# Alpha Forge — Project Checklist

> Operating checklist. Keep committed after every meaningful change.
> Current date: 2026-04-07




---

## Current Status

Backend is stable. WACC is now data-derived (CAPM from beta + implied cost of debt) rather than
hardcoded; `derivedRatios` (3-year median margins, capex %, NWC %) and `analystTargets` are
now part of every analysis output. Frontend valuation workbench is 6/7 tabs complete: Revenue,
Projections, WACC, DCF, Relative Valuation, and Final Valuation. DCF tab has a full 5-year FCFF/FCFE model,
EV/EBITDA and P/E terminal values, valuation summary with implied prices, and two color-coded 7×7
sensitivity grids. Relative Valuation tab has a full comps table (14-column with column-group headers),
statistics section, implied-price derivation, and Bull/Neutral/Bear team model. Peers flow via
analysis.peers; MSFT fixture seeded with 5 peers from collected data. Final Valuation tab delivers
a weighted rollup of DCF + RV implied prices (FCFE and FCFF paths), user-editable DCF weight with
auto-derived RV weight, 3-card summary (avg price, current price, upside %), analyst targets table,
and EV/Revenue reference panel. Remaining: Assumptions tab.

Valuation workbench refinement pass complete (2026-04-07): reusable draft-state inputs now cover
projected revenue growth, WACC price/beta, DCF terminal multiples, and DCF sensitivity multiple
centers. The abandoned global M/B display toggle was removed cleanly. Relative Valuation's comps
view is now split into stacked Company Info & Market Data, Financial Data, and Multiples tables
for readability. Analysis output was also expanded to 5 historical periods plus price-history and
equity fields needed for the new sparkline/history UI.

ProjectionsTab restructure complete (2026-04-07): Income statement is now dollar-values-only
(no % inputs). Revenue row sourced from RevenueTab via new RevenueContext (with fallback). All
user-editable % assumptions moved to Common Size section. Net Interest and Other Income now driven
by % of revenue. Net Debt in Other Forecasted Terms replaced multiplier with editable % of
(EBIT − D&A) driving a projected hard value. Two DcfTab render crashes fixed (projCOGS,
projNetBorrowing undefined references).

Final Valuation accuracy audit complete (2026-04-01): 5 issues resolved — tab-visit dependency
eliminated (DcfTab + RVTab always mounted), dcfWeight state lifted to CompanyPage (persists across
navigation), currentPrice source unified to technicals-first, negative-earnings guard added to P/E
terminal path, and evRevNeutral surfaced as reference panel.

Relative Valuation tab data integrity audit complete (2026-04-01): 3 issues resolved — peer data
pipeline built end-to-end (normalizePeer → getPeers → dataAssembler → enrichPeersWithMultiples →
analysis.peers), EBITDA now flows as a pre-computed field in historicalFinancials.incomeStatements
(single source of truth, no longer re-derived in two tabs independently), and frontend fallback
multiple derivation removed so the display and calcStats() both trust backend values. AAPL fixture
updated with ebitda on all 3 income statements and 6 peer comparables (MSFT, GOOGL, AMZN, META,
NVDA, TSLA) including pre-calculated evRevenue/evEbitda/pe. TSLA intentionally extreme to exercise
outlier detection. Tab is now fully functional in fixture mode and ready for live data once the
starter screen is implemented.

Data accuracy audit complete (2026-03-30): 4 bugs fixed across ProjectionsTab, DcfTab, WaccTab,
CompanyPage, and analysis.js. WACC tab is now live-wired to the DCF tab. Sharpe ratio
annualisation corrected in backend; fixture will update on next live pipeline run with API key.

UI clarity pass complete (2026-03-31): full "Dark Terminal Gold" retheme (gold accent, deep navy,
warm parchment text), CollapsibleSection component with smooth grid-row animation, tab fade-in
animation, recharts visualizations in Revenue and Projections tabs, and comprehensive input/table
readability improvements across all tabs.

