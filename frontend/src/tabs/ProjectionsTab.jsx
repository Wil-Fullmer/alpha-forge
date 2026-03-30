import React, { useState, useEffect, useCallback } from 'react';
import { formatLargeNumber } from '../utils/format.js';

const PROJ_COUNT = 4;
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

// ── Seed helpers ─────────────────────────────────────────────────────────────

function makeSeedAssumptions(analysis) {
  const stmts = [...(analysis?.historicalFinancials?.incomeStatements ?? [])].reverse();
  const bss   = [...(analysis?.historicalFinancials?.balanceSheets ?? [])].reverse();
  const cfs   = [...(analysis?.historicalFinancials?.cashFlows ?? [])].reverse();

  const last   = stmts.at(-1) ?? {};
  const lastBS = bss.at(-1) ?? {};
  const lastCF = cfs.at(-1) ?? {};

  const rev = last.revenue ?? 1;

  const seedRevGrowth = analysis?.dcf?.assumedGrowthRate ?? 0.05;
  const seedGM    = safeDiv(last.grossProfit, rev) ?? 0.45;
  const seedRD    = safeDiv(last.researchAndDev, rev) ?? 0.08;
  const seedSGA   = safeDiv(last.sgaExpense, rev) ?? 0.06;
  const seedDA    = safeDiv(last.depreciationAmort, rev) ?? 0.03;
  const seedNI    = last.netInterestIncome ?? 0;
  const seedOther = last.otherIncomeExpense ?? 0;
  const seedTax   = (last.taxExpense != null && last.incomeBeforeTax > 0)
                    ? safeDiv(last.taxExpense, last.incomeBeforeTax) ?? 0.20
                    : 0.20;
  const seedCapex = lastCF.capitalExpenditure != null
                    ? Math.abs(lastCF.capitalExpenditure) / rev
                    : 0.03;
  const nwcLast   = (lastBS.totalCurrentAssets ?? 0) - (lastBS.totalCurrentLiabilities ?? 0);
  const seedNWC   = last.revenue ? nwcLast / last.revenue : 0.05;

  const fill = v => Array(PROJ_COUNT).fill(v);
  return {
    revenueGrowth: fill(seedRevGrowth),
    grossMargin:   fill(seedGM),
    rdPct:         fill(seedRD),
    sgaPct:        fill(seedSGA),
    daPct:         fill(seedDA),
    netInterest:   fill(seedNI),
    otherIncome:   fill(seedOther),
    taxRate:       fill(seedTax),
    capexPct:      fill(seedCapex),
    nwcPct:        fill(seedNWC),
  };
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ProjectionsTab({ analysis }) {
  const [assumptions, setAssumptions] = useState(() => makeSeedAssumptions(analysis));

  useEffect(() => {
    setAssumptions(makeSeedAssumptions(analysis));
  }, [analysis]);

  const updateAssumption = useCallback((key, i, rawStr) => {
    const parsed = parseFloat(rawStr);
    if (isNaN(parsed)) return;
    setAssumptions(prev => {
      const next = { ...prev, [key]: [...prev[key]] };
      // % inputs: user types "46.8" → store 0.468; absolute inputs: store raw × 1e9
      next[key][i] = parsed;
      return next;
    });
  }, []);

  // Inputs stored as decimals for % keys, as raw $ for absolute keys
  const updatePct = (key, i, rawStr) => {
    const parsed = parseFloat(rawStr);
    if (isNaN(parsed)) return;
    setAssumptions(prev => {
      const next = { ...prev, [key]: [...prev[key]] };
      next[key][i] = parsed / 100;
      return next;
    });
  };

  const updateAbs = (key, i, rawStr) => {
    const parsed = parseFloat(rawStr);
    if (isNaN(parsed)) return;
    setAssumptions(prev => {
      const next = { ...prev, [key]: [...prev[key]] };
      next[key][i] = parsed * 1e9; // user types $B
      return next;
    });
  };

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

  const lastHistYear = stmts.at(-1)?.date?.slice(0, 4)
    ? parseInt(stmts.at(-1).date.slice(0, 4), 10)
    : new Date().getFullYear();
  const projYears = Array.from({ length: PROJ_COUNT }, (_, i) => `FY${lastHistYear + i + 1}`);

  // ── Projections (rolling) ─────────────────────────────────────────────────
  const baseRevenue = stmts.at(-1)?.revenue ?? null;
  const projRevenue = assumptions.revenueGrowth.reduce((acc, r) => {
    const prev = acc.at(-1) ?? baseRevenue;
    acc.push(prev != null ? prev * (1 + r) : null);
    return acc;
  }, []);

  const projGrossProfit = projRevenue.map((rev, i) =>
    rev != null ? rev * assumptions.grossMargin[i] : null);
  const projCOGS = projRevenue.map((rev, i) =>
    projGrossProfit[i] != null ? rev - projGrossProfit[i] : null);
  const projRD  = projRevenue.map((rev, i) =>
    rev != null ? rev * assumptions.rdPct[i] : null);
  const projSGA = projRevenue.map((rev, i) =>
    rev != null ? rev * assumptions.sgaPct[i] : null);
  const projDA  = projRevenue.map((rev, i) =>
    rev != null ? rev * assumptions.daPct[i] : null);
  const projOpIncome = projGrossProfit.map((gp, i) =>
    gp != null ? gp - (projRD[i] ?? 0) - (projSGA[i] ?? 0) - (projDA[i] ?? 0) : null);
  const projEBT = projOpIncome.map((op, i) =>
    op != null ? op + (assumptions.netInterest[i] ?? 0) + (assumptions.otherIncome[i] ?? 0) : null);
  const projTax = projEBT.map((ebt, i) =>
    ebt != null ? Math.max(0, ebt * assumptions.taxRate[i]) : null);
  const projNetIncome = projEBT.map((ebt, i) =>
    ebt != null && projTax[i] != null ? ebt - projTax[i] : null);

  const projCapex = projRevenue.map((rev, i) =>
    rev != null ? rev * assumptions.capexPct[i] : null);

  const lastBS  = bss.at(-1) ?? {};
  const nwcLast = (lastBS.totalCurrentAssets ?? 0) - (lastBS.totalCurrentLiabilities ?? 0);
  const projNWC = projRevenue.map((rev, i) =>
    rev != null ? rev * assumptions.nwcPct[i] : null);
  const projChangeNWC = projNWC.map((nwc, i) => {
    const prev = i === 0 ? nwcLast : (projNWC[i - 1] ?? nwcLast);
    return nwc != null && prev != null ? nwc - prev : null;
  });

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

  function dashCells(count = stmts.length) {
    return Array.from({ length: count }, (_, i) => (
      <td key={i} className="revenue-cell revenue-cell--historical revenue-cell--growth">{EM_DASH}</td>
    ));
  }

  function pctInputCells(key, inputLabel) {
    return assumptions[key].map((rate, i) => (
      <td key={projYears[i]} className="revenue-cell revenue-cell--projected revenue-cell--input">
        <input
          type="number"
          className="revenue-input"
          value={(rate * 100).toFixed(2)}
          step="0.1"
          onChange={e => updatePct(key, i, e.target.value)}
          aria-label={`${projYears[i]} ${inputLabel}`}
        />
        <span className="revenue-input__suffix">%</span>
      </td>
    ));
  }

  function absInputCells(key, inputLabel) {
    return assumptions[key].map((val, i) => (
      <td key={projYears[i]} className="revenue-cell revenue-cell--projected revenue-cell--input">
        <input
          type="number"
          className="revenue-input revenue-input--wide"
          value={(val / 1e9).toFixed(1)}
          step="0.1"
          onChange={e => updateAbs(key, i, e.target.value)}
          aria-label={`${projYears[i]} ${inputLabel}`}
        />
        <span className="revenue-input__suffix">B</span>
      </td>
    ));
  }

  function nullProjCells() {
    return projYears.map(yr => (
      <td key={yr} className="revenue-cell revenue-cell--projected revenue-cell--null">
        {EM_DASH}
      </td>
    ));
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
      <div className="proj-section">
        <p className="proj-section__title">Income Statement</p>
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>{colHeaders}</thead>
            <tbody>
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">Revenue</td>
                {histCells(s => s.revenue)}
                {projCells(projRevenue)}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Rev Growth %</td>
                {dashCells()}
                {pctInputCells('revenueGrowth', 'revenue growth')}
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
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Gross Margin %</td>
                {histPctCells(s => s.grossProfit, s => s.revenue)}
                {pctInputCells('grossMargin', 'gross margin')}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">R&amp;D</td>
                {histCells(s => s.researchAndDev)}
                {projCells(projRD)}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">R&amp;D % Rev</td>
                {histPctCells(s => s.researchAndDev, s => s.revenue)}
                {pctInputCells('rdPct', 'R&D % of revenue')}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">SG&amp;A</td>
                {histCells(s => s.sgaExpense)}
                {projCells(projSGA)}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">SG&amp;A % Rev</td>
                {histPctCells(s => s.sgaExpense, s => s.revenue)}
                {pctInputCells('sgaPct', 'SG&A % of revenue')}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">D&amp;A</td>
                {histCells(s => s.depreciationAmort)}
                {projCells(projDA)}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">D&amp;A % Rev</td>
                {histPctCells(s => s.depreciationAmort, s => s.revenue)}
                {pctInputCells('daPct', 'D&A % of revenue')}
              </tr>

              <tr className="revenue-row revenue-row--value revenue-row--subtotal">
                <td className="revenue-table__row-label">Operating Profit (Loss)</td>
                {histCells(s => s.operatingIncome)}
                {projCells(projOpIncome)}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Net Interest Inc (Exp)</td>
                {histCells(s => s.netInterestIncome)}
                {absInputCells('netInterest', 'net interest income/expense')}
              </tr>

              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label revenue-table__row-label--indent">Other Inc (Exp)</td>
                {histCells(s => s.otherIncomeExpense)}
                {absInputCells('otherIncome', 'other income/expense')}
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
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Tax Rate %</td>
                {histPctCells(s => s.taxExpense, s => s.incomeBeforeTax)}
                {pctInputCells('taxRate', 'effective tax rate')}
              </tr>

              <tr className="revenue-row revenue-row--value revenue-row--total">
                <td className="revenue-table__row-label">Net Income</td>
                {histCells(s => s.netIncome)}
                {projCells(projNetIncome)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: Common Size Income Statement ─────────────────────── */}
      <div className="proj-section">
        <p className="proj-section__title">Common Size Income Statement <span className="proj-section__subtitle">(% of Revenue)</span></p>
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <thead>{colHeaders}</thead>
            <tbody>
              {/* Revenue row: show YoY growth %, not revenue/revenue */}
              <tr className="revenue-row revenue-row--value">
                <td className="revenue-table__row-label">Revenue</td>
                {stmts.map((s, si) => (
                  <td key={s.date ?? si} className="revenue-cell revenue-cell--historical revenue-cell--growth">
                    {si === 0 ? EM_DASH : fmtPct(safeDiv(s.revenue, stmts[si - 1].revenue) != null ? (s.revenue / stmts[si - 1].revenue) - 1 : null)}
                  </td>
                ))}
                {assumptions.revenueGrowth.map((rate, pi) => (
                  <td key={projYears[pi]} className="revenue-cell revenue-cell--projected revenue-cell--growth">
                    {fmtPct(rate)}
                  </td>
                ))}
              </tr>

              {[
                ['COGS',                     s => s.costOfRevenue,     projCOGS],
                ['Gross Profit',             s => s.grossProfit,       projGrossProfit],
                ['R&D',                      s => s.researchAndDev,    projRD],
                ['SG&A',                     s => s.sgaExpense,        projSGA],
                ['D&A',                      s => s.depreciationAmort, projDA],
                ['Operating Profit (Loss)',  s => s.operatingIncome,   projOpIncome],
                ['EBT',                      s => s.incomeBeforeTax,   projEBT],
                ['Tax Provision',            s => s.taxExpense,        projTax],
                ['Net Income',               s => s.netIncome,         projNetIncome],
              ].map(([label, getter, projArr]) => (
                <tr key={label} className="revenue-row revenue-row--value">
                  <td className="revenue-table__row-label">{label}</td>
                  {stmts.map((s, si) => {
                    const val = getter(s);
                    const rev = s.revenue;
                    return (
                      <td key={s.date ?? si} className="revenue-cell revenue-cell--historical revenue-cell--growth">
                        {fmtPctAbs(safeDiv(val, rev))}
                      </td>
                    );
                  })}
                  {projArr.map((v, pi) => {
                    const rev = projRevenue[pi];
                    return (
                      <td key={projYears[pi]} className="revenue-cell revenue-cell--projected revenue-cell--growth">
                        {fmtPctAbs(safeDiv(v, rev))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Other Forecasted Terms ───────────────────────────── */}
      <div className="proj-section">
        <p className="proj-section__title">Other Forecasted Terms</p>
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
                {nullProjCells()}
              </tr>
              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Net Debt / EBITDA</td>
                {bss.map((s, i) => {
                  const inc = stmts[i];
                  const ebitda = inc ? (inc.operatingIncome ?? 0) + (inc.depreciationAmort ?? 0) : null;
                  const ratio = safeDiv(s.netDebt, ebitda);
                  return (
                    <td key={s.date ?? i} className="revenue-cell revenue-cell--historical revenue-cell--growth">
                      {ratio != null ? ratio.toFixed(1) + 'x' : EM_DASH}
                    </td>
                  );
                })}
                {nullProjCells()}
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
                {cfs.map((s, i) => (
                  <td key={s.date ?? i} className="revenue-cell revenue-cell--historical">
                    {formatLargeNumber(s.changeInWorkingCap)}
                  </td>
                ))}
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
      </div>

    </div>
  );
}
