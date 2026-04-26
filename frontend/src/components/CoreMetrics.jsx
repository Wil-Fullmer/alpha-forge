import React from 'react';
import { EM_DASH, formatPct } from '../utils/format.js';
import Sparkline from './Sparkline.jsx';
import DataGapNote from './DataGapNote.jsx';

function safeDiv(a, b) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function pctFmt(v) {
  if (v == null || isNaN(v)) return EM_DASH;
  return `${(v * 100).toFixed(2)}%`;
}

// Build oldest→newest ROE / D/E series from historical financials
function buildRatioHistory(incomeStatements, balanceSheets) {
  const bsMap = {};
  for (const bs of (balanceSheets ?? [])) {
    const yr = bs.date?.slice(0, 4);
    if (yr) bsMap[yr] = bs;
  }

  return [...(incomeStatements ?? [])]
    .reverse() // oldest first
    .map(is => {
      const yr  = is.date?.slice(0, 4);
      const bs  = yr ? bsMap[yr] : null;
      return {
        year: yr,
        roe:  safeDiv(is.netIncome, bs?.totalStockholdersEquity),
        de:   safeDiv(bs?.totalDebt, bs?.totalStockholdersEquity),
      };
    })
    .filter(r => r.year);
}

const sparkLabelStyle = {
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--font-weight-medium)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--color-text-muted)',
  marginBottom: '2px',
  marginTop: '10px',
};

export default function CoreMetrics({ analysis }) {
  if (!analysis) return null;

  const m    = analysis.coreMetrics ?? {};
  const gaps = analysis.dataGaps ?? {};

  const roe = m.roe != null ? formatPct(m.roe, 2) : EM_DASH;
  const de  = m.debtToEquity != null ? formatPct(m.debtToEquity, 2) : EM_DASH;

  const ratioHistory = buildRatioHistory(
    analysis.historicalFinancials?.incomeStatements,
    analysis.historicalFinancials?.balanceSheets,
  );

  return (
    <section className="card core-metrics" aria-label="Core Metrics">
      <h2 className="card__title">Core Metrics</h2>

      <dl className="stat-grid">
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Return on Equity (ROE)</dt>
          <dd className={`stat-grid__value stat-grid__value--tabular${roe === EM_DASH ? ' value--null' : ''}`}>
            {roe}<DataGapNote reason={roe === EM_DASH ? gaps.roe : null} />
          </dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Debt / Equity</dt>
          <dd className={`stat-grid__value stat-grid__value--tabular${de === EM_DASH ? ' value--null' : ''}`}>
            {de}<DataGapNote reason={de === EM_DASH ? gaps.debtToEquity : null} />
          </dd>
        </div>
      </dl>

      <div>
        <div style={sparkLabelStyle}>ROE — 5yr history</div>
        <Sparkline
          data={ratioHistory}
          dataKey="roe"
          color="var(--color-accent)"
          fmt={pctFmt}
          label="ROE"
        />
      </div>

      <div>
        <div style={sparkLabelStyle}>D/E — 5yr history</div>
        <Sparkline
          data={ratioHistory}
          dataKey="de"
          color="var(--color-positive)"
          fmt={pctFmt}
          label="D/E"
        />
      </div>

      <p className="card__footnote" style={{ marginTop: '8px' }}>
        ROE and D/E shown as percentages (ratio &times; 100).
      </p>
    </section>
  );
}
