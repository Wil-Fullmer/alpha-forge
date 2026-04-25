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

    Promise.all([fetchCompany(ticker), fetchAnalysis(ticker)])
      .then(([company, analysis]) => {
        if (!cancelled) {
          setState(s => ({ ...s, company, analysis, loading: false, error: null }));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState(s => ({ ...s, loading: false, error: err.message }));
        }
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
