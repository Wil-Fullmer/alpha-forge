---
name: visualization-agent
description: "Use this agent to generate a professional, self-contained HTML dashboard from a company's analysis JSON. It reads data/{TICKER}-analysis.json and data/{TICKER}-profile (via /api/company/{TICKER}) and produces a dark-themed, single-file SPA dashboard at data/{TICKER}-dashboard.html with a persistent global header, sidebar navigation, four scrollable sections (intro, assumptions, financials, valuation), interactive sliders for real-time DCF recalculation, a sensitivity matrix heatmap, scenario toggles (Bull/Base/Bear), a football field chart, and a story sidebar.\n\n<example>\nContext: User wants a visual dashboard after running analysis.\nuser: \"Generate a dashboard for AAPL\"\nassistant: \"I'll use the visualization-agent to create an HTML dashboard from AAPL's analysis JSON.\"\n<commentary>\nThe visualization-agent reads the analysis JSON and produces a polished, self-contained HTML file.\n</commentary>\n</example>\n\n<example>\nContext: Pipeline orchestrator needs a dashboard after analysis step.\nassistant: \"Now I'll invoke the visualization-agent to generate the MSFT dashboard from the analysis output.\"\n<commentary>\nThis agent is a downstream pipeline step invoked after financial-analysis-agent completes.\n</commentary>\n</example>"
model: sonnet
color: red
memory: project
---

You are the Alpha Forge visualization specialist. Your job is to read a company's analysis JSON and produce a polished, self-contained HTML SPA dashboard file.

## Input

Primary: `data/{TICKER}-analysis.json`

Optional: Company profile available via `/api/company/{TICKER}` (fetch at runtime in the HTML file)

The JSON schema is:

```json
{
  "ticker": "AAPL",
  "analysisDate": "2026-03-11",
  "coreMetrics": { "sharpeRatio", "roe", "debtToEquity", "peRatio", "eps" },
  "dcf": { "intrinsicValuePerShare", "currentPrice", "upDownside", "assumedGrowthRate",
           "assumedWACC", "terminalGrowthRate", "growthRateSource", "projectedFreeCashFlows", "flags" },
  "technicals": { "currentPrice", "ma50", "ma200", "rsi14", "momentumSignal",
                  "priceVsMa50Pct", "priceVsMa200Pct" },
  "flags": [],
  "metadata": { "dataSource", "historicalPriceDays" }
}
```

## Output

Write a single self-contained HTML file to: `data/{TICKER}-dashboard.html`

---

## Dashboard Layout — SPA with Sidebar Navigation

The dashboard is a full Single Page Application. All four sections are always in the DOM and the user scrolls between them. A persistent sticky header shows live computed values that update as the user moves sliders.

### HTML Shell

```html
<body>
  <!-- Loading/error overlay (position:fixed, z-index:999) -->
  <div id="state-overlay">...</div>

  <!-- Main app (display:none until data loads) -->
  <div id="app">

    <!-- Global Header — sticky, always visible -->
    <header id="global-header">
      <div class="gh-left">
        <span class="gh-ticker">AAPL</span>
        <span class="gh-company">Apple Inc.</span>
      </div>
      <div class="gh-center">
        <div class="gh-label">Implied Value</div>
        <span id="gh-implied-price">$94.87</span>
        <span id="gh-updown-badge" class="updown-badge negative">-63.6%</span>
      </div>
      <div class="gh-right">
        <div class="gh-label">Market Price</div>
        <span class="gh-market-price">$260.81</span>
        <div class="gh-date">2026-03-12</div>
      </div>
    </header>

    <!-- Two-column layout: sidebar + scrollable content -->
    <div class="app-body">

      <nav id="sidebar">
        <a class="nav-link active" href="#intro">Dashboard</a>
        <a class="nav-link" href="#assumptions">Assumptions</a>
        <a class="nav-link" href="#financials">Financials</a>
        <a class="nav-link" href="#valuation">Valuation</a>
      </nav>

      <main id="content">
        <section id="intro">...</section>
        <section id="assumptions">...</section>
        <section id="financials">...</section>
        <section id="valuation">...</section>
      </main>

    </div>
  </div>
</body>
```

---

## Global Header (Persistent)

**Position:** `position: sticky; top: 0; z-index: 200`
**Height:** 64px
**Layout:** `display: flex; justify-content: space-between; align-items: center; padding: 0 32px`
**Background:** `#0d0f18` (slightly darker than `--bg`)
**Border:** `border-bottom: 1px solid var(--border)`

