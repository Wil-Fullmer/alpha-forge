# Alpha Forge — Project Checklist

> Operating checklist. Keep committed after every meaningful change.
> Current date: 2026-03-22

---

## Current Status

Backend is stable and the frontend/backend split is wired. Real API calls are gated by
`VITE_API_URL` — fixture mode is the default, backend mode activates when the env var is set.
TickerInput is in the header for backend mode, styled to match the dashboard aesthetic.
FlagsPanel merges pipeline and DCF flags. Backend TTL check on `/api/analysis` is live.

---

## Current Priority

**Complete the current sprint, then begin the valuation workbench rework.**

Real API wiring is done. Remaining sprint: staleness verification, ticker validation, differentiated error responses, smoke test.
After the sprint closes, the next major work is Pass 1 of the valuation workbench — architecture,
tab scaffolding, and the editable/derived/pulled state model. See Major UI Rework section below.

---

## Current Sprint

- [ ] Frontend: verify analysis staleness indicator is fully surfaced and correct across fixture variants
- [x] Backend: ticker input validation at route level before hitting services
- [x] Backend: differentiated HTTP error responses — distinguish 404 (ticker not found), 503 (provider unavailable), 400 (bad input) instead of generic 500
- [ ] Smoke-test end-to-end: fixture server → frontend → all three fixture variants render correctly

---

## Major UI Rework — Valuation Workbench

**Status: Upcoming — multi-pass, not yet started.**

### Why the current UI is insufficient

The current card dashboard proves the data pipeline works but exposes only summary outputs.
It does not surface the modeling depth needed for actual valuation comprehension — full assumption
controls, WACC build, FCFF/FCFE side-by-side, segment revenue structure, sensitivity grids,
or weighted final valuation. The next major frontend direction replaces the card layout with a
spreadsheet-pane workbench that mirrors the Excel analysis flow.

### Interaction model

- Pulled/reference values: visible, not editable
- Calculated/formula outputs: visible, not editable
- User editable assumptions: editable in frontend state (no persistence required initially)
- Historical data: non-editable
- Forward projections and valuation assumptions: editable with real-time frontend recalc
- Backend remains the structured data gateway — no new provider calls for assumption editing
- Source-of-truth layering: backend defaults → derived calculations → user overrides on top

### Tab priority order

1. Assumptions — tax rate, risk-free rate, market risk premium, beta, all editable valuation controls
2. Revenue — workbook-level depth, segment structure where applicable, historical + projected
3. Projections — row-level editable drivers for forward model
4. WACC — full build visible (cost of equity, cost of debt, capital structure)
5. DCF — FCFF and FCFE simultaneously, terminal-growth and terminal-multiple logic, sensitivity grids
6. Final Valuation — workbook-weight logic, editable weights, implied price range
7. Relative Valuation — scaffold now (tab shell, placeholder layout); full peer implementation later

### Pass breakdown

- **Pass 1 (architecture):** tab scaffolding, frontend state model, editable-vs-derived-vs-pulled
  cell design, data flow from backend into tab components, wiring of existing API endpoints
- **Pass 2 (implementation):** build out tabs 1–6 in priority order; relative valuation tab shell only
- **Later passes:** UX polish, sensitivity heatmap treatment, relative valuation completion,
  persistence for user overrides, exportable report/research view

### Modeling requirements

- Assumptions tab must expose all valuation controls currently hardcoded or hidden
- Revenue tab must reflect segment depth where the data source supports it
- DCF must show FCFF and FCFE in parallel
- Sensitivity analysis as numeric grids first; light heatmap overlay in a later pass
- Final valuation weights must be editable with live recalc
- Relative valuation tab: scaffold and stub now; full peer-driven implementation deferred

### Supporting agents

| Agent | Role |
|---|---|
| `ui-implementation-expert` | Workbench component architecture and tab implementation |
| `ui-clarity-enhancer` | Spreadsheet readability, editable/read-only/calculated visual distinctions, dense table usability |
| `pipeline-orchestrator` | Verify frontend/backend separation, tab data flow, and state layering |
| `visualization-agent` | Sensitivity table presentation, heatmap treatment, chart/table hybrid decisions |
| `financial-analysis-agent` | Validate modeling logic in DCF/WACC/final valuation tabs against calculation semantics |
| `report-generator-agent` | Later: translate workbench outputs into exportable research views |

### Risks and dependencies

- Pass 1 must lock the state model before any tab implementation begins — out-of-order work here
  will cause rewrites
- Editable assumption state lives in frontend only until persistence is explicitly scoped
- Relative valuation requires peer data not yet in the pipeline; do not block other tabs on it
- Sensitivity grids are compute-light in the frontend but the display density needs design attention
  before implementation

---

## Near-Term Roadmap

### Frontend
- [ ] Valuation workbench Pass 1 — architecture, tab scaffolding, state model for pulled vs editable vs calculated values
- [ ] Valuation workbench Pass 2 — implement Assumptions, Revenue, Projections, WACC, DCF, Final Valuation tabs
- [ ] Relative Valuation tab shell — scaffold structure now, full peer-driven implementation later
- [ ] Spreadsheet-style UI primitives — editable cell, read-only cell, calculated cell, dense model tables
- [ ] Sensitivity table presentation — numeric grid first, light heatmap treatment later

### Backend
- [ ] Ticker input validation — reject malformed tickers at the route level before hitting services *(also in current sprint)*
- [ ] Differentiated HTTP error responses — distinguish 404 (ticker not found), 503 (provider unavailable), 400 (bad input) instead of generic 500 *(also in current sprint)*
### Testing
- [ ] Smoke-test end-to-end: fixture server → frontend → all three fixture variants render correctly
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
- [ ] `getKeyMetrics` ratio display panel — surface grahamNumber, earningsYield, evToEBITDA, returnOnEquity, etc. in a frontend metrics card; not wired into EPS/shares fallback chains (key-metrics endpoint has no direct eps/sharesOutstanding fields)

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
- [x] Frontend/backend split — `VITE_API_URL` env toggle, Vite proxy, fixture vs backend mode in App.jsx
- [x] TickerInput component — backend-mode ticker entry form, submit-only (no fetch-on-keystroke), styled pill compound control in header
- [x] FlagsPanel — merges `analysis.flags` + `analysis.dcf.flags`, renders nothing when empty
- [x] Backend TTL check on `/api/analysis` — `getOrRunAnalysis()` reads `analysisDate` and reuses disk file if fresh
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
- [x] Ticker input validation — `src/utils/validation.js` with `normalizeTicker`/`validateTicker`; all routes reject malformed tickers with 400 before hitting services
- [x] Differentiated HTTP error responses — `mapErrorToHttp()` in `server.js` maps TICKER_NOT_FOUND→404, FMP errors→503, others→500; `dataAssembler.js` throws typed errors
