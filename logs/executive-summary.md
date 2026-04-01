# Executive Summary

Alpha Forge is broadly workbook-cohesive at the UI level but not yet workbook-cohesive at the model level.

The tabs mirror the workbook order and the relative valuation / final valuation screens are the closest matches. The main failure mode is that Alpha Forge does not operate as one assumption-driven model. Revenue, Projections, WACC, and DCF each own separate local calculation state, so the tab-to-tab dependency tree required by the workbook is broken in several critical places.

## Highest-Risk Logic Gaps

1. Shared assumptions are missing.
- The workbook expects tax rate, risk-free rate, and market risk premium to propagate globally.
- Alpha Forge splits these across WACC local state, Projections local state, DCF constants, and backend defaults.

2. Revenue is not segment-driven.
- The workbook is segment-first and total revenue is a rollup.
- Alpha Forge only exposes total revenue and a single projected growth vector.

3. Projections do not feed DCF.
- The workbook DCF should consume projection outputs.
- Alpha Forge DCF rebuilds its own forecast tree from historical ratios and backend seeds.

4. Operating-income sequence is off.
- Workbook sequence deducts D&A before NOPAT and then adds it back in free cash flow.
- Alpha Forge frontend models exclude D&A from the operating-income deduction while still adding it back later.

5. Backend is not the canonical model backbone.
- The backend returns a thin snapshot plus a simple standalone DCF.
- Most workbook-like logic is tab-local frontend logic instead of a unified dependency graph.

## Fixture-Limited vs Real Architecture Issues

Fixture-limited:

- WACC blanks tied to null `sharesOutstanding` in the AAPL fixture.
- Missing analyst targets in the fixture.
- Segment detail not yet surfaced in the fixture path.

Real architecture issues:

- No centralized assumptions layer.
- No segment revenue model.
- No single forecast model shared by Revenue, Projections, and DCF.
- Inconsistent share-source handling between WACC and DCF.
- DCF / Projections sequence deviates from workbook operating logic.

## Broad Conclusion

Alpha Forge is not yet logically faithful to the workbook’s intended tab-to-tab model flow, even though the tab names and much of the visual structure are aligned.

The app is closest on:

- WACC screen structure
- Relative valuation structure
- Final valuation weighting behavior

The app is farthest on:

- shared assumption propagation
- segment revenue rollup
- projection ownership
- DCF dependency sequence

## Top 5 Areas To Inspect Next

1. Centralize assumptions and verify propagation into WACC, Projections, and DCF.
2. Introduce segment-first revenue state and a total-revenue rollup contract.
3. Make DCF consume projection outputs rather than building a second forecast tree.
4. Reconcile D&A treatment across Projections and DCF to match workbook order.
5. Standardize subject share count sourcing across WACC, relative valuation, and DCF.
