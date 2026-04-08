/**
 * analysisRunner.js
 *
 * Orchestrates the full financial analysis pipeline for a given ticker.
 * Reads pre-collected data from data/{TICKER}-collected.json if available,
 * otherwise fetches directly from FMP.
 *
 * Outputs:
 *   - data/{TICKER}-analysis.json  (structured JSON for downstream agents)
 *   - Console summary
 *   - Log entries via logger
 *
 * Usage:
 *   node src/services/analysisRunner.js <TICKER>
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'
import { assembleData } from './dataAssembler.js'
import { getAnalystTargets } from './financialData.js'
import {
  calculateSharpeRatio,
  calculateROE,
  calculateDebtToEquity,
  calculatePE,
  calculateMovingAverage,
  calculateRSI,
  getMomentumSignal,
  calculateDCF,
  deriveGrowthRate
} from './analysis.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')

const DCF_DEFAULTS = {
  growthRate: 0.10,
  wacc: 0.10,
  terminalGrowthRate: 0.03,
  projectionYears: 5
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function safeRun(label, fn) {
  try {
    return { value: fn(), error: null }
  } catch (err) {
    logger.warn(`[${label}] ${err.message}`)
    return { value: null, error: err.message }
  }
}

function pct(decimal) {
  return `${(decimal * 100).toFixed(1)}%`
}

function usd(num) {
  return `$${num.toFixed(2)}`
}

function formatUpDownside(intrinsic, current) {
  if (intrinsic == null || current == null || current === 0) return null
  const delta = (intrinsic - current) / current
  return `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`
}

function rsiLabel(rsi) {
  if (rsi == null) return ''
  if (rsi < 30) return '[oversold]'
  if (rsi > 70) return '[overbought]'
  return '[neutral]'
}

function printSummary(ticker, date, result) {
  const { coreMetrics, dcf, technicals } = result
  const line = '═'.repeat(44)

  console.log(`\n${line}`)
  console.log(`  FINANCIAL ANALYSIS — ${ticker}`)
  console.log(`  ${date}`)
  console.log(line)

  console.log('\nCORE METRICS')
  console.log(`  Sharpe Ratio:      ${coreMetrics.sharpeRatio != null ? coreMetrics.sharpeRatio.toFixed(2) : 'N/A'}`)
  console.log(`  ROE:               ${coreMetrics.roe != null ? pct(coreMetrics.roe) : 'N/A'}`)
  console.log(`  Debt/Equity:       ${coreMetrics.debtToEquity != null ? coreMetrics.debtToEquity.toFixed(2) : 'N/A'}`)
  console.log(`  P/E Ratio:         ${coreMetrics.peRatio != null ? `${coreMetrics.peRatio.toFixed(1)}x` : 'N/A'}`)
  console.log(`  EPS:               ${coreMetrics.eps != null ? usd(coreMetrics.eps) : 'N/A'}`)

  console.log('\nDCF VALUATION')
  console.log(`  Intrinsic Value:   ${dcf.intrinsicValuePerShare != null ? usd(dcf.intrinsicValuePerShare) : 'N/A'}`)
  console.log(`  Current Price:     ${dcf.currentPrice != null ? usd(dcf.currentPrice) : 'N/A'}`)
  console.log(`  Up/Downside:       ${dcf.upDownside ?? 'N/A'}`)
  console.log(`  Growth Rate:       ${pct(dcf.assumedGrowthRate)} (source: ${dcf.growthRateSource})`)
  console.log(`  WACC:              ${pct(dcf.assumedWACC)}`)
  console.log(`  Terminal Growth:   ${pct(dcf.terminalGrowthRate)}`)

  console.log('\nTECHNICAL INDICATORS')
  console.log(`  50-Day MA:         ${technicals.ma50 != null ? usd(technicals.ma50) : 'N/A'}  (${technicals.priceVsMa50Pct ?? 'N/A'} vs current)`)
  console.log(`  200-Day MA:        ${technicals.ma200 != null ? usd(technicals.ma200) : 'N/A'}  (${technicals.priceVsMa200Pct ?? 'N/A'} vs current)`)
  console.log(`  RSI (14):          ${technicals.rsi14 != null ? technicals.rsi14.toFixed(1) : 'N/A'}  ${rsiLabel(technicals.rsi14)}`)
  console.log(`  Signal:            ${technicals.momentumSignal?.toUpperCase() ?? 'N/A'}`)

  console.log(`\n${line}`)
  console.log(`Output: data/${ticker}-analysis.json`)
  console.log(line + '\n')
}

// ── Derived ratio helpers ─────────────────────────────────────────────────────

function computeMedian(arr) {
  const sorted = arr.filter(v => v != null && isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function computeDerivedRatios(incomeStatements, balanceSheets, cashFlows) {
  const stmts = incomeStatements.slice(0, 3)
  const bss   = balanceSheets.slice(0, 3)
  const cfs   = cashFlows.slice(0, 3)
  const sd = (a, b) => (a != null && b != null && b !== 0) ? a / b : null

  return {
    grossMarginPct: computeMedian(stmts.map(s => sd(s.grossProfit,       s.revenue))),
    rdPct:          computeMedian(stmts.map(s => sd(s.researchAndDev,    s.revenue))),
    sgaPct:         computeMedian(stmts.map(s => sd(s.sgaExpense,        s.revenue))),
    daPct:          computeMedian(stmts.map(s => sd(s.depreciationAmort, s.revenue))),
    capexPct:       computeMedian(cfs.map((cf, i) =>
                      sd(Math.abs(cf.capitalExpenditure ?? 0), stmts[i]?.revenue))),
    nwcPct:         computeMedian(bss.map((bs, i) => {
                      const nwc = (bs.totalCurrentAssets ?? 0) - (bs.totalCurrentLiabilities ?? 0)
                      return sd(nwc, stmts[i]?.revenue)
                    })),
    taxRate:        computeMedian(stmts.map(s => {
                      if (!s.incomeBeforeTax || s.taxExpense == null) return null
                      const r = s.taxExpense / s.incomeBeforeTax
                      return (r >= 0 && r <= 0.5) ? r : null
                    })),
  }
}

function estimateWACC(profile, balanceSheets, incomeStatements, currentPrice, sharesOutstanding, derivedRatios) {
  const rf = 0.0438, mrp = 0.05
  const beta = profile?.beta ?? 1.0
  const costOfEquity = rf + beta * mrp

  const latestBS = balanceSheets[0] ?? {}
  const latestIS = incomeStatements[0] ?? {}
  const totalDebt = latestBS.totalDebt ?? 0

  let costOfDebt = 0.045
  if (latestIS.netInterestIncome != null && totalDebt > 0) {
    const implied = Math.abs(latestIS.netInterestIncome) / totalDebt
    if (implied > 0) costOfDebt = Math.min(0.12, Math.max(0.02, implied))
  }

  const taxRate = derivedRatios?.taxRate ?? 0.21
  const mve = (sharesOutstanding && currentPrice) ? sharesOutstanding * currentPrice : null
  if (!mve) return { wacc: 0.09, source: 'default_no_market_cap', beta, costOfEquity, costOfDebt, taxRate }

  const totalV = totalDebt + mve
  const wd = totalV > 0 ? totalDebt / totalV : 0
  const wacc = Math.max(0.05, Math.min(0.20, (1 - wd) * costOfEquity + wd * costOfDebt * (1 - taxRate)))
  return { wacc, source: 'derived_capm', beta, costOfEquity, costOfDebt, taxRate }
}

/**
 * Run full financial analysis for a ticker
 * @param {string} ticker
 * @param {object} [options]
 * @param {boolean} [options.force=false] - Bypass cache for all fetches
 * @returns {Promise<object>} Analysis result JSON
 */
