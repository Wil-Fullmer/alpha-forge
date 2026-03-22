import React, { useState } from 'react';
import CompanyPage from './pages/CompanyPage.jsx';
import FixtureSelector from './components/FixtureSelector.jsx';
import TickerInput from './components/TickerInput.jsx';
import { FIXTURE_OPTIONS, DEFAULT_TICKER } from './fixtures.js';

// Build-time constant — never changes at runtime.
// Set VITE_API_URL in frontend/.env.local to enable backend mode.
const IS_BACKEND_MODE = Boolean(import.meta.env.VITE_API_URL);
const BACKEND_DEFAULT = 'AAPL';

export default function App() {
  const [ticker, setTicker] = useState(
    IS_BACKEND_MODE ? BACKEND_DEFAULT : DEFAULT_TICKER
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__brand">Alpha Forge</span>
          <span className="app-header__tagline">Financial Analysis</span>
          {IS_BACKEND_MODE ? (
            <TickerInput value={ticker} onChange={setTicker} />
          ) : (
            <FixtureSelector
              options={FIXTURE_OPTIONS}
              value={ticker}
              onChange={setTicker}
            />
          )}
        </div>
      </header>
      <main className="app-main">
        <CompanyPage ticker={ticker} />
      </main>
    </div>
  );
}
