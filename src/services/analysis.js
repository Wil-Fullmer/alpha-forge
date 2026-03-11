import logger from '../utils/logger.js'

/**
 * Calculate Sharpe Ratio from returns data
 * @param {number[]} returns - Array of returns
 * @param {number} riskFreeRate - Risk-free rate (default 0.02)
 * @returns {number} Sharpe ratio
 */
export function calculateSharpeRatio(returns, riskFreeRate = 0.02) {
  if (!returns || returns.length === 0) {
    throw new Error('No returns data provided')
  }

  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)

  if (stdDev === 0) {
    throw new Error('Standard deviation is zero (no variation in returns)')
  }

  const sharpeRatio = (meanReturn - riskFreeRate) / stdDev
  logger.info(`Sharpe ratio calculated: ${sharpeRatio.toFixed(4)}`)
  return sharpeRatio
}

/**
 * Calculate ROE (Return on Equity)
 */
export function calculateROE(netIncome, shareholderEquity) {
  if (!netIncome || !shareholderEquity) {
    throw new Error('Missing data for ROE calculation')
  }
  return netIncome / shareholderEquity
}

/**
 * Calculate debt-to-equity ratio
 */
export function calculateDebtToEquity(totalDebt, shareholderEquity) {
  if (!totalDebt || !shareholderEquity) {
    throw new Error('Missing data for debt-to-equity calculation')
  }
  return totalDebt / shareholderEquity
}
