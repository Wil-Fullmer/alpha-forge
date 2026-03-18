/**
 * dataAssembler.js
 *
 * Coordinates all data fetching for the analysis pipeline.
 * Checks pre-collected JSON first, then delegates to the cache/provider layer.
 * Returns a fully normalized data bundle ready for analysis calculations.
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
} from './financialData.js'
import {
  normalizeProfile,
  normalizeIncomeStatement,
  normalizeBalanceSheet,
  normalizeCashFlow,
} from './normalizers/fmp.js'

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
 * Assemble normalized data for a ticker from pre-collected, cache, or provider.
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

  // Skip statement fetches if pre-collected; always fetch historical prices and quote
  const fetches = await Promise.allSettled([
    collected ? Promise.resolve(null) : getCompanyProfile(ticker, force),
    collected ? Promise.resolve(null) : getIncomeStatement(ticker, force),
    collected ? Promise.resolve(null) : getBalanceSheet(ticker, force),
    collected ? Promise.resolve(null) : getCashFlowStatement(ticker, force),
    getHistoricalPrices(ticker, 252, force),
    getQuote(ticker, force),
  ])

  if (!collected) {
    const [pFetch, iFetch, bFetch, cFetch] = fetches
    profile          = pFetch.status === 'fulfilled' ? (pFetch.value?.[0] ?? null) : null
    incomeStatements = iFetch.status === 'fulfilled' ? (iFetch.value ?? []) : []
    balanceSheets    = bFetch.status === 'fulfilled' ? (bFetch.value ?? []) : []
    cashFlows        = cFetch.status === 'fulfilled' ? (cFetch.value ?? []) : []
    if (iFetch.status === 'rejected') flags.push(`Income statement fetch failed: ${iFetch.reason?.message}`)
    if (bFetch.status === 'rejected') flags.push(`Balance sheet fetch failed: ${bFetch.reason?.message}`)
    if (cFetch.status === 'rejected') flags.push(`Cash flow fetch failed: ${cFetch.reason?.message}`)
  }

  const historicalPrices = fetches[4].status === 'fulfilled' ? fetches[4].value : []
  const quote            = fetches[5].status === 'fulfilled' ? fetches[5].value : null
  if (fetches[4].status === 'rejected') flags.push(`Historical prices fetch failed: ${fetches[4].reason?.message}`)
  if (fetches[5].status === 'rejected') flags.push(`Quote fetch failed: ${fetches[5].reason?.message}`)

  return {
    profile,
    incomeStatements,
    balanceSheets,
    cashFlows,
    historicalPrices,
    quote,
    flags,
    metadata: {
      dataSource:          collected ? 'pre_collected' : 'fmp_direct',
      historicalPriceDays: historicalPrices.length,
    },
  }
}
