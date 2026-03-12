/**
 * alphaVantage.js
 *
 * Alpha Vantage fallback adapter. Fetches data when all FMP keys are exhausted,
 * and normalizes AV responses into the same shapes the pipeline expects from FMP.
 *
 * Env var: Alpha_Vantage_KEY
 */

import axios from 'axios'
import logger from '../utils/logger.js'

const BASE_URL = 'https://www.alphavantage.co/query'
export const AV_KEY = process.env.Alpha_Vantage_KEY ?? null

if (AV_KEY) {
  logger.info('Alpha Vantage fallback key loaded')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseNum = v => (v == null || v === 'None' || v === '-' || v === '') ? null : parseFloat(v)

function addNulls(a, b) {
  if (a == null && b == null) return null
  return (a ?? 0) + (b ?? 0)
}

async function avGet(params) {
  const response = await axios.get(BASE_URL, { params: { ...params, apikey: AV_KEY } })
  const d = response.data

  // AV soft errors — always HTTP 200
  if (d?.['Error Message']) throw new Error(`AV_API_ERROR: ${d['Error Message']}`)
  if (d?.['Note'])          throw new Error('AV_RATE_LIMITED: Alpha Vantage call frequency exceeded. Wait before retrying.')
  if (d?.['Information'])   throw new Error('AV_PLAN_RESTRICTED: Alpha Vantage endpoint requires a higher subscription tier.')

  return d
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