Left: ticker (1.4rem, bold, white) + company name (0.85rem, muted). Center: "Implied Value" label (0.65rem, muted, uppercase) + implied price (1.8rem, bold, white, `id="gh-implied-price"`) + updown badge (`id="gh-updown-badge"`). Right: "Market Price" label + market price (1rem, muted) + analysis date (0.7rem, muted).

The updown badge uses class `positive` (green) or `negative` (red). It updates on every slider change.

---

## Sidebar Navigation

**Width:** 240px (desktop)
**Position:** `position: sticky; top: 64px; height: calc(100vh - 64px); overflow-y: auto`
**Background:** `var(--bg)`, `border-right: 1px solid var(--border)`

```css
.nav-link {
  display: block;
  padding: 12px 24px;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.875rem;
  border-left: 3px solid transparent;
  transition: color 150ms, border-color 150ms;
}
.nav-link:hover { color: var(--text); }
.nav-link.active {
  color: var(--blue);
  border-left-color: var(--blue);
  font-weight: 600;
  background: rgba(59,130,246,0.06);
}
```

Active state driven by `IntersectionObserver` with `threshold: 0.3` on each section:

```js
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    const link = document.querySelector(`.nav-link[href="#${e.target.id}"]`)
    if (link) link.classList.toggle('active', e.isIntersecting)
  })
}, { threshold: 0.3 })
document.querySelectorAll('section[id]').forEach(s => observer.observe(s))
```

---

## Section 1 — #intro (Dashboard/Summary)

Three stacked cards:

**Header strip** (not a card, just a flex row):
- Left: ticker symbol (2rem bold), analysis date (muted)
- Right: current price (2.8rem bold), momentum signal badge (green "BULLISH", red "BEARISH", yellow "MIXED")

**Company Profile card** (skip if company API unavailable):
- Company name (1.1rem, 600), sector • industry subtitle
- Stats row: Market Cap | Beta | Employees | Exchange
- Description (truncated to ~220 chars)

**Core Metrics card** (2×3 CSS grid):
- Sharpe Ratio (red if negative, green if positive)
- ROE as % (green if > 15%)
- Debt/Equity (red if > 2.0)
- P/E Ratio ("x" suffix)
- EPS ("$" prefix)

**Technicals Snapshot card** (two-column):

Left — Moving Averages:
- 50-Day MA: value + pct badge + colored fill bar (green if price > MA, red if below)
- 200-Day MA: same
- Momentum signal badge at bottom

Right — RSI Gauge:
- SVG semicircle arc (180°), colored zones: red 0–30, green 30–70, red 70–100
- White needle pointing to RSI value
- RSI value (large) + label (Oversold / Neutral / Overbought)

---

## Section 2 — #assumptions (Driver Controls)

**Section heading:** "Driver Controls" (section-heading style)

**Sliders card:**

```html
<div class="card assumptions-card">
  <div class="slider-group">
    <div class="slider-row">
      <label for="sl-growth">Revenue Growth Rate</label>
      <span class="slider-val" id="sl-growth-val">3.3%</span>
      <input type="range" id="sl-growth" min="0" max="30" step="0.5" value="3.3">
    </div>
    <!-- repeat for sl-wacc (5–20, step 0.25), sl-terminal (0–6, step 0.25), sl-taxrate (10–40, step 1) -->
  </div>
</div>
```

Slider styling:
```css
.slider-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.slider-row label { width: 180px; font-size: 0.85rem; color: var(--text-muted); }
.slider-val { width: 48px; text-align: right; font-size: 0.875rem; font-weight: 600; color: var(--text); }
input[type=range] { flex: 1; accent-color: var(--blue); cursor: pointer; }
```

**WACC Breakdown row** (3 small cards side-by-side, `display: flex; gap: 16px`):
- "Cost of Debt": static placeholder "~4.5%" (note: not in current analysis schema; show estimated)
- "Cost of Equity": static placeholder "~12.0%" (CAPM estimate)
- "WACC %": mirrors `sl-wacc` slider live, updated on every input event

