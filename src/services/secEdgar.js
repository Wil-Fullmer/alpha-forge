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
  // PaymentsToAcquireOtherProductiveAssets covers telecoms (VZ, T) that report network capex this way
  // PaymentsForProceedsFromOtherInvestingActivities covers asset-light platforms (ABNB) post-2022
  capitalExpenditure:      ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireOtherProductiveAssets', 'PaymentsToAcquireProductiveAssets', 'PaymentsForProceedsFromOtherInvestingActivities'],
  depreciationAmort:       ['DepreciationDepletionAndAmortization', 'DepreciationAndAmortization'],
  changeInWorkingCap:      ['IncreaseDecreaseInOperatingCapital'],
  incomeBeforeTax:         ['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest',
                            'IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'],
  taxExpense:              ['IncomeTaxExpenseBenefit'],
}

/**
 * For a given GAAP concept list, extract the best available annual (10-K) data.
 * Returns array deduped by period end date, sorted newest → oldest.
 *
 * "Best" concept = the one whose most recent annual period end date is latest.
 * This handles companies that switch XBRL concepts over time (e.g. Apple moved from
 * `Revenues` to `RevenueFromContractWithCustomerExcludingAssessedTax` at ASC 606
 * adoption — the new concept has more recent data and wins).
 *
 * NOTE: SEC 10-K filings include multiple years of data (current + prior comparatives),
 * all sharing the same `fy` (filing year). Deduplicating by `end` (period end date)
 * rather than `fy` ensures we get one row per fiscal period, using the most recently
 * filed (and therefore most up-to-date, possibly restated) value for each period.
 */
function pickBestConcept(gaap, concepts) {
  let bestEntries = null
  let bestMaxEnd  = ''

  for (const concept of concepts) {
    const entries = gaap[concept]?.units?.USD
    if (!Array.isArray(entries)) continue

    // Filter annual filings only (10-K domestic, 20-F foreign private issuers)
    // ≥300 days excludes quarterly summaries embedded in annual XBRL filings
    const annual = entries.filter(e => {
      if (e.form !== '10-K' && e.form !== '20-F') return false
      if (!e.start || !e.end) return true
      return (new Date(e.end) - new Date(e.start)) / 86400000 >= 300
    })
    if (annual.length === 0) continue

    const maxEnd = annual.reduce((m, e) => (e.end > m ? e.end : m), '')
    if (maxEnd > bestMaxEnd) {
      bestMaxEnd  = maxEnd
      bestEntries = annual
    }
  }

  if (!bestEntries) return []

  // Deduplicate by period end date — keep the most recently filed entry per period
  const byEnd = new Map()
  for (const e of bestEntries) {
    const existing = byEnd.get(e.end)
    if (!existing || e.filed > existing.filed) {
      byEnd.set(e.end, e)
    }
  }

  return [...byEnd.values()].sort((a, b) => b.end.localeCompare(a.end))
}

/**
 * Extract shares outstanding from the DEI namespace.
 * dei:EntityCommonStockSharesOutstanding is filed on the 10-K cover page for every company,
 * making it the most reliable shares source when FMP profile data is missing.
 */
function extractDeiShares(facts) {
  const entries = facts?.['dei']?.EntityCommonStockSharesOutstanding?.units?.shares
  if (!Array.isArray(entries)) return null
  const tenK = entries.filter(e => (e.form === '10-K' || e.form === '20-F') && e.filed)
  if (!tenK.length) return null
  return tenK.sort((a, b) => b.filed.localeCompare(a.filed))[0]?.val ?? null
}

/**
 * Build a map of fiscal-period rows from XBRL company facts.
 * Returns an array of rows (newest first, max 7), each keyed by our field names.
 */
function extractAnnualData(facts) {
  const gaap = facts?.['us-gaap']
  if (!gaap) return []

  const yearMap = new Map() // endDate -> { fy, endDate, ...fieldValues }

  for (const [field, concepts] of Object.entries(CONCEPTS)) {
    const entries = pickBestConcept(gaap, concepts)
    for (const entry of entries) {
      if (!yearMap.has(entry.end)) {
        yearMap.set(entry.end, { fy: entry.fy, endDate: entry.end })
      }
      yearMap.get(entry.end)[field] = entry.val
    }
  }

  return [...yearMap.values()]
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
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

    // IFRS filers (most foreign private issuers filing 20-F) use ifrs-full namespace,
    // not us-gaap. We can still extract DEI shares but skip financials.
    const namespaces = Object.keys(facts?.facts ?? {})
    const isIfrs = namespaces.includes('ifrs-full') && !namespaces.includes('us-gaap')
    if (isIfrs) {
      const sharesOutstanding = extractDeiShares(facts?.facts)
      logger.info(`[SEC] ${ticker} files under IFRS — DEI shares only, financials from FMP`)
      return { annualRows: [], sharesOutstanding, isIfrs: true }
    }

    const annualRows = extractAnnualData(facts?.facts)
    const sharesOutstanding = extractDeiShares(facts?.facts)

    if (annualRows.length === 0 && sharesOutstanding == null) {
      logger.warn(`[SEC] No annual 10-K/20-F data extracted for ${ticker}`)
      return null
    }

    logger.info(`[SEC] Extracted ${annualRows.length} annual rows for ${ticker}${sharesOutstanding ? ` + DEI shares (${(sharesOutstanding/1e6).toFixed(1)}M)` : ''}`)
    return { annualRows, sharesOutstanding }
  } catch (err) {
    logger.warn(`[SEC] Failed to fetch EDGAR data for ${ticker}: ${err.message}`)
    return null
  }
}
