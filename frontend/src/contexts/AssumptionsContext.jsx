import React, { createContext, useContext, useReducer, useEffect } from 'react';

const PROJ_COUNT = 5;

function safeDiv(a, b) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

function seedFromAnalysis(analysis, company) {
  const stmts = [...(analysis?.historicalFinancials?.incomeStatements ?? [])].reverse();
  const bss   = [...(analysis?.historicalFinancials?.balanceSheets ?? [])].reverse();
  const cfs   = [...(analysis?.historicalFinancials?.cashFlows ?? [])].reverse();

  const last   = stmts.at(-1) ?? {};
  const lastBS = bss.at(-1) ?? {};
  const lastCF = cfs.at(-1) ?? {};
  const rev    = last.revenue ?? 1;

  const dr = analysis?.derivedRatios ?? {};

  // Tax rate (scalar — for WACC after-tax cost of debt)
  const taxRate = (() => {
    if (dr.taxRate != null) return dr.taxRate;
    const is = analysis?.historicalFinancials?.incomeStatements?.at(0);
    if (is?.taxExpense != null && is.incomeBeforeTax != null && is.incomeBeforeTax !== 0) {
      const r = is.taxExpense / is.incomeBeforeTax;
      return Math.min(0.5, Math.max(0, r));
    }
    return 0.21;
  })();

  // Projection ratio seeds (all as % of revenue or other relevant base)
  const seedRevGrowth     = dr.revenueCAGR   ?? analysis?.dcf?.assumedGrowthRate ?? 0.05;
  const seedGM            = dr.grossMarginPct ?? safeDiv(last.grossProfit,       rev) ?? 0.45;
  const seedRD            = dr.rdPct          ?? safeDiv(last.researchAndDev,    rev) ?? 0.08;
  const seedSGA           = dr.sgaPct         ?? safeDiv(last.sgaExpense,        rev) ?? 0.06;
  const seedDA            = dr.daPct          ?? safeDiv(last.depreciationAmort, rev) ?? 0.03;
  const seedNetInterestPct = rev > 0 ? (last.netInterestIncome ?? 0) / rev : 0;
  const seedOtherIncomePct = rev > 0 ? (last.otherIncomeExpense ?? 0) / rev : 0;
  const seedCapex         = dr.capexPct ?? (last.revenue != null && lastCF.capitalExpenditure != null
    ? Math.abs(lastCF.capitalExpenditure) / rev : 0.03);
  const nwcLast           = (lastBS.totalCurrentAssets ?? 0) - (lastBS.totalCurrentLiabilities ?? 0);
  const seedNWC           = dr.nwcPct ?? (last.revenue ? nwcLast / last.revenue : 0.05);

  const lastNetDebt    = lastBS.netDebt ?? 0;
  const lastEBIT       = last.operatingIncome ?? 0;
  const lastDA         = last.depreciationAmort ?? 0;
  const lastBase       = lastEBIT - lastDA;
  const seedNetDebtPct = lastBase !== 0 ? lastNetDebt / lastBase : 1.0;

  const fill = v => Array(PROJ_COUNT).fill(v);

  return {
    // WACC scalar inputs (owned by WaccTab display, editable everywhere via context)
    riskFreeRate: 0.0438,
    beta:         company?.beta ?? 1.0,
    mrp:          0.05,
    costOfDebt:   0.045,
    taxRate,                          // scalar: after-tax cost of debt in WACC

    // Projection ratio arrays (per-year, owned by ProjectionsTab display)
    revenueGrowth:  fill(seedRevGrowth),
    cogsPct:        fill(1 - seedGM),  // COGS as % of revenue
    rdPct:          fill(seedRD),
    sgaPct:         fill(seedSGA),
    daPct:          fill(seedDA),
    netInterestPct: fill(seedNetInterestPct),
    otherIncomePct: fill(seedOtherIncomePct),
    projTaxRate:    fill(taxRate),     // per-year effective tax rate (array)
    capexPct:       fill(seedCapex),
    nwcPct:         fill(seedNWC),
    netDebtPct:     fill(seedNetDebtPct),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SEED':
      return action.payload;

    case 'UPDATE_WACC':
      return { ...state, ...action.patch };

    case 'UPDATE_PROJ_RATIO': {
      const arr = [...state[action.key]];
      arr[action.index] = action.value;
      return { ...state, [action.key]: arr };
    }

    case 'FILL_PROJ_RATIO':
      return { ...state, [action.key]: Array(PROJ_COUNT).fill(action.value) };

    default:
      return state;
  }
}

const AssumptionsContext = createContext(null);

export function AssumptionsProvider({ analysis, company, children }) {
  const [state, dispatch] = useReducer(
    reducer,
    null,
    () => seedFromAnalysis(analysis, company),
  );

  useEffect(() => {
    dispatch({ type: 'SEED', payload: seedFromAnalysis(analysis, company) });
  }, [analysis, company]);

  const updateWaccInputs     = (patch)               => dispatch({ type: 'UPDATE_WACC',       patch });
  const updateProjectionRatio = (key, index, value)  => dispatch({ type: 'UPDATE_PROJ_RATIO', key, index, value });
  const fillProjectionRatio   = (key, value)         => dispatch({ type: 'FILL_PROJ_RATIO',   key, value });

  return (
    <AssumptionsContext.Provider value={{ ...state, updateWaccInputs, updateProjectionRatio, fillProjectionRatio }}>
      {children}
    </AssumptionsContext.Provider>
  );
}

export function useAssumptions() {
  const ctx = useContext(AssumptionsContext);
  if (ctx === null) {
    throw new Error('useAssumptions must be used inside AssumptionsProvider');
  }
  return ctx;
}
