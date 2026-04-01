/**
 * fmp.js
 *
 * Normalizes raw FMP API responses into stable internal schemas.
 * Applied before writing to cache — cache stores normalized data.
 *
 * All normalizers are idempotent: safe to apply on already-normalized data.
 * Field selection is explicit: only fields the pipeline consumes are kept.
 */

// Coerce to number; returns null for missing/blank/non-numeric values
const toNum = v =>
  (v == null || v === '' || v === 'None') ? null
  : typeof v === 'number' ? v
  : parseFloat(v)

/**
 * Normalize FMP /profile response.
 * @param {Array|Object} raw - FMP profile array or single object
 * @returns {Array} Normalized profile array
 */
export function normalizeProfile(raw) {
  return (Array.isArray(raw) ? raw : (raw ? [raw] : [])).map(d => ({
    symbol:            d.symbol ?? null,
    companyName:       d.companyName ?? null,
    description:       d.description ?? null,
    exchange:          d.exchange ?? d.exchangeFullName ?? null,
    currency:          d.currency ?? null,
    country:           d.country ?? null,
    sector:            d.sector ?? null,
    industry:          d.industry ?? null,
    marketCap:         toNum(d.marketCap ?? d.mktCap),
    beta:              toNum(d.beta),
    eps:               toNum(d.eps),
    pe:                toNum(d.pe),
    sharesOutstanding: toNum(d.sharesOutstanding),
    fullTimeEmployees: toNum(d.fullTimeEmployees),
    price:             toNum(d.price),
  }))
}

/**
 * Normalize FMP /income-statement response.
 * @param {Array} raw - FMP income statement array (newest first)
 * @returns {Array} Normalized income statement array
 */
export function normalizeIncomeStatement(raw) {
  return (Array.isArray(raw) ? raw : []).map(d => ({
    date:              d.date ?? null,
    revenue:           toNum(d.revenue),
    netIncome:         toNum(d.netIncome),
    grossProfit:       toNum(d.grossProfit),
    operatingIncome:   toNum(d.operatingIncome),
    ebitda:            toNum(d.ebitda),
    eps:               toNum(d.eps),
    costOfRevenue:     toNum(d.costOfRevenue),
    researchAndDev:    toNum(d.researchAndDevelopmentExpenses),
    sgaExpense:        toNum(d.sellingGeneralAndAdministrativeExpenses),
    depreciationAmort: toNum(d.depreciationAndAmortization),
    interestIncome:    toNum(d.interestIncome),
    interestExpense:   toNum(d.interestExpense),
    netInterestIncome: toNum(d.netInterestIncome),
    otherIncomeExpense: toNum(d.totalOtherIncomeExpensesNet),
    incomeBeforeTax:   toNum(d.incomeBeforeTax),
    taxExpense:        toNum(d.incomeTaxExpense),
  }))
}

/**
 * Normalize FMP /balance-sheet-statement response.
 * @param {Array} raw - FMP balance sheet array (newest first)
 * @returns {Array} Normalized balance sheet array
 */
export function normalizeBalanceSheet(raw) {
  return (Array.isArray(raw) ? raw : []).map(d => ({
    date:                    d.date ?? null,
    totalAssets:             toNum(d.totalAssets),
    totalLiabilities:        toNum(d.totalLiabilities),
    totalStockholdersEquity: toNum(d.totalStockholdersEquity),
    totalDebt:               toNum(d.totalDebt),
    cashAndCashEquivalents:  toNum(d.cashAndCashEquivalents),
    totalCurrentAssets:      toNum(d.totalCurrentAssets),
    totalCurrentLiabilities: toNum(d.totalCurrentLiabilities),
    netDebt:                 toNum(d.netDebt),
  }))
}

/**
 * Normalize FMP /cash-flow-statement response.
 * FMP capitalExpenditure is negative; freeCashFlow = operatingCashFlow + capitalExpenditure.
 * Falls back to calculating FCF from components if the field is absent.
 * @param {Array} raw - FMP cash flow array (newest first)
 * @returns {Array} Normalized cash flow array
 */
export function normalizeCashFlow(raw) {
  return (Array.isArray(raw) ? raw : []).map(d => {
    const operating = toNum(d.operatingCashFlow ?? d.netCashProvidedByOperatingActivities)
    const capex     = toNum(d.capitalExpenditure)
    // Prefer explicit freeCashFlow; compute from components if absent
    const fcf = d.freeCashFlow != null
      ? toNum(d.freeCashFlow)
      : (operating != null && capex != null ? operating + capex : null)
    return {
      date:               d.date ?? null,
      operatingCashFlow:  operating,
      capitalExpenditure: capex,
      freeCashFlow:       fcf,
      depreciationAmort:  toNum(d.depreciationAndAmortization),
      changeInWorkingCap: toNum(d.changeInWorkingCapital),
    }
  })
}

/**
 * Normalize a single assembled peer object (quote + income statement + balance sheet).
 * @param {Object} raw - Assembled peer data bundle
 * @returns {Object} Normalized peer object with all fields needed by RelativeValuationTab
 */
export function normalizePeer(raw) {
  if (!raw) return null
  const toN = v => (v == null || v === '' || v === 'None') ? null : typeof v === 'number' ? v : parseFloat(v)
  const opInc = toN(raw.operatingIncome)
  const da    = toN(raw.depreciationAmort)
  const debt  = toN(raw.totalDebt)
  const cash  = toN(raw.cashAndCashEquivalents)
  return {
    ticker:                 raw.ticker ?? raw.symbol ?? null,
    name:                   raw.name ?? raw.companyName ?? null,
    sharePrice:             toN(raw.sharePrice ?? raw.price),
    dilutedShares:          toN(raw.dilutedShares ?? raw.sharesOutstanding),
    equityValue:            toN(raw.equityValue ?? raw.marketCap),
    revenue:                toN(raw.revenue),
    ebitda:                 toN(raw.ebitda) ?? (opInc != null && da != null ? opInc + da : null),
    operatingIncome:        opInc,
    depreciationAmort:      da,
    netIncome:              toN(raw.netIncome),
    totalDebt:              debt,
    cashAndCashEquivalents: cash,
    netDebt:                toN(raw.netDebt) ?? (debt != null && cash != null ? debt - cash : null),
  }
}

/**
 * Normalize FMP /quote response (single object, already extracted from array).
 * Note: FMP /quote does not include eps, pe, or sharesOutstanding —
 * those fields will be null and sourced elsewhere in the pipeline.
 * @param {Object} raw - Single quote object
 * @returns {Object|null} Normalized quote object
 */
export function normalizeQuote(raw) {
  if (!raw) return null
  return {
    symbol:            raw.symbol ?? null,
    price:             toNum(raw.price),
    volume:            toNum(raw.volume),
    change:            toNum(raw.change),
    changesPercentage: toNum(raw.changesPercentage ?? raw.changePercentage),
    eps:               toNum(raw.eps),
    pe:                toNum(raw.pe),
    sharesOutstanding: toNum(raw.sharesOutstanding),
    marketCap:         toNum(raw.marketCap),
  }
}