Multi-agent workflow audit complete (2026-03-31): Claude-side audit of Codex-built handoff system.
Fixed stale agent memory paths (kakvl → Kak Vlek) in 3 agent files; Codex mirror re-synced and
all 7 SHA-256 hashes verified. All 5 handoff checks passing.

Relative Valuation tab UI clarity pass complete (2026-03-31): fixed dual-use class bug on
company name/ticker cells (text now renders in primary color), added subject company gold badge
+ 2px separator, descriptive subtitles under all 4 section titles, scenario percentile hints,
current price footnote under implied prices, and removed 35 inline style overrides.

---

## Current Priority

**Continue valuation workbench implementation — next tab: Assumptions.**

Revenue, Projections, WACC, DCF, Relative Valuation, and Final Valuation tabs are complete.
Next is the Assumptions tab (editable model inputs: growth rates, margins, WACC overrides, terminal
value assumptions). This is the last remaining stub tab.

Superseded priority (2026-04-07): the next best product step is now the initial frontend starter
screen where ticker selection happens before entering the workbench. After that, return to the
Assumptions tab as the last remaining workbench stub.

---

## Current Sprint

- [ ] Frontend: initial starter screen where ticker selection happens before entering the valuation workbench
- [ ] Frontend: verify analysis staleness indicator is fully surfaced and correct across fixture variants
- [x] Backend: ticker input validation at route level before hitting services
- [x] Backend: differentiated HTTP error responses — distinguish 404 (ticker not found), 503 (provider unavailable), 400 (bad input) instead of generic 500
- [ ] Smoke-test end-to-end: fixture server → frontend → all three fixture variants render correctly

---

## Major UI Rework — Valuation Workbench

**Status: In progress — Pass 1 and Pass 2 (Revenue + Projections) complete.**

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
- [x] Valuation workbench Pass 1 — architecture, tab scaffolding (7 tabs: Assumptions, Revenue, Projections, WACC, Relative Valuation, DCF, Final Valuation), state model for pulled vs editable vs calculated values
- [x] Valuation workbench Pass 2 (Revenue tab) — 3 historical + 4 projected years, editable growth %, live recalc; `historicalRevenue` added to analysis response and fixtures
- [x] Valuation workbench Pass 2 (Projections tab) — full income statement model (3 sections: IS, Common Size, Other Forecasted Terms); per-row editable driver inputs with live cascade; normalizer extended with 15 new fields; `historicalFinancials` added to analysis response and fixtures
- [x] Relative Valuation tab shell — scaffold structure in place; full peer-driven implementation later
- [x] Spreadsheet-style UI primitives — editable cell, read-only cell, calculated cell, dense model tables (`.revenue-table`, driver rows, subtotal/total row variants)
- [x] Valuation workbench — WACC tab implementation (capital structure weights, CAPM cost of equity, after-tax cost of debt, live WACC recalc; seeded from fixture data)
- [x] Common Size IS — Revenue row now shows YoY growth % instead of revenue/revenue; oldest year shows EM_DASH
- [x] Valuation workbench — DCF tab deep rebuild (FCFF/FCFE side-by-side, 5-year projection model, EV/EBITDA + P/E terminal value, two color-coded 7×7 sensitivity grids)
- [x] Data accuracy audit — pipeline orchestrator used to cross-reference tab data points against backend fields; 4 bugs fixed (see Agent Board below)
- [x] Valuation workbench — Final Valuation tab (weighted rollup, football field, editable weights)
- [ ] Valuation workbench — Assumptions tab (expose all valuation controls: tax rate, WACC inputs, growth overrides)
- [ ] Sensitivity table presentation — numeric grid first, light heatmap treatment later
- [ ] Start panel — user-friendly entry point: landing panel with ticker input, triggers `/api/analysis/{ticker}` on submit (runs full pipeline if no cached data), loading state while fetching, transitions to workbench tab view on success; replaces fixture-selector/header-ticker workflow for production use