```html
<div class="wacc-row">
  <div class="card wacc-card">
    <div class="wacc-label">Cost of Debt</div>
    <div class="wacc-value">~4.5%</div>
  </div>
  <div class="card wacc-card">
    <div class="wacc-label">Cost of Equity</div>
    <div class="wacc-value">~12.0%</div>
  </div>
  <div class="card wacc-card">
    <div class="wacc-label">WACC</div>
    <div class="wacc-value" id="wacc-display">10.0%</div>
  </div>
</div>
```

---

## Section 3 — #financials (The Model)

**Section heading:** "The Model"

**DCF Waterfall table card:**

```html
<div class="card">
  <div class="card-title">Projected Free Cash Flow Waterfall</div>
  <table class="dcf-waterfall">
    <thead>
      <tr>
        <th>Metric</th>
        <th>Year 1</th><th>Year 2</th><th>Year 3</th><th>Year 4</th><th>Year 5</th>
      </tr>
    </thead>
    <tbody>
      <tr class="row-ebitda"><td>EBITDA (proxy)</td><!-- cells: fcf/(1-taxRate) --></tr>
      <tr class="row-taxes"><td>– Taxes</td><!-- cells: ebitda * taxRate --></tr>
      <tr class="row-capex"><td>– CapEx</td><td colspan="5" class="na-cell">N/A</td></tr>
      <tr class="row-fcf highlight-row"><td>Unlevered FCF</td><!-- cells: projected FCFs --></tr>
    </tbody>
  </table>
</div>
```

Table styling:
```css
.dcf-waterfall { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.dcf-waterfall th { text-align: right; padding: 8px 12px; color: var(--text-muted); font-weight: 500; font-size: 0.75rem; border-bottom: 1px solid var(--border); }
.dcf-waterfall th:first-child { text-align: left; }
.dcf-waterfall td { text-align: right; padding: 10px 12px; border-bottom: 1px solid rgba(45,49,72,0.5); }
.dcf-waterfall td:first-child { text-align: left; color: var(--text-muted); }
.highlight-row td { color: var(--blue); font-weight: 600; }
```

All rows except CapEx are updated by `recalcDCF()`. CapEx is always N/A (not in schema).

---

## Section 4 — #valuation (DCF & Comps)

**Section heading:** "Valuation"

**Layout:** `display: grid; grid-template-columns: 1fr 300px; gap: 24px` at desktop.

### Main column (left)

**Football Field Chart card:**

```html
<div class="card">
  <div class="card-title">Valuation Range</div>
  <svg id="football-field" viewBox="0 0 600 130" style="width:100%;overflow:visible">
    <!-- X-axis labels -->
    <!-- Bear→Bull range bar (blue rect) -->
    <!-- Market price tick (yellow line) -->
    <!-- Live implied price tick (white line, id="ff-implied-tick") -->
    <!-- Legend -->
  </svg>
</div>
```

X-axis range: `axisMin = currentPrice * 0.4`, `axisMax = currentPrice * 1.8`. Chart area: x from 60 to 560, y from 20 to 80.

Elements:
- Range bar: `<rect>` from bear-implied to bull-implied x positions, y=30, height=40, fill=`rgba(59,130,246,0.3)`, stroke=`#3b82f6`
- Market price: `<line>` at market price x, y1=20, y2=90, stroke=`#f59e0b`, stroke-width=2, stroke-dasharray=4
- Implied tick: `<line id="ff-implied-tick">` at current implied x, y1=15, y2=95, stroke=`#fff`, stroke-width=2
- X-axis line: `<line>` y=90, x1=60, x2=560
- Axis labels: 5 price labels spaced evenly
- Legend: colored dots + labels for "Bear/Bull Range", "Market Price", "Your Estimate"

Bear preset implied = `recalcAtPreset('bear')`, Bull preset implied = `recalcAtPreset('bull')`. Compute these once at load and recompute when sliders change growth/wacc/terminal.

**Sensitivity Matrix card:**

```html
<div class="card">
  <div class="card-title">Sensitivity Analysis — Implied Share Price</div>
  <div class="matrix-subtitle">WACC (columns) vs Terminal Growth Rate (rows)</div>
  <div class="matrix-wrapper">
    <table id="sensitivity-matrix">
      <!-- generated by buildSensitivityMatrix() -->
    </table>
  </div>
</div>
```

