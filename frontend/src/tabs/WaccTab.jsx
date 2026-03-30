import React, { useState, useEffect } from 'react';
import { EM_DASH, formatPct, formatLargeNumber } from '../utils/format.js';

function safeDiv(a, b) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

export default function WaccTab({ company, analysis }) {
  const [inputs, setInputs] = useState({
    riskFreeRate: 0.0438,
    beta: 1.0,
    mrp: 0.05,
    costOfDebt: 0.045,
    taxRate: 0.21,
    shares: null,
    price: null,
  });

  useEffect(() => {
    const mostRecentIS = analysis?.historicalFinancials?.incomeStatements?.at(0);
    let derivedTaxRate = 0.21;
    if (mostRecentIS != null) {
      const expense = mostRecentIS.taxExpense;
      const beforeTax = mostRecentIS.incomeBeforeTax;
      if (expense != null && beforeTax != null && beforeTax !== 0) {
        const raw = expense / beforeTax;
        derivedTaxRate = Math.min(0.5, Math.max(0, raw));
      }
    }

    setInputs(prev => ({
      ...prev,
      shares: company?.sharesOutstanding ?? null,
      price:  analysis?.technicals?.currentPrice ?? null,
      beta:   company?.beta ?? 1.0,
      taxRate: derivedTaxRate,
    }));
  }, [analysis, company]);

  function updateInput(key, pctStr) {
    const parsed = parseFloat(pctStr);
    if (!isNaN(parsed)) {
      setInputs(prev => ({ ...prev, [key]: parsed / 100 }));
    }
  }

  function updateRaw(key, str) {
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) {
      setInputs(prev => ({ ...prev, [key]: parsed }));
    }
  }

  // Derived calculations
  const debt         = analysis?.historicalFinancials?.balanceSheets?.at(0)?.totalDebt ?? null;
  const mve          = (inputs.shares != null && inputs.price != null) ? inputs.shares * inputs.price : null;
  const total        = (debt != null && mve != null) ? debt + mve : null;
  const weightDebt   = safeDiv(debt, total);
  const weightEquity = safeDiv(mve, total);
  const capm         = inputs.riskFreeRate + inputs.beta * inputs.mrp;
  const afterTaxCOD  = inputs.costOfDebt * (1 - inputs.taxRate);
  const wacc         = (weightEquity != null && weightDebt != null)
    ? weightEquity * capm + weightDebt * afterTaxCOD
    : null;

  return (
    <div className="tab-panel tab-panel--wacc" id="tabpanel-wacc" role="tabpanel">

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
                    value={inputs.shares != null ? inputs.shares.toFixed(0) : ''}
                    step="1000000"
                    onChange={e => updateRaw('shares', e.target.value)}
                    aria-label="Diluted Shares Outstanding"
                  />
                </td>
              </tr>

              <tr className="revenue-row revenue-row--growth">
                <td className="revenue-table__row-label revenue-table__row-label--sub">Price</td>
                <td className="revenue-cell revenue-cell--input">
                  <span className="revenue-input__suffix" style={{ marginRight: '4px' }}>$</span>
                  <input
                    type="number"
                    className="revenue-input"
                    value={inputs.price != null ? inputs.price.toFixed(2) : ''}
                    step="0.01"
                    onChange={e => updateRaw('price', e.target.value)}
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
                    value={(inputs.riskFreeRate * 100).toFixed(2)}
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
                    value={inputs.beta.toFixed(3)}
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
                    value={(inputs.mrp * 100).toFixed(2)}
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
                    value={(inputs.costOfDebt * 100).toFixed(2)}
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
                    value={(inputs.taxRate * 100).toFixed(2)}
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

      {/* ── WACC ── */}
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
