import React from 'react';
import { EM_DASH, formatPrice, formatMarketCap, formatFixed, formatDaysAgo, stalenessLevel } from '../utils/format.js';

export default function MarketSnapshot({ company, analysis }) {
  if (!company || !analysis) return null;

  const price     = formatPrice(analysis.technicals?.currentPrice);
  const marketCap = formatMarketCap(company.marketCap);
  const beta      = formatFixed(company.beta, 3);
  const pe        = formatFixed(analysis.coreMetrics?.peRatio, 2);
  const eps       = analysis.coreMetrics?.eps != null
                      ? `$${analysis.coreMetrics.eps.toFixed(2)}`
                      : EM_DASH;

  const analysisDate   = analysis.analysisDate ?? null;
  const daysAgo        = formatDaysAgo(analysisDate);
  const freshnessLevel = stalenessLevel(analysisDate);
  const dateDisplay    = analysisDate ?? EM_DASH;

  return (
    <section className="card market-snapshot" aria-label="Market Snapshot">
      <div className="market-snapshot__header">
        <h2 className="card__title">Market Snapshot</h2>
        {daysAgo !== null && (
          <div
            className={`freshness-badge freshness-badge--${freshnessLevel}`}
            title={`Analysis date: ${dateDisplay}`}
          >
            <span className="freshness-badge__dot" aria-hidden="true" />
            <span className="freshness-badge__label">
              {daysAgo}
              <span className="freshness-badge__date"> &middot; {dateDisplay}</span>
            </span>
          </div>
        )}
      </div>

      <dl className="stat-grid stat-grid--large">
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Current Price</dt>
          <dd className="stat-grid__value stat-grid__value--hero">{price}</dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Market Cap</dt>
          <dd className="stat-grid__value stat-grid__value--hero">{marketCap}</dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Beta</dt>
          <dd className="stat-grid__value stat-grid__value--tabular">{beta}</dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">P/E Ratio</dt>
          <dd className="stat-grid__value stat-grid__value--tabular">{pe}</dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">EPS</dt>
          <dd className="stat-grid__value stat-grid__value--tabular">{eps}</dd>
        </div>
      </dl>
    </section>
  );
}