### Backend
- [x] Ticker input validation — reject malformed tickers at the route level before hitting services
- [x] Differentiated HTTP error responses — distinguish 404 (ticker not found), 503 (provider unavailable), 400 (bad input) instead of generic 500
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

### v1.1 — SEC EDGAR Enrichment Layer

> Deferred post-workbench (v1.0). Conceptual audit completed 2026-03-31 via pipeline-orchestrator.
> Do not begin until Final Valuation, Assumptions, and Relative Valuation tabs are shipped.

**What it is:** SEC EDGAR Company Facts API (data.sec.gov) as a supplementary enrichment layer
sitting after FMP normalization — not a provider replacement. Adds audited, XBRL-tagged financials
direct from SEC filings (10+ years quarterly + annual, free, no API key, 10 req/s rate limit).

**Architectural pattern:**
```
FMP (primary) → normalize → assemble → [optional enrichWithEdgar()] → analyze → frontend
```
Zero disruption if EDGAR unavailable. Provenance flags surface FMP vs EDGAR source per field.

**Highest-value tabs:**
- **Projections** — 10-year trend history to anchor driver assumptions (currently limited by FMP depth)
- **DCF** — verified CapEx and cash flow figures from actual filings vs FMP aggregation

**5 decisions to resolve at implementation time:**
1. CIK resolution — ticker → CIK lookup + 24h cache (respect 10 req/s limit)
2. XBRL tag mapping — hardcoded alias dict (`us-gaap:Revenues` → `revenue`, etc.)
3. Fiscal period alignment — quarterly for trends, annual for structure; explicit labeling to stay in sync with FMP annual data
4. Cache TTL — ~45 days to match quarterly filing cadence
5. Reconciliation flags — surface FMP vs EDGAR discrepancies so the user knows which source drives each number

**Deliverables when scoped:**
- `src/services/edgar.js` — CIK resolver + Company Facts fetcher
- `src/services/normalizers/edgar.js` — XBRL → normalized schema
- `dataAssembler.js` — optional `enrichWithEdgar()` export
- Test fixtures — EDGAR samples for 3–5 tickers across sectors
- Provenance field added to normalized output schema

---

## Agent Board — Claude Code

> My own task tracking. Columns: `[ BACKLOG ]` `[ TODO ]` `[ IN PROGRESS ]` `[ DONE ]`
> Updated after each session. Oldest done items roll off into the Completed section above.

---

### DONE

