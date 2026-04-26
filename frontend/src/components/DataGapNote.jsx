import React from 'react';

/**
 * Renders a small inline note next to a null/N/A cell explaining why the
 * value is unavailable. Pass the reason string from analysis.dataGaps[field].
 */
export default function DataGapNote({ reason }) {
  if (!reason) return null;
  return (
    <span
      className="data-gap-note"
      title={reason}
      aria-label={`Data unavailable: ${reason}`}
    >
      ?
    </span>
  );
}
