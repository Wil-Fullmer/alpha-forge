/**
 * secEdgar.js
 *
 * SEC EDGAR XBRL data client.
 * Fetches financial statement data (income, balance sheet, cash flow) from the
 * SEC EDGAR public API — no authentication required.
 *
 * Data priority: SEC first → FMP fills gaps (handled in dataAssembler.js).
 *
 * SEC API endpoints used:
 *   - https://www.sec.gov/files/company_tickers.json  (ticker → CIK mapping)
 *   - https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json  (XBRL facts)
 *
 * Per SEC guidelines, requests must include a User-Agent header.
 * Rate limit: ~10 req/s; caching keeps actual API calls minimal.
 */

import axios from 'axios'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'

const CACHE_DIR  = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/cache')
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false'

const TTL_CIKS  = 30 * 24 * 60 * 60 * 1000  // 30 days — CIK mapping is very stable
const TTL_FACTS =  7 * 24 * 60 * 60 * 1000  // 7 days  — facts update after each 10-K

const SEC_UA          = 'Alpha-Forge alpha-forge@example.com'
const TICKERS_URL     = 'https://www.sec.gov/files/company_tickers.json'
const FACTS_BASE      = 'https://data.sec.gov/api/xbrl/companyfacts'

// ── Cache helpers ─────────────────────────────────────────────────────────────

function readCache(key) {
  if (!CACHE_ENABLED) return null
  const file = resolve(CACHE_DIR, `${key}.json`)
  if (!existsSync(file)) return null
  try {
    const { cachedAt, ttlMs, data } = JSON.parse(readFileSync(file, 'utf8'))
    const age = Date.now() - new Date(cachedAt).getTime()
    if (age > ttlMs) return null
    logger.info(`[SEC] Cache hit: ${key} (expires in ${Math.round((ttlMs - age) / 60000)}m)`)
    return data
  } catch {
    return null
  }
}

function writeCache(key, data, ttlMs) {
  if (!CACHE_ENABLED) return
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(
    resolve(CACHE_DIR, `${key}.json`),
    JSON.stringify({ cachedAt: new Date().toISOString(), ttlMs, data })
  )
}

// ── CIK lookup ────────────────────────────────────────────────────────────────

async function fetchCikMapping() {
  const cached = readCache('sec_ciks')
  if (cached) return cached

  logger.info('[SEC] Fetching CIK mapping from SEC...')
  const res = await axios.get(TICKERS_URL, {
    headers: { 'User-Agent': SEC_UA },
    timeout: 15000,
  })
  // Response: { "0": { cik_str: 320193, ticker: "AAPL", title: "..." }, ... }
  const mapping = {}
  for (const entry of Object.values(res.data)) {
    mapping[entry.ticker.toUpperCase()] = entry.cik_str
  }
  writeCache('sec_ciks', mapping, TTL_CIKS)
  return mapping
}

async function getCik(ticker) {
  const mapping = await fetchCikMapping()
  const cik = mapping[ticker.toUpperCase()]
  if (!cik) return null
  // Zero-pad to 10 digits
  return String(cik).padStart(10, '0')
}

// ── XBRL facts fetch ──────────────────────────────────────────────────────────

async function fetchCompanyFacts(ticker, cik, force) {
  const key = `sec_facts_${ticker.toUpperCase()}`
  if (!force) {
    const cached = readCache(key)
    if (cached) return cached
  }

  const url = `${FACTS_BASE}/CIK${cik}.json`
  logger.info(`[SEC] Fetching XBRL facts for ${ticker} (CIK ${cik})`)
  const res = await axios.get(url, {
    headers: { 'User-Agent': SEC_UA },
    timeout: 30000,
  })
  writeCache(key, res.data, TTL_FACTS)
  return res.data
}

// ── Annual data extraction ────────────────────────────────────────────────────

