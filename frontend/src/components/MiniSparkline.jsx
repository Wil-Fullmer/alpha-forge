import React from 'react';

/**
 * Tiny inline SVG sparkline for table row labels.
 * No dependencies — pure SVG path from numeric array.
 */
export default function MiniSparkline({ values, color = 'var(--color-accent)', width = 64, height = 18 }) {
  const nums = (values ?? []).filter(v => v != null && !isNaN(v));
  if (nums.length < 2) return null;

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = nums.map((v, i) => {
    const x = pad + (i / (nums.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = points.join(' ');

  // Fill path: close below the line
  const fillPath = `M${points[0]} L${points.join(' L')} L${(pad + w).toFixed(1)},${(pad + h).toFixed(1)} L${pad},${(pad + h).toFixed(1)} Z`;

  const trend = nums.at(-1) > nums.at(0);
  const lineColor = color === 'auto'
    ? (trend ? 'var(--color-positive)' : 'var(--color-negative)')
    : color;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {/* Fill gradient under line */}
      <path
        d={fillPath}
        fill={lineColor}
        opacity="0.08"
      />
      {/* Sparkline */}
      <polyline
        points={polyline}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={points.at(-1).split(',')[0]}
        cy={points.at(-1).split(',')[1]}
        r="2"
        fill={lineColor}
      />
    </svg>
  );
}
