/**
 * sec.js
 *
 * Normalizes SEC EDGAR XBRL annual rows into the same internal schemas
 * produced by normalizers/fmp.js. This allows dataAssembler.js to merge
 * SEC and FMP data field-by-field without special-casing.
 *
 * Input: annualRows from secEdgar.extractAnnualData()
 *   [ { fy, endDate, revenue, netIncome, totalAssets, ... }, ... ]
 *
 * Output: same schema as fmp.js normalizers — arrays sorted newest first.
 *
 * Sign conventions match FMP:
 *   - capitalExpenditure: negative (cash outflow)
 *   - All other values: positive as reported
 */

const toNum = v =>
  (v == null || v === '') ? null
  : typeof v === 'number'  ? v
  : parseFloat(v)

/**
 * Normalize SEC annual rows → income statement schema.
 * Matches output of normalizeIncomeStatement() in fmp.js.
 */
export function normalizeSecIncomeStatement(annualRows) {
  return (annualRows ?? []).map(row => ({
    date:              row.endDate ?? null,
    revenue:           toNum(row.revenue),
    netIncome:         toNum(row.netIncome),
    grossProfit:       toNum(row.grossProfit),
    operatingIncome:   toNum(row.operatingIncome),
    ebitda:            null,  // not directly available in XBRL; dataAssembler may compute
    eps:               null,  // not mapped; FMP provides this
    costOfRevenue:     toNum(row.costOfRevenue),
    researchAndDev:    toNum(row.researchAndDev),
    sgaExpense:        toNum(row.sgaExpense),
    depreciationAmort: toNum(row.depreciationAmort),
    interestIncome:    null,
    interestExpense:   null,
    netInterestIncome: null,
    otherIncomeExpense: null,
    incomeBeforeTax:   null,
    taxExpense:        null,
  }))
}

/**
 * Normalize SEC annual rows → balance sheet schema.
 * Matches output of normalizeBalanceSheet() in fmp.js.
 */
export function normalizeSecBalanceSheet(annualRows) {
  return (annualRows ?? []).map(row => {
    const longTerm  = toNum(row.longTermDebt)
    const shortTerm = toNum(row.shortTermDebt)
    const totalDebt = longTerm != null || shortTerm != null
      ? (longTerm ?? 0) + (shortTerm ?? 0)
      : null
    const cash    = toNum(row.cashAndCashEquivalents)
    const netDebt = totalDebt != null && cash != null ? totalDebt - cash : null

    return {
      date:                    row.endDate ?? null,
      totalAssets:             toNum(row.totalAssets),
      totalLiabilities:        toNum(row.totalLiabilities),
      totalStockholdersEquity: toNum(row.totalStockholdersEquity),
      totalDebt,
      cashAndCashEquivalents:  cash,
      totalCurrentAssets:      toNum(row.totalCurrentAssets),
      totalCurrentLiabilities: toNum(row.totalCurrentLiabilities),
      netDebt,
    }
  })
}

/**
 * Normalize SEC annual rows → cash flow schema.
 * Matches output of normalizeCashFlow() in fmp.js.
 *
 * IMPORTANT: EDGAR capitalExpenditure (PaymentsToAcquirePropertyPlantAndEquipment)
 * is a positive value (cash paid). FMP stores it as negative. We negate it here
 * so FCF = operatingCashFlow + capitalExpenditure works correctly downstream.
 */
export function normalizeSecCashFlow(annualRows) {
  return (annualRows ?? []).map(row => {
    const operating = toNum(row.operatingCashFlow)
    // Negate: EDGAR positive → FMP-convention negative
    const capex     = row.capitalExpenditure != null ? -(toNum(row.capitalExpenditure)) : null
    const fcf       = operating != null && capex != null ? operating + capex : null

    return {
      date:               row.endDate ?? null,
      operatingCashFlow:  operating,
      capitalExpenditure: capex,
      freeCashFlow:       fcf,
      depreciationAmort:  toNum(row.depreciationAmort),
      changeInWorkingCap: toNum(row.changeInWorkingCap),
    }
  })
}
