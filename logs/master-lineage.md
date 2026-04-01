# Alpha Forge Workbook Fidelity Audit

Audit baseline: AAPL fixture path under `data/fixtures/AAPL`.

Workbook reference: `Summit Fund HW1 Estee Lauder.xlsx`, inspected from workbook XML, shared strings, calc chain, and sheet formulas under `logs/tmp_hw1`.

## Verdict

Alpha Forge is visually workbook-cohesive at the tab level, but it is not yet workbook-faithful at the shared model level.

The main gap is not missing screens. The main gap is broken dependency ownership:

- The workbook is a single tab-to-tab model where assumptions and revenue rollups feed projections, WACC, relative valuation, DCF, then final valuation.
- Alpha Forge renders tabs with similar names, but each major tab owns its own local projection logic and only a small subset of values cross tab boundaries.
- The backend payload is a thin historical/peer snapshot plus a legacy simple DCF, not the canonical multi-stage workbook dependency tree.

## Canonical Workbook-Required Flow

Observed from workbook sheets and formulas:

1. Introduction / identity / seed values
- Company name, ticker, current date, last filing date, next filing date, current share price.
- Revenue and downstream fiscal year headers inherit filing dates from Introduction.

2. Assumptions
- Global tax rate, risk-free rate, and market risk premium live here.
- WACC and Projections reference these cells directly.

3. Revenue
- Revenue is segment-first.
- Each segment has historical revenue, projected growth inputs, and projected revenue.
- Total revenue is the sum of segment revenue lines.
- Fiscal year headers and end dates feed forward from Introduction.

4. Projections
- Revenue sheet total revenue feeds the income statement and forecast terms.
- Historical values are reference inputs.
- Projected years are assumption-driven.
- Tax provision uses the global tax-rate assumption.
- CAPEX and NWC are forecast terms that feed DCF.

5. WACC
- Debt, diluted shares, price, market value of equity, capital weights, CAPM, after-tax cost of debt, final WACC.
- Risk-free rate, MRP, and tax rate are referenced from Assumptions.

6. Relative Valuation
- Subject-company market and financial metrics.
- Peer rows.
- Multiples.
- Statistics.
- Implied prices.
- Scenario rollups.

7. DCF
- Uses Revenue and Projections outputs, plus WACC / cost of equity and capital structure.
- Builds separate FCFF and FCFE trees.
- Uses exit multiples and discount rates.
- Sensitivity tables are downstream summaries.

8. Final Valuation
- Blends DCF and relative valuation outputs using adjustable weights.
- Computes FCFE-weighted result, FCFF-weighted result, then average.
- Analyst targets are downstream reference content.

## Observed Alpha Forge Implementation Flow

Frontend top-level structure:

- `CompanyPage` mounts workbook-like tabs and stores only four shared cross-tab values:
  - `waccOverride`
  - `waccModel`
  - `dcfPrices`
  - `rvPrices`
  - `dcfWeight`
