import React from 'react';

export default function WaccTab() {
  return (
    <div className="tab-panel tab-panel--wacc" id="tabpanel-wacc" role="tabpanel">
      <div className="tab-shell">
        <p className="tab-shell__title">WACC</p>
        <p className="tab-shell__note">
          Full WACC build — cost of equity (CAPM), cost of debt, capital structure weights, and tax shield — will appear here.
        </p>
      </div>
    </div>
  );
}
