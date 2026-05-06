import React, { useState } from 'react';
import LandingPage from './pages/LandingPage.jsx';
import CompanyPage from './pages/CompanyPage.jsx';
import CommandBar from './components/CommandBar.jsx';
import ConvictionToggle from './components/ConvictionToggle.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import { ConvictionProvider } from './contexts/ConvictionContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
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
    <ThemeProvider>
    <ConvictionProvider>
      <div className="app">
        <CommandBar onSelectTicker={handleSelect} />

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
                <div className="app-header__spacer" />
                <ThemeToggle />
                <ConvictionToggle />
                <button className="app-header__cmd-hint" onClick={() => {
                  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
                }} title="Command bar (Ctrl+K)" type="button">
                  ⌘K
                </button>
              </div>
            </header>
            <main className="app-main">
              <CompanyPage ticker={ticker} onReturnToSearch={handleNewSearch} />
            </main>
          </>
        )}
      </div>
    </ConvictionProvider>
    </ThemeProvider>
  );
}
