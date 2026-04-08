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

  // Append any FMP years that SEC didn't cover (older years)
  for (const row of fmpByYear.values()) {
    merged.push(row)
  }

  return merged
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

  // Always fetch historical prices, quote, and peers fresh.
  // Financial statements: skip if pre-collected; otherwise fetch SEC + FMP in parallel.
  const fetches = await Promise.allSettled([
    collected ? Promise.resolve(null) : getCompanyProfile(ticker, force),      // 0
    collected ? Promise.resolve(null) : getIncomeStatement(ticker, force),      // 1
    collected ? Promise.resolve(null) : getBalanceSheet(ticker, force),         // 2
    collected ? Promise.resolve(null) : getCashFlowStatement(ticker, force),    // 3
    getHistoricalPrices(ticker, 252, force),                                    // 4
    getQuote(ticker, force),                                                    // 5
    collected ? Promise.resolve(null) : getPeers(ticker, force),               // 6
    collected ? Promise.resolve(null) : getEdgarFinancials(ticker, { force }), // 7
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
    if (iFetch.status === 'rejected') flags.push(`Income statement fetch failed: ${iFetch.reason?.message}`)
    if (bFetch.status === 'rejected') flags.push(`Balance sheet fetch failed: ${bFetch.reason?.message}`)
    if (cFetch.status === 'rejected') flags.push(`Cash flow fetch failed: ${cFetch.reason?.message}`)

    // Merge SEC data over FMP where available
    const secFetch = fetches[7]
    if (secFetch?.status === 'fulfilled' && secFetch.value) {
      const { annualRows } = secFetch.value
      const secIncome  = normalizeSecIncomeStatement(annualRows)
      const secBalance = normalizeSecBalanceSheet(annualRows)
      const secCash    = normalizeSecCashFlow(annualRows)

      incomeStatements = mergeStatements(secIncome,  fmpIncome)
      balanceSheets    = mergeStatements(secBalance, fmpBalance)
      cashFlows        = mergeStatements(secCash,    fmpCash)
      dataSource = 'sec_fmp'
      logger.info(`[assembler] Financial statements: SEC primary + FMP fallback for ${ticker}`)
    } else {
      // SEC unavailable — use FMP only
      incomeStatements = fmpIncome
      balanceSheets    = fmpBalance
      cashFlows        = fmpCash
      if (secFetch?.status === 'rejected') {
        flags.push(`SEC EDGAR unavailable — using FMP only: ${secFetch.reason?.message}`)
      } else {
        flags.push('SEC EDGAR unavailable — using FMP only')
      }
      logger.info(`[assembler] Financial statements: FMP only for ${ticker}`)
    }
  }

  const historicalPrices = fetches[4].status === 'fulfilled' ? fetches[4].value : []
  const quote            = fetches[5].status === 'fulfilled' ? fetches[5].value : null
  const peers            = fetches[6]?.status === 'fulfilled' ? (fetches[6].value ?? []) : []
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
    flags,
    metadata: {
      dataSource,
      historicalPriceDays: historicalPrices.length,
    },
  }
}
