import React from 'react';
import PeersPlaceholder from '../components/PeersPlaceholder.jsx';

export default function RelativeValuationTab() {
  return (
    <div className="tab-panel tab-panel--relative" id="tabpanel-relative-valuation" role="tabpanel">
      <PeersPlaceholder />
      <div className="tab-shell tab-shell--inline">
        <p className="tab-shell__note">
          Peer multiple comparison table (EV/EBITDA, P/E, P/S) and implied valuation range will appear here.
        </p>
      </div>
    </div>
  );
}
