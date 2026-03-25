import React from 'react';
import DcfValuation from '../components/DcfValuation.jsx';
import Technicals from '../components/Technicals.jsx';

export default function DcfTab({ analysis }) {
  return (
    <div className="tab-panel tab-panel--dcf" id="tabpanel-dcf" role="tabpanel">
      <DcfValuation analysis={analysis} />
      <div className="tab-panel__spacer" />
      <Technicals analysis={analysis} />
      <div className="tab-shell tab-shell--inline">
        <p className="tab-shell__note">
          Full FCFF/FCFE DCF model, sensitivity matrix, and scenario toggles will expand here.
        </p>
      </div>
    </div>
  );
}
