# Alpha Forge — TODO

This file tracks active tasks, planned features, and backlog items.
It should be kept up to date and committed with every meaningful change.

---

## In Progress

- [ ] Data Pipeline Orchestrator agent — coordinates multi-agent workflows end-to-end
- [ ] Visualization Agent — generates charts and HTML dashboards from structured data

---

## Planned

### Agents
- [ ] Report Generator Agent — written investment summaries from analysis JSON

### Features
- [ ] Wire CLI to use real FMP historical price data for Sharpe ratio
- [ ] Add integration tests for services
- [ ] Expand web API endpoints beyond `/api/company/:ticker`

---

## Backlog

- [ ] Add caching layer for FMP API responses
- [ ] Add error handling and retry logic for API failures
- [ ] CI/CD pipeline setup

---

## Completed

- [x] Project scaffold (CLI, web server, services, utils)
- [x] SessionStart hook for npm install on web sessions
- [x] financial-data-collector agent
- [x] ui-implementation-expert agent
- [x] ui-clarity-enhancer agent
- [x] financial-analysis-agent — full core metrics, DCF, technicals, file-based output
- [x] analysis.js — DCF, RSI, moving averages, momentum signal, P/E, growth rate derivation
- [x] financialData.js — historical prices, quote, key metrics endpoints
- [x] analysisRunner.js — orchestrator: fetches data, runs all analyses, outputs JSON + console
