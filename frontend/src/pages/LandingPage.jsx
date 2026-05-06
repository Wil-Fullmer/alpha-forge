import React, { useState, useEffect } from 'react';
import { loadRecent } from '../utils/recentTickers.js';

const IS_BACKEND_MODE = Boolean(import.meta.env.VITE_API_URL);
const BASE = import.meta.env.VITE_API_URL ?? '';

export default function LandingPage({ onSelectTicker }) {
  const [input, setInput]       = useState('');
  const [recents, setRecents]   = useState([]);
  const [error, setError]       = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setRecents(loadRecent());
  }, []);

  async function submit(ticker) {
    if (!ticker) return;

    if (!IS_BACKEND_MODE) {
      setChecking(true);
      setError(null);
      try {
        const res = await fetch(`${BASE}/api/company/${ticker}`);
        if (!res.ok) {
          setError(`No fixture data for ${ticker}. Try AAPL or MSFT.`);
          setChecking(false);
          return;
        }
      } catch {
        setError('Could not reach fixture server. Is it running? (npm run web:fixtures)');
        setChecking(false);
        return;
      }
      setChecking(false);
    }

    onSelectTicker(ticker);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    submit(input.trim().toUpperCase());
  }

  return (
    <div className="landing-page">
      <video
        className="landing-page__video-bg"
        src="/generated/hero-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="landing-page__overlay" />
      <div className="landing-page__inner">
        <div className="landing-page__brand">
          <h1 className="landing-page__title">Alpha Forge</h1>
          <p className="landing-page__subtitle">Financial Valuation Workbench</p>
        </div>

        <form className="landing-page__form" onSubmit={handleFormSubmit}>
          <input
            className="landing-page__input"
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError(null); }}
            placeholder="Enter ticker symbol..."
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className="landing-page__btn"
            type="submit"
            disabled={checking || !input.trim()}
          >
            {checking ? '...' : 'Load'}
          </button>
        </form>

        {error && <p className="landing-page__error">{error}</p>}

        {recents.length > 0 && (
          <div className="recent-tickers">
            <span className="recent-tickers__label">Recent</span>
            <div className="recent-tickers__chips">
              {recents.map(t => (
                <button
                  key={t}
                  className="recent-tickers__chip"
                  onClick={() => submit(t)}
                  type="button"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
