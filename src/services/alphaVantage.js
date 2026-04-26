/**
 * alphaVantage.js
 *
 * Alpha Vantage fallback adapter. Fetches data when all FMP keys are exhausted,
 * and normalizes AV responses into the same shapes the pipeline expects from FMP.
 *
 * Env var: Alpha_Vantage_KEYS (comma-separated list of API keys)
 */

import axios from 'axios'
import logger from '../utils/logger.js'

const BASE_URL = 'https://www.alphavantage.co/query'

const AV_KEYS = (process.env.Alpha_Vantage_KEYS ?? '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)

// Exported for backward-compat boolean gate in financialData.js
export const AV_KEY = AV_KEYS.length > 0 ? AV_KEYS[0] : null

if (AV_KEYS.length > 0) {
  logger.info(`Alpha Vantage fallback loaded: ${AV_KEYS.length} key(s)`)
}

// ── Key rotation ──────────────────────────────────────────────────────────────

let keyIndex = 0
let exhaustedKeys = new Set()
let exhaustedResetDate = new Date().toDateString()

function getActiveKey() {
  const today = new Date().toDateString()
  if (today !== exhaustedResetDate) {
    exhaustedKeys = new Set()
    exhaustedResetDate = today
  }
  for (let i = 0; i < AV_KEYS.length; i++) {
    const idx = (keyIndex + i) % AV_KEYS.length
    if (!exhaustedKeys.has(idx)) {
      keyIndex = idx
      return AV_KEYS[idx]
    }
  }
  return null
}

function markKeyExhausted() {
  logger.info(`[AV] Key ${keyIndex + 1}/${AV_KEYS.length} rate-limited — rotating`)
  exhaustedKeys.add(keyIndex)
  keyIndex = (keyIndex + 1) % AV_KEYS.length
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseNum = v => (v == null || v === 'None' || v === '-' || v === '') ? null : parseFloat(v)

function addNulls(a, b) {
  if (a == null && b == null) return null
  return (a ?? 0) + (b ?? 0)
}

async function avGet(params) {
  let attempts = 0
  while (attempts < AV_KEYS.length) {
    const key = getActiveKey()
    if (!key) throw new Error('AV_ALL_KEYS_EXHAUSTED: All Alpha Vantage keys have hit their daily limit.')

    const response = await axios.get(BASE_URL, { params: { ...params, apikey: key } })
    const d = response.data

    if (d?.['Error Message']) throw new Error(`AV_API_ERROR: ${d['Error Message']}`)

    // AV uses 'Information' for both rate limits and actual plan restrictions.
    // Rate-limit text contains "standard API call frequency" — rotate key and retry.
    // True plan restriction text contains "premium" — throw immediately.
    if (d?.['Information']) {
      const msg = d['Information']
      if (msg.includes('standard API call frequency') || msg.includes('per day') || msg.includes('per minute')) {
        markKeyExhausted()
        attempts++
        continue
      }
      throw new Error('AV_PLAN_RESTRICTED: Alpha Vantage endpoint requires a higher subscription tier.')
    }

    if (d?.['Note']) {
      markKeyExhausted()
      attempts++
      continue
    }

    return d
  }
  throw new Error('AV_ALL_KEYS_EXHAUSTED: All Alpha Vantage keys have hit their daily limit.')
}

// ── Normalizers — AV response → FMP-compatible shape ─────────────────────────

function normalizeOverview(d) {
  return [{
    symbol:            d.Symbol,
    companyName:       d.Name,
    description:       d.Description,
    exchange:          d.Exchange,
    currency:          d.Currency,
    country:           d.Country,
    sector:            d.Sector,
    industry:          d.Industry,
    marketCap:         parseNum(d.MarketCapitalization),
    beta:              parseNum(d.Beta),
    eps:               parseNum(d.EPS),
    pe:                parseNum(d.PERatio),
    sharesOutstanding: parseNum(d.SharesOutstanding),
    fullTimeEmployees: d.FullTimeEmployees ?? null,
    // price not available in OVERVIEW — comes from quote
    price: null,
  }]
}

function normalizeIncomeStatement(d) {
  return (d.annualReports ?? []).slice(0, 5).map(r => ({
    date:             r.fiscalDateEnding,
    revenue:          parseNum(r.totalRevenue),
    netIncome:        parseNum(r.netIncome),
    grossProfit:      parseNum(r.grossProfit),
    operatingIncome:  parseNum(r.operatingIncome),
    ebitda:           parseNum(r.ebitda),
    eps:              parseNum(r.reportedEPS ?? r.eps ?? null),
  }))
}

function normalizeBalanceSheet(d) {
  return (d.annualReports ?? []).slice(0, 5).map(r => ({
    date:                       r.fiscalDateEnding,
    totalAssets:                parseNum(r.totalAssets),
    totalLiabilities:           parseNum(r.totalLiabilities),
    totalStockholdersEquity:    parseNum(r.totalShareholderEquity),
    totalDebt:                  addNulls(parseNum(r.shortTermDebt), parseNum(r.longTermDebtNoncurrent)),
    cashAndCashEquivalents:     parseNum(r.cashAndCashEquivalentsAtCarryingValue),
  }))
}

function normalizeCashFlow(d) {
  return (d.annualReports ?? []).slice(0, 5).map(r => {
    const operating = parseNum(r.operatingCashflow)
    const capex     = parseNum(r.capitalExpenditures)
    // AV stores capex as positive; FCF = operating - capex
    const fcf = operating != null && capex != null ? operating - Math.abs(capex) : null
    return {
      date:               r.fiscalDateEnding,
      operatingCashFlow:  operating,
      capitalExpenditure: capex != null ? -Math.abs(capex) : null,
      freeCashFlow:       fcf,
    }
  })
}

function normalizeQuote(d) {
  const q = d['Global Quote'] ?? {}
  return {
    symbol:            q['01. symbol'] ?? null,
    price:             parseNum(q['05. price']),
    volume:            parseNum(q['06. volume']),
    change:            parseNum(q['09. change']),
    changesPercentage: parseNum((q['10. change percent'] ?? '').replace('%', '')),
    // AV GLOBAL_QUOTE does not include eps/pe — will be null
    eps:               null,
    pe:                null,
  }
}

function normalizeHistoricalPrices(d, days) {
  const series = d['Time Series (Daily)'] ?? {}
  return Object.entries(series)
    .map(([date, v]) => ({ date, close: parseNum(v['4. close']) }))
    .filter(p => p.close != null)
    .sort((a, b) => a.date.localeCompare(b.date))  // oldest → newest
    .slice(-days)
}

// ── Endpoint Map ──────────────────────────────────────────────────────────────

const FMP_TO_AV = {
  'profile':                 { fn: 'OVERVIEW',          normalize: normalizeOverview },
  'income-statement':        { fn: 'INCOME_STATEMENT',  normalize: normalizeIncomeStatement },
  'balance-sheet-statement': { fn: 'BALANCE_SHEET',     normalize: normalizeBalanceSheet },
  'cash-flow-statement':     { fn: 'CASH_FLOW',         normalize: normalizeCashFlow },
  'quote':                   { fn: 'GLOBAL_QUOTE',      normalize: normalizeQuote },
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch and normalize data for a given FMP-style endpoint via Alpha Vantage.
 * Returns null if the endpoint has no AV mapping.
 */
export async function fetchFromAV(ticker, fmpEndpoint) {
  const mapping = FMP_TO_AV[fmpEndpoint]
  if (!mapping) {
    logger.warn(`No Alpha Vantage mapping for endpoint: ${fmpEndpoint}`)
    return null
  }

  logger.info(`Fetching ${ticker}/${fmpEndpoint} from Alpha Vantage`)
  const raw = await avGet({ function: mapping.fn, symbol: ticker })
  const normalized = mapping.normalize(raw)
  logger.info(`Alpha Vantage fallback succeeded for ${ticker}/${fmpEndpoint}`)
  return normalized
}

/**
 * Fetch historical daily prices via Alpha Vantage TIME_SERIES_DAILY.
 * Returns array of { date, close } sorted oldest → newest.
 */
export async function fetchHistoricalPricesFromAV(ticker, days = 252) {
  logger.info(`Fetching historical prices for ${ticker} from Alpha Vantage`)
  const raw = await avGet({
    function:   'TIME_SERIES_DAILY',
    symbol:     ticker,
    outputsize: days > 100 ? 'full' : 'compact',
  })
  const result = normalizeHistoricalPrices(raw, days)
  logger.info(`Alpha Vantage: ${result.length} historical prices for ${ticker}`)
  return result
}
