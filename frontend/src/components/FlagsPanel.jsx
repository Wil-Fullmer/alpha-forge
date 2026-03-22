import React from 'react';

// Splits a "LABEL: detail" flag string into its parts.
// Guards for non-string values (null/undefined from future backend changes).
// Falls back to { label: '', detail: flag } if no ': ' is found.
function splitFlag(flag) {
  if (typeof flag !== 'string') return { label: '', detail: '' };
  const idx = flag.indexOf(': ');
  if (idx === -1) return { label: '', detail: flag.trim() };
  return { label: flag.slice(0, idx).trim(), detail: flag.slice(idx + 2).trim() };
}

// Merges analysis.flags and analysis.dcf.flags into a single list.
// Renders nothing when both are empty — the empty state wastes space.
export default function FlagsPanel({ analysis }) {
  if (!analysis) return null;

  const pipelineFlags = Array.isArray(analysis.flags) ? analysis.flags : [];
  const dcfFlags      = Array.isArray(analysis.dcf?.flags) ? analysis.dcf.flags : [];
  const allFlags      = [...pipelineFlags, ...dcfFlags];

  if (allFlags.length === 0) return null;

  return (
    <section
      className={`card flags-panel flags-panel--has-flags`}
      aria-label="Flags and Warnings"
    >
      <h2 className="card__title">Flags &amp; Notes ({allFlags.length})</h2>

      <ul className="flags-panel__list" role="list">
        {allFlags.map((flag, i) => {
          const { label, detail } = splitFlag(flag);
          return (
            <li key={i} className="flags-panel__item">
              <span className="flags-panel__icon" aria-hidden="true">&#9888;</span>
              <span className="flags-panel__item-text">
                {label && (
                  <strong className="flags-panel__item-label">{label}:</strong>
                )}{' '}
                <span className="flags-panel__item-detail">{detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