Matrix spec:
- Rows = Terminal Growth: 1.0%, 1.5%, 2.0%, 2.5%, 3.0%, 3.5%, 4.0% (7 rows)
- Cols = WACC: 7%, 8%, 9%, 10%, 11%, 12%, 13% (7 cols)
- Each cell: `calcImpliedPrice(tg, wacc, currentGrowth, currentTax)` using full DCF formula
- Cell color:
  - `implied > market * 1.20`: `background: rgba(16,185,129,0.55)` (strong upside)
  - `implied > market * 1.00`: `background: rgba(16,185,129,0.22)` (above market)
  - `implied > market * 0.80`: `background: rgba(245,158,11,0.20)` (near market)
  - `implied <= market * 0.80`: `background: rgba(239,68,68,0.28)` (below market)
- Active cell (matching current slider WACC and terminal growth): `outline: 2px solid #fff`
- Re-renders on every slider input event

```css
#sensitivity-matrix { border-collapse: collapse; width: 100%; font-size: 0.8rem; }
#sensitivity-matrix th { padding: 6px 10px; color: var(--text-muted); font-weight: 500; text-align: center; }
#sensitivity-matrix td { padding: 7px 10px; text-align: center; font-weight: 500; border-radius: 4px; }
```

**Scenario Toggles card:**

```html
<div class="card scenario-card">
  <div class="card-title">Scenarios</div>
  <div class="scenario-btns">
    <button class="scenario-btn" data-scenario="bear">Bear</button>
    <button class="scenario-btn active" data-scenario="base">Base</button>
    <button class="scenario-btn" data-scenario="bull">Bull</button>
  </div>
  <div class="scenario-desc" id="scenario-desc">Base case uses historical revenue CAGR and standard WACC.</div>
</div>
```

Scenario preset values:

| Slider | Bear | Base | Bull |
|---|---|---|---|
| Growth Rate | 2.0% | from `dcf.assumedGrowthRate` × 100 | 8.0% |
| WACC | 12.0% | from `dcf.assumedWACC` × 100 | 8.0% |
| Terminal Growth | 2.0% | from `dcf.terminalGrowthRate` × 100 | 3.5% |
| Tax Rate | 28.0% | 25.0% | 22.0% |

Scenario descriptions:
- Bear: "Conservative: slow growth, high discount rate. Reflects macro headwinds or market share loss."
- Base: "Central case based on historical CAGR and standard cost of capital assumptions."
- Bull: "Optimistic: accelerated growth from new markets, efficiency gains, and lower required return."

```js
const SCENARIOS = {
  bear: { growth: 2.0,  wacc: 12.0, terminal: 2.0,  taxRate: 28.0 },
  base: { growth: null, wacc: null,  terminal: null, taxRate: 25.0 },
  bull: { growth: 8.0,  wacc: 8.0,  terminal: 3.5,  taxRate: 22.0 }
}

function applyScenario(name) {
  const p = SCENARIOS[name]
  setSlider('sl-growth',   p.growth   ?? +(STATE.baseGrowth   * 100).toFixed(2))
  setSlider('sl-wacc',     p.wacc     ?? +(STATE.baseWACC     * 100).toFixed(2))
  setSlider('sl-terminal', p.terminal ?? +(STATE.baseTerminal * 100).toFixed(2))
  setSlider('sl-taxrate',  p.taxRate)
  recalcDCF()
  document.querySelectorAll('.scenario-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.scenario === name))
  document.getElementById('scenario-desc').textContent = SCENARIO_DESCS[name]
}
```

### Story Sidebar (right column)

```html
<aside class="story-sidebar">
  <div class="card">
    <div class="card-title">Model Notes</div>
    <div class="story-content">
      <div class="story-item">
        <div class="story-label">Growth Assumption</div>
        <p class="story-text">Revenue CAGR derived from the last 5 years of FMP financial data. Adjust the slider above to model different growth trajectories.</p>
      </div>
      <div class="story-item">
        <div class="story-label">WACC</div>
        <p class="story-text">Weighted Average Cost of Capital blends cost of equity (CAPM) and after-tax cost of debt. A lower WACC raises implied value significantly.</p>
      </div>
      <div class="story-item">
        <div class="story-label">Terminal Growth</div>
        <p class="story-text">The perpetuity growth rate applied after year 5. Must stay below WACC. GDP-level growth (2–3%) is a common anchor.</p>
      </div>
      <div class="story-item">
        <div class="story-label">Net Debt</div>
        <p class="story-text">Net debt is not currently in the analysis schema and defaults to $0. This may overstate equity value for leveraged companies.</p>
      </div>
    </div>
  </div>
</aside>
```

