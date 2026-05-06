/**
 * finnhub.js
 *
 * Finnhub free API adapter for analyst consensus data.
 * Provides price targets (mean/high/low) and buy/hold/sell recommendation trends.
 *
 * Env var: FINNHUB_API_KEY — free key from finnhub.io (no credit card needed)
 * Rate limit: 60 calls/min on free tier
 */

import axios from 'axios'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'

const BASE_URL = 'https://finnhub.io/api/v1'
const CACHE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/cache')
const TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export const FINNHUB_KEY = process.env.FINNHUB_API_KEY ?? null

if (FINNHUB_KEY) {
  logger.info('Finnhub API key loaded')
} else {
  logger.info('FINNHUB_API_KEY not set — analyst consensus will be unavailable')
}

function readCache(key) {
  const file = resolve(CACHE_DIR, `${key}.json`)
  if (!existsSync(file)) return null
  const { cachedAt, ttlMs, data } = JSON.parse(readFileSync(file, 'utf8'))
  if (Date.now() - new Date(cachedAt).getTime() > ttlMs) return null
  return data
}

function writeCache(key, data) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(resolve(CACHE_DIR, `${key}.json`), JSON.stringify({ cachedAt: new Date().toISOString(), ttlMs: TTL_MS, data }))
}

async function get(path, params = {}) {
  const res = await axios.get(`${BASE_URL}${path}`, {
    params: { ...params, token: FINNHUB_KEY },
    timeout: 8000,
  })
  return res.data
}

/**
 * Get key balance sheet metrics from Finnhub's /stock/metric endpoint.
 * Used as a fallback when SEC EDGAR XBRL lacks balance sheet data (sparse filers like MXL).
 *
 * Returns { netDebt, totalDebt, epsAnnual, beta } — all nullable.
 * netDebt derived from enterpriseValue − marketCapitalization (both in millions from Finnhub).
 * totalDebt estimated from D/E ratio × book equity (approximate — use only when no better source).
 */
export async function getFinnhubBasicFinancials(ticker, force = false) {
  if (!FINNHUB_KEY) return null
  const key = `${ticker}-basic-financials-fh`
  if (!force) { const cached = readCache(key); if (cached) return cached }

  try {
    const raw = await get('/stock/metric', { symbol: ticker, metric: 'all' })
    const m = raw?.metric ?? {}

    const mktCapM  = m.marketCapitalization ?? null
    const evM      = m.enterpriseValue ?? null
    const deRatio  = m['totalDebt/totalEquityAnnual'] ?? null
    const bvps     = m.bookValuePerShareAnnual ?? null

    // netDebt = EV − market cap (both in millions → convert to dollars)
    const netDebt = evM != null && mktCapM != null ? (evM - mktCapM) * 1e6 : null
    // totalDebt approximation: D/E × book equity per share × shares (shares not known here;
    // return ratio + bvps so analysisRunner can compute with sharesOutstanding in hand)
    const deRatioAndBvps = deRatio != null && bvps != null ? { deRatio, bvps } : null

    const result = {
      netDebt,
      deRatioAndBvps,
      epsAnnual:  m.epsAnnual ?? null,
      beta:       m.beta ?? null,
      marketCap:  mktCapM != null ? mktCapM * 1e6 : null,
    }
    writeCache(key, result)
    logger.info(`[Finnhub] Basic financials for ${ticker}: netDebt=${netDebt != null ? '$'+(netDebt/1e6).toFixed(0)+'M' : 'N/A'}`)
    return result
  } catch (err) {
    logger.warn(`[Finnhub] getFinnhubBasicFinancials failed for ${ticker}: ${err?.message}`)
    return null
  }
}

/**
 * Get analyst consensus for a ticker.
 * Combines price target (mean/high/low) with current recommendation trend (buy/hold/sell).
 *
 * Returns null if FINNHUB_API_KEY is not set or all calls fail.
 */
export async function getAnalystConsensus(ticker, force = false) {
  if (!FINNHUB_KEY) return null

  const key = `${ticker}-analyst-consensus-fh`
  if (!force) { const cached = readCache(key); if (cached) return cached }

  try {
    // price-target endpoint requires paid plan — recommendation only on free tier
    const raw = await get('/stock/recommendation', { symbol: ticker })
    const trends = Array.isArray(raw) ? raw : []

    // Most recent period
    const trend = trends.sort((a, b) => (b.period ?? '').localeCompare(a.period ?? ''))[0] ?? null

    const totalBuy  = (trend?.strongBuy ?? 0) + (trend?.buy ?? 0)
    const totalHold = trend?.hold ?? 0
    const totalSell = (trend?.strongSell ?? 0) + (trend?.sell ?? 0)
    const totalAnalysts = totalBuy + totalHold + totalSell

    const result = {
      targetMean:     null,
      targetHigh:     null,
      targetLow:      null,
      targetMedian:   null,
      buy:            totalBuy,
      hold:           totalHold,
      sell:           totalSell,
      totalAnalysts:  totalAnalysts || null,
      period:         trend?.period ?? null,
    }

    writeCache(key, result)
    logger.info(`Finnhub recommendation fetched for ${ticker}: ${totalBuy} buy, ${totalHold} hold, ${totalSell} sell`)
    return result
  } catch (err) {
    logger.warn(`getAnalystConsensus: Finnhub failed for ${ticker}: ${err.message}`)
    return null
  }
}
