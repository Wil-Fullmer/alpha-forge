# Alpha Forge — Project Checklist

> Operating checklist. Keep committed after every meaningful change.
> Current date: 2026-04-29

---

## Current Status

v2 shipped (2026-04-28). v3 brainstorm complete (2026-04-29). Active branch: `v2`.
Next: v3a implementation. Full v3 spec in `vault/projects/alpha-forge/design-specs/`.

---

## Current Sprint

- **v3a** — per design-specs/v3-feature-brainstorm-2026-04-29.md:
  1. Capital Allocation tab (ROIC/WACC river chart, DuPont decomposition, FCF allocation waterfall)
  2. FRED API integration (live 10Y risk-free rate into WACC) — needs FRED_API_KEY in .env
  3. Forensic Accounting tab (Beneish M-Score computed from existing SEC data)
  4. The Heartbeat animation (ECG-style SVG on Final Valuation tab alongside Liquid Gauge)

- **v3b** — per design-specs/v3-feature-brainstorm-2026-04-29-round2.md:
  5. Multi-Factor Pentagon Radar — 5-axis radar chart (Value, Quality, Safety, Growth, Sentiment)
  6. Altman Z-Score — add to Forensic tab
  7. Reverse DCF Scrubber Dial — solve for market-implied growth rate; dial maps price to historical growth period analogue
  8. Footnote Miner / Delta Map — NLP year-over-year diff of Risk Factors + MD&A; heatmap overlay (red=new risk, green=removed)
  9. Thermal Pressure ROIC/WACC — WACC layer visually crushes ROIC layer when spread negative; extends river chart animation

- **v3c** — architectural:
  10. Persistence layer (SQLite/DuckDB) — cache 10 years of FMP + SEC data locally; eliminates API latency on repeat lookups

- **Next visual pass** — projected column visual refinements. DCF cockpit further polish.

---

## Agent Board

### TODO

— empty —

---

## Architecture Guardrails

These rules do not change without explicit decision:

- **Cache first.** Every provider fetch must check cache before making a network call. Force-refresh is opt-in only (`force=true` / `?force=true`).
- **Normalize at the boundary.** FMP and AV responses are normalized in `financialData.js` before being written to cache. `analysisRunner` must not depend on raw provider field names.
- **Data assembly is separate from analysis.** `dataAssembler.js` owns fetching and normalization. `analysisRunner.js` owns calculations and output. Do not re-merge them.
- **Routes are thin.** Business logic belongs in services. Routes parse input, call one service function, return output.
- **Pre-collected data is the fixture path.** `data/{TICKER}-collected.json` is how frontend dev and tests avoid live provider calls for statement data.

---

## API Usage Safeguards

- Default `force=false` everywhere — cache is always preferred
- `CACHE_ENABLED=false` bypasses cache (dev/debug only — never set in production)
- `MAX_PROVIDER_CALLS=20` — logs a warning when provider HTTP calls exceed threshold per session
- `ANALYSIS_CACHE_TTL_MS=86400000` — analysis files older than 24 h are treated as stale and rerun
- Integration tests use `data/AAPL-collected.json` fixture by default — live tests require `RUN_LIVE_TESTS=1`
- Alpha Vantage fallback activates only when FMP returns 402/429/401/403 — not on first attempt
- Do not add retry loops, polling, or background refresh without an explicit budget check
