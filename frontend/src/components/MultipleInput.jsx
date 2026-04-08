import React, { useState } from 'react';

export default function MultipleInput({
  value,
  onChange,
  step = '1',
  className,
  ariaLabel,
}) {
  const [draft, setDraft] = useState(null);

  function toDisplay(v) {
    if (v == null || isNaN(v)) return '';
    return String(v);
  }

  function commit(str) {
    const next = parseFloat(str);
    if (!isNaN(next)) onChange(next);
    setDraft(null);
  }

  const display = draft !== null ? draft : toDisplay(value);

  return (
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
  );
}
