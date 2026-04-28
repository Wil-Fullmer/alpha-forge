import React, { useState, useEffect } from 'react';
import { EM_DASH, formatLargeNumber, formatPct } from '../utils/format.js';
import { useAssumptions } from '../contexts/AssumptionsContext.jsx';
import { useProjectedValues } from '../contexts/ProjectedValuesContext.jsx';
import { useConviction } from '../contexts/ConvictionContext.jsx';
import { getSharesOutstanding } from '../utils/sharesOutstanding.js';
import PctInput from '../components/PctInput.jsx';
import MultipleInput from '../components/MultipleInput.jsx';

const PROJ_COUNT = 5;
const GRID_SIZE = 7;
const HALF = 3;

function safeDiv(a, b) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function fmtPct(v, d = 2) {
  if (v == null || isNaN(v)) return EM_DASH;
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(d)}%`;
}

function fmtM(v) {
  if (v == null || isNaN(v)) return EM_DASH;
  const m = v / 1e6;
  const abs = Math.abs(m).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return m < 0 ? `(${abs})` : abs;
}

function getGridRange(grid) {
  const vals = grid.flat().filter(v => v != null && Number.isFinite(v));
  if (!vals.length) return { min: null, max: null };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sensitivityStyle(value, min, max) {
  if (value == null || min == null || max == null) return {};
  if (max === min) {
    return { backgroundColor: 'rgba(251, 191, 36, 0.12)' };
  }

  // Lowest value = red, highest value = green.
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = Math.round(lerp(248, 74, t));
  const g = Math.round(lerp(113, 222, t));
  const b = Math.round(lerp(113, 128, t));
  const alpha = 0.1 + 0.22 * Math.abs(t - 0.5) * 2;

  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`,
    color: t > 0.7 ? 'rgb(74, 222, 128)' : t < 0.3 ? 'rgb(248, 113, 113)' : undefined,
  };
}

// Only user-editable values live in state. Everything else is derived inline.
function buildState(analysis, company, waccOverride, ctxBeta, ctxRfr, ctxMrp) {
  const peRatio    = analysis?.coreMetrics?.peRatio ?? 20;
  const assumedWACC = waccOverride ?? analysis?.dcf?.assumedWACC ?? 0.10;
  const debtSeries = analysis?.historicalFinancials?.balanceSheets ?? [];
  const latestDebt = debtSeries[0]?.totalDebt;
  const priorDebt = debtSeries[1]?.totalDebt;
  const impliedNetBorrowing = (latestDebt != null && priorDebt != null) ? latestDebt - priorDebt : 0;
  const beta = ctxBeta ?? company?.beta ?? 1.0;
  const rfr  = ctxRfr  ?? 0.0438;
  const mrp  = ctxMrp  ?? 0.05;
  const coe  = rfr + beta * mrp;
  return {
    terminalPE:          peRatio,
    terminalEVEBITDA:    15,
    netBorrowingPerYear: Array(PROJ_COUNT).fill(impliedNetBorrowing),
    waccCenter:          assumedWACC,
    evEbitdaCenter:      15,
    coeCenter:           coe,
    peCenter:            peRatio,
  };
}

