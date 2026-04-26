/**
 * dataAssembler.js
 *
 * Coordinates all data fetching for the analysis pipeline.
 * Priority order for financial statements (income, balance sheet, cash flow):
 *   1. Pre-collected JSON (data/{TICKER}-collected.json) — skips all API calls
 *   2. SEC EDGAR XBRL — free, authoritative, no auth required
 *   3. FMP API — fills gaps left by EDGAR and provides all non-financial data
 *
 * Non-financial data (profile, quote, prices, peers, analyst targets) always
 * comes from FMP since EDGAR does not provide it.
 *
 * Pre-collected format (data/{TICKER}-collected.json):
 *   { company: {...}, financials: { incomeStatements, balanceSheets, cashFlows } }
 *
 * assemblePeers() — dedicated peer pipeline:
 *   FMP stock_peers → list of peer tickers
 *   Per peer: FMP quote (market data) + SEC EDGAR financials (FMP fallback)
 *   Computes EV, EV/Revenue, EV/EBITDA, P/E for each peer.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'
import {
  getCompanyProfile,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
  getHistoricalPrices,
  getQuote,
  getPeers,
} from './financialData.js'
import {
  normalizeProfile,
  normalizeIncomeStatement,
  normalizeBalanceSheet,
  normalizeCashFlow,
} from './normalizers/fmp.js'
import {
  normalizeSecIncomeStatement,
  normalizeSecBalanceSheet,
  normalizeSecCashFlow,
} from './normalizers/sec.js'
import { getEdgarFinancials } from './secEdgar.js'
import { getFinnhubBasicFinancials } from './finnhub.js'

const DATA_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../data')

function tryReadCollected(ticker) {
  const path = resolve(DATA_DIR, `${ticker.toUpperCase()}-collected.json`)
  if (existsSync(path)) {
    logger.info(`Reading pre-collected data from ${path}`)
    return JSON.parse(readFileSync(path, 'utf8'))
  }
  return null
}

/**
 * Merge two arrays of normalized financial statement rows.
 * Rows are aligned by calendar year (first 4 chars of the date field).
 * SEC values take precedence over FMP values when non-null.
 * Result is ordered by SEC rows (newest first); FMP-only years are appended.
 *
 * @param {object[]} secRows  - Normalized SEC rows (primary)
 * @param {object[]} fmpRows  - Normalized FMP rows (fallback)
 * @returns {object[]}
 */
