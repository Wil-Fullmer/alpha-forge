import React from 'react';
import FlagsPanel from '../components/FlagsPanel.jsx';

function fmtPrice(v) {
  if (v == null || isNaN(v)) return '—';
  const isNeg = v < 0;
  const abs = Math.abs(v);
  return isNeg ? `($${abs.toFixed(2)})` : `$${abs.toFixed(2)}`;
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(v * 100).toFixed(1)}%`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return dateStr.split('T')[0];
}

function WeightingTable({ title, subtitle, dcfLabel, dcfPrice, rvLabel, rvPrice, dcfWeight, rvWeight }) {
  const dcfVal = dcfPrice != null ? dcfPrice * dcfWeight : null;
  const rvVal  = rvPrice  != null ? rvPrice  * rvWeight  : null;
  const total  = dcfVal != null && rvVal != null ? dcfVal + rvVal : null;

  return (
    <div className="fv-section">
      <h2 className="fv-section__title">{title}</h2>
      {subtitle && <p className="fv-section__subtitle">{subtitle}</p>}
      <div className="fv-table-scroll">
        <table className="fv-table">
          <thead>
            <tr>
              <th>Method</th>
              <th className="fv-cell--num">Implied Price</th>
              <th className="fv-cell--num">Weight</th>
              <th className="fv-cell--num">Weighted Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{dcfLabel}</td>
              <td className="fv-cell--num">{fmtPrice(dcfPrice)}</td>
              <td className="fv-cell--num">{(dcfWeight * 100).toFixed(0)}%</td>
              <td className="fv-cell--num">{fmtPrice(dcfVal)}</td>
            </tr>
            <tr>
              <td>{rvLabel}</td>
              <td className="fv-cell--num">{fmtPrice(rvPrice)}</td>
              <td className="fv-cell--num">{(rvWeight * 100).toFixed(0)}%</td>
              <td className="fv-cell--num">{fmtPrice(rvVal)}</td>
            </tr>
            <tr className="fv-row--total">
              <td>Weighted Average</td>
              <td className="fv-cell--num">—</td>
              <td className="fv-cell--num">100%</td>
              <td className="fv-cell--num fv-cell--total">{fmtPrice(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FinalValuationTab({ analysis, company, dcfPrices, rvPrices, dcfWeight, onDcfWeightChange }) {
  const rvWeight = 1 - dcfWeight;

  // FCFE path: DCF FCFE + RV P/E median
  const fcfeWeighted = dcfPrices?.fcfe != null && rvPrices?.peNeutral != null
    ? dcfPrices.fcfe * dcfWeight + rvPrices.peNeutral * rvWeight
    : null;

  // FCFF path: DCF FCFF + RV EV/EBITDA median
  const fcffWeighted = dcfPrices?.fcff != null && rvPrices?.evEbitdaNeutral != null
    ? dcfPrices.fcff * dcfWeight + rvPrices.evEbitdaNeutral * rvWeight
    : null;

  const avgValuation = fcfeWeighted != null && fcffWeighted != null
    ? (fcfeWeighted + fcffWeighted) / 2
    : fcfeWeighted ?? fcffWeighted ?? null;

  const currentPrice = analysis?.technicals?.currentPrice ?? company?.price ?? null;
  const upside = avgValuation != null && currentPrice != null && currentPrice > 0
    ? (avgValuation / currentPrice) - 1
    : null;

  const analystTargets = analysis?.analystTargets;
  const sortedTargets = analystTargets
    ? [...analystTargets].sort((a, b) => {
        if (!a.publishedDate) return 1;
        if (!b.publishedDate) return -1;
        return b.publishedDate.localeCompare(a.publishedDate);
      })
    : null;

  const handleWeightChange = (e) => {
    const val = Math.max(0, Math.min(100, Number(e.target.value)));
    onDcfWeightChange?.(val / 100);
  };

  return (
    <div className="fv-wrap">

      {/* Weight Control */}
      <div className="fv-section fv-section--weight">
        <h2 className="fv-section__title">Model Weights</h2>
        <p className="fv-section__subtitle">
          Adjust the relative weight between DCF and Relative Valuation implied prices.
          The RV weight auto-updates to the remainder.
        </p>
        <div className="fv-weight-control">
          <div className="fv-weight-row">
            <label className="fv-weight-label" htmlFor="dcf-weight-input">DCF Weight</label>
            <input
              id="dcf-weight-input"
              type="number"
              min="0"
              max="100"
              step="5"
              value={Math.round(dcfWeight * 100)}
              onChange={handleWeightChange}
              className="fv-weight-input"
            />
            <span className="fv-weight-unit">%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={Math.round(dcfWeight * 100)}
            onChange={handleWeightChange}
            className="fv-weight-slider"
            aria-label="DCF weight slider"
          />
          <div className="fv-weight-row fv-weight-row--derived">
            <span className="fv-weight-label">RV Weight</span>
            <span className="fv-weight-derived">{Math.round(rvWeight * 100)}%</span>
          </div>
        </div>
      </div>

      {/* FCFE Weighting Table */}
      <WeightingTable
        title="FCFE Valuation (Equity-Based)"
        subtitle="Blends DCF equity-side implied price with RV P/E median implied price"
        dcfLabel="DCF — FCFE"
        dcfPrice={dcfPrices?.fcfe ?? null}
        rvLabel="RV — P/E Median"
        rvPrice={rvPrices?.peNeutral ?? null}
        dcfWeight={dcfWeight}
        rvWeight={rvWeight}
      />

      {/* FCFF Weighting Table */}
      <WeightingTable
        title="FCFF Valuation (Enterprise-Based)"
        subtitle="Blends DCF enterprise-side implied price with RV EV/EBITDA median implied price"
        dcfLabel="DCF — FCFF"
        dcfPrice={dcfPrices?.fcff ?? null}
        rvLabel="RV — EV/EBITDA Median"
        rvPrice={rvPrices?.evEbitdaNeutral ?? null}
        dcfWeight={dcfWeight}
        rvWeight={rvWeight}
      />

      {/* EV/Revenue Reference — surfaced but not included in weighted blend */}
      {rvPrices?.evRevNeutral != null && (
        <div className="fv-section">
          <h2 className="fv-section__title">Alternative RV Reference</h2>
          <p className="fv-section__subtitle">EV/Revenue implied price from Relative Valuation — for reference only, not included in the weighted blend above</p>
          <div className="fv-table-scroll">
            <table className="fv-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th className="fv-cell--num">Implied Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>RV — EV/Revenue Median</td>
                  <td className="fv-cell--num">{fmtPrice(rvPrices.evRevNeutral)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="fv-section">
        <h2 className="fv-section__title">Valuation Summary</h2>
        <p className="fv-section__subtitle">Average of FCFE and FCFF weighted outputs vs. current market price</p>
        <div className="fv-summary-grid">
          <div className="fv-summary-card">
            <span className="fv-summary-card__label">Average Implied Price</span>
            <span className="fv-summary-card__value">{fmtPrice(avgValuation)}</span>
          </div>
          <div className="fv-summary-card">
            <span className="fv-summary-card__label">Current Stock Price</span>
            <span className="fv-summary-card__value">{fmtPrice(currentPrice)}</span>
          </div>
          <div className="fv-summary-card">
            <span className="fv-summary-card__label">Potential Upside</span>
            <span className={`fv-summary-card__value ${upside == null ? '' : upside >= 0 ? 'fv-upside--positive' : 'fv-upside--negative'}`}>
              {fmtPct(upside)}
            </span>
          </div>
        </div>
        {(dcfPrices == null || rvPrices == null) && (
          <p className="fv-hint">
            Navigate to the <strong>DCF</strong> and <strong>Relative Valuation</strong> tabs to populate implied prices.
          </p>
        )}
      </div>

      {/* Analyst Price Targets */}
      <div className="fv-section">
        <h2 className="fv-section__title">Analyst Price Targets</h2>
        <p className="fv-section__subtitle">Third-party consensus targets sorted by most recent publication date</p>
        {sortedTargets && sortedTargets.length > 0 ? (
          <div className="fv-table-scroll">
            <table className="fv-table">
              <thead>
                <tr>
                  <th>Analyst / Firm</th>
                  <th className="fv-cell--num">Target Price</th>
                  <th>Rating</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {sortedTargets.map((t, i) => (
                  <tr key={i}>
                    <td>{[t.analystName, t.firm].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="fv-cell--num">{t.priceTarget != null ? `$${Number(t.priceTarget).toFixed(2)}` : '—'}</td>
                    <td>{t.rating || '—'}</td>
                    <td>{fmtDate(t.publishedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="fv-placeholder-note">No analyst targets available for this ticker.</p>
        )}
      </div>

      <FlagsPanel analysis={analysis} />
    </div>
  );
}
