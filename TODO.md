# Alpha Forge — Project Checklist

> Operating checklist. Keep committed after every meaningful change.
> Current date: 2026-04-26 (updated)

---

## Current Status

Live app on `live-app-v1`. All 7 workbench tabs functional. Valuation pipeline hardened for
FMP-restricted tickers: SEC EDGAR capex fallbacks, DEI shares, Finnhub balance sheet fallback,
WACC guard rails. MXL DCF/WACC/net debt now accurate. Unit tests passing.

---

## Current Sprint

— empty —

---

## Agent Board

### TODO

— empty —

### BACKLOG

- **AV key setup** — Add `AV_API_KEY` to `.env` to enable price history + technicals for
  FMP-restricted tickers (Sharpe, MA50/200, RSI currently null for non-flagship tickers).
  AV fallback is already wired in `financialData.js` — just needs the key.

- **Null-line UI notes** — When a workbench cell is null due to a known data gap, show an
  inline note on that line explaining why (e.g. "No price data — configure AV key" on Sharpe
  ratio row; "Balance sheet unavailable via SEC EDGAR" on D/E row). Currently shows blank/N/A
  with no context. Flags panel exists but users miss the connection to specific cells.

- **Multi-company hardening** — Systematically test a cross-section of company types to find
  and fix data gaps: small-caps, REITs, financials (banks/insurance), foreign private issuers,
  recent IPOs, holding companies, and pre-revenue/loss-stage companies. Each sector has
  non-standard XBRL reporting patterns and different FMP plan coverage. Goal: DCF and core
  metrics should either produce a valid result or a clear ⚠ flag — never silently wrong.

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
