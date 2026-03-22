import React, { useState } from 'react';

/**
 * TickerInput — backend-mode ticker entry form.
 * Fires onChange only on explicit submit, never on keystroke.
 * Input is displayed uppercase visually via CSS.
 */
export default function TickerInput({ value, onChange }) {
  const [inputValue, setInputValue] = useState(value);

  function handleSubmit(e) {
    e.preventDefault();
    const t = inputValue.trim().toUpperCase();
    if (t) onChange(t);
  }

  return (
    <form className="ticker-input" onSubmit={handleSubmit}>
      <input
        className="ticker-input__field"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Ticker"
        aria-label="Ticker symbol"
        style={{ textTransform: 'uppercase' }}
      />
      <button className="ticker-input__submit" type="submit">Load</button>
    </form>
  );
}
