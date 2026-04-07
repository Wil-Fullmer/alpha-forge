import React, { createContext, useContext, useState } from 'react';

/**
 * RevenueContext
 *
 * RevenueTab publishes its computed projections here via publishRevenue().
 * ProjectionsTab consumes them so its income statement revenue row stays
 * in sync with the Revenue tab's user-controlled growth rates.
 *
 * Shape of `revenueData`:
 * {
 *   projectedRevenue: number[],   // absolute $ values, length PROJ_COUNT
 *   growthRates:      number[],   // decimal growth rates, length PROJ_COUNT
 * }
 */
const RevenueContext = createContext(null);

export function RevenueProvider({ children }) {
  const [revenueData, setRevenueData] = useState(null);

  return (
    <RevenueContext.Provider value={{ revenueData, publishRevenue: setRevenueData }}>
      {children}
    </RevenueContext.Provider>
  );
}

export function useRevenue() {
  const ctx = useContext(RevenueContext);
  if (ctx === null) {
    throw new Error('useRevenue must be used inside RevenueProvider');
  }
  return ctx;
}