export async function runFullAnalysis(ticker, { force = false } = {}) {
  ticker = ticker.toUpperCase()
  const date = new Date().toISOString().split('T')[0]

  logger.info(`Starting full analysis for ${ticker}${force ? ' (force refresh)' : ''}`)

  // ── 1. Assemble normalized data ────────────────────────────────────────────
  const [bundle, analystTargets] = await Promise.all([
    assembleData(ticker, { force }),
    getAnalystTargets(ticker, force),
  ])
  const { profile, incomeStatements, balanceSheets, cashFlows, historicalPrices, quote, peers: rawPeers } = bundle
  const flags = [...bundle.flags]  // copy so calculation flags can be appended
  const metadata = bundle.metadata

  const currentPrice = quote?.price ?? profile?.price ?? null
  if (quote == null && profile?.price != null) flags.push('Current price sourced from profile (quote unavailable)')

  // ── 2. Core Metrics ────────────────────────────────────────────────────────
  const latestIncome = incomeStatements[0] ?? {}
  const latestBalance = balanceSheets[0] ?? {}
  const netIncome = latestIncome.netIncome ?? null
  const shareholderEquity = latestBalance.totalStockholdersEquity ?? null
  const totalDebt = latestBalance.totalDebt ?? null
  const eps = quote?.eps ?? latestIncome.eps ?? null

  const closingPrices = historicalPrices.map(d => d.close)
  const dailyReturns = closingPrices.slice(1).map((p, i) => (p - closingPrices[i]) / closingPrices[i])

  const sharpe = safeRun('Sharpe', () => calculateSharpeRatio(dailyReturns))
  const roe = safeRun('ROE', () => calculateROE(netIncome, shareholderEquity))
  const de = safeRun('D/E', () => calculateDebtToEquity(totalDebt, shareholderEquity))
  const pe = safeRun('P/E', () => calculatePE(currentPrice, eps))

  if (sharpe.error) flags.push(`Sharpe ratio: ${sharpe.error}`)
  if (roe.error) flags.push(`ROE: ${roe.error}`)
  if (de.error) flags.push(`D/E: ${de.error}`)
  if (pe.error) flags.push(`P/E: ${pe.error}`)

  const coreMetrics = {
    sharpeRatio: sharpe.value != null ? parseFloat(sharpe.value.toFixed(4)) : null,
    roe: roe.value != null ? parseFloat(roe.value.toFixed(4)) : null,
    debtToEquity: de.value != null ? parseFloat(de.value.toFixed(4)) : null,
    peRatio: pe.value != null ? parseFloat(pe.value.toFixed(2)) : null,
    eps: eps != null ? parseFloat(eps.toFixed(2)) : null
  }

  // ── 3. DCF Valuation ───────────────────────────────────────────────────────
  const latestCF = cashFlows[0] ?? {}
  const freeCashFlow = latestCF.freeCashFlow ?? null
  const sharesOutstanding = quote?.sharesOutstanding ?? profile?.sharesOutstanding
    ?? (quote?.marketCap && currentPrice ? Math.round(quote.marketCap / currentPrice) : null)
  const netDebt = (totalDebt ?? 0) - (latestBalance.cashAndCashEquivalents ?? 0)
  if (totalDebt == null) flags.push('Net debt: totalDebt missing from balance sheet, assumed 0')
  if (latestBalance.cashAndCashEquivalents == null) flags.push('Net debt: cash missing from balance sheet, assumed 0')

  const { growthRate, source: growthRateSource } = deriveGrowthRate(incomeStatements)

  // ── 3a. Derived ratios & WACC estimate ────────────────────────────────────
  const derivedRatios = {
    ...computeDerivedRatios(incomeStatements, balanceSheets, cashFlows),
    revenueCAGR:      growthRate,
    netDebt,
    sharesOutstanding,
    currentPrice,
  }

  const waccEst = estimateWACC(profile, balanceSheets, incomeStatements, currentPrice, sharesOutstanding, derivedRatios)

  let dcfResult = { intrinsicValuePerShare: null, projectedFCFs: [], terminalValue: null, enterpriseValue: null }
  if (freeCashFlow !== null && freeCashFlow < 0) {
    flags.push(`DCF skipped: negative free cash flow ($${(freeCashFlow / 1e9).toFixed(2)}B) — model requires positive FCF`)
  } else if (freeCashFlow && sharesOutstanding) {
    const r = safeRun('DCF', () => calculateDCF({
      freeCashFlow,
      growthRate,
      wacc: waccEst.wacc,
      terminalGrowthRate: DCF_DEFAULTS.terminalGrowthRate,
      sharesOutstanding,
      netDebt,
      projectionYears: DCF_DEFAULTS.projectionYears
    }))
    if (r.value) dcfResult = r.value
    else flags.push(`DCF: ${r.error}`)
  } else {
    flags.push('DCF skipped: missing freeCashFlow or sharesOutstanding')
  }

  const upDownside = formatUpDownside(dcfResult.intrinsicValuePerShare, currentPrice)

  const dcf = {
    intrinsicValuePerShare: dcfResult.intrinsicValuePerShare != null
      ? parseFloat(dcfResult.intrinsicValuePerShare.toFixed(2)) : null,
    currentPrice,
    upDownside,
    assumedGrowthRate: growthRate,
    assumedWACC: parseFloat(waccEst.wacc.toFixed(4)),
    waccSource:  waccEst.source,
    waccDetails: {
      beta:         parseFloat(waccEst.beta.toFixed(4)),
      costOfEquity: parseFloat(waccEst.costOfEquity.toFixed(4)),
      costOfDebt:   parseFloat(waccEst.costOfDebt.toFixed(4)),
      taxRate:      parseFloat(waccEst.taxRate.toFixed(4)),
    },
    terminalGrowthRate: DCF_DEFAULTS.terminalGrowthRate,
    growthRateSource,
    projectedFreeCashFlows: dcfResult.projectedFCFs.map(v => Math.round(v)),
    flags: []
  }

  // ── 4. Technical Indicators ────────────────────────────────────────────────
  const ma50Result = safeRun('MA50', () => calculateMovingAverage(closingPrices, 50))
  const ma200Result = safeRun('MA200', () => calculateMovingAverage(closingPrices, 200))
  const rsiResult = safeRun('RSI14', () => calculateRSI(closingPrices, 14))

  if (ma50Result.error) flags.push(`MA50: ${ma50Result.error}`)
  if (ma200Result.error) flags.push(`MA200: ${ma200Result.error}`)
  if (rsiResult.error) flags.push(`RSI14: ${rsiResult.error}`)

  const ma50 = ma50Result.value
  const ma200 = ma200Result.value
  const rsi14 = rsiResult.value != null ? parseFloat(rsiResult.value.toFixed(2)) : null
  const momentumSignal = (currentPrice && ma50 && ma200)
    ? getMomentumSignal(currentPrice, ma50, ma200) : null

  function pctDiff(base, current) {
    if (base == null || current == null || base === 0) return null
    const d = (current - base) / base
    return `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`
  }

  const technicals = {
    currentPrice,
    ma50: ma50 != null ? parseFloat(ma50.toFixed(2)) : null,
    ma200: ma200 != null ? parseFloat(ma200.toFixed(2)) : null,
    rsi14,
    momentumSignal,
    priceVsMa50Pct: pctDiff(ma50, currentPrice),
    priceVsMa200Pct: pctDiff(ma200, currentPrice)
  }

  // ── 5. Assemble result ─────────────────────────────────────────────────────
  function enrichPeersWithMultiples(peers) {
    const safeDiv = (a, b) => (a != null && b != null && b !== 0) ? a / b : null
    return (peers ?? []).map(p => {
      const ev = p.equityValue != null && p.netDebt != null
        ? p.equityValue + p.netDebt
        : null
      return {
        ...p,
        enterpriseValue: ev,
        evRevenue: safeDiv(ev, p.revenue),
        evEbitda:  safeDiv(ev, p.ebitda),
        pe:        safeDiv(p.equityValue, p.netIncome),
      }
    })
  }

  const result = {
    ticker,
    derivedRatios,
    analysisDate: date,
    coreMetrics,
    dcf,
    technicals,
    historicalRevenue: incomeStatements
      .slice(0, 5)
      .map(s => ({ date: s.date, revenue: s.revenue })),
    historicalFinancials: {
      incomeStatements: incomeStatements.slice(0, 5).map(s => ({
        date:               s.date,
        revenue:            s.revenue,
        costOfRevenue:      s.costOfRevenue,
        grossProfit:        s.grossProfit,
        researchAndDev:     s.researchAndDev,
        sgaExpense:         s.sgaExpense,
        depreciationAmort:  s.depreciationAmort,
        operatingIncome:    s.operatingIncome,
        ebitda:             s.ebitda ?? (
          s.operatingIncome != null && s.depreciationAmort != null
            ? s.operatingIncome + s.depreciationAmort
            : null
        ),
        netInterestIncome:  s.netInterestIncome ?? (
          (s.interestIncome != null && s.interestExpense != null)
            ? s.interestIncome - s.interestExpense : null
        ),
        otherIncomeExpense: s.otherIncomeExpense,
        incomeBeforeTax:    s.incomeBeforeTax,
        taxExpense:         s.taxExpense,
        netIncome:          s.netIncome,
      })),
      balanceSheets: balanceSheets.slice(0, 5).map(s => ({
        date:                       s.date,
        totalCurrentAssets:         s.totalCurrentAssets,
        totalCurrentLiabilities:    s.totalCurrentLiabilities,
        totalDebt:                  s.totalDebt,
        cashAndCashEquivalents:     s.cashAndCashEquivalents,
        netDebt:                    s.netDebt,
        totalStockholdersEquity:    s.totalStockholdersEquity,
      })),
      cashFlows: cashFlows.slice(0, 5).map(s => ({
        date:               s.date,
        capitalExpenditure: s.capitalExpenditure,
        changeInWorkingCap: s.changeInWorkingCap,
      })),
    },
    historicalPrices: historicalPrices.slice(0, 252).map(d => ({ date: d.date, close: d.close })),
    lastFilingDate: incomeStatements[0]?.date ?? null,
    peers: enrichPeersWithMultiples(rawPeers),
    analystTargets,
    flags,
    metadata
  }

  // ── 6. Write output ────────────────────────────────────────────────────────
  ensureDataDir()
  const outputPath = resolve(DATA_DIR, `${ticker}-analysis.json`)
  writeFileSync(outputPath, JSON.stringify(result, null, 2))
  logger.info(`Analysis written to ${outputPath}`)

  printSummary(ticker, date, result)

  return result
}

// ── CLI entry point ──────────────────────────────────────────────────────────
if (process.argv[1] && process.argv[1].endsWith('analysisRunner.js')) {
  const ticker = process.argv[2]
  if (!ticker) {
    console.error('Usage: node src/services/analysisRunner.js <TICKER>')
    process.exit(1)
  }

  runFullAnalysis(ticker).catch(err => {
    logger.error(`Analysis failed: ${err.message}`)
    process.exit(1)
  })
}
