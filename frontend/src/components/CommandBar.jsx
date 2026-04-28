import React, { useState, useEffect, useRef } from 'react';
import { loadRecent } from '../utils/recentTickers.js';

const TAB_ALIASES = {
  assumptions: 'assumptions',
  revenue: 'revenue',
  projections: 'projections',
  wacc: 'wacc',
  'relative-valuation': 'relative-valuation',
  comps: 'relative-valuation',
  rv: 'relative-valuation',
  dcf: 'dcf',
  'final-valuation': 'final-valuation',
  final: 'final-valuation',
  fv: 'final-valuation',
};

const HINTS = [
  { cmd: 'go [ticker]',  desc: 'Load a ticker  —  e.g. go NVDA' },
  { cmd: 'view [tab]',   desc: 'Switch tab: assumptions · revenue · projections · wacc · comps · dcf · final' },
  { cmd: 'history',      desc: 'Show recently loaded tickers' },
  { cmd: 'reset',        desc: 'Clear all manual overrides' },
  { cmd: 'set wacc [%]', desc: 'Override WACC  —  e.g. set wacc 9.5' },
  { cmd: 'export csv',   desc: 'Download active model data' },
];

function dispatch(detail) {
  window.dispatchEvent(new CustomEvent('af:cmd', { detail }));
}

export default function CommandBar({ onSelectTicker }) {
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setInput('');
        setResult(null);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setInput('');
        setResult(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setInput('');
    setResult(null);
  }

  function execute(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    const parts = lower.split(/\s+/);
    const cmd   = parts[0];

    if (cmd === 'go' && parts[1]) {
      onSelectTicker?.(parts[1].toUpperCase());
      close();
      return;
    }

    if (cmd === 'view' && parts[1]) {
      const tabId = TAB_ALIASES[parts[1]];
      if (tabId) {
        dispatch({ type: 'view-tab', tab: tabId });
        close();
      } else {
        setResult({ error: `Unknown tab: "${parts[1]}"` });
      }
      return;
    }

    if (lower === 'history') {
      const recent = loadRecent();
      setResult({ list: recent.length ? recent : null, msg: recent.length ? null : 'No history yet' });
      return;
    }

    if (lower === 'reset') {
      dispatch({ type: 'reset' });
      setResult({ ok: 'Overrides cleared' });
      setTimeout(close, 900);
      return;
    }

    if (cmd === 'set' && parts[1] === 'wacc' && parts[2]) {
      const val = parseFloat(parts[2]);
      if (isNaN(val)) { setResult({ error: 'Expected a number — e.g. set wacc 9.5' }); return; }
      dispatch({ type: 'set-wacc', value: val / 100 });
      setResult({ ok: `WACC overridden → ${val}%` });
      setTimeout(close, 900);
      return;
    }

    if (lower === 'export csv') {
      dispatch({ type: 'export-csv' });
      setResult({ ok: 'Export triggered' });
      setTimeout(close, 800);
      return;
    }

    setResult({ error: `Unknown command: "${trimmed}"` });
  }

  if (!open) return null;

  const query = input.toLowerCase();
  const filtered = query
    ? HINTS.filter(h => h.cmd.includes(query) || h.desc.toLowerCase().includes(query))
    : HINTS;

  return (
    <div className="cmd-overlay" onMouseDown={close}>
      <div className="cmd-modal" onMouseDown={e => e.stopPropagation()}>

        <div className="cmd-input-row">
          <span className="cmd-prompt">⌘K</span>
          <input
            ref={inputRef}
            className="cmd-input"
            value={input}
            onChange={e => { setInput(e.target.value); setResult(null); }}
            onKeyDown={e => { if (e.key === 'Enter') execute(input); }}
            placeholder="Type a command…"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {result && (
          <div className={`cmd-result ${result.error ? 'cmd-result--error' : 'cmd-result--ok'}`}>
            {result.error || result.ok || result.msg}
            {result.list && (
              <div className="cmd-result-chips">
                {result.list.map(t => (
                  <button key={t} className="cmd-chip"
                    onClick={() => { onSelectTicker?.(t); close(); }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="cmd-hints">
            {filtered.map(h => (
              <div key={h.cmd} className="cmd-hint"
                onClick={() => {
                  const fill = h.cmd.replace(/\s*\[.*?\]\s*/g, ' ').trim() + ' ';
                  setInput(fill);
                  inputRef.current?.focus();
                }}>
                <code className="cmd-hint__cmd">{h.cmd}</code>
                <span className="cmd-hint__desc">{h.desc}</span>
              </div>
            ))}
          </div>
        )}

        <div className="cmd-footer">
          <span>↵ run</span>
          <span>esc close</span>
          <span>ctrl+k toggle</span>
        </div>
      </div>
    </div>
  );
}
