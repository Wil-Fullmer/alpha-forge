import React from 'react';
import { EM_DASH, formatFixed, formatPct } from '../utils/format.js';

// roe and debtToEquity come as plain ratios from the API.
// Multiply by 100 before displaying as percentages per API contract.
export default function CoreMetrics({ analysis }) {
  if (!analysis) return null;

  const m = analysis.coreMetrics ?? {};

  // roe: ratio → multiply ×100 for % display
  const roe = m.roe != null ? formatPct(m.roe, 2) : EM_DASH;

  // debtToEquity: ratio → multiply ×100 for % display
  const de = m.debtToEquity != null ? formatPct(m.debtToEquity, 2) : EM_DASH;

  // sharpeRatio: dimensionless — show to 4 decimal places
  const sharpe = formatFixed(m.sharpeRatio, 4);

  // Classify Sharpe for colour coding
  const sharpeClass =
    m.sharpeRatio == null
      ? 'value--null'
      : m.sharpeRatio >= 1
      ? 'value--positive'
      : m.sharpeRatio >= 0
      ? 'value--neutral'
      : 'value--negative';

  return (
    <section className="card core-metrics" aria-label="Core Metrics">
      <h2 className="card__title">Core Metrics</h2>

      <dl className="stat-grid">
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Return on Equity (ROE)</dt>
          <dd className={`stat-grid__value stat-grid__value--tabular${roe === EM_DASH ? ' value--null' : ''}`}>{roe}</dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Debt / Equity</dt>
          <dd className={`stat-grid__value stat-grid__value--tabular${de === EM_DASH ? ' value--null' : ''}`}>{de}</dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Sharpe Ratio</dt>
          <dd className={`stat-grid__value stat-grid__value--tabular ${sharpeClass}`}>{sharpe}</dd>
        </div>
      </dl>

      <p className="card__footnote">
        ROE and Debt/Equity shown as percentages (ratio &times; 100). Sharpe ratio is annualised from daily returns.
      </p>
    </section>
  );
}
