import axios from 'axios'
import logger from '../utils/logger.js'

const BASE_URL = 'https://financialmodelingprep.com/api/v3'
const API_KEY = process.env.FMP_API_KEY

if (!API_KEY) {
  logger.error('FMP_API_KEY not found in environment variables')
} else {
  logger.info(`API key loaded (length: ${API_KEY.length})`)
}

/**
 * Fetch financial data from FMP API
 * @param {string} ticker - Stock ticker symbol
 * @param {string} endpoint - API endpoint (e.g., 'income-statement')
 * @returns {Promise<Object>} Financial data
 */
export async function fetchFromFMP(ticker, endpoint) {
  try {
    const url = `${BASE_URL}/${endpoint}/${ticker}`
    const response = await axios.get(url, {
      params: { apikey: API_KEY }
    })

    logger.info(`Fetched data for ${ticker} from ${endpoint}`)
    return response.data
  } catch (error) {
    logger.error(`Error fetching ${ticker} data: ${error.message}`)
    throw error
  }
}

/**
 * Get company profile
 */
export async function getCompanyProfile(ticker) {
  return fetchFromFMP(ticker, 'profile')
}

/**
 * Get income statement
 */
export async function getIncomeStatement(ticker) {
  return fetchFromFMP(ticker, 'income-statement')
}

/**
 * Get balance sheet
 */
export async function getBalanceSheet(ticker) {
  return fetchFromFMP(ticker, 'balance-sheet-statement')
}

/**
 * Get cash flow statement
 */
export async function getCashFlowStatement(ticker) {
  return fetchFromFMP(ticker, 'cash-flow-statement')
}

/**
 * Get historical daily prices
 * @param {string} ticker
 * @param {number} [days=252] - Number of trading days of history to request
 * @returns {Promise<{ date: string, close: number }[]>} Sorted oldest → newest
 */
export async function getHistoricalPrices(ticker, days = 252) {
  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - days * 1.5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  try {
    const url = `${BASE_URL}/historical-price-full/${ticker}`
    const response = await axios.get(url, {
      params: { apikey: API_KEY, from, to }
    })

    const historical = response.data?.historical ?? []
    // FMP returns newest first; reverse to chronological order, take last `days`
    const sorted = historical.reverse().slice(-days)
    logger.info(`Fetched ${sorted.length} historical prices for ${ticker}`)
    return sorted.map(d => ({ date: d.date, close: d.close }))
  } catch (error) {
    logger.error(`Error fetching historical prices for ${ticker}: ${error.message}`)
    throw error
  }
}

/**
 * Get key metrics (EPS, P/E, WACC, shares outstanding, etc.)
 * @param {string} ticker
 * @returns {Promise<object[]>} FMP key metrics array, newest first
 */
export async function getKeyMetrics(ticker) {
  return fetchFromFMP(ticker, 'key-metrics')
}

/**
 * Get current quote (real-time price, EPS, P/E)
 * @param {string} ticker
 * @returns {Promise<object>} Quote object
 */
export async function getQuote(ticker) {
  const data = await fetchFromFMP(ticker, 'quote')
  return Array.isArray(data) ? data[0] : data
}
