import React from 'react';
import { useConviction } from '../contexts/ConvictionContext.jsx';

const MODES = [
  { id: 'conservative', label: 'CONS', title: 'Conservative — cool palette, worst-case heat map' },
  { id: 'base',         label: 'BASE', title: 'Base Case — default branding' },
  { id: 'aggressive',   label: 'AGG',  title: 'Aggressive — warm palette, best-case heat map' },
];

export default function ConvictionToggle() {
  const { conviction, setConviction } = useConviction();

  return (
    <div className="conviction-toggle" role="group" aria-label="Conviction mode">
      <span className="conviction-label">CASE</span>
      {MODES.map(m => (
        <button
          key={m.id}
          className={`conviction-btn conviction-btn--${m.id} ${conviction === m.id ? 'conviction-btn--active' : ''}`}
          onClick={() => setConviction(m.id)}
          title={m.title}
          type="button"
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
