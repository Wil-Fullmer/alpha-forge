const KEY = 'alpha-forge:recent-tickers';
const MAX = 5;

export function loadRecent() {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecent(ticker) {
  const list = loadRecent().filter(t => t !== ticker);
  list.unshift(ticker);
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}
