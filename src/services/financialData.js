import axios from 'axios'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'
import { AV_KEY, fetchFromAV, fetchHistoricalPricesFromAV } from './alphaVantage.js'
import {
  normalizeProfile,
  normalizeIncomeStatement,
  normalizeBalanceSheet,
  normalizeCashFlow,
  normalizeQuote,
  normalizePeer,
} from './normalizers/fmp.js'

const BASE_URL = 'https://financialmodelingprep.com/stable'

const CACHE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/cache')

const TTL = {
  QUOTE:      15 * 60 * 1000,
  PRICES:     24 * 60 * 60 * 1000,
  STATEMENTS: 7  * 24 * 60 * 60 * 1000,
}

// ── API Key Pool ──────────────────────────────────────────────────────────────
// Loads all FMP API keys from environment variables.
// Supported names: FMP_API_KEY (primary), FMP_API_KEY_ALT (legacy), FMP_API_KEY_2, FMP_API_KEY_3, ...
// Add new keys by adding FMP_API_KEY_N=... to .env — no code changes needed.
function loadApiKeys() {
  const seen = new Set()
  const keys = []
  const candidates = [
    'FMP_API_KEY',
    'FMP_API_KEY_ALT',
    ...Object.keys(process.env)
      .filter(k => /^FMP_API_KEY_(?!ALT$)\w+$/.test(k))
      .sort()
  ]
  for (const name of candidates) {
    const val = process.env[name]
    if (val && !seen.has(val)) { seen.add(val); keys.push(val) }
  }
  return keys
}

const API_KEYS = loadApiKeys()

if (API_KEYS.length === 0) {
  logger.error('No FMP API keys found. Set FMP_API_KEY in .env')
} else {
  logger.info(`FMP API keys loaded: ${API_KEYS.length}`)
}

// ── CACHE_ENABLED guard ───────────────────────────────────────────────────────
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false'

// ── Provider call budget ──────────────────────────────────────────────────────
let _providerCallCount = 0
const _BUDGET_WARN = parseInt(process.env.MAX_PROVIDER_CALLS ?? '20', 10)

function _bumpBudget() {
  _providerCallCount++
  if (_providerCallCount >= _BUDGET_WARN) {
    logger.warn(
      `[budget] Provider API call #${_providerCallCount} this session (threshold: ${_BUDGET_WARN})` +
      ' — reduce force-refresh usage or increase MAX_PROVIDER_CALLS'
    )
  }
}

// ── Cache ─────────────────────────────────────────────────────────────────────
function readCache(key) {
  if (!CACHE_ENABLED) return null
  const file = resolve(CACHE_DIR, `${key}.json`)
  if (!existsSync(file)) return null
  const { cachedAt, ttlMs, data } = JSON.parse(readFileSync(file, 'utf8'))
  const age = Date.now() - new Date(cachedAt).getTime()
  if (age > ttlMs) return null
  logger.info(`Cache hit for ${key} (expires in ${Math.round((ttlMs - age) / 60000)}m)`)
  return data
}

function writeCache(key, data, ttlMs) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(resolve(CACHE_DIR, `${key}.json`), JSON.stringify({ cachedAt: new Date().toISOString(), ttlMs, data }))
}

// ── Core Fetch Helpers ────────────────────────────────────────────────────────
async function doFetch(url, params) {
  _bumpBudget()
  const response = await axios.get(url, { params })
  const errMsg = response.data?.['Error Message'] ?? response.data?.message
  if (errMsg) throw new Error(`FMP_API_ERROR: ${errMsg}`)
  return response.data
}

/**
 * Executes requestFn(apikey) cycling through all loaded API keys on 429/401/403.
 * Fails immediately on 402 (plan restriction — retrying won't help).
 * Propagates non-auth errors immediately.
 */
