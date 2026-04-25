import React, { useEffect } from 'react';
import { formatLargeNumber } from '../utils/format.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import PctInput from '../components/PctInput.jsx';
import { useAssumptions } from '../contexts/AssumptionsContext.jsx';
import { useProjectedValues } from '../contexts/ProjectedValuesContext.jsx';
import { useRevenue } from '../contexts/RevenueContext.jsx';
import { ResponsiveContainer, ComposedChart, Line, Cell,
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

const PROJ_COUNT = 5;
const EM_DASH = '—';

// ── Formatting helpers ──────────────────────────────────────────────────────

function fmtPct(v, decimals = 1) {
  if (v == null || isNaN(v)) return EM_DASH;
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(decimals)}%`;
}

function fmtPctAbs(v, decimals = 1) {
  if (v == null || isNaN(v)) return EM_DASH;
  return `${(v * 100).toFixed(decimals)}%`;
}

function safeDiv(a, b) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function fiscalYear(dateStr) {
  if (!dateStr) return EM_DASH;
  return `FY${dateStr.slice(0, 4)}`;
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ProjectionsTab({ analysis }) {
  const ctx = useAssumptions();
  const { publishProjections } = useProjectedValues();
  const { revenueData } = useRevenue();

  const stmts = [...(analysis?.historicalFinancials?.incomeStatements ?? [])].reverse();
  const bss   = [...(analysis?.historicalFinancials?.balanceSheets ?? [])].reverse();
  const cfs   = [...(analysis?.historicalFinancials?.cashFlows ?? [])].reverse();
  const hasData = stmts.length > 0;

  if (!hasData) {
    return (
      <div className="tab-panel tab-panel--projections" id="tabpanel-projections" role="tabpanel">
        <div className="tab-shell">
          <p className="tab-shell__title">Projections</p>
          <p className="tab-shell__note">No financial data available for this ticker.</p>
        </div>
      </div>
    );
  }

  const projStartYear = new Date().getFullYear();
  const projYears = Array.from({ length: PROJ_COUNT }, (_, i) => `FY${projStartYear + i}E`);

  // ── Revenue: from RevenueContext with fallback ────────────────────────────
  const seedGrowthRate = analysis?.dcf?.assumedGrowthRate ?? 0.05;
  const baseRevenue = stmts.at(-1)?.revenue ?? null;
  const fallbackRevenue = Array.from({ length: PROJ_COUNT }, (_, i) =>
    baseRevenue != null ? baseRevenue * Math.pow(1 + seedGrowthRate, i + 1) : null);
  const projRevenue = revenueData?.projectedRevenue ?? fallbackRevenue;
  const projGrowthRates = revenueData?.growthRates ?? Array(PROJ_COUNT).fill(seedGrowthRate);

  // ── Projections ───────────────────────────────────────────────────────────
  const projCOGS = projRevenue.map((r, i) =>
    r != null ? r * ctx.cogsPct[i] : null);
  const projGrossProfit = projRevenue.map((r, i) =>
    r != null ? r - projCOGS[i] : null);
  const projRD  = projRevenue.map((r, i) =>
    r != null ? r * ctx.rdPct[i] : null);
  const projSGA = projRevenue.map((r, i) =>
    r != null ? r * ctx.sgaPct[i] : null);
  const projDA  = projRevenue.map((r, i) =>
    r != null ? r * ctx.daPct[i] : null);
  const projEBIT = projGrossProfit.map((gp, i) =>
    gp != null ? gp - (projRD[i] ?? 0) - (projSGA[i] ?? 0) - (projDA[i] ?? 0) : null);
  const projNetInterest = projRevenue.map((r, i) =>
    r != null ? r * ctx.netInterestPct[i] : null);
  const projOtherIncome = projRevenue.map((r, i) =>
    r != null ? r * ctx.otherIncomePct[i] : null);
  const projEBT = projEBIT.map((op, i) =>
    op != null ? op + (projNetInterest[i] ?? 0) + (projOtherIncome[i] ?? 0) : null);
  const projTax = projEBT.map((ebt, i) =>
    ebt != null ? Math.max(0, ebt * ctx.projTaxRate[i]) : null);
  const projNetIncome = projEBT.map((ebt, i) =>
    ebt != null && projTax[i] != null ? ebt - projTax[i] : null);

  const projCapex = projRevenue.map((r, i) =>
    r != null ? r * ctx.capexPct[i] : null);

  const lastBS  = bss.at(-1) ?? {};
  const nwcLast = (lastBS.totalCurrentAssets ?? 0) - (lastBS.totalCurrentLiabilities ?? 0);
  const projNWC = projRevenue.map((r, i) =>
    r != null ? r * ctx.nwcPct[i] : null);
  const projChangeNWC = projNWC.map((nwc, i) => {
    const prev = i === 0 ? nwcLast : (projNWC[i - 1] ?? nwcLast);
    return nwc != null && prev != null ? nwc - prev : null;
  });

  const projNetDebt = projEBIT.map((ebit, i) =>
    ebit != null ? (ebit - (projDA[i] ?? 0)) * ctx.netDebtPct[i] : null);

  // ── Publish to ProjectedValuesContext ─────────────────────────────────────
  useEffect(() => {
    if (projRevenue.some(v => v != null)) {
      publishProjections({
        years:       projYears,
        revenue:     projRevenue,
        cogs:        projCOGS,
        grossProfit: projGrossProfit,
        rd:          projRD,
        sga:         projSGA,
        da:          projDA,
        ebit:        projEBIT,
        ebt:         projEBT,
        netIncome:   projNetIncome,
        capex:       projCapex,
        nwc:         projNWC,
        changeNwc:   projChangeNWC,
      });
    }
  }, [projRevenue, projCOGS, projGrossProfit, projRD, projSGA, projDA, projEBIT, projEBT, projNetIncome, projCapex, projNWC, projChangeNWC]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chart data ────────────────────────────────────────────────────────────
  const csChartData = [
    ...stmts.map(s => {
      const rev = s.revenue;
      return {
        year: fiscalYear(s.date),
        isProjected: false,
        cogs:   rev ? +((safeDiv(s.costOfRevenue,  rev) ?? 0) * 100).toFixed(1) : null,
        gross:  rev ? +((safeDiv(s.grossProfit,    rev) ?? 0) * 100).toFixed(1) : null,
        opex:   rev ? +(((s.researchAndDev ?? 0) + (s.sgaExpense ?? 0) + (s.depreciationAmort ?? 0)) / rev * 100).toFixed(1) : null,
        netInc: rev ? +((safeDiv(s.netIncome,      rev) ?? 0) * 100).toFixed(1) : null,
      };
    }),
    ...projYears.map((yr, i) => {
      const rev = projRevenue[i];
      return {
        year: yr,
        isProjected: true,
        cogs:   rev ? +((projCOGS[i] ?? 0) / rev * 100).toFixed(1) : null,
        gross:  rev ? +((projGrossProfit[i] ?? 0) / rev * 100).toFixed(1) : null,
        opex:   rev ? +(((projRD[i] ?? 0) + (projSGA[i] ?? 0) + (projDA[i] ?? 0)) / rev * 100).toFixed(1) : null,
        netInc: rev ? +((projNetIncome[i] ?? 0) / rev * 100).toFixed(1) : null,
      };
    }),
  ];
  const lastHistLabel = stmts.at(-1) ? fiscalYear(stmts.at(-1).date) : null;

  // ── Render helpers ─────────────────────────────────────────────────────────

  function histCells(getter) {
    return stmts.map((s, i) => (
      <td key={s.date ?? i} className="revenue-cell revenue-cell--historical">
        {formatLargeNumber(getter(s))}
      </td>
    ));
  }

  function projCells(arr) {
    return arr.map((v, i) => (
      <td key={projYears[i]} className="revenue-cell revenue-cell--projected">
        {formatLargeNumber(v)}
      </td>
    ));
  }

  function histPctCells(numGetter, denomGetter) {
    return stmts.map((s, i) => (
      <td key={s.date ?? i} className="revenue-cell revenue-cell--historical revenue-cell--growth">
        {fmtPctAbs(safeDiv(numGetter(s), denomGetter(s)))}
      </td>
    ));
  }

  function pctInputCells(key, inputLabel) {
    return ctx[key].map((rate, i) => (
      <td key={projYears[i]} className="revenue-cell revenue-cell--projected revenue-cell--input">
        <PctInput
          value={rate}
          onChange={v => ctx.updateProjectionRatio(key, i, v)}
          step="0.1"
          className="revenue-input"
          ariaLabel={`${projYears[i]} ${inputLabel}`}
        />
      </td>
    ));
  }

  // Common size row: historical cells read-only, projected cells editable inputs
  function csInputRow(label, histNumGetter, histDenomGetter, key) {
    return (
      <tr key={label} className="revenue-row revenue-row--value">
        <td className="revenue-table__row-label">{label}</td>
        {stmts.map((s, si) => (
          <td key={s.date ?? si} className="revenue-cell revenue-cell--historical revenue-cell--growth">
            {fmtPctAbs(safeDiv(histNumGetter(s), histDenomGetter(s)))}
          </td>
        ))}
        {ctx[key].map((rate, pi) => (
          <td key={projYears[pi]} className="revenue-cell revenue-cell--projected revenue-cell--input">
            <PctInput
              value={rate}
              onChange={v => ctx.updateProjectionRatio(key, pi, v)}
              step="0.1"
              className="revenue-input"
              ariaLabel={`${projYears[pi]} ${label}`}
            />
          </td>
        ))}
      </tr>
    );
  }

  // Common size row: both historical and projected are display-only
  function csCalcRow(label, histNumGetter, histDenomGetter, projArr, projDenomArr = projRevenue) {
    return (
      <tr key={label} className="revenue-row revenue-row--value">
        <td className="revenue-table__row-label">{label}</td>
        {stmts.map((s, si) => (
          <td key={s.date ?? si} className="revenue-cell revenue-cell--historical revenue-cell--growth">
            {fmtPctAbs(safeDiv(histNumGetter(s), histDenomGetter(s)))}
          </td>
        ))}
        {projArr.map((v, pi) => (
          <td key={projYears[pi]} className="revenue-cell revenue-cell--projected revenue-cell--growth">
            {fmtPctAbs(safeDiv(v, projDenomArr[pi]))}
          </td>
        ))}
      </tr>
    );
  }

  const colHeaders = (
    <tr>
      <th className="revenue-table__row-label" scope="col"></th>
      {stmts.map(s => (
        <th key={s.date} className="revenue-col-header revenue-col-header--historical" scope="col">
          {fiscalYear(s.date)}
          <span className="revenue-col-header__tag">Actual</span>
        </th>
      ))}
      {projYears.map(yr => (
        <th key={yr} className="revenue-col-header revenue-col-header--projected" scope="col">
          {yr}
          <span className="revenue-col-header__tag">Projected</span>
        </th>
      ))}
    </tr>
  );

  // ── Sections ───────────────────────────────────────────────────────────────

  return (
    <div className="tab-panel tab-panel--projections" id="tabpanel-projections" role="tabpanel">

      {/* ── Section 1: Income Statement ──────────────────────────────────── */}
      <CollapsibleSection title="Income Statement" subtitle="Historical & Projected" defaultOpen={true}>
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>{colHeaders}</thead>
            <tbody>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">Revenue</td>
                {histCells(s => s.revenue)}
                {projCells(projRevenue)}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">COGS</td>
                {histCells(s => s.costOfRevenue)}
                {projCells(projCOGS)}
              </tr>

              <tr className="revenue-row revenue-row--value revenue-row--subtotal">
                <td className="revenue-table__row-label">Gross Profit</td>
                {histCells(s => s.grossProfit)}
                {projCells(projGrossProfit)}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">R&amp;D</td>
                {histCells(s => s.researchAndDev)}
                {projCells(projRD)}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">SG&amp;A</td>
                {histCells(s => s.sgaExpense)}
                {projCells(projSGA)}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">D&amp;A</td>
                {histCells(s => s.depreciationAmort)}
                {projCells(projDA)}
              </tr>

              <tr className="revenue-row revenue-row--value revenue-row--subtotal">
                <td className="revenue-table__row-label">Operating Profit (Loss)</td>
                {histCells(s => s.operatingIncome)}
                {projCells(projEBIT)}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Net Interest Inc (Exp)</td>
                {histCells(s => s.netInterestIncome)}
                {projCells(projNetInterest)}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Other Inc (Exp)</td>
                {histCells(s => s.otherIncomeExpense)}
                {projCells(projOtherIncome)}
              </tr>

              <tr className="revenue-row revenue-row--value revenue-row--subtotal">
                <td className="revenue-table__row-label">Earnings Before Tax (Loss)</td>
                {histCells(s => s.incomeBeforeTax)}
                {projCells(projEBT)}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Tax Provision</td>
                {histCells(s => s.taxExpense)}
                {projCells(projTax)}
              </tr>

              <tr className="revenue-row revenue-row--value revenue-row--total">
                <td className="revenue-table__row-label">Net Income</td>
                {histCells(s => s.netIncome)}
                {projCells(projNetIncome)}
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      {/* ── Section 2: Common Size Income Statement ─────────────────────── */}
      <CollapsibleSection title="Common Size Income Statement" subtitle="(% of Revenue)" defaultOpen={true}>
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>{colHeaders}</thead>
            <tbody>
              {/* Revenue: YoY growth % — read-only, sourced from RevenueTab */}
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">Revenue</td>
                {stmts.map((s, si) => (
                  <td key={s.date ?? si} className="revenue-cell revenue-cell--historical revenue-cell--growth">
                    {si === 0 ? EM_DASH : fmtPct(safeDiv(s.revenue, stmts[si - 1].revenue) != null
                      ? (s.revenue / stmts[si - 1].revenue) - 1 : null)}
                  </td>
                ))}
                {projGrowthRates.map((rate, pi) => (
                  <td key={projYears[pi]} className="revenue-cell revenue-cell--projected revenue-cell--growth">
                    {fmtPct(rate)}
                  </td>
                ))}
              </tr>

              {/* COGS % — editable */}
              {csInputRow('COGS', s => s.costOfRevenue, s => s.revenue, 'cogsPct')}

              {/* Gross Profit % — calculated */}
              {csCalcRow('Gross Profit', s => s.grossProfit, s => s.revenue, projGrossProfit)}

              {/* R&D % — editable */}
              {csInputRow('R&D', s => s.researchAndDev, s => s.revenue, 'rdPct')}

              {/* SG&A % — editable */}
              {csInputRow('SG&A', s => s.sgaExpense, s => s.revenue, 'sgaPct')}

              {/* D&A % — editable */}
              {csInputRow('D&A', s => s.depreciationAmort, s => s.revenue, 'daPct')}

              {/* Operating Profit % — calculated */}
              {csCalcRow('Operating Profit (Loss)', s => s.operatingIncome, s => s.revenue, projEBIT)}

              {/* Net Interest % — editable */}
              {csInputRow('Net Interest Inc (Exp)', s => s.netInterestIncome, s => s.revenue, 'netInterestPct')}

              {/* Other Income % — editable */}
              {csInputRow('Other Inc (Exp)', s => s.otherIncomeExpense, s => s.revenue, 'otherIncomePct')}

              {/* EBT % — calculated */}
              {csCalcRow('EBT', s => s.incomeBeforeTax, s => s.revenue, projEBT)}

              {/* Tax Rate % of EBT — editable */}
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">
                  Tax Rate <span style={{ fontSize: '0.75em', opacity: 0.65 }}>(% of EBT)</span>
                </td>
                {stmts.map((s, si) => (
                  <td key={s.date ?? si} className="revenue-cell revenue-cell--historical revenue-cell--growth">
                    {fmtPctAbs(safeDiv(s.taxExpense, s.incomeBeforeTax))}
                  </td>
                ))}
                {ctx.projTaxRate.map((rate, pi) => (
                  <td key={projYears[pi]} className="revenue-cell revenue-cell--projected revenue-cell--input">
                    <PctInput
                      value={rate}
                      onChange={v => ctx.updateProjectionRatio('projTaxRate', pi, v)}
                      step="0.1"
                      className="revenue-input"
                      ariaLabel={`${projYears[pi]} tax rate`}
                    />
                  </td>
                ))}
              </tr>

              {/* Net Income % — calculated */}
              {csCalcRow('Net Income', s => s.netIncome, s => s.revenue, projNetIncome)}
            </tbody>
          </table>
        </div>
        <CollapsibleSection title="Trend Chart" defaultOpen={true}>
          <div className="chart-panel">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={csChartData} margin={{ top: 4, right: 48, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="#1e2d40" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#8a9ab5', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fill: '#8a9ab5', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#0e1624', border: '1px solid #1e2d40', borderRadius: '8px', fontSize: '12px', color: '#f0ead6' }}
                         labelStyle={{ color: '#8a9ab5', marginBottom: '4px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#8a9ab5' }} />
                {lastHistLabel && (
                  <ReferenceLine x={lastHistLabel} stroke="#d4a853" strokeDasharray="4 4"
                    label={{ value: 'Projected →', position: 'insideTopRight', fill: '#8a9ab5', fontSize: 10 }} />
                )}
                <Line dataKey="cogs"   name="COGS %"         type="monotone" stroke="rgba(248,113,113,0.85)" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
                <Line dataKey="opex"   name="OpEx %"          type="monotone" stroke="rgba(251,191,36,0.75)"  strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
                <Line dataKey="gross"  name="Gross Margin %" type="monotone" stroke="rgba(212,168,83,0.9)"   strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} connectNulls />
                <Line dataKey="netInc" name="Net Margin %"   type="monotone" stroke="#4ade80"                strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>
      </CollapsibleSection>

      {/* ── Section 3: Other Forecasted Terms ───────────────────────────── */}
      <CollapsibleSection title="Other Forecasted Terms" defaultOpen={true}>
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>{colHeaders}</thead>
            <tbody>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">CAPEX</td>
                {cfs.map((s, i) => (
                  <td key={s.date ?? i} className="revenue-cell revenue-cell--historical">
                    {formatLargeNumber(s.capitalExpenditure != null ? -Math.abs(s.capitalExpenditure) : null)}
                  </td>
                ))}
                {projCapex.map((v, i) => (
                  <td key={projYears[i]} className="revenue-cell revenue-cell--projected">
                    {formatLargeNumber(v != null ? -v : null)}
                  </td>
                ))}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">CAPEX % Rev</td>
                {cfs.map((s, i) => {
                  const rev = stmts[i]?.revenue;
                  return (
                    <td key={s.date ?? i} className="revenue-cell revenue-cell--historical revenue-cell--growth">
                      {fmtPctAbs(safeDiv(s.capitalExpenditure != null ? Math.abs(s.capitalExpenditure) : null, rev))}
                    </td>
                  );
                })}
                {pctInputCells('capexPct', 'CAPEX % of revenue')}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">Net Debt</td>
                {bss.map((s, i) => (
                  <td key={s.date ?? i} className="revenue-cell revenue-cell--historical">
                    {formatLargeNumber(s.netDebt)}
                  </td>
                ))}
                {projNetDebt.map((v, i) => (
                  <td key={projYears[i]} className="revenue-cell revenue-cell--projected">
                    {formatLargeNumber(v)}
                  </td>
                ))}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Net Debt % (EBIT − D&amp;A)</td>
                {bss.map((s, i) => {
                  const inc = stmts[i];
                  const base = inc ? (inc.operatingIncome ?? 0) - (inc.depreciationAmort ?? 0) : null;
                  return (
                    <td key={s.date ?? i} className="revenue-cell revenue-cell--historical revenue-cell--growth">
                      {fmtPctAbs(safeDiv(s.netDebt, base))}
                    </td>
                  );
                })}
                {pctInputCells('netDebtPct', 'Net Debt % of (EBIT − D&A)')}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">NWC</td>
                {bss.map((s, i) => {
                  const nwc = s.totalCurrentAssets != null && s.totalCurrentLiabilities != null
                    ? s.totalCurrentAssets - s.totalCurrentLiabilities : null;
                  return (
                    <td key={s.date ?? i} className="revenue-cell revenue-cell--historical">
                      {formatLargeNumber(nwc)}
                    </td>
                  );
                })}
                {projNWC.map((v, i) => (
                  <td key={projYears[i]} className="revenue-cell revenue-cell--projected">
                    {formatLargeNumber(v)}
                  </td>
                ))}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Change in NWC</td>
                {bss.map((s, i) => {
                  const nwcCurr = s.totalCurrentAssets != null && s.totalCurrentLiabilities != null
                    ? s.totalCurrentAssets - s.totalCurrentLiabilities : null;
                  const prev = bss[i - 1];
                  const nwcPrev = prev?.totalCurrentAssets != null && prev?.totalCurrentLiabilities != null
                    ? prev.totalCurrentAssets - prev.totalCurrentLiabilities : null;
                  const delta = nwcCurr != null && nwcPrev != null ? nwcCurr - nwcPrev : null;
                  return (
                    <td key={s.date ?? i} className="revenue-cell revenue-cell--historical">
                      {formatLargeNumber(i === 0 ? null : delta)}
                    </td>
                  );
                })}
                {projChangeNWC.map((v, i) => (
                  <td key={projYears[i]} className="revenue-cell revenue-cell--projected">
                    {formatLargeNumber(v)}
                  </td>
                ))}
              </tr>

              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">NWC % Rev</td>
                {bss.map((s, i) => {
                  const rev = stmts[i]?.revenue;
                  const nwc = s.totalCurrentAssets != null && s.totalCurrentLiabilities != null
                    ? s.totalCurrentAssets - s.totalCurrentLiabilities : null;
                  return (
                    <td key={s.date ?? i} className="revenue-cell revenue-cell--historical revenue-cell--growth">
                      {fmtPct(safeDiv(nwc, rev))}
                    </td>
                  );
                })}
                {pctInputCells('nwcPct', 'NWC % of revenue')}
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

    </div>
  );
}
