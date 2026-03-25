import React from 'react';
import MarketSnapshot from '../components/MarketSnapshot.jsx';
import CoreMetrics from '../components/CoreMetrics.jsx';

export default function AssumptionsTab({ company, analysis }) {
  return (
    <div className="tab-panel tab-panel--assumptions" id="tabpanel-assumptions" role="tabpanel">
      <div className="tab-panel__grid">
        <MarketSnapshot company={company} analysis={analysis} />
        <CoreMetrics analysis={analysis} />
      </div>
      <div className="tab-shell tab-shell--inline">
        <p className="tab-shell__note">
          Editable model assumptions, growth rate overrides, and margin inputs will appear here.
        </p>
      </div>
    </div>
  );
}