async function fetchWithKeyRotation(requestFn) {
  if (API_KEYS.length === 0) throw new Error('FMP_NO_KEYS: No FMP API key configured. Set FMP_API_KEY in .env')
  let lastErr
  for (let i = 0; i < API_KEYS.length; i++) {
    try {
      return await requestFn(API_KEYS[i])
    } catch (err) {
      const s = err.response?.status
      if (s === 402) throw new Error('FMP_PLAN_RESTRICTED: Endpoint requires a higher FMP subscription tier.')
      if (s === 429 || s === 401 || s === 403) {
        lastErr = err
        if (i < API_KEYS.length - 1) {
          logger.warn(`Key [${i + 1}/${API_KEYS.length}] failed (${s}), trying next key`)
          continue
        }
        break
      }
      throw err // network errors, 5xx, etc. — propagate immediately
    }
  }
  const fs = lastErr?.response?.status
  if (fs === 429) throw new Error(`FMP_RATE_LIMITED: All ${API_KEYS.length} key(s) rate limited. Use cached data or wait before retrying.`)
  if (fs === 401 || fs === 403) throw new Error(`FMP_AUTH_FAILED: All ${API_KEYS.length} key(s) invalid or expired. Check .env`)
  throw lastErr
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetch financial data from FMP stable API
 * @param {string} ticker - Stock ticker symbol
 * @param {string} endpoint - API endpoint (e.g., 'income-statement')
 * @param {object} [params] - Additional query parameters
 * @returns {Promise<Object>} Financial data
 */
export async function fetchFromFMP(ticker, endpoint, params = {}) {
  const url = `${BASE_URL}/${endpoint}`
  try {
    const data = await fetchWithKeyRotation(apikey =>
      doFetch(url, { symbol: ticker, apikey, ...params })
    )
    logger.info(`Fetched data for ${ticker} from ${endpoint}`)
    return data
  } catch (fmpErr) {
    const code = fmpErr.message?.split(':')[0]
    if (AV_KEY && (code === 'FMP_PLAN_RESTRICTED' || code === 'FMP_RATE_LIMITED' || code === 'FMP_AUTH_FAILED')) {
      logger.warn(`FMP exhausted for ${endpoint} (${code}), trying Alpha Vantage`)
      const avData = await fetchFromAV(ticker, endpoint)
      if (avData != null) return avData
    }
    throw fmpErr
  }
}

/**
 * Get company profile
 */
export async function getCompanyProfile(ticker, force = false) {
  const key = `${ticker}-profile`
  if (!force) { const cached = readCache(key); if (cached) return cached }
  const data = await fetchFromFMP(ticker, 'profile')
  const normalized = normalizeProfile(data)
  writeCache(key, normalized, TTL.STATEMENTS)
  return normalized
}

/**
 * Get income statement
 */
export async function getIncomeStatement(ticker, force = false) {
  const key = `${ticker}-income-statement`
  if (!force) { const cached = readCache(key); if (cached) return cached }
  const data = await fetchFromFMP(ticker, 'income-statement', { limit: 7 })
  const normalized = normalizeIncomeStatement(data)
  writeCache(key, normalized, TTL.STATEMENTS)
  return normalized
}

/**
 * Get balance sheet
 */
export async function getBalanceSheet(ticker, force = false) {
  const key = `${ticker}-balance-sheet-statement`
  if (!force) { const cached = readCache(key); if (cached) return cached }
  const data = await fetchFromFMP(ticker, 'balance-sheet-statement', { limit: 7 })
  const normalized = normalizeBalanceSheet(data)
  writeCache(key, normalized, TTL.STATEMENTS)
  return normalized
}

/**
 * Get cash flow statement
 */
export async function getCashFlowStatement(ticker, force = false) {
  const key = `${ticker}-cash-flow-statement`
  if (!force) { const cached = readCache(key); if (cached) return cached }
  const data = await fetchFromFMP(ticker, 'cash-flow-statement', { limit: 7 })
  const normalized = normalizeCashFlow(data)
  writeCache(key, normalized, TTL.STATEMENTS)
  return normalized
}

/**
 * Get historical daily prices
 * @param {string} ticker
 * @param {number} [days=252] - Number of trading days of history to request
 * @param {boolean} [force=false] - Bypass cache
 * @returns {Promise<{ date: string, close: number }[]>} Sorted oldest → newest
 */
export async function getHistoricalPrices(ticker, days = 252, force = false) {
  const key = `${ticker}-historical-prices`
  if (!force) { const cached = readCache(key); if (cached) return cached }

  const to   = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - days * 1.5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const url  = `${BASE_URL}/historical-price-eod/full`

  const parseHistorical = (data) => {
    const historical = Array.isArray(data) ? data : (data?.historical ?? [])
    return historical.reverse().slice(-days).map(d => ({ date: d.date, close: d.close }))
  }

  let rawData
  try {
    rawData = await fetchWithKeyRotation(async apikey => {
      _bumpBudget()
      const r = await axios.get(url, { params: { symbol: ticker, from, to, apikey } })
      return r.data
    })
  } catch (fmpErr) {
    const code = fmpErr.message?.split(':')[0]
    if (AV_KEY && (code === 'FMP_PLAN_RESTRICTED' || code === 'FMP_RATE_LIMITED' || code === 'FMP_AUTH_FAILED')) {
      logger.warn(`FMP exhausted for historical prices (${code}), trying Alpha Vantage`)
      const avResult = await fetchHistoricalPricesFromAV(ticker, days)
      logger.info(`Fetched ${avResult.length} historical prices for ${ticker} (Alpha Vantage)`)
      writeCache(key, avResult, TTL.PRICES)
      return avResult
    }
    throw fmpErr
  }

  const result = parseHistorical(rawData)
  logger.info(`Fetched ${result.length} historical prices for ${ticker}`)
  writeCache(key, result, TTL.PRICES)
  return result
}

/**
 * Get key metrics (EPS, P/E, WACC, shares outstanding, etc.)
 * @param {string} ticker
 * @param {boolean} [force=false] - Bypass cache
 * @returns {Promise<object[]>} FMP key metrics array, newest first
 */
export async function getKeyMetrics(ticker, force = false) {
  const key = `${ticker}-key-metrics`
  if (!force) { const cached = readCache(key); if (cached) return cached }
  const data = await fetchFromFMP(ticker, 'key-metrics', { limit: 5 })
  writeCache(key, data, TTL.STATEMENTS)
  return data
}

/**
 * Get current quote (real-time price, EPS, P/E)
 * @param {string} ticker
 * @param {boolean} [force=false] - Bypass cache
 * @returns {Promise<object>} Quote object
 */
export async function getQuote(ticker, force = false) {
  const key = `${ticker}-quote`
  if (!force) { const cached = readCache(key); if (cached) return cached }
  const data = await fetchFromFMP(ticker, 'quote')
  const extracted = Array.isArray(data) ? data[0] : data
  const normalized = normalizeQuote(extracted)
  writeCache(key, normalized, TTL.QUOTE)
  return normalized
}

/**
 * Get peer comparables for a ticker.
 * Fetches peers from FMP /stable/stock-peers (returns name, price, mktCap per peer),
 * then enriches each with income statement + balance sheet data in parallel.
 * Failed individual peer fetches are skipped gracefully.
 *
 * @param {string} ticker
 * @param {boolean} [force=false] - Bypass cache
 * @returns {Promise<object[]>} Array of normalized peer objects
 */
export async function getPeers(ticker, force = false) {
  const key = `${ticker}-peers`
  if (!force) { const cached = readCache(key); if (cached) return cached }

  // Step 1: fetch peer list — returns [{ symbol, companyName, price, mktCap }, ...]
  let peersData = []
  try {
    const raw = await fetchFromFMP(ticker, 'stock-peers')
    peersData = Array.isArray(raw) ? raw : []
  } catch (err) {
    logger.warn(`getPeers: failed to fetch peer list for ${ticker}: ${err.message}`)
    return []
  }

  if (peersData.length === 0) {
    logger.info(`getPeers: no peers found for ${ticker}`)
    return []
  }

  // Step 2: for each peer, fetch income statement + balance sheet in parallel.
  // Market data (price, mktCap, companyName) comes from the peers list response.
  const peerResults = await Promise.allSettled(
    peersData.map(async peerData => {
      const peerTicker = peerData.symbol
      if (!peerTicker) return null

      const [incomeRes, balanceRes] = await Promise.allSettled([
        getIncomeStatement(peerTicker, force),
        getBalanceSheet(peerTicker, force),
      ])

      const income  = incomeRes.status  === 'fulfilled' ? (incomeRes.value?.[0]  ?? null) : null
      const balance = balanceRes.status === 'fulfilled' ? (balanceRes.value?.[0] ?? null) : null

      const price  = peerData.price  ?? null
      const mktCap = peerData.mktCap ?? null
      // Derive shares outstanding from market cap / price rather than a separate quote call
      const shares = price && mktCap ? mktCap / price : null

      return normalizePeer({
        ticker:                 peerTicker,
        name:                   peerData.companyName ?? null,
        sharePrice:             price,
        dilutedShares:          shares,
        equityValue:            mktCap,
        revenue:                income?.revenue,
        ebitda:                 income?.ebitda,
        operatingIncome:        income?.operatingIncome,
        depreciationAmort:      income?.depreciationAmort,
        netIncome:              income?.netIncome,
        totalDebt:              balance?.totalDebt,
        cashAndCashEquivalents: balance?.cashAndCashEquivalents,
        netDebt:                balance?.netDebt,
      })
    })
  )

  const peers = peerResults
    .filter(r => r.status === 'fulfilled' && r.value != null)
    .map(r => r.value)

  logger.info(`getPeers: assembled ${peers.length} peers for ${ticker}`)
  writeCache(key, peers, TTL.STATEMENTS)
  return peers
}

/**
 * Get analyst price targets from FMP /price-target endpoint.
 * Returns up to 5 most recent targets, normalized to a consistent shape.
 * Returns [] gracefully if the endpoint is unavailable or plan-restricted.
 */
export async function getAnalystTargets(ticker, force = false) {
  const key = `${ticker}-analyst-targets`
  if (!force) { const cached = readCache(key); if (cached) return cached }

  try {
    const data = await fetchFromFMP(ticker, 'price-target', { limit: 5 })
    const raw = Array.isArray(data) ? data : []
    const normalized = raw.map(t => ({
      analystName:    t.analystName    ?? null,
      analystCompany: t.analystCompany ?? null,
      targetPrice:    t.priceTarget    ?? null,
      rating:         t.rating         ?? null,
      publishedDate:  t.publishedDate  ?? null,
    }))
    writeCache(key, normalized, TTL.STATEMENTS)
    return normalized
  } catch (err) {
    logger.warn(`getAnalystTargets: could not fetch for ${ticker}: ${err.message}`)
    return []
  }
}
