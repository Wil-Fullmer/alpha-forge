import React from 'react';
import { EM_DASH, formatPrice, formatFixed, formatPreformatted } from '../utils/format.js';

// Maps the momentumSignal string to a badge modifier and label.
function momentumBadgeClass(signal) {
  if (!signal) return 'badge--neutral';
  const s = signal.toLowerCase();
  if (s === 'bullish') return 'badge--positive';
  if (s === 'bearish') return 'badge--negative';
  return 'badge--neutral';
}

function momentumLabel(signal) {
  if (!signal) return EM_DASH;
  return signal.charAt(0).toUpperCase() + signal.slice(1).toLowerCase();
}

// Returns a CSS class for a pre-formatted percentage string (e.g. "+6.4%" or "-1.0%").
function signClass(preformattedPct) {
  if (typeof preformattedPct !== 'string') return '';
  if (preformattedPct.startsWith('+')) return 'value--positive';
  if (preformattedPct.startsWith('-')) return 'value--negative';
  return '';
}

// RSI overbought/oversold label for aria context — not shown visually.
function rsiAriaLabel(rsi) {
  if (rsi == null) return 'RSI unavailable';
  if (rsi > 70) return `RSI ${rsi.toFixed(1)}, overbought`;
  if (rsi < 30) return `RSI ${rsi.toFixed(1)}, oversold`;
  return `RSI ${rsi.toFixed(1)}, neutral`;
}

export default function Technicals({ analysis }) {
  if (!analysis) return null;

  const t = analysis.technicals ?? {};

  const ma50          = formatPrice(t.ma50);
  const ma200         = formatPrice(t.ma200);
  const rsi           = t.rsi14 != null ? t.rsi14 : null;
  const rsiDisplay    = formatFixed(rsi, 1);
  const momentum      = t.momentumSignal ?? null;
  const vsMa50        = formatPreformatted(t.priceVsMa50Pct);
  const vsMa200       = formatPreformatted(t.priceVsMa200Pct);

  // Fully-degraded: all MA and RSI values are null — no meaningful signal to show.
  const isFullyDegraded =
    t.ma50 == null && t.ma200 == null && t.rsi14 == null;

  // Clamp RSI to [0, 100] for bar width calculation.
  const rsiPct = rsi != null ? Math.max(0, Math.min(100, rsi)) : null;
  const rsiZone =
    rsi == null ? ''
    : rsi > 70  ? 'rsi-bar__fill--overbought'
    : rsi < 30  ? 'rsi-bar__fill--oversold'
    : '';

  const vsMa50Class  = signClass(t.priceVsMa50Pct);
  const vsMa200Class = signClass(t.priceVsMa200Pct);

  // Build the price-history notice for the degraded state.
  const historyDays = analysis.metadata?.historicalPriceDays ?? null;
  const gaps = analysis.dataGaps ?? {};
  const historyNotice = gaps.ma200 ?? (
    historyDays != null
      ? `${historyDays} days of price data available — MA200 requires at least 200 trading days`
      : 'Insufficient price data — MA200 requires at least 200 trading days'
  );

  return (
    <section className="card technicals" aria-label="Technical Indicators">
      <div className="technicals__header">
        <h2 className="card__title">Technicals</h2>
        {momentum !== null && (
          <span
            className={`badge ${momentumBadgeClass(momentum)}`}
            aria-label={`Momentum signal: ${momentumLabel(momentum)}`}
          >
            {momentumLabel(momentum)}
          </span>
        )}
      </div>

      {isFullyDegraded ? (
        /* Empty-state notice — replaces stat grid and RSI bar when no data exists */
        <div className="technicals-unavailable" role="note" aria-label="Technicals unavailable">
          <span className="technicals-unavailable__label">Insufficient price history</span>
          <p className="technicals-unavailable__reason">{historyNotice}</p>
        </div>
      ) : (
        <>
          <dl className="stat-grid">
            <div className="stat-grid__item">
              <dt className="stat-grid__label">50-Day MA</dt>
              <dd className="stat-grid__value stat-grid__value--tabular">{ma50}</dd>
            </div>
            <div className="stat-grid__item">
              <dt className="stat-grid__label">200-Day MA</dt>
              <dd className="stat-grid__value stat-grid__value--tabular">{ma200}</dd>
            </div>
            <div className="stat-grid__item">
              <dt className="stat-grid__label">vs 50-Day MA</dt>
              <dd className={`stat-grid__value stat-grid__value--tabular${vsMa50Class ? ` ${vsMa50Class}` : ''}`}>
                {vsMa50}
              </dd>
            </div>
            <div className="stat-grid__item">
              <dt className="stat-grid__label">vs 200-Day MA</dt>
              <dd className={`stat-grid__value stat-grid__value--tabular${vsMa200Class ? ` ${vsMa200Class}` : ''}`}>
                {vsMa200}
              </dd>
            </div>
          </dl>

          {rsiPct !== null && (
            <div className="technicals__rsi">
              <div className="technicals__rsi-header">
                <span className="technicals__rsi-label">RSI (14)</span>
                <span
                  className="technicals__rsi-value stat-grid__value--tabular"
                  aria-label={rsiAriaLabel(rsi)}
                >
                  {rsiDisplay}
                </span>
              </div>
              <div className="rsi-bar" role="img" aria-label={rsiAriaLabel(rsi)}>
                <div
                  className={`rsi-bar__fill ${rsiZone}`}
                  style={{ width: `${rsiPct}%` }}
                />
                {/* Overbought / oversold zone markers */}
                <div className="rsi-bar__marker rsi-bar__marker--30" aria-hidden="true" />
                <div className="rsi-bar__marker rsi-bar__marker--70" aria-hidden="true" />
              </div>
              <div className="rsi-bar__legend" aria-hidden="true">
                <span>Oversold &lt;30</span>
                <span>Overbought &gt;70</span>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
