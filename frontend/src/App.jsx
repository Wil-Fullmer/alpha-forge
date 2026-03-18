import React, { useState } from 'react';
import CompanyPage from './pages/CompanyPage.jsx';
import FixtureSelector from './components/FixtureSelector.jsx';
import { FIXTURE_OPTIONS, DEFAULT_TICKER } from './fixtures.js';

export default function App() {
  const [ticker, setTicker] = useState(DEFAULT_TICKER);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="app-header__brand">Alpha Forge</span>
          <span className="app-header__tagline">Financial Analysis</span>
          <FixtureSelector
            options={FIXTURE_OPTIONS}
            value={ticker}
            onChange={setTicker}
          />
        </div>
      </header>
      <main className="app-main">
        <CompanyPage ticker={ticker} />
      </main>
    </div>
  );
}
