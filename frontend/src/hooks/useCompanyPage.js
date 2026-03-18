import { useState, useEffect } from 'react';
import { fetchCompany } from '../api/company.js';
import { fetchAnalysis } from '../api/analysis.js';

// Fetches company profile and full analysis in parallel.
// Returns { company, analysis, loading, error }.
// No polling, no auto-retry — one fetch per mount.
export function useCompanyPage(ticker) {
  const [state, setState] = useState({
    company: null,
    analysis: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!ticker) return;

    let cancelled = false;

    setState({ company: null, analysis: null, loading: true, error: null });

    Promise.all([fetchCompany(ticker), fetchAnalysis(ticker)])
      .then(([company, analysis]) => {
        if (!cancelled) {
          setState({ company, analysis, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ company: null, analysis: null, loading: false, error: err.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return state;
}
