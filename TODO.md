# Alpha Forge — Project Checklist

> Operating checklist. Keep committed after every meaningful change.
> Current date: 2026-03-17

---

## Current Status

Backend foundation is stable. The data pipeline is cache-first, provider calls are guarded,
normalization is layered, and partial endpoints no longer trigger unnecessary full-pipeline runs.
The project is ready to begin frontend/backend split and UI development.

---

## Current Priority

**Establish a clean frontend/backend dev workflow.**

The goal is that frontend development can proceed against stable, local data without touching
the provider API. This means a mock/fixture server or static JSON contract must be in place
before building new UI components.

---

## Current Sprint

- [ ] Frontend: wire real API calls (remove fixture-only mode, add `VITE_API_URL` env toggle)
- [ ] Frontend: add analysis staleness indicator (surface `analysisDate` in UI)
- [ ] Frontend: surface `flags[]` warnings panel in UI
- [ ] Backend: apply `analysisDate` TTL check to `/api/analysis/:ticker` route (currently always reruns)
- [ ] Backend: ticker input validation at route level before hitting services
- [ ] Smoke-test end-to-end: fixture server → frontend → all three fixture variants render correctly

---

## Near-Term Roadmap

### Frontend
- [ ] Company overview page — profile, sector, key metrics summary
- [ ] Valuation view — DCF intrinsic value, up/downside %, growth/WACC assumptions
- [ ] Technicals view — MA50/200, RSI, momentum signal
- [ ] Analysis staleness indicator — surface `analysisDate` and TTL state to the user
- [ ] Error/flag display — surface `flags[]` array warnings to the user

### Backend
- [ ] `/api/analysis/:ticker` disk-reuse — apply same `analysisDate` TTL check that `/api/technicals` and `/api/metrics` now use (currently `/api/analysis` always reruns)
- [ ] Ticker input validation — reject malformed tickers at the route level before hitting services
- [ ] Differentiated HTTP error responses — distinguish 404 (ticker not found), 503 (provider unavailable), 400 (bad input) instead of generic 500
- [ ] `getKeyMetrics` wired into analysis output — endpoint exists in `financialData.js` but result is not currently used in `analysisRunner`

### Testing
- [ ] Unit tests for `dataAssembler.js` — verify pre-collected path, fetch-error path, and flag accumulation
- [ ] Unit tests for `normalizers/fmp.js` — verify coercion, missing fields, and idempotency
- [ ] Unit test for `getOrRunAnalysis()` freshness logic — stale/fresh/malformed cases

---

## Later Backlog

- [ ] Multi-ticker comparison view
- [ ] Peer/sector benchmarking — extend `financial-data-collector` output
- [ ] Alpha Vantage as primary (not just fallback) — provider selection via env var
- [ ] Persistent analysis history — keep timestamped snapshots of `{TICKER}-analysis.json` instead of overwriting
- [ ] CI/CD pipeline — automated test run on push, no live API calls in CI
- [ ] Rate-limit budget reporting — surface `_providerCallCount` in `/health` or a `/api/debug/budget` endpoint
- [ ] `CACHE_TTL` env var wired into statement TTLs in `financialData.js` (currently documented in `.env.example` but not read at runtime)
- [ ] Scheduled auto-refresh — background job to pre-warm analysis files for tracked tickers

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

---

## Completed

- [x] Backend architecture audit — traced full request flow, identified gaps vs target architecture
- [x] FMP normalization layer — `src/services/normalizers/fmp.js` with five normalizers applied before cache write
- [x] Data assembly separated from analysis — `dataAssembler.js` owns fetching; `analysisRunner.js` owns calculations
- [x] `CACHE_ENABLED` env var wired — `readCache()` now respects it (was documented but ignored)
- [x] Provider call budget guard — `_bumpBudget()` counter in `financialData.js`, warns at `MAX_PROVIDER_CALLS` threshold
- [x] Partial endpoints API-safe — `/api/technicals` and `/api/metrics` read from disk when analysis file exists instead of rerunning full pipeline
- [x] Analysis file freshness TTL — `getOrRunAnalysis()` checks `analysisDate` against `ANALYSIS_CACHE_TTL_MS`; stale/malformed files are rerun
- [x] Integration test fixture — `data/AAPL-collected.json` created; test skips if fixture missing, live test gated by `RUN_LIVE_TESTS=1`
- [x] `.env.example` updated — `ANALYSIS_CACHE_TTL_MS` and `MAX_PROVIDER_CALLS` documented
- [x] Frontend project structure — Vite + React SPA (`frontend/`) with full component tree and `package.json`
- [x] Company page — `CompanyPage.jsx` with `CompanyOverview`, `CoreMetrics`, `DcfValuation`, `Technicals`, `FlagsPanel` components
- [x] Frontend API client layer — `frontend/src/api/{client,company,analysis}.js`
- [x] Fixture switching in frontend — `frontend/src/fixtures.js` and `FixtureSelector.jsx`
- [x] Format utility — `frontend/src/utils/format.js`
- [x] MSFT fixture set — `data/fixtures/MSFT/` (4 files: company, analysis, technicals, metrics)
- [x] AAPL-null fixture set — `data/fixtures/AAPL-null/` (exercises null fields and non-empty flags)
- [x] SPA dashboard — global header, sidebar nav, assumption sliders, real-time DCF recalc, sensitivity heatmap, scenario toggles, football field chart, story sidebar
- [x] Tab-window animated dashboard — five-tab interface, slide/fade transitions, company profile strip, lazy report loading
- [x] Project scaffold — CLI, web server, services, utils
- [x] SessionStart hook — npm install on web sessions
- [x] financial-data-collector agent
- [x] financial-analysis-agent — core metrics, DCF, technicals, file output
- [x] pipeline-orchestrator agent
- [x] visualization-agent
- [x] report-generator-agent
- [x] ui-implementation-expert agent
- [x] ui-clarity-enhancer agent
- [x] analysis.js — DCF, RSI, moving averages, momentum signal, P/E, growth rate derivation
- [x] financialData.js — historical prices, quote, key metrics, TTL-based file cache, force-refresh flag
- [x] analysisRunner.js — orchestrator with full pipeline, JSON output, console summary
- [x] Alpha Vantage fallback adapter — `alphaVantage.js` with FMP-compatible normalization
- [x] Infinite API key support — dynamic pool from env, rotation on 429/401/403, immediate fail on 402
- [x] Typed error handling — 429/401/403 rotation, soft-error JSON detection, negative FCF guard, CAGR clamping
- [x] Web API endpoints — `/api/analysis`, `/api/technicals`, `/api/metrics`, `/api/company`, `/dashboard`, `/report`
- [x] Integration tests — `tests/integration/analysisRunner.test.js`
