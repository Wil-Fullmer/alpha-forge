import React, { useId } from 'react';

function fmt(v) {
  if (v == null || isNaN(v)) return '—';
  return `$${v.toFixed(2)}`;
}

export default function LiquidGauge({ intrinsicValue, currentPrice, label = 'Avg Implied' }) {
  const uid = useId().replace(/:/g, '');

  if (intrinsicValue == null || currentPrice == null || currentPrice <= 0) return null;

  const ratio     = intrinsicValue / currentPrice;
  const fillPct   = Math.min(Math.max(ratio, 0), 1.4);
  const levelPct  = Math.min(fillPct, 1);
  const overflow  = ratio > 1;
  const cracked   = ratio < 0.75;
  const upside    = (ratio - 1) * 100;

  const liquidColor = overflow  ? '#4ade80'
                    : cracked   ? '#f87171'
                    : '#fbbf24';

  const glowColor   = overflow  ? 'rgba(74,222,128,0.35)'
                    : cracked   ? 'rgba(248,113,113,0.25)'
                    : 'rgba(251,191,36,0.25)';

  const fillY      = 11 + 138 * (1 - levelPct);
  const fillH      = 138 * levelPct;
  const waveY      = fillY;

  return (
    <div className="liquid-gauge">
      <p className="liquid-gauge__title">Margin of Safety</p>

      <div className="liquid-gauge__body">
        <svg
          className="liquid-gauge__svg"
          viewBox="0 0 80 170"
          aria-label={`Margin of safety gauge: intrinsic ${fmt(intrinsicValue)}, price ${fmt(currentPrice)}`}
        >
          <defs>
            <clipPath id={`lg-clip-${uid}`}>
              <rect x="11" y="11" width="58" height="138" rx="5" />
            </clipPath>
            <filter id={`lg-glow-${uid}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Cylinder shell */}
          <rect x="10" y="10" width="60" height="140" rx="6"
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

          {/* Liquid body + wave */}
          <g clipPath={`url(#lg-clip-${uid})`}>
            {fillH > 0 && (
              <>
                <rect
                  x="11" y={fillY} width="58" height={fillH}
                  fill={liquidColor} opacity="0.55"
                  className="liquid-gauge__fill"
                />
                <path
                  d={`M11 ${waveY} Q29 ${waveY - 5} 40 ${waveY} Q51 ${waveY + 5} 69 ${waveY} V${fillY + fillH} H11 Z`}
                  fill={liquidColor} opacity="0.8"
                  className="liquid-gauge__wave"
                />
              </>
            )}
          </g>

          {/* Overflow glow cap */}
          {overflow && (
            <ellipse cx="40" cy="10" rx="29" ry="5"
              fill={liquidColor} opacity="0.45" filter={`url(#lg-glow-${uid})`}
              className="liquid-gauge__overflow-cap"
            />
          )}

          {/* Crack lines when deeply overvalued */}
          {cracked && (
            <g opacity="0.5" stroke="#f87171" fill="none" strokeLinecap="round">
              <polyline points="36,70 40,90 37,112 44,132" strokeWidth="1.2" />
              <polyline points="52,55 47,80 50,93" strokeWidth="0.8" />
            </g>
          )}

          {/* Intrinsic value label inside */}
          <text x="40" y={Math.max(waveY - 6, 22)} textAnchor="middle"
            fill="rgba(255,255,255,0.85)" fontSize="8.5" fontFamily="monospace" fontWeight="bold">
            {fmt(intrinsicValue)}
          </text>

          {/* Current price at bottom */}
          <text x="40" y="162" textAnchor="middle"
            fill="rgba(255,255,255,0.35)" fontSize="7" fontFamily="monospace">
            {fmt(currentPrice)} mkt
          </text>
        </svg>

        {/* Glow pool below cylinder when overflowing */}
        {overflow && (
          <div className="liquid-gauge__pool" style={{ '--glow': glowColor }} />
        )}
      </div>

      <p className={`liquid-gauge__stat ${overflow ? 'liquid-gauge__stat--pos' : 'liquid-gauge__stat--neg'}`}>
        {overflow ? '▲' : '▼'} {Math.abs(upside).toFixed(1)}%{' '}
        <span>{overflow ? 'undervalued' : 'overvalued'}</span>
      </p>

      <p className="liquid-gauge__sublabel">{label}</p>
    </div>
  );
}