| # | Task | Files Touched | Notes |
|---|------|---------------|-------|
| A-001 | **BUG FIX — DCF hardcoded date** | `DcfTab.jsx:112` | `new Date(2026,2,30)` → `new Date()`. Scale factors now always reflect actual current date. |
| A-002 | **BUG FIX — D&A double-counted in projected Operating Income** | `ProjectionsTab.jsx:154–157` | FMP's `operatingIncome` = GP − R&D − SG&A (D&A embedded in COGS). Removed `projDA` from `projOpIncome`. Historical/projected margins now comparable. |
| A-003 | **BUG FIX — Change in NWC methodology mismatch** | `ProjectionsTab.jsx:519–534` | Switched historical Change in NWC from CF-statement `changeInWorkingCap` to balance-sheet delta (`NWC_curr − NWC_prev`). Eliminates false −$25B → +$5.7B cliff for AAPL. |
| A-004 | **BUG FIX — WACC Tab not wired to DCF Tab** | `CompanyPage.jsx`, `WaccTab.jsx`, `DcfTab.jsx` | Lifted `waccOverride` state to `CompanyPage`. WACC tab calls `onWaccChange` on every compute. DCF tab accepts `waccOverride` prop and uses it for all projections, terminal values, and sensitivity grids. |
| A-005 | **BUG FIX — Sharpe ratio units mismatch (annualisation)** | `src/services/analysis.js:9–25` | Was: `(dailyMean − 0.02) / dailyStd` (annual RFR vs daily returns). Now: `((dailyMean − 0.02/252) / dailyStd) × √252`. Fixture will update on next live pipeline run. |
| A-006 | **AUDIT — Full data accuracy review of all new tabs** | All tab files, `data/fixtures/AAPL/analysis.json` | Used pipeline orchestrator to regenerate data; cross-referenced every tab field against FMP JSON schema and backend normalizers. Found 4 bugs + 2 notes. |
| A-016 | **UI clarity pass — Dark Terminal Gold retheme + charts + collapsibles** | `styles.css`, `CollapsibleSection.jsx`, `CompanyPage.jsx`, `ProjectionsTab.jsx`, `RevenueTab.jsx`, `DcfTab.jsx`, `WaccTab.jsx`, `CompanyOverview.jsx` | Full retheme (gold accent, deep navy, warm parchment); CollapsibleSection with grid-row animation; tab fade-in; recharts charts in Revenue + Projections; input/table density improvements across all tabs. |
| A-017 | **Pre-push hook — enforce TODO.md update on every git push** | `.claude/hooks/pre-push-todo-check.sh`, `.claude/settings.json`, `CLAUDE.md`, `docs/WORKFLOW_CHECKPOINT_SKILL.md` | PreToolUse hook blocks `git push` if TODO.md is absent from HEAD commit or date is not today. CLAUDE.md policy section added. Enforcement note added to WORKFLOW_CHECKPOINT_SKILL.md. |
| A-018 | **Claude Code settings — model + env config** | `.claude/settings.local.json` | Set `model: sonnet`, `MAX_THINKING_TOKENS: 13000`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: 60`, `CLAUDE_CODE_SUBAGENT_MODEL: haiku`. |
| A-019 | **Multi-agent workflow audit — Claude-side verification** | `.claude/agents/*.md`, `.codex/agents/*.md`, `docs/WORKLOG.md` | Audited Codex-built handoff system from Claude's side. Fixed stale memory paths in 3 agent files (kakvl → Kak Vlek). Re-synced Codex mirror; all 7 SHA-256 hashes verified. All 5 handoff-check gates passing. |
| A-020 | **UI clarity pass — Relative Valuation tab** | `frontend/src/tabs/RelativeValuationTab.jsx`, `frontend/src/styles.css` | Fixed `rv-table__col-hdr` misuse on data cells → `rv-cell--text`; gold subject badge; 2px gold row separator; subtitles under all 4 section titles; renamed section 3 to "Implied Share Price Analysis"; scenario percentile hints (75th/Median/25th); current price footnote; removed 35 inline `style` overrides; bumped group header font 10→11px. |
| A-022 | **AUDIT — Final Valuation tab accuracy + data flow** | `CompanyPage.jsx`, `FinalValuationTab.jsx`, `DcfTab.jsx` | 5 issues fixed: (1) tab-visit dependency — DcfTab/RVTab moved outside keyed div, always mounted; (2) dcfWeight lifted to CompanyPage; (3) currentPrice unified to technicals-first; (4) P/E terminal path guarded against negative earnings; (5) evRevNeutral surfaced as reference panel. |
| A-021 | **UI clarity pass — Final Valuation tab** | `frontend/src/tabs/FinalValuationTab.jsx`, `frontend/src/styles.css` | Fixed undefined `var(--color-text)` token (4×) → `text-primary`; replaced hardcoded `rgba` border/tint with CSS variables; aligned section title 14→13px and subtitle 12→11px; removed `padding: 20px` from `fv-wrap`; removed built-in `margin-top` from `.fv-table`; added `fv-table-scroll` wrapper + overflow safety; added `th` background + hover row; added `subtitle` prop to WeightingTable; added subtitles to all 4 sections; total row border-top separator. |

---

### TODO

| # | Task | Priority | Depends On |
|---|------|----------|------------|
| A-007 | **NOTE — Surface backend intrinsic value in DCF tab** | Low | — | Add `analysis.dcf.intrinsicValuePerShare` as a read-only reference row in DCF summary panel with tooltip explaining Gordon Growth method vs EV/EBITDA model. |
| A-008 | **Regenerate AAPL fixture after Sharpe fix** | Medium | FMP API key in `.env` | Run `node src/services/analysisRunner.js AAPL`, copy output to `data/fixtures/AAPL/`. Annualised Sharpe should land in −1 to +1 range for AAPL 2025. |
| A-009 | **Verify MSFT + AAPL-null fixtures against audit findings** | Medium | A-003 | AAPL-null fixture has null balanceSheet fields — confirm NWC delta renders as `—` gracefully. MSFT fixture has positive NWC — confirm delta is consistent. |

---

### BACKLOG

| # | Task | Area |
|---|------|------|
| A-010 | Final Valuation tab — weighted rollup of FCFF/FCFE implied prices, editable weights, football field chart | Frontend |
| A-011 | Assumptions tab — expose all live model controls (tax rate, WACC inputs, growth overrides) currently scattered across other tabs | Frontend |
| A-012 | Relative Valuation tab — EV/EBITDA, P/E, P/S peer table; requires peer data in pipeline | Frontend + Backend |
| A-013 | Smoke-test all three fixture variants (AAPL, MSFT, AAPL-null) end-to-end after audit fixes | QA |
| A-014 | Sensitivity grid — add light heatmap overlay treatment (CSS background intensity, currently numeric only) | Frontend |
| A-015 | FCFE bridge accuracy — `projFCFE = projFCFF + netInterestIncome` is a simplification; proper bridge is `FCFF − interest×(1−tax) + net borrowings` | Modeling |

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
- [x] Claude/Codex agent interop docs — `.codex/agents` mirror added, `scripts/sync-agents.ps1` hash-verified sync, and workflow notes updated in README/CLAUDE/checklists
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
- [x] Valuation workbench Pass 1 — `WorkbenchTabs` nav + 7 tab panel components, `CompanyPage` converted to workbench container, tab state resets on ticker change, dark spreadsheet-pane aesthetic
- [x] Valuation workbench Pass 2 (Revenue tab) — `RevenueTab.jsx`: 3 historical + 4 projected columns, editable growth % inputs, live rolling revenue projection; `historicalRevenue` added to `/api/analysis` response, all fixture files updated
- [x] Valuation workbench Pass 2 (Projections tab) — `ProjectionsTab.jsx`: three-section model (Income Statement, Common Size, Other Forecasted Terms); per-row driver inputs (gross margin, R&D %, SG&A %, D&A %, tax rate, CAPEX %, NWC %); full cascade from revenue through net income; `historicalFinancials` added to analysis response; normalizers extended with 15 new fields (costOfRevenue, researchAndDev, sgaExpense, depreciationAmort, netInterestIncome, otherIncomeExpense, incomeBeforeTax, taxExpense, totalCurrentAssets, totalCurrentLiabilities, netDebt, changeInWorkingCap, etc.)
- [x] Data accuracy audit + fixes — cross-referenced all workbench tab data points against backend fields and FMP data definitions; resolved: D&A double-count in Projections IS, hardcoded date in DCF scale factors, WACC→DCF tab wiring, NWC methodology mismatch, Sharpe ratio annualisation
- [x] Pre-push hook — `.claude/hooks/pre-push-todo-check.sh` enforces TODO.md update on every `git push`; PreToolUse hook in `settings.json`; policy documented in `CLAUDE.md`
- [x] UI clarity pass — "Dark Terminal Gold" retheme (gold accent `#d4a853`, deep navy bg, warm parchment text); `CollapsibleSection` component (CSS grid-row height animation); tab fade-in animation; recharts `ComposedChart` in Revenue tab (gold bars + YoY growth line) and Projections tab (stacked COGS/OpEx bars + gross/net margin lines); input width/hover/tint fixes; DCF sensitivity color floor + base-cell inset; CompanyOverview line-clamp with show-more toggle; WACC result row gold tint; monospace font on all data cells
