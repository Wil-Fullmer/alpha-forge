// All available fixture options.
// label: shown in the selector UI
// ticker: sent as :ticker in /api/company/:ticker and /api/analysis/:ticker
// description: shown as a tooltip or subtitle (optional but helpful)
export const FIXTURE_OPTIONS = [
  { label: 'AAPL — Full data',  ticker: 'AAPL',      description: 'Happy path, all fields populated' },
  { label: 'AAPL — Null/Flags', ticker: 'AAPL-null', description: 'Sparse data, 6 pipeline warnings' },
];

export const DEFAULT_TICKER = FIXTURE_OPTIONS[0].ticker;