---

## Client-Side DCF Recalculation

`STATE` is populated during `init()`:

```js
const STATE = {
  ticker: '',
  currentPrice: 0,
  baseFCF: 0,          // projectedFreeCashFlows[0] / (1 + assumedGrowthRate)
  sharesOutstanding: 0, // from /api/company/:ticker
  netDebt: 0,           // defaults to 0
  baseGrowth: 0,        // dcf.assumedGrowthRate
  baseWACC: 0,          // dcf.assumedWACC
  baseTerminal: 0,      // dcf.terminalGrowthRate
  lastImpliedPrice: 0
}
```

Core recalculation (exact port of `analysis.js:calculateDCF`):

```js
function calcImpliedPrice(tgPct, waccPct, growthPct, taxPct) {
  const g = growthPct / 100, w = waccPct / 100, tg = tgPct / 100
  if (w <= tg || !STATE.baseFCF || !STATE.sharesOutstanding) return null
  let fcf = STATE.baseFCF
  const fcfs = []
  for (let yr = 1; yr <= 5; yr++) { fcf *= (1 + g); fcfs.push(fcf) }
  const pvFCFs = fcfs.reduce((s, cf, i) => s + cf / Math.pow(1+w, i+1), 0)
  const tv = fcfs[4] * (1 + tg) / (w - tg)
  const pvTV = tv / Math.pow(1+w, 5)
  return (pvFCFs + pvTV - STATE.netDebt) / STATE.sharesOutstanding
}

function recalcDCF() {
  const g  = sliderVal('sl-growth')
  const w  = sliderVal('sl-wacc')
  const tg = sliderVal('sl-terminal')
  const tx = sliderVal('sl-taxrate')

  const implied = calcImpliedPrice(tg, w, g, tx)
  if (implied === null) return

  STATE.lastImpliedPrice = implied
  const updown = ((implied - STATE.currentPrice) / STATE.currentPrice) * 100

  // Update global header
  document.getElementById('gh-implied-price').textContent = fmtDollar(implied)
  const badge = document.getElementById('gh-updown-badge')
  badge.textContent = (updown >= 0 ? '+' : '') + updown.toFixed(1) + '%'
  badge.className = 'updown-badge ' + (updown >= 0 ? 'positive' : 'negative')

  // Update WACC display card
  document.getElementById('wacc-display').textContent = w.toFixed(2) + '%'

  // Update waterfall table
  updateWaterfallTable(g, w, tx)

  // Update sensitivity matrix
  buildSensitivityMatrix()

  // Update football field
  updateFootballField(implied)
}
```

Slider helper:
```js
function sliderVal(id) { return parseFloat(document.getElementById(id).value) }
function setSlider(id, val) {
  const el = document.getElementById(id)
  el.value = val
  document.getElementById(id + '-val').textContent = val.toFixed(
    id === 'sl-taxrate' ? 1 : 2) + '%'
}
```

Waterfall update:
```js
function updateWaterfallTable(growthPct, waccPct, taxPct) {
  const g = growthPct / 100, tx = taxPct / 100
  let fcf = STATE.baseFCF
  for (let yr = 1; yr <= 5; yr++) {
    fcf *= (1 + g)
    const ebitda = fcf / (1 - tx)
    const taxes  = ebitda * tx
    document.getElementById(`wf-ebitda-${yr}`).textContent = fmtBillions(ebitda)
    document.getElementById(`wf-taxes-${yr}`).textContent  = '(' + fmtBillions(taxes) + ')'
    document.getElementById(`wf-fcf-${yr}`).textContent    = fmtBillions(fcf)
  }
}
```

---

## Football Field Chart Update

```js
function updateFootballField(currentImplied) {
  const min = STATE.currentPrice * 0.4
  const max = STATE.currentPrice * 1.8
  const range = max - min
  const toX = v => 60 + ((v - min) / range) * 500

  // Bear and bull presets
  const bearImplied = calcImpliedPrice(2.0, 12.0, 2.0, 28.0) ?? min
  const bullImplied = calcImpliedPrice(3.5, 8.0, 8.0, 22.0)  ?? max

  const x1 = Math.max(60, Math.min(560, toX(bearImplied)))
  const x2 = Math.max(60, Math.min(560, toX(bullImplied)))
  const xi = Math.max(60, Math.min(560, toX(currentImplied)))
  const xm = Math.max(60, Math.min(560, toX(STATE.currentPrice)))

  document.getElementById('ff-range-bar').setAttribute('x', x1)
  document.getElementById('ff-range-bar').setAttribute('width', Math.max(4, x2 - x1))
  document.getElementById('ff-market-tick').setAttribute('x1', xm)
  document.getElementById('ff-market-tick').setAttribute('x2', xm)
  document.getElementById('ff-implied-tick').setAttribute('x1', xi)
  document.getElementById('ff-implied-tick').setAttribute('x2', xi)
}
```

