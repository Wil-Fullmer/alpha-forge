import React, { useState, useEffect } from 'react';
import { EM_DASH, formatPct, formatLargeNumber } from '../utils/format.js';
import { useAssumptions } from '../contexts/AssumptionsContext.jsx';
import { getSharesOutstanding } from '../utils/sharesOutstanding.js';

function safeDiv(a, b) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

export default function WaccTab({ company, analysis, onWaccChange, onModelChange }) {
  const assumptions = useAssumptions();

  // Local UI state for shares and price (capital structure inputs not in AssumptionsContext)
  const [shares, setShares] = useState(() => getSharesOutstanding(company, analysis));
  const [price,  setPrice]  = useState(() => analysis?.technicals?.currentPrice ?? null);

  // Re-seed capital structure when ticker changes
  useEffect(() => {
    setShares(getSharesOutstanding(company, analysis));
    setPrice(analysis?.technicals?.currentPrice ?? null);
  }, [analysis, company]);

  function updateInput(key, pctStr) {
    const parsed = parseFloat(pctStr);
    if (!isNaN(parsed)) {
      assumptions.updateWaccInputs({ [key]: parsed / 100 });
    }
  }

  function updateRaw(key, str) {
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) {
      assumptions.updateWaccInputs({ [key]: parsed });
    }
  }

  // Derived calculations — read WACC inputs from shared context
  const { riskFreeRate, beta, mrp, costOfDebt, taxRate } = assumptions;
  const debt         = analysis?.historicalFinancials?.balanceSheets?.at(0)?.totalDebt ?? null;
  const mve          = (shares != null && price != null) ? shares * price : null;
  const total        = (debt != null && mve != null) ? debt + mve : null;
  const weightDebt   = safeDiv(debt, total);
  const weightEquity = safeDiv(mve, total);
  const capm         = riskFreeRate + beta * mrp;
  const afterTaxCOD  = costOfDebt * (1 - taxRate);
  const wacc         = (weightEquity != null && weightDebt != null)
    ? weightEquity * capm + weightDebt * afterTaxCOD
    : null;

  useEffect(() => {
    if (wacc != null) onWaccChange?.(wacc);
  }, [wacc]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onModelChange?.({
      riskFreeRate,
      beta,
      mrp,
      costOfDebt,
      taxRate,
      capm,
      afterTaxCOD,
      wacc,
      debt,
      marketValueEquity: mve,
      weightDebt,
      weightEquity,
    });
  }, [riskFreeRate, beta, mrp, costOfDebt, taxRate, capm, afterTaxCOD, wacc, debt, mve, weightDebt, weightEquity]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tab-panel tab-panel--wacc" id="tabpanel-wacc" role="tabpanel">

      {/* ── Top grid: Capital Structure (left) + Cost of Equity / Cost of Debt (right) ── */}
      <div className="wacc-layout-grid">
        {/* ── Capital Structure ── */}
        <section className="proj-section">
          <h2 className="proj-section__title">Capital Structure</h2>
          <div className="revenue-table-wrap">
            <table className="revenue-table">
              <tbody>
                <tr className="revenue-row revenue-row--value">
                  <td className="revenue-table__row-label">Debt</td>
                  <td className="revenue-cell">{formatLargeNumber(debt)}</td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">Dil. Shares Outstanding</td>
                  <td className="revenue-cell revenue-cell--input">
                    <input
                      type="number"
                      className="revenue-input revenue-input--wide"
                      value={shares != null ? shares.toFixed(0) : ''}
                      step="1000000"
                      onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setShares(v); }}
                      aria-label="Diluted Shares Outstanding"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--growth">
                  <td className="revenue-table__row-label revenue-table__row-label--sub">Price</td>
                  <td className="revenue-cell revenue-cell--input">
                    <span className="revenue-input__prefix">$</span>
                    <input
                      type="number"
                      className="revenue-input"
                      value={price != null ? price.toFixed(2) : ''}
                      step="0.01"
                      onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) setPrice(v); }}
                      aria-label="Price"
                    />
                  </td>
                </tr>

                <tr className="revenue-row revenue-row--value">
                  <td className="revenue-table__row-label">Market Value of Equity</td>
                  <td className="revenue-cell">{formatLargeNumber(mve)}</td>
                </tr>

                <tr className="revenue-row revenue-row--subtotal">
                  <td className="revenue-table__row-label">Total</td>
                  <td className="revenue-cell">{formatLargeNumber(total)}</td>
                </tr>

                <tr className="revenue-row revenue-row--value">
                  <td className="revenue-table__row-label">Weight of Debt</td>
                  <td className="revenue-cell">{formatPct(weightDebt, 2)}</td>
                </tr>

                <tr className="revenue-row revenue-row--value">
                  <td className="revenue-table__row-label">Weight of Equity</td>
                  <td className="revenue-cell">{formatPct(weightEquity, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Right column: Cost of Equity + Cost of Debt stacked ── */}
        <div className="wacc-layout-grid__right">
          {/* ── Cost of Equity ── */}
          <section className="proj-section">
            <h2 className="proj-section__title">Cost of Equity</h2>
            <div className="revenue-table-wrap">
              <table className="revenue-table">
                <tbody>
                  <tr className="revenue-row revenue-row--growth">
                    <td className="revenue-table__row-label revenue-table__row-label--sub">Risk Free Rate</td>
                    <td className="revenue-cell revenue-cell--input">
                      <input
                        type="number"
                        className="revenue-input"
                        value={(riskFreeRate * 100).toFixed(2)}
                        step="0.01"
                        onChange={e => updateInput('riskFreeRate', e.target.value)}
                        aria-label="Risk Free Rate"
                      />
                      <span className="revenue-input__suffix">%</span>
                    </td>
                  </tr>

                  <tr className="revenue-row revenue-row--growth">
                    <td className="revenue-table__row-label revenue-table__row-label--sub">Beta</td>
                    <td className="revenue-cell revenue-cell--input">
                      <input
                        type="number"
                        className="revenue-input"
                        value={beta.toFixed(3)}
                        step="0.001"
                        onChange={e => updateRaw('beta', e.target.value)}
                        aria-label="Beta"
                      />
                    </td>
                  </tr>

                  <tr className="revenue-row revenue-row--growth">
                    <td className="revenue-table__row-label revenue-table__row-label--sub">MRP</td>
                    <td className="revenue-cell revenue-cell--input">
                      <input
                        type="number"
                        className="revenue-input"
                        value={(mrp * 100).toFixed(2)}
                        step="0.01"
                        onChange={e => updateInput('mrp', e.target.value)}
                        aria-label="Market Risk Premium"
                      />
                      <span className="revenue-input__suffix">%</span>
                    </td>
                  </tr>

                  <tr className="revenue-row revenue-row--total">
                    <td className="revenue-table__row-label">CAPM</td>
                    <td className="revenue-cell">{formatPct(capm, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Cost of Debt ── */}
          <section className="proj-section">
            <h2 className="proj-section__title">Cost of Debt</h2>
            <div className="revenue-table-wrap">
              <table className="revenue-table">
                <tbody>
                  <tr className="revenue-row revenue-row--growth">
                    <td className="revenue-table__row-label revenue-table__row-label--sub">Cost of Debt</td>
                    <td className="revenue-cell revenue-cell--input">
                      <input
                        type="number"
                        className="revenue-input"
                        value={(costOfDebt * 100).toFixed(2)}
                        step="0.01"
                        onChange={e => updateInput('costOfDebt', e.target.value)}
                        aria-label="Cost of Debt"
                      />
                      <span className="revenue-input__suffix">%</span>
                    </td>
                  </tr>

                  <tr className="revenue-row revenue-row--growth">
                    <td className="revenue-table__row-label revenue-table__row-label--sub">Expected Marginal Tax Rate</td>
                    <td className="revenue-cell revenue-cell--input">
                      <input
                        type="number"
                        className="revenue-input"
                        value={(taxRate * 100).toFixed(2)}
                        step="0.01"
                        onChange={e => updateInput('taxRate', e.target.value)}
                        aria-label="Expected Marginal Tax Rate"
                      />
                      <span className="revenue-input__suffix">%</span>
                    </td>
                  </tr>

                  <tr className="revenue-row revenue-row--total">
                    <td className="revenue-table__row-label">After Tax Cost of Debt</td>
                    <td className="revenue-cell">{formatPct(afterTaxCOD, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {/* ── WACC result — full width ── */}
      <section className="proj-section">
        <h2 className="proj-section__title">Weighted Average Cost of Capital</h2>
        <div className="revenue-table-wrap">
          <table className="revenue-table">
            <tbody>
              <tr className="revenue-row wacc-result-row">
                <td className="revenue-table__row-label">WACC</td>
                <td className="revenue-cell">{wacc != null ? formatPct(wacc, 2) : EM_DASH}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
