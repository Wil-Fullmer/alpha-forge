import React from 'react';
import { useCompanyPage } from '../hooks/useCompanyPage.js';
import CompanyOverview from '../components/CompanyOverview.jsx';
import MarketSnapshot from '../components/MarketSnapshot.jsx';
import CoreMetrics from '../components/CoreMetrics.jsx';
import Technicals from '../components/Technicals.jsx';
import DcfValuation from '../components/DcfValuation.jsx';
import PeersPlaceholder from '../components/PeersPlaceholder.jsx';
import FlagsPanel from '../components/FlagsPanel.jsx';

export default function CompanyPage({ ticker = 'AAPL' }) {
  const { company, analysis, loading, error } = useCompanyPage(ticker);

  if (loading) {
    return (
      <div className="page-state page-state--loading" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading {ticker}&hellip;</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state page-state--error" role="alert">
        <h2>Unable to load data</h2>
        <p className="page-state__detail">{error}</p>
        <p className="page-state__hint">
          Make sure the fixture server is running:&nbsp;
          <code>npm run web:fixtures</code>
        </p>
      </div>
    );
  }

  return (
    <div className="company-page">
      {/* Identity band — full width */}
      <CompanyOverview company={company} />

      {/* Market data row — two equal columns */}
      <MarketSnapshot company={company} analysis={analysis} />
      <CoreMetrics analysis={analysis} />

      {/* Analysis row — Technicals beside Peers placeholder */}
      <Technicals analysis={analysis} />
      <PeersPlaceholder />

      {/* Valuation — full width, data-rich */}
      <DcfValuation analysis={analysis} />

      {/* Flags — full width, only rendered when flags exist */}
      <FlagsPanel analysis={analysis} />
    </div>
  );
}
