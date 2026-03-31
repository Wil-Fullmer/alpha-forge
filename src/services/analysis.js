import logger from '../utils/logger.js'

/**
 * Calculate Sharpe Ratio from returns data
 * @param {number[]} returns - Array of returns
 * @param {number} annualRiskFreeRate - Annual risk-free rate (default 0.02); converted to daily internally
 * @returns {number} Sharpe ratio
 */
export function calculateSharpeRatio(returns, annualRiskFreeRate = 0.02) {
  if (!returns || returns.length === 0) {
    throw new Error('No returns data provided')
  }

  const TRADING_DAYS = 252
  const meanDailyReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanDailyReturn, 2), 0) / returns.length
  const dailyStdDev = Math.sqrt(variance)

  if (dailyStdDev === 0) {
    throw new Error('Standard deviation is zero (no variation in returns)')
  }

  // Annualise: (mean_daily − daily_rfr) / daily_std × √252
  const dailyRfr = annualRiskFreeRate / TRADING_DAYS
  const sharpeRatio = ((meanDailyReturn - dailyRfr) / dailyStdDev) * Math.sqrt(TRADING_DAYS)
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

/**
 * Calculate P/E ratio
 * @param {number} price - Current stock price
 * @param {number} eps - Earnings per share (TTM)
 * @returns {number} P/E ratio
 */
export function calculatePE(price, eps) {
  if (!price || !eps || eps === 0) {
    throw new Error('Missing or zero EPS for P/E calculation')
  }
  return price / eps
}

/**
 * Calculate simple moving average
 * @param {number[]} prices - Array of closing prices (chronological)
 * @param {number} period - Lookback period in days
 * @returns {number} Moving average of the last `period` prices
 */
export function calculateMovingAverage(prices, period) {
  if (!prices || prices.length < period) {
    throw new Error(`Insufficient price data for ${period}-day MA (need ${period}, got ${prices?.length ?? 0})`)
  }
  const slice = prices.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

/**
 * Calculate 14-day RSI (Wilder's smoothed method)
 * @param {number[]} prices - Array of closing prices (chronological), needs at least 15 values
 * @param {number} period - RSI period (default 14)
 * @returns {number} RSI value between 0 and 100
 */
export function calculateRSI(prices, period = 14) {
  if (!prices || prices.length < period + 1) {
    throw new Error(`Insufficient price data for RSI-${period} (need ${period + 1}, got ${prices?.length ?? 0})`)
  }

  // Initial average gain/loss over first `period` changes
  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1]
    if (change >= 0) gains += change
    else losses += Math.abs(change)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  // Wilder's smoothing for remaining prices
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1]
    const gain = change >= 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

/**
 * Determine momentum signal from price vs moving averages
 * @param {number} price - Current price
 * @param {number} ma50 - 50-day MA
 * @param {number} ma200 - 200-day MA
 * @returns {'bullish'|'bearish'|'mixed'}
 */
export function getMomentumSignal(price, ma50, ma200) {
  if (price > ma50 && ma50 > ma200) return 'bullish'
  if (price < ma50 && ma50 < ma200) return 'bearish'
  return 'mixed'
}

/**
 * Run a DCF valuation
 * @param {object} params
 * @param {number} params.freeCashFlow - Most recent annual FCF
 * @param {number} params.growthRate - Annual growth rate (decimal, e.g. 0.10)
 * @param {number} params.wacc - Weighted average cost of capital (decimal)
 * @param {number} params.terminalGrowthRate - Terminal growth rate (decimal, e.g. 0.03)
 * @param {number} params.sharesOutstanding - Shares outstanding
 * @param {number} params.netDebt - Net debt (totalDebt - cash); can be negative
 * @param {number} [params.projectionYears=5] - Number of projection years
 * @returns {{ intrinsicValuePerShare: number, projectedFCFs: number[], terminalValue: number, enterpriseValue: number }}
 */
export function calculateDCF({
  freeCashFlow,
  growthRate,
  wacc,
  terminalGrowthRate,
  sharesOutstanding,
  netDebt,
  projectionYears = 5
}) {
  if (!freeCashFlow || !wacc || !sharesOutstanding) {
    throw new Error('Missing required DCF inputs')
  }
  if (wacc <= terminalGrowthRate) {
    throw new Error('WACC must be greater than terminal growth rate')
  }

  const projectedFCFs = []
  let fcf = freeCashFlow

  for (let year = 1; year <= projectionYears; year++) {
    fcf = fcf * (1 + growthRate)
    projectedFCFs.push(fcf)
  }

  // Discount projected FCFs
  const pvFCFs = projectedFCFs.reduce((sum, cashFlow, i) => {
    return sum + cashFlow / Math.pow(1 + wacc, i + 1)
  }, 0)

  // Terminal value (Gordon Growth Model on final year FCF)
  const terminalFCF = projectedFCFs[projectionYears - 1] * (1 + terminalGrowthRate)
  const terminalValue = terminalFCF / (wacc - terminalGrowthRate)
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc, projectionYears)

  const enterpriseValue = pvFCFs + pvTerminalValue
  const equityValue = enterpriseValue - (netDebt ?? 0)
  const intrinsicValuePerShare = equityValue / sharesOutstanding

  logger.info(`DCF intrinsic value: $${intrinsicValuePerShare.toFixed(2)}/share`)
  return { intrinsicValuePerShare, projectedFCFs, terminalValue, enterpriseValue }
}

/**
 * Derive historical revenue growth rate from income statement array (FMP format)
 * @param {object[]} incomeStatements - FMP income statements, newest first
 * @returns {{ growthRate: number, source: string }}
 */
export function deriveGrowthRate(incomeStatements) {
  const DEFAULT = { growthRate: 0.10, source: 'default' }

  if (!incomeStatements || incomeStatements.length < 2) return DEFAULT

  const revenues = incomeStatements
    .slice(0, Math.min(5, incomeStatements.length))
    .map(s => s.revenue)
    .filter(r => r && r > 0)

  if (revenues.length < 2) return DEFAULT

  // CAGR from oldest to newest in our slice
  const oldest = revenues[revenues.length - 1]
  const newest = revenues[0]
  const years = revenues.length - 1
  const cagr = Math.pow(newest / oldest, 1 / years) - 1

  // Sanity clamp: between -20% and +50%
  if (cagr < -0.20 || cagr > 0.50) {
    const clamped = Math.max(-0.20, Math.min(0.50, cagr))
    logger.warn(`Revenue CAGR ${(cagr * 100).toFixed(1)}% out of [-20%, +50%] bounds, clamped to ${(clamped * 100).toFixed(1)}%`)
    return { growthRate: parseFloat(clamped.toFixed(4)), source: 'fmp_historical_clamped' }
  }

  logger.info(`Derived revenue CAGR from FMP: ${(cagr * 100).toFixed(1)}%`)
  return { growthRate: parseFloat(cagr.toFixed(4)), source: 'fmp_historical' }
}
