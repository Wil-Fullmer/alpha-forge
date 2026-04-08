import React, { useState } from 'react';
import LandingPage from './pages/LandingPage.jsx';
import CompanyPage from './pages/CompanyPage.jsx';
import { addRecent } from './utils/recentTickers.js';

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [ticker, setTicker] = useState(null);

  function handleSelect(t) {
    addRecent(t);
    setTicker(t);
    setScreen('workbench');
  }

  function handleNewSearch() {
    setScreen('landing');
  }

  return (
    <div className="app">
      {screen === 'landing' && (
        <LandingPage onSelectTicker={handleSelect} />
      )}
      {screen === 'workbench' && (
        <>
          <header className="app-header">
            <div className="app-header__inner">
              <button className="app-header__back" onClick={handleNewSearch} type="button">
                &#8592; New Search
              </button>
              <span className="app-header__brand">Alpha Forge</span>
              <span className="app-header__tagline">Financial Analysis</span>
            </div>
          </header>
          <main className="app-main">
            <CompanyPage ticker={ticker} />
          </main>
        </>
      )}
    </div>
  );
}
