import React from 'react';

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
        {allFlags.map((flag, i) => (
          <li key={i} className="flags-panel__item">
            <span className="flags-panel__icon" aria-hidden="true">&#9888;</span>
            {flag}
          </li>
        ))}
      </ul>
    </section>
  );
}
