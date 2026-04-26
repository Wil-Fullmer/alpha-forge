# Alpha Forge — Project Checklist

> Operating checklist. Keep committed after every meaningful change.
> Current date: 2026-04-26 (updated)

---

## Current Status

Live app on `live-app-v1`. All 7 workbench tabs functional. Full multi-company hardening
complete across 8 ticker types (small-cap, REIT, bank, foreign 20-F, IPO, pre-revenue,
asset-light, holding company). Currency normalization for 20-F filers (TWD→USD via AV FX rate).
Null-line UI notes shipped: `dataGaps` map wired backend→frontend, `?` badges on null cells.
AV key rotation live. Unit tests passing.

---

## Current Sprint

— empty —

---

## Agent Board

### TODO

— empty —

### BACKLOG

- **[DONE] AV key setup** — `Alpha_Vantage_KEYS` wired in `.env`. Key rotation implemented in
  `alphaVantage.js`: comma-separated keys, rotates on rate-limit, resets at midnight. Add more
  keys by appending to `Alpha_Vantage_KEYS=key1,key2,...` — no code changes needed.

- **[DONE] Multi-company hardening** — Tested SLAB, O, JPM, TSM, RDDT, MRNA, ABNB, BRK-B.
  Fixes: 20-F filter, IFRS detection, asset-light capex concept, share count cross-check,
  REIT/bank sector flags, AV rate-limit/plan-restriction disambiguation, hyphen ticker support.
  Remaining known gap: TSM/foreign-filer FX normalization (TWD→USD via AV rate, live in prod).

- **[DONE] Null-line UI notes** — `dataGaps` map in analysis output, `DataGapNote.jsx` badge
  component with tooltip, wired into MarketSnapshot (P/E, EPS), CoreMetrics (ROE, D/E),
  Technicals (degraded state message). No hardcoded strings in frontend.

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