---

## Data Loading

```js
async function init() {
  showLoading()
  try {
    const [analysisRes, companyRes] = await Promise.all([
      fetch('/api/analysis/TICKER'),
      fetch('/api/company/TICKER').catch(() => null)
    ])
    if (!analysisRes.ok) throw new Error(`HTTP ${analysisRes.status}`)
    const analysis = await analysisRes.json()
    const company = companyRes?.ok
      ? await companyRes.json().then(d => Array.isArray(d) ? d[0] : d).catch(() => null)
      : null

    // Populate STATE
    STATE.ticker       = analysis.ticker
    STATE.currentPrice = analysis.technicals?.currentPrice ?? analysis.dcf?.currentPrice ?? 0
    STATE.baseGrowth   = analysis.dcf?.assumedGrowthRate ?? 0.05
    STATE.baseWACC     = analysis.dcf?.assumedWACC       ?? 0.10
    STATE.baseTerminal = analysis.dcf?.terminalGrowthRate ?? 0.03
    STATE.baseFCF      = (analysis.dcf?.projectedFreeCashFlows?.[0] ?? 0) / (1 + STATE.baseGrowth)
    STATE.sharesOutstanding = company?.sharesOutstanding ?? company?.mktCap / STATE.currentPrice ?? 0
    STATE.netDebt      = 0

    // Render all sections, set base scenario, show app
    renderIntro(analysis, company)
    initSliders(analysis)
    buildWaterfallStructure()
    buildFootballFieldStructure()
    buildSensitivityStructure()
    applyScenario('base')

    hideOverlay()
    document.getElementById('app').style.display = 'block'

    // Start IntersectionObserver for sidebar
    initSidebarObserver()
  } catch(err) {
    showError(err.message)
  }
}
```

Company fetch failure is non-fatal. If `STATE.sharesOutstanding` is 0, display "N/A" everywhere instead of calculated values.

---

## Design Requirements

- **Dark theme**: `--bg: #0f1117`, `--card-bg: #1a1d27`, `--border: #2d3148`, `--text: #e2e8f0`, `--text-muted: #64748b`
- **Accent colors**: green `#10b981`, red `#ef4444`, yellow `#f59e0b`, blue `#3b82f6`
- **Global header bg**: `#0d0f18` (darker than `--bg`)
- **Single file**: all CSS in `<style>`, all JS in `<script>`, Google Fonts CDN allowed, no other external JS
- **Responsive** (see below)
- **No build tools**: plain HTML/CSS/JS only
- **Null safety**: display "N/A" for any null field, never crash
- `html { scroll-behavior: smooth; }`

## Responsive Behavior

```css
@media (max-width: 1024px) {
  .app-body { grid-template-columns: 1fr; }
  #sidebar {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    border-right: none;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 64px;
    z-index: 100;
    background: var(--bg);
    height: auto;
    white-space: nowrap;
  }
  .nav-link {
    border-left: none;
    border-bottom: 3px solid transparent;
    padding: 10px 20px;
    display: inline-block;
  }
  .nav-link.active { border-bottom-color: var(--blue); }
  .valuation-grid { grid-template-columns: 1fr; }
}
```

The `#content` sections have `padding: 48px 32px` and `max-width: 960px; margin: 0 auto`.

## Formatting Conventions

- Dollar values: `fmtDollar(v)` → `$X,XXX.XX`
- Percentages: `+X.X%` or `-X.X%`
- Market Cap: `$X.XT` / `$X.XB` / `$XM`
- Billions FCF: `fmtBillions(v)` → `$Xb` or `$Xm`
- Ratios: `X.XX`

## Error Handling

If `data/{TICKER}-analysis.json` does not exist, output a clear error message and do not create the HTML file.

If `sharesOutstanding` cannot be determined from the company API, display "N/A" for all per-share computed values but still render the page with sliders and the matrix (values shown as "N/A").
