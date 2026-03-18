import request from './client.js';

// Returns the first element of the array response.
// The FMP profile endpoint always returns an array; [0] is the profile.
export async function fetchCompany(ticker) {
  const data = await request(`/api/company/${encodeURIComponent(ticker)}`);
  return Array.isArray(data) ? data[0] : data;
}
