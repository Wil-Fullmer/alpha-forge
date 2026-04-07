/**
 * Unified diluted share count resolution.
 * Resolution order:
 *   1. company.sharesOutstanding (direct API field)
 *   2. marketCap / price (fallback when sharesOutstanding is null/0)
 *   3. null (no usable source)
 */
export function getSharesOutstanding(company, analysis) {
  if (company?.sharesOutstanding != null && company.sharesOutstanding > 0) {
    return company.sharesOutstanding;
  }
  const price = company?.price ?? analysis?.technicals?.currentPrice;
  if (company?.marketCap != null && price != null && price > 0) {
    return company.marketCap / price;
  }
  return null;
}
