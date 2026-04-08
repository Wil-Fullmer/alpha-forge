# Worklog

Purpose: high-signal session handoff between Codex and Claude.

## Entry Template

```md
## YYYY-MM-DD HH:MM (TZ) - <agent/tool>
- Branch: <branch-name>
- Objective: <what this session tried to do>
- Decisions: <key decisions made>
- Open Questions: <questions/blockers left unresolved>
- Next Step: <single best next action>
- Owns Next: <exact files/modules next agent should edit>
- Do Not Touch: <out-of-scope files/modules for next agent>
- Files Touched: <comma-separated file list or "none">
```

## 2026-04-08 — claude (session 2)
- Branch: feature/valuation-workbench → live-app-v1
- Objective: fix projection year anchoring, PROJ_COUNT alignment, Revenue chart bars, and the FY2024/FY2025 gap in historical actuals
- Decisions:
  - **Projection year fix:** `projStartYear = new Date().getFullYear()` (2026) across RevenueTab, ProjectionsTab, DcfTab — projections always FY(currentYear) through FY(currentYear+4). Confirmed with user: FY2025 is last actual, FY2026–FY2030 are projections.
  - **PROJ_COUNT 4→5:** RevenueTab.jsx, ProjectionsTab.jsx, AssumptionsContext.jsx all updated. DcfTab was already 5.
  - **Revenue Trend chart bars:** Added `fill="#d4a853"` directly on `<Bar>` element as fallback (Recharts silently defaults to black when `Cell`-only fill doesn't attach); also bumped projected cell opacity 0.35→0.5.
  - **FMP fetch depth 5→7:** `getIncomeStatement`, `getBalanceSheet`, `getCashFlowStatement` in `financialData.js` all use `limit: 7`. SEC EDGAR `extractAnnualData` slice raised to 7. `analysisRunner.js` slice raised to 7 for all historical arrays.
  - **mergeStatements sort bug (root cause of FY2024/2025 gap):** VZ's SEC EDGAR XBRL uses `fy` labels offset +2 from calendar year (e.g. `fy:2025 → endDate: 2023-12-31`). SEC rows only reached through 2023 by endDate; FMP correctly had 2025-12-31 and 2024-12-31. `mergeStatements` appended FMP-only rows at the END of the array (comment said "older years"), putting FY2024/FY2025 at positions 8–9, past the `slice(0,7)` cut. Fix: added `.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))` before the return in `mergeStatements` — newest-first regardless of source. This is a general correctness fix for any ticker where FMP is more current than EDGAR.
  - **New branch `live-app-v1`:** created from this session's commit; this is the branch for ongoing live-app work going forward.
- Open Questions: none — all fixes verified by checking VZ-analysis.json output dates
- Next Step: fix RV screen data issues, chart rendering problems, DCF FCFF/FCFE calculation correctness, and cascading Final Valuation tab fix
- Owns Next: `frontend/src/tabs/RelativeValuationTab.jsx`, `frontend/src/tabs/DcfTab.jsx`, `frontend/src/tabs/FinalValuationTab.jsx`, chart components
- Do Not Touch: `src/services/secEdgar.js` (working correctly now), `src/services/normalizers/sec.js`, `frontend/src/pages/LandingPage.jsx`
- Files Touched: `frontend/src/tabs/RevenueTab.jsx`, `frontend/src/tabs/ProjectionsTab.jsx`, `frontend/src/tabs/DcfTab.jsx`, `frontend/src/contexts/AssumptionsContext.jsx`, `src/services/financialData.js`, `src/services/analysisRunner.js`, `src/services/secEdgar.js`, `src/services/dataAssembler.js`, `TODO.md`, `docs/WORKLOG.md`

## 2026-04-08 — claude
- Branch: feature/valuation-workbench → version-1
- Objective: implement landing screen (pre-workbench ticker selection), wire SEC EDGAR as primary financial data source, and create a Version 1 branch capturing the stable state of the workbench
- Decisions:
  - **Landing screen:** `LandingPage.jsx` is a full-page entry screen (full-screen centered layout) shown before the workbench loads. Props: `onSelectTicker(ticker)`. Ticker input uppercased, submit on Enter or click. In fixture mode, pre-flight fetch `/api/company/{TICKER}` — 404 shows inline error "No fixture data for {TICKER}. Try AAPL or MSFT." without transitioning. `recentTickers.js` stores up to 5 recent tickers in localStorage (`alpha-forge:recent-tickers`); chips render below the form and call `onSelectTicker` directly.
  - **App.jsx routing:** replaced `ticker`-first state with `screen: 'landing' | 'workbench'` + `ticker: null`. Removed FixtureSelector, TickerInput, FIXTURE_OPTIONS, DEFAULT_TICKER. Added "← New Search" button in workbench header (`app-header__back` class). `handleSelect(t)` calls `addRecent(t)`, `setTicker(t)`, `setScreen('workbench')`.
  - **styles.css additions:** `.landing-page`, `.landing-page__inner`, `.landing-page__brand`, `.landing-page__title`, `.landing-page__subtitle`, `.landing-page__form`, `.landing-page__input`, `.landing-page__btn`, `.landing-page__error`, `.recent-tickers`, `.recent-tickers__label`, `.recent-tickers__chips`, `.recent-tickers__chip`, `.app-header__back` — all using existing CSS variables.
  - **SEC EDGAR integration:** `secEdgar.js` implements CIK mapping fetch (cached 30d as `sec_ciks`) and company facts fetch (cached 7d as `sec_facts_{TICKER}`). Uses `User-Agent: Alpha-Forge alpha-forge@example.com` per SEC guidelines. GAAP concept fallback chains for 19 fields. `extractAnnualData()` filters `form === "10-K"`, deduplicates by `fy` (latest `filed` wins), newest→oldest, max 5 years. Returns `{ annualRows }` or `null` on any failure.
  - **SEC normalizer:** `normalizers/sec.js` maps EDGAR field names to same internal schema as `normalizers/fmp.js`. `normalizeSecCashFlow` **negates capitalExpenditure** (EDGAR positive = payments made → FMP negative convention). `freeCashFlow = operatingCashFlow + capitalExpenditure` computed inline.
  - **dataAssembler.js merge:** `mergeStatements(secRows, fmpRows)` aligns by calendar year (first 4 chars of date), starts from FMP row, overlays all non-null SEC fields. SEC + FMP now fetched in parallel (8-slot `Promise.allSettled`). `metadata.dataSource` = `'sec_fmp'` | `'fmp_only'` | `'pre_collected'`.
  - **.gitignore:** added `.claude/settings.local.json`
  - **frontend/.env.local:** created pointing frontend at `http://localhost:3000` for live backend use (gitignored)
  - **Version 1 branch:** created `version-1` branch from the commit capturing all of the above — represents the first stable, end-to-end deployable version of Alpha Forge
- Open Questions: none — all work for this session committed and pushed
- Next Step: **Fix projection years and chart rendering** (see plan below)
- Owns Next: `frontend/src/tabs/RevenueTab.jsx`, `frontend/src/tabs/ProjectionsTab.jsx`, `frontend/src/contexts/AssumptionsContext.jsx`, `frontend/src/tabs/DcfTab.jsx`
- Do Not Touch: `src/services/secEdgar.js`, `src/services/normalizers/sec.js`, `src/services/dataAssembler.js` (SEC integration complete — do not re-touch unless EDGAR API changes), `frontend/src/pages/LandingPage.jsx`, `frontend/src/utils/recentTickers.js`, `data/fixtures/**`
- Files Touched: `.gitignore`, `frontend/src/App.jsx`, `frontend/src/styles.css`, `frontend/src/pages/LandingPage.jsx` (new), `frontend/src/utils/recentTickers.js` (new), `src/services/secEdgar.js` (new), `src/services/normalizers/sec.js` (new), `src/services/dataAssembler.js`, `frontend/.env.local` (new, gitignored), `TODO.md`, `docs/WORKLOG.md`

### PLAN FOR NEXT SESSION — Projection Year Fix + Chart Rendering

**Problem 1 — Wrong projection years (HIGHEST PRIORITY)**
FY2024/FY2025 appear as "Projected" columns despite live data existing for them.
Root cause: `projStartYear = lastHistYear + 1` uses the most recent filing date year (e.g. 2024) instead of the current calendar year.
User confirmed: if it's 2026, projections must be FY2027–FY2031 (5 years, always `currentYear+1` onward).

**Problem 2 — PROJ_COUNT mismatch**
RevenueTab and ProjectionsTab use `PROJ_COUNT = 4`. AssumptionsContext also seeds arrays of length 4.
DcfTab already uses 5. All must align at 5.

**Problem 3 — Revenue Trend chart bars completely absent**
Revenue Trend chart in RevenueTab is inside `<CollapsibleSection defaultOpen={false}>`.
Recharts `ResponsiveContainer` measures its container at mount — when section is collapsed (display:none / 0-width), bars render at 0px and never recover when the section opens.
Same issue in the nested "Trend Chart" `<CollapsibleSection defaultOpen={false}>` inside ProjectionsTab's Common Size section.

**Exact changes required:**

**`frontend/src/tabs/RevenueTab.jsx`**
1. `const PROJ_COUNT = 4` → `const PROJ_COUNT = 5`
2. Remove `lastHistYear` derivation from `historical` array
3. Add: `const projStartYear = new Date().getFullYear() + 1;`
4. Change: `const projYears = Array.from({ length: PROJ_COUNT }, (_, i) => \`FY\${projStartYear + i}\`);`
5. CollapsibleSection wrapping Revenue Trend chart: `defaultOpen={false}` → `defaultOpen={true}`

**`frontend/src/tabs/ProjectionsTab.jsx`**
1. `const PROJ_COUNT = 4` → `const PROJ_COUNT = 5`
2. Remove lines 133–136 (the `lastHistYear` derivation block)
3. Add: `const projStartYear = new Date().getFullYear() + 1;`
4. Change: `const projYears = Array.from({ length: PROJ_COUNT }, (_, i) => \`FY\${projStartYear + i}E\`);`
5. Line 517 — nested `<CollapsibleSection title="Trend Chart" defaultOpen={false}>` → `defaultOpen={true}`

**`frontend/src/contexts/AssumptionsContext.jsx`**
1. `const PROJ_COUNT = 4` → `const PROJ_COUNT = 5`
   (All `Array(PROJ_COUNT).fill(value)` seeded arrays automatically grow to length 5)

**`frontend/src/tabs/DcfTab.jsx`**
1. PROJ_COUNT is already 5 — only the year calculation needs updating
2. Find where projection years are derived from `lastFilingDate` or `lastHistYear`
3. Change to: `const projStartYear = new Date().getFullYear() + 1;`

**Verification after changes:**
1. `npm run dev` (frontend) + `node src/index.js` (backend), load AAPL
2. Revenue tab: chart open by default, bars visible; projected years are FY2027–FY2031
3. Projections tab: projected columns FY2027E–FY2031E; Trend Chart opens by default with bars
4. DCF tab: projection years align with FY2027–FY2031
5. AssumptionsContext: assumption arrays have 5 elements

## 2026-04-07 — claude (session 2)
- Branch: feature/valuation-workbench
- Objective: commit previously uncommitted work from the 2026-04-06 session that was left staged but never pushed
- Decisions:
  - **sharesOutstanding utility:** new `frontend/src/utils/sharesOutstanding.js` — unified resolution chain: `company.sharesOutstanding` → `marketCap/price` → null; both `RelativeValuationTab` and `WaccTab` updated to use it
  - **WaccTab → AssumptionsContext:** WACC rate inputs (risk-free rate, beta, MRP, cost of debt, tax rate) migrated from local `useState` to shared `AssumptionsContext` so they persist across tab switches; shares/price remain local capital structure inputs
  - **analysisRunner derived ratios:** `computeDerivedRatios()` computes 3-year median grossMarginPct, rdPct, sgaPct, daPct, capexPct, nwcPct, taxRate; `estimateWACC()` derives CAPM WACC from beta + implied cost of debt; DCF now uses derived WACC instead of `DCF_DEFAULTS.wacc`; `derivedRatios` block added to analysis output
  - **Analyst targets:** `getAnalystTargets()` added to `financialData.js`; fetched in parallel with `assembleData()` in `analysisRunner`; `analystTargets` array added to result payload
  - **ErrorBoundary:** added to `main.jsx` to surface render crashes (previously swallowed by React 18)
- Open Questions: ErrorBoundary should be removed once blank-page regression is confirmed resolved
- Next Step: verify ErrorBoundary is no longer needed and remove; then implement Assumptions tab
- Owns Next: frontend/src/main.jsx (ErrorBoundary cleanup), frontend/src/tabs/AssumptionsTab.jsx
- Do Not Touch: data/fixtures/**, src/services/dataAssembler.js
- Files Touched: frontend/src/utils/sharesOutstanding.js (new), frontend/src/main.jsx, frontend/src/tabs/RelativeValuationTab.jsx, frontend/src/tabs/WaccTab.jsx, src/services/analysisRunner.js, src/services/financialData.js

## 2026-04-07 — claude
- Branch: feature/valuation-workbench
- Objective: resolve two DCF tab render crashes, then restructure Projections tab so the income statement is dollar-values-only with % assumptions living in the Common Size section; wire Revenue tab projections into Projections tab via shared context; fix Net Debt calculation in Other Forecasted Terms
- Decisions:
  - **Render crash #1 — `projCOGS` / `projGP` / `projOpEx` not defined:** three variables were referenced in DcfTab JSX (~line 454) but never defined at component scope — they only existed as local `const` inside the `localEBIT` map callback. Fixed by adding three derived arrays after `projEBIT` using the already-in-scope `cogsPct` and `opExPct` scalars applied to `projRevenue`.
  - **Render crash #2 — `projNetBorrowing` not defined:** same pattern — variable used in DCF cash flow bridge render but never declared. Added `projNetBorrowing = Array.from({ length: PROJ_COUNT }, (_, i) => s.netBorrowingPerYear[i] ?? 0)` and updated `projFCFE` to use it instead of the inline `s.netBorrowingPerYear[i]` reference.
  - **RevenueContext:** created `frontend/src/contexts/RevenueContext.jsx` (mirrors `ProjectedValuesContext` pattern); `RevenueTab` now publishes `{ projectedRevenue, growthRates }` on every change; `CompanyPage` wraps with `<RevenueProvider>`.
  - **ProjectionsTab income statement restructure:** removed all % input rows from income statement (Rev Growth %, Gross Margin %, R&D % Rev, SG&A % Rev, D&A % Rev, Tax Rate %); every projected cell is now a dollar value; `Net Interest` and `Other Income` rows changed from absolute $ inputs to display-only cells driven by their common size %.
  - **Common Size section now owns all % inputs:** replaced static projected `fmtPctAbs` cells with editable `<input>` fields for COGS %, R&D %, SG&A %, D&A %, Net Interest %, Other Inc/Exp %, Tax Rate % (of EBT); aggregate rows (Gross Profit %, Op Profit %, EBT %, Net Income %) remain calculated/read-only.
  - **Assumptions state changes:** `grossMargin` renamed to `cogsPct` (= 1 − GM seed); `netInterest`/`otherIncome` (absolute $) replaced by `netInterestPct`/`otherIncomePct` (% of revenue); `revenueGrowth` removed from assumptions (revenue sourced from RevenueContext, with seeded fallback).
  - **Net Debt in Other Forecasted Terms:** replaced "Net Debt / EBITDA" multiplier row with "Net Debt % (EBIT − D&A)" — historical shows read-only %, projected columns are editable inputs; projected dollar value = `netDebtPct × (projEBIT − projDA)`; seeded from `lastBS.netDebt / (lastEBIT − lastDA)`.
  - **Other Forecasted Terms unchanged:** CAPEX and NWC retain their existing structure (dollar row + % input row).
  - `publishProjections` shape to `ProjectedValuesContext` is unchanged — DcfTab is unaffected.
- Open Questions: none
- Next Step: Assumptions tab implementation (last remaining stub tab)
- Owns Next: frontend/src/tabs/AssumptionsTab.jsx
- Do Not Touch: frontend/src/contexts/ProjectedValuesContext.jsx (shape unchanged), src/services/**, data/fixtures/**
- Files Touched: frontend/src/tabs/DcfTab.jsx, frontend/src/tabs/ProjectionsTab.jsx, frontend/src/tabs/RevenueTab.jsx, frontend/src/pages/CompanyPage.jsx, frontend/src/contexts/RevenueContext.jsx (new)

## 2026-04-06 — claude
- Branch: feature/valuation-workbench
- Objective: implement audit remediations A-008, A-009, A-006 from the workbook-fidelity audit; then debug blank-page regression introduced by those changes
- Decisions:
  - A-008: added `getAnalystTargets()` to `financialData.js`; wired it into `analysisRunner.js` via parallel `Promise.all([assembleData(...), getAnalystTargets(...)])`; added `analystTargets` array to result payload
  - A-009: added `lastFilingDate` to `analysisRunner.js` result (ISO date string from `incomeStatements[0].date`); updated `DcfTab` + `ProjectionsTab` to derive fiscal year labels from `analysis.lastFilingDate` (falling back to raw statement date); changed projection year labels from `FY2025` style to `FY2025E` to signal estimates
  - A-006 (backend as canonical seed provider): added `computeMedian()`, `computeDerivedRatios()`, `estimateWACC()` helpers to `analysisRunner.js`; `computeDerivedRatios` computes 3-year median grossMarginPct, rdPct, sgaPct, daPct, capexPct, nwcPct, taxRate; `estimateWACC` derives CAPM-based WACC from beta, market cap, implied cost of debt; added `derivedRatios` block to result payload; replaced hardcoded `wacc: 0.10` in `calculateDCF` call with derived WACC; added `assumedWACC`, `waccSource`, `waccDetails` to `dcf` result object
  - A-006 (frontend): introduced `AssumptionsContext` as shared assumption store; `seedFromAnalysis()` now prefers `analysis.derivedRatios.*` (backend canonical) and falls back to single-period inline derivation; `ProjectionsTab.makeSeedAssumptions()` updated with the same `dr.*` pattern; `WaccTab` refactored to read WACC inputs from `AssumptionsContext` instead of local state, writes back via `updateWaccInputs()`; `DcfTab` refactored to read projection ratios (daPct, capexPct, nwcPct, taxRate, revenueGrowth) from context and projected values from `ProjectedValuesContext`; `CompanyPage` wraps everything in `AssumptionsProvider` + `ProjectedValuesProvider`
  - Blank page debugging: build passes but app is blank at runtime — added `ErrorBoundary` to `main.jsx` to surface the actual React render error (previously swallowed by React 18 unmounting the entire tree on uncaught errors)
- Open Questions: root cause of the blank-page render crash is not yet identified — `ErrorBoundary` was added at session end to surface the error message on next browser load
- Next Step: check browser after adding `ErrorBoundary`; fix the specific crash it reports; remove `ErrorBoundary` once confirmed stable
- Owns Next: frontend/src/main.jsx (error boundary — remove after debug), root crash site TBD once error is visible
- Do Not Touch: logs/**, data/fixtures/** (fixture data is correct; crash is in component render logic)
- Files Touched: src/services/analysisRunner.js, src/services/financialData.js, frontend/src/contexts/AssumptionsContext.jsx, frontend/src/tabs/ProjectionsTab.jsx, frontend/src/tabs/WaccTab.jsx, frontend/src/tabs/DcfTab.jsx, frontend/src/pages/CompanyPage.jsx, frontend/src/tabs/RelativeValuationTab.jsx, frontend/src/main.jsx, docs/WORKLOG.md

## 2026-04-01 17:09 (America/Denver) - codex
- Branch: feature/valuation-workbench
- Objective: audit Alpha Forge against the Summit Fund HW1 workbook using the AAPL fixture path and generate a read-only lineage package for workbook-fidelity review
- Decisions: (1) treat the workbook as canonical for structure, dependency order, and calculation sequence; (2) extract workbook sheet/formula topology from the `.xlsx` archive under `logs/tmp_hw1` because Excel COM was unavailable in-session; (3) classify fixture-limited gaps separately from architecture failures; (4) keep the audit at field-family level rather than cell-by-cell except where sequence mismatches required deeper tracing
- Open Questions: whether the next implementation pass should centralize assumptions first or unify Revenue/Projections/DCF into a single authoritative forecast model first; whether `logs/tmp_hw1` should remain checked in locally as workbook-inspection support or be deleted after handoff
- Next Step: convert the audit findings into an implementation-sequenced remediation plan, starting with shared assumption ownership and a single forecast lineage for Revenue -> Projections -> DCF
- Owns Next: frontend/src/pages/CompanyPage.jsx, frontend/src/tabs/AssumptionsTab.jsx, frontend/src/tabs/RevenueTab.jsx, frontend/src/tabs/ProjectionsTab.jsx, frontend/src/tabs/WaccTab.jsx, frontend/src/tabs/DcfTab.jsx, src/services/analysisRunner.js, src/services/analysis.js
- Do Not Touch: logs/master-lineage.md, logs/audit-report.html, logs/lineage.json, logs/executive-summary.md unless updating the audit itself; current app code was intentionally left read-only in this session
- Files Touched: docs/WORKLOG.md, CLAUDE.md, logs/master-lineage.md, logs/audit-report.html, logs/lineage.json, logs/executive-summary.md

## 2026-04-01 (session 2) — claude
- Branch: feature/valuation-workbench
- Objective: full data integrity audit of Relative Valuation tab — ensure calculations are accurate, flow from previous data (not re-derived), and the tab is ready for full functionality once the starter screen is implemented
- Decisions: (1) build a complete peer data pipeline (FMP /stock_peers → per-peer quote+income+balance → normalizePeer → enrichPeersWithMultiples) rather than seeding fixture manually and leaving backend empty; (2) centralize EBITDA in the backend income statement pass-through so neither RV nor DCF tab recomputes it independently — uses FMP value, falls back to operatingIncome+D&A; (3) remove frontend fallback multiple derivation (??-chained raw computation) since calcStats() was already reading p.evRevenue directly — the fallback only existed in the display path creating a silent mismatch; (4) TSLA added to fixture peers deliberately at extreme multiples (P/E 171×, EV/EBITDA 84×) to exercise outlier detection and the *excl badge
- Open Questions: none — all 3 audit findings resolved; tab fully functional in fixture mode
- Next Step: implement Assumptions tab (last stub tab), or implement starter screen (company selector)
- Owns Next: frontend/src/tabs/AssumptionsTab.jsx OR new starter/home screen component
- Do Not Touch: src/services/normalizers/fmp.js, src/services/financialData.js, src/services/dataAssembler.js, src/services/analysisRunner.js (peer pipeline is complete — do not re-touch unless FMP endpoint changes)
- Files Touched: src/services/normalizers/fmp.js, src/services/financialData.js, src/services/dataAssembler.js, src/services/analysisRunner.js, frontend/src/tabs/RelativeValuationTab.jsx, data/fixtures/AAPL/analysis.json, TODO.md

## 2026-04-01 — claude
- Branch: feature/valuation-workbench
- Objective: full accuracy audit of Final Valuation tab; ensure calculations flow from previous tabs and the tab is ready for full functionality once the starter screen is implemented
- Decisions: (1) always mount DcfTab and RelativeValuationTab (outside keyed div) so prices emit on data load, no tab-visit prerequisite; (2) lift dcfWeight state to CompanyPage so it survives tab navigation; (3) unify currentPrice source to technicals-first across DCF and Final Valuation; (4) guard P/E terminal path against negative projected earnings
- Open Questions: none — all 5 audit findings resolved
- Next Step: implement Assumptions tab (last stub tab)
- Owns Next: frontend/src/tabs/AssumptionsTab.jsx, frontend/src/pages/CompanyPage.jsx
- Do Not Touch: src/services/**, data/fixtures/**, .claude/agents/**
- Files Touched: frontend/src/pages/CompanyPage.jsx, frontend/src/tabs/FinalValuationTab.jsx, frontend/src/tabs/DcfTab.jsx, TODO.md

## 2026-03-31 11:35 (America/Denver) - codex
- Branch: feature/valuation-workbench
- Objective: establish cross-tool continuity guardrails, then audit DCF tab math and sensitivity shading before implementing fixes
- Decisions: keep `.claude/agents` as canonical; use `.codex/agents` mirror; add explicit worklog + automated handoff checks
- Open Questions: whether scale-factor discounting should be retained as a stub-period method or replaced with fixed year-index discounting
- Next Step: complete DCF audit report with concrete findings and proposed patch set
- Owns Next: frontend/src/tabs/DcfTab.jsx, frontend/src/tabs/WaccTab.jsx, frontend/src/pages/CompanyPage.jsx
- Do Not Touch: src/services/**, data/fixtures/**, .claude/agents/**
- Files Touched: docs/WORKLOG.md, docs/AGENT_SYNC.md, docs/WORKFLOW_CHECKPOINT_SKILL.md, scripts/handoff-check.ps1

## 2026-03-31 12:10 (America/Denver) - codex
- Branch: feature/valuation-workbench
- Objective: implement approved DCF fixes (fuller FCFE bridge, scale-factor correction, sensitivity color logic, and WACC->DCF dataflow)
- Decisions: switch discounting to fixed annual periods for full-year projections; map sensitivity colors by grid min/max; carry full WACC model state into DCF tab
- Open Questions: whether to expose a user-facing toggle between annual-period discounting and explicit stub-period discounting
- Next Step: run UI smoke checks with fixture variants and confirm visual gradient expectations on both sensitivity grids
- Owns Next: frontend/src/tabs/DcfTab.jsx, frontend/src/tabs/WaccTab.jsx, frontend/src/pages/CompanyPage.jsx
- Do Not Touch: src/services/**, data/fixtures/**, .claude/agents/**
- Files Touched: frontend/src/pages/CompanyPage.jsx, frontend/src/tabs/WaccTab.jsx, frontend/src/tabs/DcfTab.jsx, docs/WORKLOG.md

## 2026-03-31 12:20 (America/Denver) - codex
- Branch: feature/valuation-workbench
- Objective: add usage-limit handoff automation and cross-tool switch command
- Decisions: add `prepare-handoff.ps1` for one-command baton passing; add usage-failover skill doc; wire shared checks into flow
- Open Questions: whether you want a final optional launcher for local Claude CLI if present
- Next Step: use `prepare-handoff.ps1` commands for limit-based switching and commit once reviewed
- Owns Next: scripts/prepare-handoff.ps1, scripts/session-end.ps1, docs/USAGE_FAILOVER_SKILL.md, docs/AGENT_SYNC.md, .claude/hooks/session-start.sh
- Do Not Touch: src/services/**, data/fixtures/**, .claude/agents/**
- Files Touched: scripts/prepare-handoff.ps1, scripts/session-end.ps1, docs/USAGE_FAILOVER_SKILL.md, docs/AGENT_SYNC.md, .claude/hooks/session-start.sh, docs/WORKLOG.md

## 2026-03-31 13:00 (America/Denver) - claude
- Branch: feature/valuation-workbench
- Objective: audit Claude-side workflow system; verify awareness of DCF audit and Codex/Claude interop
- Decisions: fix stale agent memory paths (kakvl → Kak Vlek) in financial-data-collector, ui-clarity-enhancer, ui-implementation-expert; re-sync Codex mirror; all 7 agent hashes verified
- Open Questions: none
- Next Step: continue to Final Valuation tab implementation
- Owns Next: frontend/src/tabs/FinalValuationTab.jsx (new file), frontend/src/pages/CompanyPage.jsx
- Do Not Touch: src/services/**, data/fixtures/**, .claude/agents/**
- Files Touched: .claude/agents/financial-data-collector.md, .claude/agents/ui-clarity-enhancer.md, .claude/agents/ui-implementation-expert.md, .codex/agents/* (synced), docs/WORKLOG.md

## 2026-03-31 11:52 (America/Denver) - codex
- Branch: feature/valuation-workbench
- Objective: auto-generated handoff for current workspace changes
- Decisions: auto-captured from git state; refine manually if nuanced decisions were made
- Open Questions: none captured automatically
- Next Step: continue work on owned files and refine this handoff entry if needed
- Owns Next: .claude/hooks/session-start.sh, CLAUDE.md, docs/AGENT_SYNC.md, docs/WORKFLOW_CHECKPOINT_SKILL.md, frontend/src/pages/CompanyPage.jsx, frontend/src/styles.css, frontend/src/tabs/DcfTab.jsx, frontend/src/tabs/WaccTab.jsx, .githooks/, docs/USAGE_FAILOVER_SKILL.md, docs/WORKLOG.md, scripts/codex-auto.ps1, scripts/handoff-check.ps1, scripts/prepare-handoff.ps1, scripts/session-end.ps1, scripts/session-start.ps1
- Do Not Touch: files outside Owns Next, unless explicitly required for dependency fixes
- Files Touched: .claude/hooks/session-start.sh, CLAUDE.md, docs/AGENT_SYNC.md, docs/WORKFLOW_CHECKPOINT_SKILL.md, frontend/src/pages/CompanyPage.jsx, frontend/src/styles.css, frontend/src/tabs/DcfTab.jsx, frontend/src/tabs/WaccTab.jsx, .githooks/, docs/USAGE_FAILOVER_SKILL.md, docs/WORKLOG.md, scripts/codex-auto.ps1, scripts/handoff-check.ps1, scripts/prepare-handoff.ps1, scripts/session-end.ps1, scripts/session-start.ps1

## 2026-03-31 12:01 (America/Denver) - codex
- Branch: feature/valuation-workbench
- Objective: auto-generated handoff for current workspace changes
- Decisions: auto-captured from git state; refine manually if nuanced decisions were made
- Open Questions: none captured automatically
- Next Step: continue work on owned files and refine this handoff entry if needed
- Owns Next: .claude/hooks/session-start.sh, CLAUDE.md, docs/AGENT_SYNC.md, docs/WORKFLOW_CHECKPOINT_SKILL.md, frontend/src/pages/CompanyPage.jsx, frontend/src/styles.css, frontend/src/tabs/DcfTab.jsx, frontend/src/tabs/WaccTab.jsx, .githooks/, docs/USAGE_FAILOVER_SKILL.md, docs/WORKLOG.md, scripts/codex-auto.ps1, scripts/handoff-check.ps1, scripts/prepare-handoff.ps1, scripts/session-end.ps1, scripts/session-start.ps1
- Do Not Touch: files outside Owns Next, unless explicitly required for dependency fixes
- Files Touched: .claude/hooks/session-start.sh, CLAUDE.md, docs/AGENT_SYNC.md, docs/WORKFLOW_CHECKPOINT_SKILL.md, frontend/src/pages/CompanyPage.jsx, frontend/src/styles.css, frontend/src/tabs/DcfTab.jsx, frontend/src/tabs/WaccTab.jsx, .githooks/, docs/USAGE_FAILOVER_SKILL.md, docs/WORKLOG.md, scripts/codex-auto.ps1, scripts/handoff-check.ps1, scripts/prepare-handoff.ps1, scripts/session-end.ps1, scripts/session-start.ps1

## 2026-03-31 - claude
- Branch: feature/valuation-workbench
- Objective: UI clarity pass on Final Valuation tab — token fixes, style alignment, readability improvements
- Decisions: (1) removed undefined `var(--color-text)` token (4 instances) → `var(--color-text-primary)`; (2) replaced hardcoded `rgba(30,45,64,0.5)` border → `var(--color-border)` and hardcoded gold tint → `rgba(212,168,83,0.07)`; (3) aligned section title 14px→13px and subtitle 12px→11px with RV tab; (4) removed `padding: 20px` from `fv-wrap` (double-padding with tab container); (5) removed built-in `margin-top: 12px` from `.fv-table` (section padding handles spacing); (6) added `fv-table-scroll` wrapper class for overflow safety on both weighting tables and analyst table; (7) added `background: var(--color-surface-alt)` to `fv-table th` for consistent header treatment; (8) added `subtitle` prop to WeightingTable component; (9) added subtitles to FCFE, FCFF, Valuation Summary, and Analyst Targets sections; (10) added `fv-table tr:hover` row highlight; (11) added `border-top` to total row for cleaner separation; (12) added `white-space: nowrap` to th for narrow viewports
- Open Questions: none
- Next Step: Assumptions tab (last remaining stub)
- Owns Next: frontend/src/tabs/AssumptionsTab.jsx, frontend/src/pages/CompanyPage.jsx
- Do Not Touch: src/services/**, data/fixtures/**, .claude/agents/**
- Files Touched: frontend/src/tabs/FinalValuationTab.jsx, frontend/src/styles.css, TODO.md, docs/WORKLOG.md

## 2026-03-31 - claude
- Branch: feature/valuation-workbench
- Objective: UI clarity pass on Relative Valuation tab — full audit and targeted fixes for readability, semantic correctness, and style consistency
- Decisions: (1) replaced misused `rv-table__col-hdr` on `<td>` elements with new `rv-cell--text` class so company names render in text-primary not muted secondary; (2) extracted "← Your company" into a styled gold `rv-subject-badge` span; (3) added 2px gold border-bottom to `.rv-row--subject` as a hard separator from peers; (4) added descriptive subtitles under all 4 section titles; (5) renamed "Statistical Analysis of Multiple Valuation" → "Implied Share Price Analysis" to disambiguate from Statistics section; (6) removed all 35 `style={{ textAlign: 'left' }}` inline overrides (CSS `th/td:first-child` rules already cover this); (7) added `rv-scenario-hint` spans to Bull/Neutral/Bear rows showing percentile used; (8) added current price footnote under implied prices table; bumped group header font 10px → 11px
- Open Questions: none
- Next Step: Final Valuation tab — weighted rollup of DCF + RV implied prices, football field chart, editable weights
- Owns Next: frontend/src/tabs/FinalValuationTab.jsx (new), frontend/src/pages/CompanyPage.jsx
- Do Not Touch: src/services/**, data/fixtures/**, .claude/agents/**
- Files Touched: frontend/src/tabs/RelativeValuationTab.jsx, frontend/src/styles.css, TODO.md, docs/WORKLOG.md

## 2026-03-31 - claude
- Branch: feature/valuation-workbench
- Objective: implement Final Valuation tab — weighted rollup of DCF + RV implied prices, weight control, summary metrics, analyst targets
- Decisions: state-lifted via onPricesChange callbacks mirroring existing onWaccChange pattern; FCFE path uses P/E median RV price (equity metric); FCFF path uses EV/EBITDA median RV price (enterprise metric); only dcfWeight is editable state — rvWeight always derived as 1-dcfWeight; hint shown when source tabs not yet visited; useCallback on handlers to avoid effect re-runs
- Open Questions: none
- Next Step: implement Assumptions tab (last stub tab)
- Owns Next: frontend/src/tabs/AssumptionsTab.jsx, frontend/src/pages/CompanyPage.jsx
- Do Not Touch: src/services/**, data/fixtures/**, .claude/agents/**
- Files Touched: frontend/src/tabs/FinalValuationTab.jsx, frontend/src/tabs/DcfTab.jsx, frontend/src/tabs/RelativeValuationTab.jsx, frontend/src/pages/CompanyPage.jsx, frontend/src/styles.css, TODO.md, docs/WORKLOG.md

## 2026-03-31 - claude
- Branch: feature/valuation-workbench
- Objective: implement Relative Valuation tab (comps table, statistics, implied prices, Bull/Neutral/Bear model)
- Decisions: peers flow via analysis.peers array (generic schema); stats use all values for High/Low, positive-only for 75th/Avg/Median/25th; outlier detection via Q3+3×IQR; implied prices use EV bridge for EV-based multiples and EPS for P/E; MSFT fixture seeded with 5 peers from data/MSFT-collected.json as first live example; no example data hardcoded — fully data-driven
- Open Questions: data pipeline does not yet populate analysis.peers for live tickers (only MSFT fixture has peers); EBITDA derived from operatingIncome + depreciationAmort where available, otherwise shown as —
- Next Step: implement Final Valuation tab — weighted rollup of DCF + RV implied prices, football field chart, editable model weights
- Owns Next: frontend/src/tabs/FinalValuationTab.jsx, frontend/src/pages/CompanyPage.jsx
- Do Not Touch: src/services/**, data/fixtures/AAPL/**, data/fixtures/MSFT/**, .claude/agents/**
- Files Touched: frontend/src/tabs/RelativeValuationTab.jsx, frontend/src/pages/CompanyPage.jsx, frontend/src/styles.css, data/fixtures/MSFT/analysis.json, TODO.md, docs/WORKLOG.md

## 2026-04-07 22:45 (America/Denver) - codex
- Branch: feature/valuation-workbench
- Objective: finalize the valuation workbench refinement pass, fold the Claude + Codex session work into a single documented checkpoint, and prepare the branch for commit
- Decisions: keep the commit scope to product code plus tracking docs; remove the abandoned global M/B display-unit toggle instead of partially wiring it; retain the broader 5-year historical payload and sparkline support added in this session; split Relative Valuation's wide comps view into stacked Company Info & Market Data, Financial Data, and Multiples tables for readability; standardize numeric editing UX with draft-state inputs for projected revenue growth, WACC price/beta, DCF terminal multiples, and DCF sensitivity multiple centers
- Open Questions: Assumptions tab is still the last workbench stub, but the better next product step is now the initial frontend entry screen where ticker selection happens before entering the workbench
- Next Step: implement the initial frontend starter screen for ticker selection and transition into the valuation workbench
- Owns Next: frontend/src/App.jsx, frontend/src/pages/CompanyPage.jsx, frontend/src/components/TickerInput.jsx, frontend/src/components/FixtureSelector.jsx, frontend/src/styles.css, frontend/src/tabs/AssumptionsTab.jsx
- Do Not Touch: .claude/worktrees/**, .claude/settings.local.json, data/AAPL-analysis.json
- Files Touched: frontend/src/App.jsx, frontend/src/components/CoreMetrics.jsx, frontend/src/components/MarketSnapshot.jsx, frontend/src/components/PctInput.jsx, frontend/src/components/MultipleInput.jsx, frontend/src/components/Sparkline.jsx, frontend/src/styles.css, frontend/src/tabs/DcfTab.jsx, frontend/src/tabs/ProjectionsTab.jsx, frontend/src/tabs/RelativeValuationTab.jsx, frontend/src/tabs/RevenueTab.jsx, frontend/src/tabs/WaccTab.jsx, frontend/src/utils/format.js, src/services/analysisRunner.js, TODO.md, docs/WORKLOG.md