export default function DcfTab({ company, analysis, waccOverride, waccModel, onPricesChange }) {
  const ctx = useAssumptions();
  const { projections: ctxProj } = useProjectedValues();
  const { conviction } = useConviction();

  const waccDelta = conviction === 'conservative' ?  0.005 : conviction === 'aggressive' ? -0.005 : 0;
  const evDelta   = conviction === 'conservative' ? -1.0   : conviction === 'aggressive' ?  1.0   : 0;
  const peDelta   = conviction === 'conservative' ? -2.0   : conviction === 'aggressive' ?  2.0   : 0;
  const coeDelta  = conviction === 'conservative' ?  0.005 : conviction === 'aggressive' ? -0.005 : 0;

  const [s, setS] = useState(() => buildState(analysis, company, waccOverride, ctx.beta, ctx.riskFreeRate, ctx.mrp));

  useEffect(() => {
    setS(buildState(analysis, company, waccOverride, ctx.beta, ctx.riskFreeRate, ctx.mrp));
  }, [analysis, company, waccOverride, ctx.beta, ctx.riskFreeRate, ctx.mrp]); // eslint-disable-line react-hooks/exhaustive-deps

  const updNetBorrowYear = (i, str) => {
    const v = parseFloat(str);
    if (!isNaN(v)) setS(p => {
      const next = [...p.netBorrowingPerYear];
      next[i] = v * 1e6;
      return { ...p, netBorrowingPerYear: next };
    });
  };

  // ── Derived constants ──────────────────────────────────────────────────────
  // Assumptions are read from AssumptionsContext (single source of truth).
  // Historical financials are still used for capital structure and base values.
  const stmts      = analysis?.historicalFinancials?.incomeStatements ?? [];
  const lastIS     = stmts[0] ?? {};
  const lastBS     = (analysis?.historicalFinancials?.balanceSheets ?? [])[0] ?? {};
  const lastCF     = (analysis?.historicalFinancials?.cashFlows ?? [])[0] ?? {};
  const rev        = lastIS.revenue || 1;

  // Read projection ratios from context (editable in ProjectionsTab / seeded from history)
  const cogsPct    = safeDiv(lastIS.costOfRevenue, rev) ?? 0.53;
  const opExPct    = safeDiv((lastIS.researchAndDev ?? 0) + (lastIS.sgaExpense ?? 0), rev) ?? 0.14;
  const daPct      = ctx.daPct[0]    ?? safeDiv(lastIS.depreciationAmort, rev)           ?? 0.03;
  const capexPct   = ctx.capexPct[0] ?? (lastCF.capitalExpenditure != null ? Math.abs(lastCF.capitalExpenditure) / rev : 0.03);
  const nwcPct     = ctx.nwcPct[0]   ?? safeDiv((lastBS.totalCurrentAssets ?? 0) - (lastBS.totalCurrentLiabilities ?? 0), rev) ?? 0.05;

  // Tax rate and WACC — context is authoritative; waccModel is a secondary override from WaccTab
  const taxRate       = waccModel?.taxRate ?? ctx.taxRate;
  const wacc          = waccOverride ?? analysis?.dcf?.assumedWACC ?? 0.10;
  const costOfEquity  = waccModel?.capm ?? (ctx.riskFreeRate + ctx.beta * ctx.mrp);

  const longTermDebt  = lastBS.totalDebt ?? 0;
  const shares        = getSharesOutstanding(company, analysis) ?? 1e9;
  const cash          = lastBS.cashAndCashEquivalents ?? 0;

  // Revenue growth comes from context (editable in ProjectionsTab), padded/trimmed to PROJ_COUNT
  const ctxGrowth     = ctx.revenueGrowth ?? [];
  const revenueGrowth = Array.from({ length: PROJ_COUNT }, (_, i) =>
    ctxGrowth[i] ?? analysis?.dcf?.assumedGrowthRate ?? 0.05
  );

  const netInterestIncome       = lastIS.netInterestIncome ?? 0;
  const afterTaxInterestExpense = Math.max(0, -netInterestIncome) * (1 - taxRate);
  const lastRevenue  = lastIS.revenue ?? null;
  const lastNWC      = (lastBS.totalCurrentAssets ?? 0) - (lastBS.totalCurrentLiabilities ?? 0);
  const lastDate     = analysis?.lastFilingDate ?? stmts[0]?.date ?? null;

  const currentPrice = analysis?.technicals?.currentPrice ?? company?.price ?? null;

  // ── Fiscal year labels & scale factors ───────────────────────────────────
  const lastMonthDay = lastDate ? lastDate.slice(5) : '09-30';
  const projStartYear  = new Date().getFullYear();
  const projFYLabels   = Array.from({ length: PROJ_COUNT }, (_, i) => `FY${projStartYear + i}E`);
  const projFYEndDates = Array.from({ length: PROJ_COUNT }, (_, i) => `${projStartYear + i}-${lastMonthDay}`);

  // Use fixed annual period indexing for discounting consistency with full-year projections.
  const discountPeriods = Array.from({ length: PROJ_COUNT }, (_, i) => i + 1);

  // ── Projections ──────────────────────────────────────────────────────────
  // Use ProjectionsTab context rows (years 1–4) when available; compute year 5
  // by extending the last context year using the same growth/ratio assumptions.
  const baseRev = lastRevenue ?? 1;

  // Local fallback projection (used when no context rows exist, or to extend to year 5)
  const localProjRevenue = revenueGrowth.reduce((acc, r) => {
    const prev = acc.length ? acc[acc.length - 1] : baseRev;
    acc.push(prev * (1 + r));
    return acc;
  }, []);

  function extendFromCtx(ctxArr, localArr, idx) {
    // Prefer context value; fall back to local for out-of-range indices
    return ctxArr != null && ctxArr[idx] != null ? ctxArr[idx] : localArr[idx];
  }

  const projRevenue = Array.from({ length: PROJ_COUNT }, (_, i) =>
    extendFromCtx(ctxProj?.revenue, localProjRevenue, i));

  const projDA        = projRevenue.map((r, i) =>
    extendFromCtx(ctxProj?.da, localProjRevenue.map(rv => rv * daPct), i) ?? r * daPct);

  // EBIT: prefer context ebit; compute locally for year 5
  const localEBIT = localProjRevenue.map((r, i) => {
    const gp   = r - r * cogsPct;
    const opex = r * opExPct;
    const da   = r * daPct;
    return gp - opex - da;
  });
  const projEBIT  = Array.from({ length: PROJ_COUNT }, (_, i) =>
    extendFromCtx(ctxProj?.ebit, localEBIT, i));

  const projCOGS  = Array.from({ length: PROJ_COUNT }, (_, i) =>
    extendFromCtx(ctxProj?.cogs, projRevenue.map(r => r * cogsPct), i));
  const projGP    = Array.from({ length: PROJ_COUNT }, (_, i) =>
    extendFromCtx(ctxProj?.grossProfit, projRevenue.map(r => r * (1 - cogsPct)), i));
  const projOpEx  = Array.from({ length: PROJ_COUNT }, (_, i) => {
    const rd  = ctxProj?.rd?.[i];
    const sga = ctxProj?.sga?.[i];
    return (rd != null && sga != null) ? rd + sga : projRevenue[i] * opExPct;
  });

  const projEBITDA    = projEBIT.map((e, i) => e + projDA[i]);
  const projTax       = projEBIT.map(e => Math.max(0, e * taxRate));
  const projNOPAT     = projEBIT.map((e, i) => e - projTax[i]);

  const localNWC = localProjRevenue.map(r => r * nwcPct);
  const projNWC  = Array.from({ length: PROJ_COUNT }, (_, i) =>
    extendFromCtx(ctxProj?.nwc, localNWC, i));
  const projChangeNWC = projNWC.map((nwc, i) => nwc - (i === 0 ? lastNWC : projNWC[i - 1]));

  const localCAPEX = localProjRevenue.map(r => r * capexPct);
  const projCAPEX  = Array.from({ length: PROJ_COUNT }, (_, i) =>
    extendFromCtx(ctxProj?.capex, localCAPEX, i));
  const projFCFF      = projNOPAT.map((n, i) => n + projDA[i] - projChangeNWC[i] - projCAPEX[i]);
  const projAfterTaxInterestExpense = Array(PROJ_COUNT).fill(afterTaxInterestExpense);
  const projNetBorrowing = Array.from({ length: PROJ_COUNT }, (_, i) => s.netBorrowingPerYear[i] ?? 0);
  const projFCFE = projFCFF.map((f, i) => f - projAfterTaxInterestExpense[i] + projNetBorrowing[i]);

  // ── Present values ───────────────────────────────────────────────────────
  const pvUFCF    = projFCFF.map((f, i) => f / Math.pow(1 + wacc, discountPeriods[i]));
  const pvLFCF    = projFCFE.map((f, i) => f / Math.pow(1 + costOfEquity, discountPeriods[i]));
  const sumPvUFCF = pvUFCF.reduce((a, b) => a + b, 0);
  const sumPvLFCF = pvLFCF.reduce((a, b) => a + b, 0);

  // ── Terminal values ──────────────────────────────────────────────────────
  const lastEBITDA   = projEBITDA[PROJ_COUNT - 1];
  const projectedNetIncomeToEquity = projNOPAT.map(v => v - afterTaxInterestExpense);
  const lastEarnings = projectedNetIncomeToEquity[PROJ_COUNT - 1];
  const lastPeriod    = discountPeriods[PROJ_COUNT - 1];

  const tvEVEBITDA   = lastEBITDA * s.terminalEVEBITDA;
  const pvTvEVEBITDA = tvEVEBITDA / Math.pow(1 + wacc, lastPeriod);
  const ev           = sumPvUFCF + pvTvEVEBITDA;
  const equityFCFF   = ev - longTermDebt + cash;
  const impliedFCFF  = shares > 0 ? equityFCFF / shares : null;
  const upsideFCFF   = safeDiv(impliedFCFF != null ? impliedFCFF - currentPrice : null, currentPrice);

  const tvPE         = lastEarnings != null && lastEarnings > 0 ? lastEarnings * s.terminalPE : null;
  const pvTvPE       = tvPE != null ? tvPE / Math.pow(1 + costOfEquity, lastPeriod) : null;
  const equityFCFE   = tvPE != null ? sumPvLFCF + pvTvPE : null;
  const impliedFCFE  = equityFCFE != null && shares > 0 ? equityFCFE / shares : null;
  const upsideFCFE   = safeDiv(impliedFCFE != null ? impliedFCFE - currentPrice : null, currentPrice);

  // Emit implied prices to parent (FinalValuationTab via CompanyPage)
  useEffect(() => {
    onPricesChange?.({ fcfe: impliedFCFE ?? null, fcff: impliedFCFF ?? null });
  }, [impliedFCFE, impliedFCFF, onPricesChange]);

  const pctFirstFCFF = safeDiv(sumPvUFCF, ev);
  const pctTermFCFF  = safeDiv(pvTvEVEBITDA, ev);
  const pctFirstFCFE = equityFCFE != null ? safeDiv(sumPvLFCF, equityFCFE) : null;
  const pctTermFCFE  = equityFCFE != null ? safeDiv(pvTvPE, equityFCFE) : null;

  const perShare = v => shares > 0 ? v / shares : null;
  const revCAGR  = lastRevenue && projRevenue[PROJ_COUNT - 1]
    ? Math.pow(projRevenue[PROJ_COUNT - 1] / lastRevenue, 1 / PROJ_COUNT) - 1
    : null;

  // ── Sensitivity grids ────────────────────────────────────────────────────
  // Axis steps generated from editable center values
  const waccSteps   = Array.from({ length: GRID_SIZE }, (_, i) => (s.waccCenter + waccDelta) + (i - HALF) * 0.01);
  const evMultSteps = Array.from({ length: GRID_SIZE }, (_, i) => (s.evEbitdaCenter + evDelta) + (i - HALF));
  const coeSteps    = Array.from({ length: GRID_SIZE }, (_, i) => (s.coeCenter + coeDelta) + (i - HALF) * 0.01);
  const peSteps     = Array.from({ length: GRID_SIZE }, (_, i) => (s.peCenter + peDelta) + (i - HALF));

  const grid1 = waccSteps.map(w => {
    const pvs   = projFCFF.map((f, i) => f / Math.pow(1 + w, discountPeriods[i]));
    const sumPv = pvs.reduce((a, b) => a + b, 0);
    return evMultSteps.map(mult => {
      const pvTv = (lastEBITDA * mult) / Math.pow(1 + w, lastPeriod);
      const eq   = sumPv + pvTv - longTermDebt + cash;
      return shares > 0 ? eq / shares : null;
    });
  });

  const grid2 = coeSteps.map(coe => {
    const pvs   = projFCFE.map((f, i) => f / Math.pow(1 + coe, discountPeriods[i]));
    const sumPv = pvs.reduce((a, b) => a + b, 0);
    return peSteps.map(pe => {
      const pvTv = (lastEarnings * pe) / Math.pow(1 + coe, lastPeriod);
      const eq   = sumPv + pvTv;
      return shares > 0 ? eq / shares : null;
    });
  });

  const grid1Range = getGridRange(grid1);
  const grid2Range = getGridRange(grid2);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="tab-panel tab-panel--dcf" id="tabpanel-dcf" role="tabpanel">

      {/* ── Areas 1+2: Top row ────────────────────────────────────────────── */}
      <div className="dcf-top-grid">

        {/* Area 1: Assumptions Panel */}
        <div className="dcf-assumptions-panel">
          <p className="dcf-assumptions-panel__section-title">Current Stock Price</p>
          <div className="dcf-kv">
            <span className="dcf-kv__label">Price</span>
            <span className="dcf-kv__value">{currentPrice != null ? `$${currentPrice.toFixed(2)}` : EM_DASH}</span>
          </div>

          <p className="dcf-assumptions-panel__section-title">Operating Assumptions</p>
          {[
            ['OpEx % Revenue',  (opExPct * 100).toFixed(2) + '%'],
            ['D&A % Revenue',   (daPct * 100).toFixed(2) + '%'],
            ['CapEx % Revenue', (capexPct * 100).toFixed(2) + '%'],
            ['COGS % Revenue',  (cogsPct * 100).toFixed(2) + '%'],
            ['Tax Rate',        (taxRate * 100).toFixed(2) + '%'],
          ].map(([label, display]) => (
            <div className="dcf-kv" key={label}>
              <span className="dcf-kv__label">{label}</span>
              <span className="dcf-kv__value">{display}</span>
            </div>
          ))}

          <p className="dcf-assumptions-panel__section-title">DCF Assumptions</p>
          {[
            ['WACC',             (wacc * 100).toFixed(2) + '%'],
            ['Cost of Equity',   (costOfEquity * 100).toFixed(2) + '%'],
            ['Revenue Growth',   ((revenueGrowth[0] ?? 0) * 100).toFixed(2) + '%'],
            ['Long-term Debt',   '$' + (longTermDebt / 1e6).toFixed(0) + 'M'],
            ['Dil. Shares (M)',  (shares / 1e6).toFixed(0)],
            ['Cash',             '$' + (cash / 1e6).toFixed(0) + 'M'],
            ['Net Interest Income', '$' + (netInterestIncome / 1e6).toFixed(0) + 'M'],
            ['After-tax Interest Expense', '$' + (afterTaxInterestExpense / 1e6).toFixed(0) + 'M'],
          ].map(([label, display]) => (
            <div className="dcf-kv" key={label}>
              <span className="dcf-kv__label">{label}</span>
              <span className="dcf-kv__value">{display}</span>
            </div>
          ))}

          <p className="dcf-assumptions-panel__section-title dcf-assumptions-panel__section-title--editable">Terminal Multiples</p>
          <div className="dcf-kv">
            <span className="dcf-kv__label">Terminal P/E</span>
            <span className="dcf-kv__value">
              <MultipleInput
                value={s.terminalPE}
                onChange={v => setS(p => ({ ...p, terminalPE: v }))}
                className="dcf-kv__input"
                step="0.5"
                ariaLabel="Terminal P/E"
              />
              <span style={{ marginLeft: '2px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>x</span>
            </span>
          </div>
          <div className="dcf-kv">
            <span className="dcf-kv__label">Terminal EV/EBITDA</span>
            <span className="dcf-kv__value">
              <MultipleInput
                value={s.terminalEVEBITDA}
                onChange={v => setS(p => ({ ...p, terminalEVEBITDA: v }))}
                className="dcf-kv__input"
                step="0.5"
                ariaLabel="Terminal EV/EBITDA"
              />
              <span style={{ marginLeft: '2px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>x</span>
            </span>
          </div>
          <p className="dcf-assumptions-panel__section-title dcf-assumptions-panel__section-title--editable">
            Net Borrowing (M, per year)
          </p>
          {s.netBorrowingPerYear.map((val, i) => (
            <div className="dcf-kv" key={i}>
              <span className="dcf-kv__label">{projFYLabels[i]}</span>
              <span className="dcf-kv__value">
                <input
                  type="number"
                  className="dcf-kv__input"
                  value={(val / 1e6).toFixed(0)}
                  step="100"
                  onChange={e => updNetBorrowYear(i, e.target.value)}
                  aria-label={`Net Borrowing ${projFYLabels[i]} (millions)`}
                />
                <span style={{ marginLeft: '2px', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>M</span>
              </span>
            </div>
          ))}
        </div>

        {/* Area 2: Valuation Summary */}
        <div className="dcf-summary-panel">
          <div className="dcf-summary-block">
            <p className="dcf-summary-block__title">FCFF — EV/EBITDA Exit</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <span className="dcf-summary-block__hero">{impliedFCFF != null ? `$${impliedFCFF.toFixed(2)}` : EM_DASH}</span>
              <span
                className="dcf-summary-block__upside"
                style={{ color: upsideFCFF != null ? (upsideFCFF >= 0 ? 'var(--color-positive)' : 'var(--color-negative)') : undefined }}
              >
                {upsideFCFF != null ? fmtPct(upsideFCFF, 2) : EM_DASH}
              </span>
            </div>
            <div className="dcf-summary-block__detail-grid">
              <div><span className="dcf-kv__label">PV of FCFF (Stage 1)</span></div>
              <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">{formatLargeNumber(sumPvUFCF)}</span></div>
              <div><span className="dcf-kv__label">PV of Terminal Value</span></div>
              <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">{formatLargeNumber(pvTvEVEBITDA)}</span></div>
              <div><span className="dcf-kv__label">% from Stage 1</span></div>
              <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">{formatPct(pctFirstFCFF, 2)}</span></div>
              <div><span className="dcf-kv__label">% from Terminal</span></div>
              <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">{formatPct(pctTermFCFF, 2)}</span></div>
              <div><span className="dcf-kv__label">Rev CAGR</span></div>
              <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">{formatPct(revCAGR, 2)}</span></div>
            </div>
          </div>

          <div className="dcf-summary-block">
            <p className="dcf-summary-block__title">FCFE — P/E Exit</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <span className="dcf-summary-block__hero">{impliedFCFE != null ? `$${impliedFCFE.toFixed(2)}` : EM_DASH}</span>
              <span
                className="dcf-summary-block__upside"
                style={{ color: upsideFCFE != null ? (upsideFCFE >= 0 ? 'var(--color-positive)' : 'var(--color-negative)') : undefined }}
              >
                {upsideFCFE != null ? fmtPct(upsideFCFE, 2) : EM_DASH}
              </span>
            </div>
            <div className="dcf-summary-block__detail-grid">
              <div><span className="dcf-kv__label">PV of FCFE (Stage 1) / share</span></div>
              <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">{perShare(sumPvLFCF) != null ? `$${perShare(sumPvLFCF).toFixed(2)}` : EM_DASH}</span></div>
              <div><span className="dcf-kv__label">PV of Terminal Value / share</span></div>
              <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">{perShare(pvTvPE) != null ? `$${perShare(pvTvPE).toFixed(2)}` : EM_DASH}</span></div>
              <div><span className="dcf-kv__label">% from Stage 1</span></div>
              <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">{formatPct(pctFirstFCFE, 2)}</span></div>
              <div><span className="dcf-kv__label">% from Terminal</span></div>
              <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">{formatPct(pctTermFCFE, 2)}</span></div>
            </div>
          </div>

          {(() => {
            const iv = analysis?.dcf?.intrinsicValuePerShare ?? null;
            const ivUpside = safeDiv(iv != null ? iv - currentPrice : null, currentPrice);
            return (
              <div className="dcf-summary-block" style={{ opacity: 0.75 }}>
                <p className="dcf-summary-block__title" style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.08em' }}>
                  GORDON GROWTH — BACKEND REF
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  <span className="dcf-summary-block__hero">{iv != null ? `$${iv.toFixed(2)}` : EM_DASH}</span>
                  <span
                    className="dcf-summary-block__upside"
                    style={{ color: ivUpside != null ? (ivUpside >= 0 ? 'var(--color-positive)' : 'var(--color-negative)') : undefined }}
                  >
                    {ivUpside != null ? fmtPct(ivUpside, 2) : EM_DASH}
                  </span>
                </div>
                <div className="dcf-summary-block__detail-grid">
                  <div><span className="dcf-kv__label">Method</span></div>
                  <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">Gordon Growth</span></div>
                  <div><span className="dcf-kv__label">Inputs</span></div>
                  <div style={{ textAlign: 'right' }}><span className="dcf-kv__value">FCF · WACC · g</span></div>
                  <div><span className="dcf-kv__label">Read-only</span></div>
                  <div style={{ textAlign: 'right' }}><span className="dcf-kv__value" style={{ color: 'var(--color-text-muted)' }}>Backend only</span></div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Area 3: Projection Table ─────────────────────────────────────── */}
      <div className="proj-section">
        <p className="proj-section__title">FCFF / FCFE Projection Model <span className="proj-section__subtitle">$ millions</span></p>
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>
              <tr>
                <th className="revenue-table__row-label" scope="col"></th>
                {projFYLabels.map(fy => (
                  <th key={fy} className="revenue-col-header revenue-col-header--projected" scope="col">
                    {fy}<span className="revenue-col-header__tag">Projected</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Discount Period</td>
                {discountPeriods.map((period, i) => <td key={i} className="revenue-cell revenue-cell--projected revenue-cell--growth">{period.toFixed(0)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">FY End Date</td>
                {projFYEndDates.map((d, i) => <td key={i} className="revenue-cell revenue-cell--projected revenue-cell--growth">{d}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">Revenue</td>
                {projRevenue.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Less: COGS</td>
                {projCOGS.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(-v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--subtotal">
                <td className="revenue-table__row-label">Gross Profit</td>
                {projGP.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Less: Operating Expenses</td>
                {projOpEx.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(-v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Less: D&amp;A</td>
                {projDA.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(-v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--subtotal">
                <td className="revenue-table__row-label">EBIT</td>
                {projEBIT.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Less: Taxes</td>
                {projTax.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(-v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--subtotal">
                <td className="revenue-table__row-label">NOPAT</td>
                {projNOPAT.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Plus: D&amp;A</td>
                {projDA.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Less: Change in NWC</td>
                {projChangeNWC.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(-v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Less: Capital Expenditures</td>
                {projCAPEX.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(-v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--total">
                <td className="revenue-table__row-label">Unlevered Free Cash Flow (FCFF)</td>
                {projFCFF.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Per Share</td>
                {projFCFF.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected revenue-cell--growth">{perShare(v) != null ? perShare(v).toFixed(2) : EM_DASH}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Less: After-tax Interest Expense</td>
                {projAfterTaxInterestExpense.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(-v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Plus: Net Borrowing</td>
                {projNetBorrowing.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--total">
                <td className="revenue-table__row-label">Levered Free Cash Flow (FCFE)</td>
                {projFCFE.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Per Share</td>
                {projFCFE.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected revenue-cell--growth">{perShare(v) != null ? perShare(v).toFixed(2) : EM_DASH}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">Present Value of UFCF</td>
                {pvUFCF.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Per Share</td>
                {pvUFCF.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected revenue-cell--growth">{perShare(v) != null ? perShare(v).toFixed(2) : EM_DASH}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">Present Value of LFCF</td>
                {pvLFCF.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected">{fmtM(v)}</td>)}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Per Share</td>
                {pvLFCF.map((v, i) => <td key={i} className="revenue-cell revenue-cell--projected revenue-cell--growth">{perShare(v) != null ? perShare(v).toFixed(2) : EM_DASH}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Area 4: Sensitivity Grids ─────────────────────────────────────── */}
      <div className="dcf-sensitivity-grid">

        {/* Grid 1: WACC vs EV/EBITDA */}
        <div className="dcf-sensitivity">
          <p className="dcf-sensitivity__title">Sensitivity: WACC vs EV/EBITDA — Implied FCFF Price</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="dcf-sensitivity__table">
              <thead>
                <tr>
                  <th className="dcf-sensitivity__corner">WACC \ EV/EBITDA</th>
                  {evMultSteps.map((m, ci) => (
                    <th key={ci}>
                      {ci === HALF
                        ? <MultipleInput value={s.evEbitdaCenter} onChange={v => setS(p => ({ ...p, evEbitdaCenter: v }))} step="1" className="dcf-sens-input" ariaLabel="EV/EBITDA center" />
                        : `${m.toFixed(0)}x`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid1.map((row, ri) => (
                  <tr key={ri}>
                    <th>
                      {ri === HALF
                        ? <PctInput value={s.waccCenter} onChange={v => setS(p => ({ ...p, waccCenter: v }))} step="0.01" className="dcf-sens-input" ariaLabel="WACC center" showSuffix={false} />
                        : `${(waccSteps[ri] * 100).toFixed(2)}%`}
                    </th>
                    {row.map((price, ci) => (
                      <td
                        key={ci}
                        className={ri === HALF && ci === HALF ? 'dcf-sensitivity__cell--base' : ''}
                        style={sensitivityStyle(price, grid1Range.min, grid1Range.max)}
                      >
                        {price != null ? `$${price.toFixed(2)}` : EM_DASH}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grid 2: Cost of Equity vs P/E */}
        <div className="dcf-sensitivity">
          <p className="dcf-sensitivity__title">Sensitivity: Cost of Equity vs P/E — Implied FCFE Price</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="dcf-sensitivity__table">
              <thead>
                <tr>
                  <th className="dcf-sensitivity__corner">CoE \ P/E</th>
                  {peSteps.map((p, ci) => (
                    <th key={ci}>
                      {ci === HALF
                        ? <MultipleInput value={s.peCenter} onChange={v => setS(p => ({ ...p, peCenter: v }))} step="1" className="dcf-sens-input" ariaLabel="P/E center" />
                        : `${p.toFixed(0)}x`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid2.map((row, ri) => (
                  <tr key={ri}>
                    <th>
                      {ri === HALF
                        ? <PctInput value={s.coeCenter} onChange={v => setS(p => ({ ...p, coeCenter: v }))} step="0.01" className="dcf-sens-input" ariaLabel="Cost of Equity center" showSuffix={false} />
                        : `${(coeSteps[ri] * 100).toFixed(2)}%`}
                    </th>
                    {row.map((price, ci) => (
                      <td
                        key={ci}
                        className={ri === HALF && ci === HALF ? 'dcf-sensitivity__cell--base' : ''}
                        style={sensitivityStyle(price, grid2Range.min, grid2Range.max)}
                      >
                        {price != null ? `$${price.toFixed(2)}` : EM_DASH}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