// GAAP concept fallback chains. First match with data wins.
const CONCEPTS = {
  revenue:                 ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'],
  costOfRevenue:           ['CostOfRevenue', 'CostOfGoodsAndServicesSold'],
  grossProfit:             ['GrossProfit'],
  researchAndDev:          ['ResearchAndDevelopmentExpense'],
  sgaExpense:              ['SellingGeneralAndAdministrativeExpense'],
  operatingIncome:         ['OperatingIncomeLoss'],
  netIncome:               ['NetIncomeLoss'],
  totalAssets:             ['Assets'],
  totalLiabilities:        ['Liabilities'],
  totalStockholdersEquity: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
  longTermDebt:            ['LongTermDebt', 'LongTermDebtAndCapitalLeaseObligation'],
  shortTermDebt:           ['ShortTermBorrowings', 'DebtCurrent'],
  cashAndCashEquivalents:  ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsAndShortTermInvestments'],
  totalCurrentAssets:      ['AssetsCurrent'],
  totalCurrentLiabilities: ['LiabilitiesCurrent'],
  operatingCashFlow:       ['NetCashProvidedByUsedInOperatingActivities'],
  // SEC capex is positive (payments made); will be negated in normalizer to match FMP sign convention
  capitalExpenditure:      ['PaymentsToAcquirePropertyPlantAndEquipment'],
  depreciationAmort:       ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization'],
  changeInWorkingCap:      ['IncreaseDecreaseInOperatingCapital'],
}

/**
 * For a given GAAP concept list, extract the best available annual (10-K) data.
 * Returns array of { fy, end, val } sorted newest → oldest, deduped by fiscal year.
 */
function pickBestConcept(gaap, concepts) {
  for (const concept of concepts) {
    const entries = gaap[concept]?.units?.USD
    if (!Array.isArray(entries)) continue

    const annual = entries.filter(e => e.form === '10-K')
    if (annual.length === 0) continue

    // Deduplicate by fiscal year — keep the most recently filed entry
    const byFy = new Map()
    for (const e of annual) {
      const existing = byFy.get(e.fy)
      if (!existing || e.filed > existing.filed) {
        byFy.set(e.fy, e)
      }
    }

    return [...byFy.values()].sort((a, b) => b.fy - a.fy)
  }
  return []
}

/**
 * Build a map of fiscal-year rows from XBRL company facts.
 * Returns an array of rows (newest first, max 5), each keyed by our field names.
 */
function extractAnnualData(facts) {
  const gaap = facts?.['us-gaap']
  if (!gaap) return []

  const yearMap = new Map() // fy -> { fy, endDate, ...fieldValues }

  for (const [field, concepts] of Object.entries(CONCEPTS)) {
    const entries = pickBestConcept(gaap, concepts)
    for (const entry of entries) {
      if (!yearMap.has(entry.fy)) {
        yearMap.set(entry.fy, { fy: entry.fy, endDate: entry.end })
      }
      yearMap.get(entry.fy)[field] = entry.val
    }
  }

  return [...yearMap.values()]
    .sort((a, b) => b.fy - a.fy)
    .slice(0, 7)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch and extract annual financial data from SEC EDGAR for a ticker.
 *
 * @param {string} ticker
 * @param {{ force?: boolean }} options
 * @returns {Promise<{ annualRows: object[] } | null>}
 *   Returns null if the ticker is not found in EDGAR or on any error.
 */
export async function getEdgarFinancials(ticker, { force = false } = {}) {
  try {
    const cik = await getCik(ticker)
    if (!cik) {
      logger.info(`[SEC] Ticker ${ticker} not found in EDGAR — will use FMP only`)
      return null
    }

    const facts = await fetchCompanyFacts(ticker, cik, force)
    const annualRows = extractAnnualData(facts?.facts)

    if (annualRows.length === 0) {
      logger.warn(`[SEC] No annual 10-K data extracted for ${ticker}`)
      return null
    }

    logger.info(`[SEC] Extracted ${annualRows.length} annual rows for ${ticker}`)
    return { annualRows }
  } catch (err) {
    logger.warn(`[SEC] Failed to fetch EDGAR data for ${ticker}: ${err.message}`)
    return null
  }
}