function mergeStatements(secRows, fmpRows) {
  if (!secRows?.length) return fmpRows ?? []
  if (!fmpRows?.length) return secRows

  const fmpByYear = new Map()
  for (const row of fmpRows) {
    const year = row.date?.substring(0, 4)
    if (year) fmpByYear.set(year, row)
  }

  // Merge SEC rows with FMP data for the same year
  const merged = secRows.map(secRow => {
    const year   = secRow.date?.substring(0, 4)
    const fmpRow = fmpByYear.get(year) ?? {}
    fmpByYear.delete(year) // track consumed FMP years

    // Start from FMP, then overlay all non-null SEC fields
    const result = { ...fmpRow }
    for (const [key, val] of Object.entries(secRow)) {
      if (val != null) result[key] = val
    }
    return result
  })

  // Append any FMP years that SEC didn't cover (may be newer OR older years)
  for (const row of fmpByYear.values()) {
    merged.push(row)
  }

  // Sort newest → oldest so FMP-only recent years (e.g. FY2024/2025 not yet in EDGAR)
  // land at the front rather than being buried past the slice boundary.
  return merged.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

/**
 * Assemble normalized data for a ticker from pre-collected, SEC EDGAR, or FMP.
 *
 * @param {string} ticker
 * @param {{ force?: boolean }} options
 * @returns {Promise<{
 *   profile: object|null,
 *   incomeStatements: object[],
 *   balanceSheets: object[],
 *   cashFlows: object[],
 *   historicalPrices: { date: string, close: number }[],
 *   quote: object|null,
 *   peers: object[],
 *   flags: string[],
 *   metadata: { dataSource: string, historicalPriceDays: number }
 * }>}
 */
export async function assembleData(ticker, { force = false } = {}) {
  ticker = ticker.toUpperCase()
  const flags = []
  const collected = tryReadCollected(ticker)

  let profile = null, incomeStatements = [], balanceSheets = [], cashFlows = []

  if (collected) {
    // Normalize pre-collected data for consistent field types
    profile          = normalizeProfile([collected.company])?.[0] ?? null
    incomeStatements = normalizeIncomeStatement(collected.financials?.incomeStatements ?? [])
    balanceSheets    = normalizeBalanceSheet(collected.financials?.balanceSheets ?? [])
    cashFlows        = normalizeCashFlow(collected.financials?.cashFlows ?? [])
  }

  // Always fetch historical prices, quote, and SEC EDGAR financials (SEC is free/cached, no key needed).
  // FMP financial statements and profile: skip if pre-collected.
  const fetches = await Promise.allSettled([
    collected ? Promise.resolve(null) : getCompanyProfile(ticker, force),      // 0
    collected ? Promise.resolve(null) : getIncomeStatement(ticker, force),      // 1
    collected ? Promise.resolve(null) : getBalanceSheet(ticker, force),         // 2
    collected ? Promise.resolve(null) : getCashFlowStatement(ticker, force),    // 3
    getHistoricalPrices(ticker, 252, force),                                    // 4
    getQuote(ticker, force),                                                    // 5
    collected ? Promise.resolve(null) : getPeers(ticker, force),               // 6
    getEdgarFinancials(ticker, { force }),                                      // 7 — always: SEC is free/cached
    getFinnhubBasicFinancials(ticker, force),                                   // 8 — balance sheet fallback
  ])

  let dataSource = collected ? 'pre_collected' : 'fmp_only'

  if (!collected) {
    const [pFetch, iFetch, bFetch, cFetch] = fetches

    // Surface profile failures — rejection means provider error; empty result means unknown ticker
    if (pFetch.status === 'rejected') throw pFetch.reason
    const profileData = pFetch.value ?? []
    if (profileData.length === 0) throw new Error(`TICKER_NOT_FOUND: No company data found for "${ticker}"`)
    profile = profileData[0]

    // Normalize FMP financial statements
    const fmpIncome  = iFetch.status === 'fulfilled' ? normalizeIncomeStatement(iFetch.value ?? []) : []
    const fmpBalance = bFetch.status === 'fulfilled' ? normalizeBalanceSheet(bFetch.value ?? []) : []
    const fmpCash    = cFetch.status === 'fulfilled' ? normalizeCashFlow(cFetch.value ?? []) : []

    // Merge SEC data over FMP where available
    const secFetch = fetches[7]
    if (secFetch?.status === 'fulfilled' && secFetch.value) {
      const { annualRows, sharesOutstanding: deiShares } = secFetch.value
      // DEI shares are more reliable than FMP profile for sparse-plan tickers
      if (deiShares != null && profile.sharesOutstanding == null) {
        profile = { ...profile, sharesOutstanding: deiShares }
        logger.info(`[assembler] sharesOutstanding from SEC DEI for ${ticker}: ${(deiShares/1e6).toFixed(1)}M`)
      }
      const secIncome  = normalizeSecIncomeStatement(annualRows)
      const secBalance = normalizeSecBalanceSheet(annualRows)
      const secCash    = normalizeSecCashFlow(annualRows)

      incomeStatements = mergeStatements(secIncome,  fmpIncome)
      balanceSheets    = mergeStatements(secBalance, fmpBalance)
      cashFlows        = mergeStatements(secCash,    fmpCash)
      dataSource = 'sec_fmp'
      // FMP statement failures are silently covered by SEC — log only
      if (iFetch.status === 'rejected') logger.info(`[assembler] FMP income unavailable, covered by SEC: ${iFetch.reason?.message}`)
      if (bFetch.status === 'rejected') logger.info(`[assembler] FMP balance unavailable, covered by SEC: ${bFetch.reason?.message}`)
      if (cFetch.status === 'rejected') logger.info(`[assembler] FMP cash flow unavailable, covered by SEC: ${cFetch.reason?.message}`)
      logger.info(`[assembler] Financial statements: SEC primary + FMP fallback for ${ticker}`)
    } else {
      // SEC unavailable — use FMP only; surface any FMP failures to the user
      incomeStatements = fmpIncome
      balanceSheets    = fmpBalance
      cashFlows        = fmpCash
      if (iFetch.status === 'rejected') flags.push(`Income statement fetch failed: ${iFetch.reason?.message}`)
      if (bFetch.status === 'rejected') flags.push(`Balance sheet fetch failed: ${bFetch.reason?.message}`)
      if (cFetch.status === 'rejected') flags.push(`Cash flow fetch failed: ${cFetch.reason?.message}`)
      if (secFetch?.status === 'rejected') {
        flags.push(`SEC EDGAR unavailable — using FMP only: ${secFetch.reason?.message}`)
      } else {
        flags.push('SEC EDGAR unavailable — using FMP only')
      }
      logger.info(`[assembler] Financial statements: FMP only for ${ticker}`)
    }
  } else {
    // Pre-collected: enrich with SEC EDGAR (free, no API key, cached 7d)
    // SEC wins on non-null fields; pre-collected FMP data fills the rest
    const secFetch = fetches[7]
    if (secFetch?.status === 'fulfilled' && secFetch.value) {
      const { annualRows, sharesOutstanding: deiShares } = secFetch.value
      if (deiShares != null && profile?.sharesOutstanding == null) {
        profile = { ...profile, sharesOutstanding: deiShares }
      }
      const secIncome  = normalizeSecIncomeStatement(annualRows)
      const secBalance = normalizeSecBalanceSheet(annualRows)
      const secCash    = normalizeSecCashFlow(annualRows)

      incomeStatements = mergeStatements(secIncome,  incomeStatements)
      balanceSheets    = mergeStatements(secBalance, balanceSheets)
      cashFlows        = mergeStatements(secCash,    cashFlows)
      dataSource = 'sec_pre_collected'
      logger.info(`[assembler] Pre-collected enriched with SEC EDGAR for ${ticker}`)
    } else {
      logger.info(`[assembler] SEC unavailable — using pre-collected only for ${ticker}`)
    }
  }

  const historicalPrices  = fetches[4].status === 'fulfilled' ? fetches[4].value : []
  const quote             = fetches[5].status === 'fulfilled' ? fetches[5].value : null
  const peers             = fetches[6]?.status === 'fulfilled' ? (fetches[6].value ?? []) : []
  const finnhubMetrics    = fetches[8]?.status === 'fulfilled' ? fetches[8].value : null
  if (fetches[4].status === 'rejected') flags.push(`Historical prices fetch failed: ${fetches[4].reason?.message}`)
  if (fetches[5].status === 'rejected') flags.push(`Quote fetch failed: ${fetches[5].reason?.message}`)
  if (fetches[6]?.status === 'rejected') flags.push(`Peers fetch failed: ${fetches[6].reason?.message}`)

  return {
    profile,
    incomeStatements,
    balanceSheets,
    cashFlows,
    historicalPrices,
    quote,
    peers,
    finnhubMetrics,
    flags,
    metadata: {
      dataSource,
      historicalPriceDays: historicalPrices.length,
    },
  }
}

/**
 * Assemble peer comparables for the Relative Valuation tab.
 *
 * Priority for financial data per peer:
 *   1. SEC EDGAR XBRL — revenue, EBITDA (op income + D&A), net income, debt, cash
 *   2. FMP — fills any gaps left by SEC (and always provides market data)
 *
 * Market data (price, marketCap, sharesOutstanding) always comes from FMP since
 * SEC EDGAR does not publish live market data.
 *
 * Returns peers enriched with enterpriseValue, evRevenue, evEbitda, pe.
 *
 * @param {string} ticker - Subject company ticker
 * @param {{ force?: boolean }} options
 * @returns {Promise<object[]>}
 */
export async function assemblePeers(ticker, { force = false } = {}) {
  ticker = ticker.toUpperCase()

  const rawPeers = await getPeers(ticker, force)
  if (!rawPeers || rawPeers.length === 0) return []

  // SEC-enrich each peer's financials in parallel; fall back to FMP data already in rawPeers
  const enriched = await Promise.all(
    rawPeers.map(async peer => {
      try {
        const secResult = await getEdgarFinancials(peer.ticker, { force })
        if (!secResult) return peer

        const { annualRows } = secResult
        const secIncome  = normalizeSecIncomeStatement(annualRows)
        const secBalance = normalizeSecBalanceSheet(annualRows)
        const latestI = secIncome[0]
        const latestB = secBalance[0]

        const secRevenue   = latestI?.revenue ?? null
        const secOpInc     = latestI?.operatingIncome ?? null
        const secDA        = latestI?.depreciationAmort ?? null
        const secEbitda    = secOpInc != null && secDA != null ? secOpInc + secDA : null
        const secNetIncome = latestI?.netIncome ?? null
        const secTotalDebt = latestB?.totalDebt ?? null
        const secCash      = latestB?.cashAndCashEquivalents ?? null
        const secNetDebt   = latestB?.netDebt ?? null

        return {
          ...peer,
          revenue:                secRevenue   ?? peer.revenue,
          ebitda:                 secEbitda    ?? peer.ebitda,
          netIncome:              secNetIncome ?? peer.netIncome,
          totalDebt:              secTotalDebt ?? peer.totalDebt,
          cashAndCashEquivalents: secCash      ?? peer.cashAndCashEquivalents,
          netDebt:                secNetDebt   ?? peer.netDebt,
        }
      } catch {
        return peer
      }
    })
  )

  const safeDiv = (a, b) => (a != null && b != null && b !== 0) ? a / b : null
  return enriched.map(p => {
    const ev = p.equityValue != null && p.netDebt != null ? p.equityValue + p.netDebt : null
    return {
      ...p,
      enterpriseValue: ev,
      evRevenue: safeDiv(ev, p.revenue),
      evEbitda:  safeDiv(ev, p.ebitda),
      pe:        safeDiv(p.equityValue, p.netIncome),
    }
  })
}
