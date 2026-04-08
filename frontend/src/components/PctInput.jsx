import React, { useState } from 'react';

/**
 * PctInput — a percentage input where the stored value is a decimal (0.05 = 5%).
 * The user types in percentage space (type "5" → stored as 0.05).
 * Uses local draft state so mid-typing (e.g. "5.5") doesn't snap back.
 * Commits on blur or Enter key.
 *
 * Props:
 *   value      — decimal (e.g. 0.05)
 *   onChange   — called with the new decimal value
 *   step       — input step attribute (in % space, default "0.01")
 *   className  — forwarded to <input>
 *   ariaLabel  — forwarded to aria-label
 *   showSuffix — whether to render a "%" suffix span (default true)
 *   suffixClass — class for the suffix span (default "revenue-input__suffix")
 */
export default function PctInput({
  value,
  onChange,
  step = '0.01',
  className,
  ariaLabel,
  showSuffix = true,
  suffixClass = 'revenue-input__suffix',
}) {
  const [draft, setDraft] = useState(null); // null = not editing

  function toDisplay(v) {
    if (v == null || isNaN(v)) return '';
    return (v * 100).toFixed(2);
  }

  function commit(str) {
    const v = parseFloat(str);
    if (!isNaN(v)) onChange(v / 100);
    setDraft(null);
  }

  const display = draft !== null ? draft : toDisplay(value);

  return (
    <>
      <input
        type="number"
        className={className}
        value={display}
        step={step}
        onChange={e => setDraft(e.target.value)}
        onBlur={e => commit(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            commit(e.target.value);
            e.target.blur();
          }
        }}
        aria-label={ariaLabel}
      />
      {showSuffix && <span className={suffixClass}>%</span>}
    </>
  );
}
