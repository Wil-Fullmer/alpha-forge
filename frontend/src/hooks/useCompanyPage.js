import { useState, useEffect } from 'react';
import { fetchCompany } from '../api/company.js';
import { fetchAnalysis, fetchPeers } from '../api/analysis.js';

// Fetches company profile, full analysis, and peers concurrently.
// peers fires immediately alongside analysis — no tab-visit dependency.
// Returns { company, analysis, peers, peersLoading, loading, error }.
export function useCompanyPage(ticker) {
  const [state, setState] = useState({
    company: null,
    analysis: null,
    peers: null,
    peersLoading: true,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!ticker) return;

    let cancelled = false;

    setState({ company: null, analysis: null, peers: null, peersLoading: true, loading: true, error: null });

    Promise.allSettled([fetchCompany(ticker), fetchAnalysis(ticker)])
      .then(([companyResult, analysisResult]) => {
        if (cancelled) return;
        // Analysis failure is fatal (no data to show); profile failure is soft (renders without header data).
        if (analysisResult.status === 'rejected') {
          const raw = analysisResult.reason?.message ?? '';
          const userMsg = raw.includes('404')
            ? `No data found for "${ticker}". Check the ticker symbol and try again.`
            : 'Could not load data. Please try again.';
          setState(s => ({ ...s, loading: false, error: userMsg }));
          return;
        }
        const company = companyResult.status === 'fulfilled' ? companyResult.value : null;
        setState(s => ({ ...s, company, analysis: analysisResult.value, loading: false, error: null }));
      });

    // Peers load independently — updates state when resolved, regardless of analysis timing.
    fetchPeers(ticker)
      .then(({ peers }) => {
        if (!cancelled) {
          setState(s => ({ ...s, peers: peers ?? [], peersLoading: false }));
        }
      })
      .catch(() => {
        if (!cancelled) {
          // On failure (e.g. fixture server with no peer endpoint), mark loaded with null
          // so RelativeValuationTab falls back to analysis.peers.
          setState(s => ({ ...s, peers: null, peersLoading: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return state;
}
