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
