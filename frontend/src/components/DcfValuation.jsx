import React from 'react';
import {
  EM_DASH,
  formatPrice,
  formatLargeNumber,
  formatPct,
  formatPreformatted,
} from '../utils/format.js';

// Extracts the skip reason from analysis.flags.
// Looks for a flag starting with "DCF skipped:" and returns the text after
// that prefix. Falls back to the provided default string.
function extractDcfSkipReason(flags, fallback) {
  if (!Array.isArray(flags)) return fallback;
  const match = flags.find(f => typeof f === 'string' && f.startsWith('DCF skipped:'));
  if (!match) return fallback;
  return match.slice('DCF skipped: '.length).trim();
}

// Renders the DCF valuation card.
// assumedGrowthRate, assumedWACC, terminalGrowthRate come as decimals
// from the API — multiply ×100 for display per API contract.
export default function DcfValuation({ analysis }) {
  if (!analysis) return null;

  const dcf = analysis.dcf ?? {};

  const isSkipped = dcf.intrinsicValuePerShare == null;

  const intrinsic       = formatPrice(dcf.intrinsicValuePerShare);
  const currentPrice    = formatPrice(dcf.currentPrice);
  const upDownside      = formatPreformatted(dcf.upDownside);
  const growthRate      = formatPct(dcf.assumedGrowthRate, 2);
  const wacc            = formatPct(dcf.assumedWACC, 1);
  const terminalGrowth  = formatPct(dcf.terminalGrowthRate, 1);
  const growthSource    = dcf.growthRateSource ?? EM_DASH;
  const fcfList         = Array.isArray(dcf.projectedFreeCashFlows)
                            ? dcf.projectedFreeCashFlows
                            : [];

  // Determine colour class based on upDownside sign
  const isPositive = typeof dcf.upDownside === 'string' && dcf.upDownside.startsWith('+');
  const isNegative = typeof dcf.upDownside === 'string' && dcf.upDownside.startsWith('-');
  const upDownsideClass = isPositive
    ? 'value--positive'
    : isNegative
    ? 'value--negative'
    : '';

  const skipReason = isSkipped
    ? extractDcfSkipReason(
        analysis.flags,
        'Model requires positive free cash flow'
      )
    : null;

  return (
    <section className="card dcf-valuation" aria-label="DCF Valuation">
      <h2 className="card__title">DCF Valuation</h2>

      {isSkipped ? (
        /* Skipped-state notice — replaces the verdict row */
        <div className="dcf-skipped" role="note" aria-label="DCF model skipped">
          <span className="dcf-skipped__label">Skipped</span>
          <p className="dcf-skipped__reason">{skipReason}</p>
        </div>
      ) : (
        /* Verdict row — the primary output: intrinsic vs price vs up/downside */
        <dl className="dcf-verdict">
          <div className="dcf-verdict__item">
            <dt className="dcf-verdict__label">Intrinsic Value / Share</dt>
            <dd className="dcf-verdict__value">{intrinsic}</dd>
          </div>
          <div className="dcf-verdict__divider" aria-hidden="true" />
          <div className="dcf-verdict__item">
            <dt className="dcf-verdict__label">Current Price</dt>
            <dd className="dcf-verdict__value">{currentPrice}</dd>
          </div>
          <div className="dcf-verdict__divider" aria-hidden="true" />
          <div className="dcf-verdict__item dcf-verdict__item--updown">
            <dt className="dcf-verdict__label">Up / Downside</dt>
            <dd className={`dcf-verdict__value dcf-verdict__value--updown ${upDownsideClass}`}>
              {upDownside}
            </dd>
          </div>
        </dl>
      )}

      {/* Assumptions tier — secondary, visually subordinated; always rendered */}
      <div className="dcf-assumptions">
        <span className="dcf-assumptions__heading">Assumptions</span>
        <dl className="dcf-assumptions__grid">
          <div className="dcf-assumptions__item">
            <dt className="dcf-assumptions__label">Growth Rate</dt>
            <dd className="dcf-assumptions__value">{growthRate}</dd>
          </div>
          <div className="dcf-assumptions__item">
            <dt className="dcf-assumptions__label">WACC</dt>
            <dd className="dcf-assumptions__value">{wacc}</dd>
          </div>
          <div className="dcf-assumptions__item">
            <dt className="dcf-assumptions__label">Terminal Growth</dt>
            <dd className="dcf-assumptions__value">{terminalGrowth}</dd>
          </div>
          <div className="dcf-assumptions__item">
            <dt className="dcf-assumptions__label">Growth Source</dt>
            <dd className="dcf-assumptions__value dcf-assumptions__value--muted">{growthSource}</dd>
          </div>
        </dl>
      </div>

      {fcfList.length > 0 && (
        <div className="dcf-valuation__fcf">
          <h3 className="dcf-valuation__fcf-title">Projected Free Cash Flows</h3>
          <ol className="fcf-list" aria-label="Projected free cash flows by year">
            {fcfList.map((fcf, i) => (
              <li key={i} className="fcf-list__item">
                <span className="fcf-list__year">Y{i + 1}</span>
                <span className="fcf-list__value">{formatLargeNumber(fcf)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
