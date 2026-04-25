import React from 'react';
import { EM_DASH, formatPct } from '../utils/format.js';
import PctInput from '../components/PctInput.jsx';
import MultipleInput from '../components/MultipleInput.jsx';
import MarketSnapshot from '../components/MarketSnapshot.jsx';
import CoreMetrics from '../components/CoreMetrics.jsx';
import { useAssumptions } from '../contexts/AssumptionsContext.jsx';
import { useRevenue } from '../contexts/RevenueContext.jsx';

function fmtPctSign(v, d = 1) {
  if (v == null || isNaN(v)) return EM_DASH;
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(d)}%`;
}

function allSame(arr) {
  if (!arr?.length) return true;
  return arr.every(v => Math.abs(v - arr[0]) < 1e-9);
}

export default function AssumptionsTab({ company, analysis }) {
  const ctx = useAssumptions();
  const { revenueData } = useRevenue();

  const capm       = ctx.riskFreeRate + ctx.beta * ctx.mrp;
  const afterTaxCOD = ctx.costOfDebt * (1 - ctx.taxRate);

  const growthRates = revenueData?.growthRates ?? ctx.revenueGrowth ?? [];
  const projStartYear = new Date().getFullYear();

  // Display scalar for a per-year assumption array.
  // If all years match show the value; if mixed show the first year value with an asterisk.
  function scalarDisplay(key) {
    const arr = ctx[key];
    if (!arr?.length) return null;
    return arr[0];
  }

  function scalarLabel(key) {
    return allSame(ctx[key]) ? '' : '*';
  }

  return (
    <div className="tab-panel tab-panel--assumptions" id="tabpanel-assumptions" role="tabpanel">

      {/* ── Market snapshot + core metrics ── */}
      <div className="tab-panel__grid">
        <MarketSnapshot company={company} analysis={analysis} />
        <CoreMetrics analysis={analysis} />
      </div>

      {/* ── Two-column assumption controls ── */}
      <div className="wacc-layout-grid">

        {/* ── Left: Cost of Capital ── */}
        <section className="proj-section">
          <h2 className="proj-section__title">Cost of Capital</h2>
          <p className="proj-section__subtitle">WACC inputs · live-wired to WACC and DCF tabs</p>
          <div className="revenue-table-wrap">
            <table className="revenue-table">
              <tbody>
                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">Risk-Free Rate</td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={ctx.riskFreeRate}
                      onChange={v => ctx.updateWaccInputs({ riskFreeRate: v })}
                      className="revenue-input"
                      ariaLabel="Risk-Free Rate"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">Beta</td>
                  <td className="revenue-cell revenue-cell--input">
                    <MultipleInput
                      value={ctx.beta}
                      onChange={v => ctx.updateWaccInputs({ beta: v })}
                      className="revenue-input"
                      step="0.001"
                      ariaLabel="Beta"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">Equity Risk Premium</td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={ctx.mrp}
                      onChange={v => ctx.updateWaccInputs({ mrp: v })}
                      className="revenue-input"
                      ariaLabel="Market Risk Premium"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--total">
                  <td className="revenue-table__row-label">Cost of Equity (CAPM)</td>
                  <td className="revenue-cell">{formatPct(capm, 2)}</td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">Cost of Debt</td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={ctx.costOfDebt}
                      onChange={v => ctx.updateWaccInputs({ costOfDebt: v })}
                      className="revenue-input"
                      ariaLabel="Cost of Debt"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">Marginal Tax Rate</td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={ctx.taxRate}
                      onChange={v => ctx.updateWaccInputs({ taxRate: v })}
                      className="revenue-input"
                      ariaLabel="Marginal Tax Rate"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--total">
                  <td className="revenue-table__row-label">After-Tax Cost of Debt</td>
                  <td className="revenue-cell">{formatPct(afterTaxCOD, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Right: Projection Driver Defaults ── */}
        <section className="proj-section">
          <h2 className="proj-section__title">Projection Driver Defaults</h2>
          <p className="proj-section__subtitle">Sets all 5 projected years · override per-year in Projections</p>
          <div className="revenue-table-wrap">
            <table className="revenue-table">
              <tbody>
                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">
                    COGS %{scalarLabel('cogsPct')}
                  </td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={scalarDisplay('cogsPct')}
                      onChange={v => ctx.fillProjectionRatio('cogsPct', v)}
                      className="revenue-input"
                      ariaLabel="COGS % of Revenue"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">
                    R&amp;D %{scalarLabel('rdPct')}
                  </td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={scalarDisplay('rdPct')}
                      onChange={v => ctx.fillProjectionRatio('rdPct', v)}
                      className="revenue-input"
                      ariaLabel="R&D % of Revenue"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">
                    SG&amp;A %{scalarLabel('sgaPct')}
                  </td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={scalarDisplay('sgaPct')}
                      onChange={v => ctx.fillProjectionRatio('sgaPct', v)}
                      className="revenue-input"
                      ariaLabel="SG&A % of Revenue"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">
                    D&amp;A %{scalarLabel('daPct')}
                  </td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={scalarDisplay('daPct')}
                      onChange={v => ctx.fillProjectionRatio('daPct', v)}
                      className="revenue-input"
                      ariaLabel="D&A % of Revenue"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">
                    CAPEX %{scalarLabel('capexPct')}
                  </td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={scalarDisplay('capexPct')}
                      onChange={v => ctx.fillProjectionRatio('capexPct', v)}
                      className="revenue-input"
                      ariaLabel="CAPEX % of Revenue"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">
                    NWC %{scalarLabel('nwcPct')}
                  </td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={scalarDisplay('nwcPct')}
                      onChange={v => ctx.fillProjectionRatio('nwcPct', v)}
                      className="revenue-input"
                      ariaLabel="NWC % of Revenue"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">
                    Effective Tax Rate %{scalarLabel('projTaxRate')}
                  </td>
                  <td className="revenue-cell revenue-cell--input">
                    <PctInput
                      value={scalarDisplay('projTaxRate')}
                      onChange={v => ctx.fillProjectionRatio('projTaxRate', v)}
                      className="revenue-input"
                      ariaLabel="Effective Tax Rate"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {Object.keys({cogsPct:1,rdPct:1,sgaPct:1,daPct:1,capexPct:1,nwcPct:1,projTaxRate:1}).some(k => !allSame(ctx[k])) && (
            <p className="tab-shell__note" style={{ marginTop: 'var(--space-2)', fontSize: '11px' }}>
              * Per-year values differ — showing Year 1. Edit in Projections tab for granular control.
            </p>
          )}
        </section>
      </div>

      {/* ── Revenue growth schedule ── */}
      {growthRates.length > 0 && (
        <section className="proj-section">
          <h2 className="proj-section__title">Revenue Growth Schedule</h2>
          <p className="proj-section__subtitle">Set per-year in Revenue tab · shown here as reference</p>
          <div className="revenue-table-wrap">
            <table className="revenue-table">
              <thead>
                <tr>
                  <th className="revenue-table__row-label" scope="col"></th>
                  {growthRates.map((_, i) => (
                    <th key={i} className="revenue-col-header revenue-col-header--projected" scope="col">
                      FY{projStartYear + i}
                      <span className="revenue-col-header__tag">Projected</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="revenue-row revenue-row--value">
                  <td className="revenue-table__row-label">Revenue Growth %</td>
                  {growthRates.map((rate, i) => (
                    <td key={i} className="revenue-cell revenue-cell--projected revenue-cell--growth">
                      {fmtPctSign(rate)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
