import React from 'react';

export default function ApiLimitedGate({ ticker, onViewSecData, onReturnToSearch }) {
  return (
    <div className="api-gate">
      <div className="api-gate__icon" aria-hidden="true">⚠</div>
      <h2 className="api-gate__title">Market Data Unavailable</h2>
      <p className="api-gate__body">
        Live market data could not be loaded for <strong>{ticker}</strong>.
        This usually means your API key is rate-limited, expired, or not configured
        for this endpoint.
      </p>
      <p className="api-gate__body api-gate__body--sub">
        Historical financial statements sourced from SEC filings are available.
        A full valuation model requires live price and market data.
      </p>

      <div className="api-gate__actions">
        <button className="api-gate__btn api-gate__btn--primary" onClick={onViewSecData}>
          <span className="api-gate__btn-label">View SEC Data</span>
          <span className="api-gate__btn-sub">Revenue &amp; income statement history · projection inputs</span>
        </button>
        <button className="api-gate__btn api-gate__btn--secondary" onClick={onReturnToSearch}>
          <span className="api-gate__btn-label">Return to Search</span>
          <span className="api-gate__btn-sub">Try a different ticker or refresh</span>
        </button>
      </div>

      <p className="api-gate__hint">
        To restore full functionality, add a valid <code>FMP_API_KEY</code> or <code>Alpha_Vantage_KEYS</code> to your <code>.env</code> file and restart the backend.
      </p>
    </div>
  );
}
