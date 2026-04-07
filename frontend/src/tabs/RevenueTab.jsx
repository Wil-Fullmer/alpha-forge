import React, { useState, useEffect } from 'react';
import { formatLargeNumber } from '../utils/format.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import { useRevenue } from '../contexts/RevenueContext.jsx';
import { ResponsiveContainer, ComposedChart, Bar, Line, Cell,
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

const PROJ_COUNT = 4;
const FALLBACK_RATE = 0.05;

function fiscalYear(dateStr) {
  if (!dateStr) return '—';
  return `FY${dateStr.slice(0, 4)}`;
}

function fmtPct(rate) {
  if (rate == null) return '—';
  const sign = rate >= 0 ? '+' : '';
  return `${sign}${(rate * 100).toFixed(1)}%`;
}

function yoyGrowth(arr, i) {
  if (i === 0) return null;
  const prev = arr[i - 1]?.revenue;
  const curr = arr[i]?.revenue;
  if (prev == null || curr == null || prev === 0) return null;
  return (curr - prev) / prev;
}

export default function RevenueTab({ analysis }) {
  const seedRate = analysis?.dcf?.assumedGrowthRate ?? FALLBACK_RATE;
  const { publishRevenue } = useRevenue();

  const [growthRates, setGrowthRates] = useState(
    () => Array(PROJ_COUNT).fill(seedRate)
  );

  // Reset inputs when analysis changes (ticker switch)
  useEffect(() => {
    const r = analysis?.dcf?.assumedGrowthRate ?? FALLBACK_RATE;
    setGrowthRates(Array(PROJ_COUNT).fill(r));
  }, [analysis]);

  // Historical: newest-first from API → reverse to chronological
  const historical = [...(analysis?.historicalRevenue ?? [])].reverse();
  const hasHistory = historical.length > 0;

  // Projected year labels
  const lastHistYear = historical.at(-1)?.date
    ? parseInt(historical.at(-1).date.slice(0, 4), 10)
    : new Date().getFullYear();
  const projYears = Array.from({ length: PROJ_COUNT }, (_, i) => `FY${lastHistYear + i + 1}`);

  // Rolling projected revenue from last historical base
  const baseRevenue = historical.at(-1)?.revenue ?? null;
  const projectedRevenue = growthRates.reduce((acc, rate) => {
    const prev = acc.length ? acc.at(-1) : baseRevenue;
    acc.push(prev != null ? prev * (1 + rate) : null);
    return acc;
  }, []);

  // Publish to RevenueContext so ProjectionsTab can consume
  useEffect(() => {
    if (projectedRevenue.some(v => v != null)) {
      publishRevenue({ projectedRevenue, growthRates });
    }
  }, [projectedRevenue, growthRates]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGrowthChange(i, raw) {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      setGrowthRates(prev => {
        const next = [...prev];
        next[i] = parsed / 100;
        return next;
      });
    }
  }

  if (!hasHistory) {
    return (
      <div className="tab-panel tab-panel--revenue" id="tabpanel-revenue" role="tabpanel">
        <div className="tab-shell">
          <p className="tab-shell__title">Revenue</p>
          <p className="tab-shell__note">No historical revenue data available for this ticker.</p>
        </div>
      </div>
    );
  }

  const revChartData = [
    ...historical.map((h, i) => ({
      year: fiscalYear(h.date),
      revenue: h.revenue != null ? +(h.revenue / 1e9).toFixed(2) : null,
      growth:  yoyGrowth(historical, i) != null ? +(yoyGrowth(historical, i) * 100).toFixed(1) : null,
      isProjected: false,
    })),
    ...projectedRevenue.map((rev, i) => ({
      year: projYears[i],
      revenue: rev != null ? +(rev / 1e9).toFixed(2) : null,
      growth:  +(growthRates[i] * 100).toFixed(1),
      isProjected: true,
    })),
  ];

  return (
    <div className="tab-panel tab-panel--revenue" id="tabpanel-revenue" role="tabpanel">
      <div className="revenue-table-wrap">
        <table className="revenue-table">
          <thead>
            <tr>
              <th className="revenue-table__row-label" scope="col"></th>
              {historical.map(h => (
                <th key={h.date} className="revenue-col-header revenue-col-header--historical" scope="col">
                  {fiscalYear(h.date)}
                  <span className="revenue-col-header__tag">Actual</span>
                </th>
              ))}
              {projYears.map(yr => (
                <th key={yr} className="revenue-col-header revenue-col-header--projected" scope="col">
                  {yr}
                  <span className="revenue-col-header__tag">Projected</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Revenue row */}
            <tr className="revenue-row revenue-row--value">
              <td className="revenue-table__row-label">Revenue</td>
              {historical.map(h => (
                <td key={h.date} className="revenue-cell revenue-cell--historical">
                  {formatLargeNumber(h.revenue)}
                </td>
              ))}
              {projectedRevenue.map((rev, i) => (
                <td key={projYears[i]} className="revenue-cell revenue-cell--projected">
                  {formatLargeNumber(rev)}
                </td>
              ))}
            </tr>

            {/* Growth % row */}
            <tr className="revenue-row revenue-row--growth">
              <td className="revenue-table__row-label revenue-table__row-label--sub">
                Rev Growth %
              </td>
              {historical.map((h, i) => (
                <td key={h.date} className="revenue-cell revenue-cell--historical revenue-cell--growth">
                  {fmtPct(yoyGrowth(historical, i))}
                </td>
              ))}
              {growthRates.map((rate, i) => (
                <td key={projYears[i]} className="revenue-cell revenue-cell--projected revenue-cell--input">
                  <input
                    type="number"
                    className="revenue-input"
                    value={(rate * 100).toFixed(1)}
                    step="0.1"
                    onChange={e => handleGrowthChange(i, e.target.value)}
                    aria-label={`${projYears[i]} revenue growth rate`}
                  />
                  <span className="revenue-input__suffix">%</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <CollapsibleSection title="Revenue Trend" defaultOpen={false}>
        <div className="chart-panel">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={revChartData} margin={{ top: 4, right: 48, bottom: 0, left: 8 }}>
              <CartesianGrid stroke="#1e2d40" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#8a9ab5', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left"  tickFormatter={v => `$${v}B`} tick={{ fill: '#8a9ab5', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fill: '#8a9ab5', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0e1624', border: '1px solid #1e2d40', borderRadius: '8px', fontSize: '12px', color: '#f0ead6' }}
                       labelStyle={{ color: '#8a9ab5', marginBottom: '4px' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#8a9ab5' }} />
              <ReferenceLine y={0} yAxisId="right" stroke="#1e2d40" />
              <Bar dataKey="revenue" yAxisId="left" name="Revenue ($B)" maxBarSize={40}>
                {revChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.isProjected ? 'rgba(212,168,83,0.35)' : '#d4a853'} />
                ))}
              </Bar>
              <Line dataKey="growth" yAxisId="right" name="YoY Growth (%)" type="monotone"
                    stroke="#4ade80" strokeWidth={2} dot={{ r: 3, fill: '#4ade80' }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CollapsibleSection>

      <div className="tab-shell tab-shell--inline">
        <p className="tab-shell__note">
          Segment-level revenue breakdown and additional income statement rows will expand here in a future pass.
        </p>
      </div>
    </div>
  );
}