- Code: [frontend/src/pages/CompanyPage.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\pages\CompanyPage.jsx#L23)

Backend payload shape:

- Backend returns:
  - `company`
  - `analysis.coreMetrics`
  - `analysis.dcf`
  - `analysis.technicals`
  - `analysis.historicalRevenue`
  - `analysis.historicalFinancials`
  - `analysis.peers`
  - `analysis.flags`
- Backend does not return workbook-like shared assumptions, segment revenue model, projections model, WACC model, DCF FCFF tree, DCF FCFE tree, or final valuation model state.
- Code: [src/services/analysisRunner.js](C:\Users\Kak Vlek\projects\alpha-forge\src\services\analysisRunner.js#L257)

Current tab ownership:

- Assumptions tab is display-only market snapshot and core metrics.
- Revenue tab owns its own local growth state and projected total revenue only.
- Projections tab owns its own local forecast assumption arrays and computes projected statement rows locally.
- WACC tab owns its own local WACC input state and emits only computed WACC/model.
- Relative Valuation tab computes subject metrics, stats, implied prices, and scenarios locally from `analysis.peers` and historical statement snapshots.
- DCF tab builds a second local projection model and emits only FCFF/FCFE implied prices.
- Final Valuation tab combines emitted DCF and RV prices plus a local user weight.

## Deltas: Canonical vs Observed

### Introduction

Canonical:
- Identity and seed values provide company, ticker, price, current date, last filing date, next filing date, and fiscal-year timing anchors.

Observed:
- Identity is partially shown in overview and market snapshot.
- Filing-date-driven timing is absent from payload and UI.
- Revenue, Projections, and DCF derive year labels from historical dates only.

Status:
- partially wired

### Assumptions

Canonical:
- A single assumptions layer propagates tax rate, risk-free rate, and MRP to WACC, Projections, and DCF.

Observed:
- Assumptions tab is not the assumption owner.
- WACC owns editable `riskFreeRate`, `mrp`, and `taxRate` locally.
- Projections owns editable `taxRate` locally and seeds it from historical statements.
- DCF hardcodes `RFR` and `MRP` constants, uses WACC override when present, and otherwise uses backend defaults.
- Code:
  - [frontend/src/tabs/AssumptionsTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\AssumptionsTab.jsx#L4)
  - [frontend/src/tabs/WaccTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\WaccTab.jsx#L10)
  - [frontend/src/tabs/ProjectionsTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\ProjectionsTab.jsx#L35)
  - [frontend/src/tabs/DcfTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\DcfTab.jsx#L7)

Status:
- unintentionally deviated / probable issue

### Revenue

Canonical:
- Segment-first.
- Total revenue rolls up from segments.
- Projected revenue is driven by editable segment growth assumptions.

Observed:
- Revenue tab displays only total historical revenue and one total-growth input row.
- No segment rows are rendered.
- No segment rollup feeds downstream tabs.
- Growth is seeded from backend `analysis.dcf.assumedGrowthRate`, not a shared revenue model.
- Code: [frontend/src/tabs/RevenueTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\RevenueTab.jsx#L29)

Status:
- partially wired

### Projections

Canonical:
- Revenue sheet output feeds projected statement lines and forecast terms.
- D&A is part of the operating bridge before FCF add-backs.

Observed:
- Projections tab computes rows locally from historical ratios plus local editable arrays.
- It does not consume RevenueTab local state.
- It does not publish projected rows to DCF.
- `projOpIncome` excludes D&A as a deduction, while D&A is also shown as its own line. This diverges from the workbook sequence.
- Common-size chart includes D&A inside OpEx while projected operating profit excludes it, creating a display/model inconsistency.
- Code:
  - [frontend/src/tabs/ProjectionsTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\ProjectionsTab.jsx#L139)
  - [frontend/src/tabs/ProjectionsTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\ProjectionsTab.jsx#L157)
  - [frontend/src/tabs/ProjectionsTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\ProjectionsTab.jsx#L181)

Status:
- unintentionally deviated / probable issue

### WACC

Canonical:
- Shares, price, debt, assumption inputs, CAPM, after-tax cost of debt, and weights produce final WACC.

Observed:
- WACC tab structure matches workbook intent closely.
- Risk-free rate, MRP, cost of debt, tax rate, shares, and price are editable.
- WACC emits shared override/model to DCF.
- If `company.sharesOutstanding` is null, WACC leaves shares blank instead of using the same fallback that DCF uses.
- Code:
  - [frontend/src/tabs/WaccTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\WaccTab.jsx#L20)
  - [frontend/src/tabs/WaccTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\WaccTab.jsx#L55)

Status:
- workbook-aligned but fixture-limited

### Relative Valuation

Canonical:
- Subject-company row, peer ingestion, multiples, stats, implied prices, scenario outputs.

Observed:
- Structure is close to workbook intent.
- Backend supplies `analysis.peers`; frontend computes stats, implied prices, and scenarios.
- Negative multiples are included in high/low but filtered from percentile stats, broadly matching workbook notes.
- Subject diluted shares are derived from market cap and price because `company.sharesOutstanding` is null in fixture.
- Code:
  - [frontend/src/tabs/RelativeValuationTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\RelativeValuationTab.jsx#L53)
  - [frontend/src/tabs/RelativeValuationTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\RelativeValuationTab.jsx#L80)
  - [src/services/analysisRunner.js](C:\Users\Kak Vlek\projects\alpha-forge\src\services\analysisRunner.js#L241)

Status:
- workbook-aligned and verified

### DCF

Canonical:
- Separate FCFF and FCFE trees.
- Depends on upstream Revenue, Projections, WACC, and cost of equity.
- Sequence must respect operating bridge, taxes, NWC, CAPEX, leverage adjustments, and terminal methods.

Observed:
- DCF tab has separate FCFF and FCFE outputs and sensitivity tables, which is structurally aligned.
- It does not consume RevenueTab or ProjectionsTab user edits.
- It rebuilds its own projection stack from latest historical ratios and backend growth seed.
- It uses constant growth across all years.
- FCFE net borrowing is a flat annual amount derived from historical debt delta, not conditional debt increase logic.
- Backend `analysis.dcf` is still a separate simple Gordon-growth model and acts mostly as a seed source, not the displayed canonical DCF engine.
- Code:
  - [frontend/src/tabs/DcfTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\DcfTab.jsx#L58)
  - [frontend/src/tabs/DcfTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\DcfTab.jsx#L137)
  - [frontend/src/tabs/DcfTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\DcfTab.jsx#L173)
  - [src/services/analysis.js](C:\Users\Kak Vlek\projects\alpha-forge\src\services\analysis.js#L139)

Status:
- partially wired

### Final Valuation

Canonical:
- Combines DCF FCFE with relative-valuation P/E path, DCF FCFF with relative-valuation enterprise path, then averages them under user-controlled weights.

Observed:
- Weighting flow is structurally close.
- `dcfWeight` lives in top-level user state and recomputes live.
- FCFE uses DCF FCFE + RV P/E median.
- FCFF uses DCF FCFF + RV EV/EBITDA median.
- EV/Revenue is displayed as reference only, not blended.
- Analyst targets table exists but AAPL fixture does not provide `analysis.analystTargets`.
- Code:
  - [frontend/src/pages/CompanyPage.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\pages\CompanyPage.jsx#L25)
  - [frontend/src/tabs/FinalValuationTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\FinalValuationTab.jsx#L67)

Status:
- workbook-aligned and verified

## Editable Inputs and Recompute Expectations

### RevenueTab

- Editable:
  - total revenue growth by projected year
- State:
  - local React state only
- Persistence:
  - not persisted
- Downstream workbook expectation:
  - total revenue
  - projections statement rows
  - DCF FCFF tree
  - DCF FCFE tree
  - final valuation
- Actual recompute:
  - only RevenueTab table/chart updates
- Code: [frontend/src/tabs/RevenueTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\RevenueTab.jsx#L32)

### ProjectionsTab

- Editable:
  - revenue growth
  - gross margin
  - R&D percent of revenue
  - SG&A percent of revenue
  - D&A percent of revenue
  - net interest
  - other income
  - tax rate
  - CAPEX percent of revenue
  - NWC percent of revenue
- State:
  - local React state only
- Persistence:
  - not persisted
- Downstream workbook expectation:
  - DCF operating bridge
  - FCFF
  - FCFE
  - final valuation
- Actual recompute:
  - only ProjectionsTab tables/charts update
- Code: [frontend/src/tabs/ProjectionsTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\ProjectionsTab.jsx#L79)

### WaccTab

- Editable:
  - risk-free rate
  - beta
  - MRP
  - cost of debt
  - expected marginal tax rate
  - diluted shares
  - price
- State:
  - local React state, partially shared upward through callbacks
- Persistence:
  - not persisted
- Downstream workbook expectation:
  - DCF discount rate
  - final valuation via DCF outputs
- Actual recompute:
  - WACC tab updates live
  - DCF uses `waccOverride` and `waccModel` live
- Code: [frontend/src/tabs/WaccTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\WaccTab.jsx#L67)

### DcfTab

- Editable:
  - terminal P/E
  - terminal EV/EBITDA
  - net borrowing annual
  - sensitivity-grid center values
- State:
  - local React state
- Persistence:
  - not persisted
- Downstream workbook expectation:
  - final valuation
- Actual recompute:
  - DCF summary, tables, sensitivity grids, and emitted prices update live
- Code: [frontend/src/tabs/DcfTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\DcfTab.jsx#L79)

### FinalValuationTab

- Editable:
  - DCF weight slider / numeric input
- State:
  - top-level React state in `CompanyPage`
- Persistence:
  - not persisted
- Downstream workbook expectation:
  - final FCFE weighting
  - final FCFF weighting
  - average implied value
  - upside/downside
- Actual recompute:
  - matches workbook intent
- Code: [frontend/src/tabs/FinalValuationTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\FinalValuationTab.jsx#L98)

## Major Findings

### 1. No shared canonical assumptions model

- Severity: critical
- Categories:
  - dependency mismatch
  - wrong calculation layer
  - sequence mismatch
- Why it matters:
  - The workbook depends on one shared assumptions layer.
  - Alpha Forge splits assumption ownership across WACC, Projections, DCF constants, and Revenue local state.
  - The Assumptions page is visual only.

### 2. Revenue is not segment-first and does not roll into downstream logic

- Severity: critical
- Categories:
  - missing upstream source
  - dependency mismatch
  - sequence mismatch
- Why it matters:
  - Workbook total revenue is a segment rollup.
  - Alpha Forge projects only total revenue and does not expose segment rows, segment growth, or downstream segment-driven lineage.

### 3. Projections and DCF are separate local models

- Severity: critical
- Categories:
  - dependency mismatch
  - sequence mismatch
  - wrong calculation layer
- Why it matters:
  - Workbook DCF depends on Projections outputs.
  - Alpha Forge DCF rebuilds its own projection stack and ignores ProjectionsTab edits.

### 4. Operating-income sequence deviates because D&A is not deducted before NOPAT in the frontend model

- Severity: critical
- Categories:
  - sequence mismatch
  - numerical/convention mismatch
  - display inconsistency
- Why it matters:
  - Workbook operating profit sequence includes D&A as a separate deduction before EBIT/NOPAT.
  - Alpha Forge Projections and DCF treat D&A as informational or add-back only, which changes EBIT/NOPAT lineage.

### 5. WACC share-source handling is inconsistent across tabs

- Severity: moderate
- Categories:
  - dependency mismatch
  - fixture limitation
- Why it matters:
  - WACC leaves shares blank when fixture `sharesOutstanding` is null.
  - DCF falls back to `marketCap / price`.
  - Same company therefore has different capital-structure availability in different tabs.

### 6. Backend payload is not the canonical model backbone

- Severity: moderate
- Categories:
  - wrong calculation layer
  - missing upstream source
- Why it matters:
  - Backend still produces a simple standalone DCF and historical snapshots.
  - Full workbook lineage currently exists mostly as frontend tab logic, not as a unified model.

## Fixture-Limited vs Architecture Issues

Fixture-limited and not automatic failures:

- `company.sharesOutstanding` is null in the AAPL fixture, causing blank WACC share input until manually entered.
- Analyst targets are absent from fixture payload.
- Some future-state segment and peer-expansion behaviors are hinted but not fully surfaced.

Real architecture issues:

- Assumptions are not centralized.
- Revenue is not segment-driven.
- Projections do not feed DCF.
- DCF uses its own model instead of upstream editable projections.
- D&A handling deviates from workbook sequence.

## Dormant / Helper Paths Aligned With Workbook Intent

- Revenue tab explicitly notes future segment-level expansion.
  - [frontend/src/tabs/RevenueTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\RevenueTab.jsx#L186)
- Relative valuation empty state is prepared for populated peer ingestion.
  - [frontend/src/tabs/RelativeValuationTab.jsx](C:\Users\Kak Vlek\projects\alpha-forge\frontend\src\tabs\RelativeValuationTab.jsx#L157)
- Backend already enriches peers with enterprise value and multiples, which supports full-scale relative valuation once peer selection/loading is broadened.
  - [src/services/analysisRunner.js](C:\Users\Kak Vlek\projects\alpha-forge\src\services\analysisRunner.js#L241)

## Recommended Next Inspection

1. Define a shared assumption store and trace every tab to it.
2. Decide whether Revenue or Projections is the authoritative forecast owner, then remove parallel forecast trees.
3. Rebuild DCF to consume projected line items instead of deriving its own isolated ratios.
4. Restore a segment-first revenue schema in payloads and frontend state.
5. Standardize diluted-share sourcing across company, WACC, relative valuation, and DCF.
