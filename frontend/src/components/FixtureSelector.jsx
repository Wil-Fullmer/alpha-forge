import React from 'react';

/**
 * FixtureSelector — dev-only dropdown rendered in the app header.
 *
 * Props:
 *   options  {Array<{ label: string, ticker: string, description?: string }>}
 *   value    {string}  — current ticker value
 *   onChange {(ticker: string) => void}
 */
export default function FixtureSelector({ options, value, onChange }) {
  return (
    <div className="fixture-selector" aria-label="Fixture switcher">
      <span className="fixture-selector__label" aria-hidden="true">Fixture</span>
      <select
        className="fixture-selector__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select fixture dataset"
        title={options.find((o) => o.ticker === value)?.description ?? ''}
      >
        {options.map((opt) => (
          <option key={opt.ticker} value={opt.ticker} title={opt.description ?? ''}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
