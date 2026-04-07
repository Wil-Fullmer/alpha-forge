import React, { createContext, useContext, useState } from 'react';

/**
 * ProjectedValuesContext
 *
 * ProjectionsTab publishes its computed rows here via publishProjections().
 * DcfTab consumes them instead of rebuilding independently.
 *
 * Shape of `projections`:
 * {
 *   years: string[],
 *   revenue: number[], cogs: number[], grossProfit: number[],
 *   rd: number[], sga: number[], da: number[],
 *   ebit: number[], ebt: number[], netIncome: number[],
 *   capex: number[], nwc: number[], changeNwc: number[],
 * }
 */
const ProjectedValuesContext = createContext(null);

export function ProjectedValuesProvider({ children }) {
  const [projections, setProjections] = useState(null);

  return (
    <ProjectedValuesContext.Provider value={{ projections, publishProjections: setProjections }}>
      {children}
    </ProjectedValuesContext.Provider>
  );
}

export function useProjectedValues() {
  const ctx = useContext(ProjectedValuesContext);
  if (ctx === null) {
    throw new Error('useProjectedValues must be used inside ProjectedValuesProvider');
  }
  return ctx;
}
