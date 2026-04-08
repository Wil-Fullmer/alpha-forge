import React, { createContext, useContext, useReducer, useEffect } from 'react';

const PROJ_COUNT = 5;

function safeDiv(a, b) {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}

/**
 * Derive initial assumption values from the raw analysis + company objects.
 * Mirrors the seed logic previously duplicated in WaccTab and ProjectionsTab.
 */
function seedFromAnalysis(analysis, company) {
  const stmts = [...(analysis?.historicalFinancials?.incomeStatements ?? [])].reverse();
  const bss   = [...(analysis?.historicalFinancials?.balanceSheets ?? [])].reverse();
  const cfs   = [...(analysis?.historicalFinancials?.cashFlows ?? [])].reverse();

  const last   = stmts.at(-1) ?? {};
  const lastBS = bss.at(-1) ?? {};
  const lastCF = cfs.at(-1) ?? {};
  const rev    = last.revenue ?? 1;

  // Prefer backend canonical derivedRatios; fall back to single-period inline derivation
  const dr = analysis?.derivedRatios ?? {};

  // Tax rate
  const taxRate = (() => {
    if (dr.taxRate != null) return dr.taxRate;
    const is = analysis?.historicalFinancials?.incomeStatements?.at(0);
    if (is?.taxExpense != null && is.incomeBeforeTax != null && is.incomeBeforeTax !== 0) {
      const r = is.taxExpense / is.incomeBeforeTax;
      return Math.min(0.5, Math.max(0, r));
    }
    return 0.21;
  })();

  // Projection ratios
  const seedRevGrowth = dr.revenueCAGR   ?? analysis?.dcf?.assumedGrowthRate ?? 0.05;
  const seedGM    = dr.grossMarginPct ?? safeDiv(last.grossProfit,       rev) ?? 0.45;
  const seedRD    = dr.rdPct          ?? safeDiv(last.researchAndDev,    rev) ?? 0.08;
  const seedSGA   = dr.sgaPct         ?? safeDiv(last.sgaExpense,        rev) ?? 0.06;
  const seedDA    = dr.daPct          ?? safeDiv(last.depreciationAmort, rev) ?? 0.03;
  const seedNI    = last.netInterestIncome ?? 0;
  const seedOther = last.otherIncomeExpense ?? 0;
  const seedCapex = dr.capexPct ?? (lastCF.capitalExpenditure != null
    ? Math.abs(lastCF.capitalExpenditure) / rev : 0.03);
  const nwcLast   = (lastBS.totalCurrentAssets ?? 0) - (lastBS.totalCurrentLiabilities ?? 0);
  const seedNWC   = dr.nwcPct ?? (last.revenue ? nwcLast / last.revenue : 0.05);

  const fill = v => Array(PROJ_COUNT).fill(v);

  return {
    // WACC inputs (owned by WaccTab, editable)
    riskFreeRate: 0.0438,
    beta:         company?.beta ?? 1.0,
    mrp:          0.05,
    costOfDebt:   0.045,
    taxRate,

    // Projection ratios (owned by ProjectionsTab, editable)
    revenueGrowth: fill(seedRevGrowth),
    grossMargin:   fill(seedGM),
    rdPct:         fill(seedRD),
    sgaPct:        fill(seedSGA),
    daPct:         fill(seedDA),
    netInterest:   fill(seedNI),
    otherIncome:   fill(seedOther),
    capexPct:      fill(seedCapex),
    nwcPct:        fill(seedNWC),
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

  // Re-seed when the ticker (analysis/company) changes
  useEffect(() => {
    dispatch({ type: 'SEED', payload: seedFromAnalysis(analysis, company) });
  }, [analysis, company]);

  const updateWaccInputs = (patch) => dispatch({ type: 'UPDATE_WACC', patch });

  const updateProjectionRatio = (key, index, value) =>
    dispatch({ type: 'UPDATE_PROJ_RATIO', key, index, value });

  return (
    <AssumptionsContext.Provider value={{ ...state, updateWaccInputs, updateProjectionRatio }}>
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
