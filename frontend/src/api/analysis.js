import request from './client.js';

export async function fetchAnalysis(ticker) {
  return request(`/api/analysis/${encodeURIComponent(ticker)}`);
}
