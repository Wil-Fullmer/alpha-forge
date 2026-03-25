import React from 'react';
import FlagsPanel from '../components/FlagsPanel.jsx';

export default function FinalValuationTab({ analysis }) {
  return (
    <div className="tab-panel tab-panel--final" id="tabpanel-final-valuation" role="tabpanel">
      <div className="tab-shell">
        <p className="tab-shell__title">Final Valuation</p>
        <p className="tab-shell__note">
          Weighted valuation rollup across DCF and relative methods, football field chart, and investment verdict will appear here.
        </p>
      </div>
      <div className="tab-panel__spacer" />
      <FlagsPanel analysis={analysis} />
    </div>
  );
}
