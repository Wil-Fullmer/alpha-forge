import React from 'react';
import { useTheme, THEMES } from '../contexts/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Color theme">
      {THEMES.map(t => (
        <button
          key={t.id}
          className={`theme-btn ${theme === t.id ? 'theme-btn--active' : ''}`}
          onClick={() => setTheme(t.id)}
          title={t.title}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
