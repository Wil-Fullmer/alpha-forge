import React from 'react';
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis } from 'recharts';

const EM_DASH = '—';

function SparkTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div style={{
      background: 'var(--color-surface-elevated, #1e2530)',
      border: '1px solid var(--color-border)',
      borderRadius: 4,
      padding: '2px 6px',
      fontSize: 'var(--text-xs)',
      color: 'var(--color-text-primary)',
      pointerEvents: 'none',
    }}>
      {label}: {fmt(v)}
    </div>
  );
}

/**
 * Compact sparkline using Recharts.
 *
 * Props:
 *   data    — array of objects
 *   dataKey — key to plot on y-axis
 *   color   — stroke color (CSS variable or hex)
 *   fmt     — (value) => string for tooltip
 *   label   — label shown inside tooltip (e.g. "ROE")
 *   height  — chart height in px (default 56)
 */
export default function Sparkline({ data, dataKey, color, fmt, label, height = 56 }) {
  if (!data?.length) {
    return (
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        {EM_DASH}
      </span>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <YAxis domain={['auto', 'auto']} hide />
        <Tooltip
          content={<SparkTooltip fmt={fmt} label={label} />}
          cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: color }}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
