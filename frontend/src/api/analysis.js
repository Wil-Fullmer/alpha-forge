import request from './client.js';

export async function fetchAnalysis(ticker) {
  return request(`/api/analysis/${encodeURIComponent(ticker)}`);
}

export async function fetchPeers(ticker) {
  return request(`/api/peers/${encodeURIComponent(ticker)}`);
}
