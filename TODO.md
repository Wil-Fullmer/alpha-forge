# Alpha Forge — TODO

This file tracks active tasks, planned features, and backlog items.
It should be kept up to date and committed with every meaningful change.


## In Progress

---

## Planned

### Agents

### Features

---

## Backlog

- [ ] CI/CD pipeline setup

---

## Completed

- [x] SPA dashboard upgrade — global header, sidebar nav, assumption sliders (growth/WACC/terminal/tax), real-time DCF recalc, sensitivity matrix heatmap, scenario toggles (Bull/Base/Bear), football field SVG chart, story sidebar

- [x] Project scaffold (CLI, web server, services, utils)
- [x] SessionStart hook for npm install on web sessions
- [x] financial-data-collector agent
- [x] ui-implementation-expert agent
- [x] ui-clarity-enhancer agent
- [x] financial-analysis-agent — full core metrics, DCF, technicals, file-based output
- [x] analysis.js — DCF, RSI, moving averages, momentum signal, P/E, growth rate derivation
- [x] financialData.js — historical prices, quote, key metrics endpoints
- [x] analysisRunner.js — orchestrator: fetches data, runs all analyses, outputs JSON + console
- [x] Wire CLI to use real FMP historical price data for Sharpe ratio — CLI now calls runFullAnalysis
- [x] Expand web API endpoints — added /api/analysis/:ticker, /api/technicals/:ticker, /api/metrics/:ticker
- [x] Add integration tests for services — tests/integration/analysisRunner.test.js
- [x] Data Pipeline Orchestrator agent — .claude/agents/pipeline-orchestrator.md
- [x] Visualization Agent — .claude/agents/visualization-agent.md
- [x] Report Generator Agent — .claude/agents/report-generator-agent.md
- [x] TTL-based file cache for FMP API responses — 15m quote, 1d prices, 7d statements; --force flag to bypass
- [x] Add error handling and retry logic for API failures — typed errors for 429/401/403, soft-error JSON detection, negative FCF guard, missing net-debt flags, CAGR clamping
- [x] Infinite API key support — dynamic key pool from env vars (FMP_API_KEY, FMP_API_KEY_ALT, FMP_API_KEY_2..N), rotation on 429/401/403, immediate fail on 402
- [x] Tab-window animated dashboard — five-tab interface (Overview, Valuation, Technicals, Projections, Report), slide/fade transitions, company profile strip, lazy report loading
