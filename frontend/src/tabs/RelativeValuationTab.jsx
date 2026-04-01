import React, { useEffect } from 'react';

// Formatting helpers
function fmtDollarsM(v) {
  if (v === null || v === undefined) return '—';
  const isNeg = v < 0;
  const abs = Math.abs(v);
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return isNeg ? `(${formatted})` : `$${formatted}`;
}

function fmtMultiple(v) {
  if (v === null || v === undefined) return '—';
  if (v < 0) return `-${Math.abs(v).toFixed(2)}x`;
  return `${v.toFixed(2)}x`;
}

function fmtPrice(v) {
  if (v === null || v === undefined) return '—';
  const isNeg = v < 0;
  const abs = Math.abs(v);
  const formatted = abs.toFixed(2);
  return isNeg ? `(${formatted})` : `$${formatted}`;
}

function fmtShares(v) {
  if (v === null || v === undefined) return '—';
  return v.toFixed(2);
}

// Percentile calculation with linear interpolation
function computePercentile(sortedValues, p) {
  if (!sortedValues || sortedValues.length === 0) return null;
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

// Detect statistical outliers: Q3 + 3*IQR
function identifyOutliers(values) {
  if (values.length < 4) return new Set();
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = computePercentile(sorted, 25);
  const q3 = computePercentile(sorted, 75);
  const iqr = q3 - q1;
  const threshold = q3 + 3 * iqr;
  return new Set(values.filter(v => v > threshold));
}

export default function RelativeValuationTab({ company, analysis, onPricesChange }) {
  // ===== Data Extraction =====
  const symbol = company?.symbol;
  const name = company?.companyName;
  const exchange = company?.exchange;
  const price = company?.price;
  const marketCap = company?.marketCap;
  const dilutedSharesM = (marketCap && price) ? marketCap / price / 1e6 : null;
  const equityValueM = marketCap ? marketCap / 1e6 : null;

  const incomeStmt = analysis?.historicalFinancials?.incomeStatements?.[0];
  const balanceSheet = analysis?.historicalFinancials?.balanceSheets?.[0];

  const revenue = incomeStmt?.revenue ? incomeStmt.revenue / 1e6 : null;
  const ebitda = (incomeStmt?.operatingIncome != null && incomeStmt?.depreciationAmort != null)
    ? (incomeStmt.operatingIncome + incomeStmt.depreciationAmort) / 1e6
    : null;
  const netIncome = incomeStmt?.netIncome ? incomeStmt.netIncome / 1e6 : null;
  const netDebtM = balanceSheet?.netDebt ? balanceSheet.netDebt / 1e6 : null;
  const enterpriseValueM = equityValueM != null && netDebtM != null
    ? equityValueM + netDebtM
    : null;

  const evRevenue = (enterpriseValueM && revenue) ? enterpriseValueM / revenue : null;
  const evEbitda = (enterpriseValueM && ebitda) ? enterpriseValueM / ebitda : null;
  const pe = (equityValueM && netIncome) ? equityValueM / netIncome : null;

  const peers = analysis?.peers ?? [];

  // ===== Statistics Calculation =====
  function calcStats(getMultiple) {
    const allValues = peers
      .map(getMultiple)
      .filter(v => v !== null && v !== undefined && !isNaN(v));

    if (allValues.length === 0) {
      return { high: null, p75: null, avg: null, median: null, p25: null, low: null };
    }

    const positives = allValues.filter(v => v > 0);
    const outliers = identifyOutliers(positives);
    const positivesNoOutliers = positives.filter(v => !outliers.has(v));

    const high = Math.max(...allValues);
    const low = Math.min(...allValues);

    if (positivesNoOutliers.length === 0) {
      return { high, p75: null, avg: null, median: null, p25: null, low };
    }

    const sorted = [...positivesNoOutliers].sort((a, b) => a - b);
    const p75 = computePercentile(sorted, 75);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const median = computePercentile(sorted, 50);
    const p25 = computePercentile(sorted, 25);

    return { high, p75, avg, median, p25, low };
  }

  const statsEVRevenue = calcStats(p => p.evRevenue);
  const statsEVEbitda = calcStats(p => p.evEbitda);
  const statsPE = calcStats(p => p.pe);

  // ===== Implied Prices =====
  // (defined before useEffect so they can be referenced in the effect body)
  function impliedFromEV(statMultiple, financialMetricM) {
    if (statMultiple == null || financialMetricM == null || netDebtM == null || dilutedSharesM == null) {
      return null;
    }
    const impliedEV = statMultiple * financialMetricM;
    const impliedEqVal = impliedEV - netDebtM;
    return impliedEqVal / dilutedSharesM;
  }

  function impliedFromPE(statMultiple) {
    if (statMultiple == null || netIncome == null || dilutedSharesM == null) {
      return null;
    }
    const subjectEPS = netIncome / dilutedSharesM;
    return statMultiple * subjectEPS;
  }

  // Emit neutral (median) implied prices to parent (FinalValuationTab via CompanyPage)
  const evRevNeutral   = impliedFromEV(statsEVRevenue.median, revenue);
  const evEbitdaNeutral = impliedFromEV(statsEVEbitda.median, ebitda);
  const peNeutral      = impliedFromPE(statsPE.median);

  useEffect(() => {
    onPricesChange?.({ evRevNeutral, evEbitdaNeutral, peNeutral });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evRevNeutral, evEbitdaNeutral, peNeutral]);

  // ===== Outlier Detection for Table =====
  function getAllPeerMultiples(getMultiple) {
    return peers.map(getMultiple).filter(v => v !== null && v !== undefined && !isNaN(v));
  }

  const allEVRevenue = getAllPeerMultiples(p => p.evRevenue);
  const allEVEbitda = getAllPeerMultiples(p => p.evEbitda);
  const allPE = getAllPeerMultiples(p => p.pe);

  const outlierEVRevenue = identifyOutliers(allEVRevenue.filter(v => v > 0));
  const outlierEVEbitda = identifyOutliers(allEVEbitda.filter(v => v > 0));
  const outlierPE = identifyOutliers(allPE.filter(v => v > 0));

  // ===== Empty State =====
  if (!peers || peers.length === 0) {
    return (
      <div className="rv-wrap">
        <div className="rv-section">
          <h2 className="rv-section__title">Relative Valuation for {symbol || '—'}</h2>
          <p className="rv-section__subtitle">Subject company benchmarked against peer multiples</p>
          <div className="rv-table-scroll">
            <table className="rv-table">
              <thead>
                <tr>
                  <th colSpan="3" className="rv-table__group-hdr">Company Info</th>
                  <th colSpan="2" className="rv-table__group-hdr">Market Data</th>
                  <th colSpan="6" className="rv-table__group-hdr">Financial Data</th>
                  <th colSpan="3" className="rv-table__group-hdr">Multiples</th>
                </tr>
              </thead>
              <tbody>
                <tr className="rv-row--subject">
                  <td className="rv-cell--text">—</td>
                  <td className="rv-cell--text">{name || '—'}<span className="rv-subject-badge">← You</span></td>
                  <td className="rv-cell--text">{symbol || '—'}</td>
                  <td className="rv-cell--num">{fmtPrice(price)}</td>
                  <td className="rv-cell--num">{fmtShares(dilutedSharesM)}</td>
                  <td className="rv-cell--num">{fmtDollarsM(equityValueM)}</td>
                  <td className="rv-cell--num">{fmtDollarsM(netDebtM)}</td>
                  <td className="rv-cell--num">{fmtDollarsM(enterpriseValueM)}</td>
                  <td className="rv-cell--num">{fmtDollarsM(revenue)}</td>
                  <td className="rv-cell--num">{fmtDollarsM(ebitda)}</td>
                  <td className="rv-cell--num">{fmtDollarsM(netIncome)}</td>
                  <td className="rv-cell--num">{fmtMultiple(evRevenue)}</td>
                  <td className="rv-cell--num">{fmtMultiple(evEbitda)}</td>
                  <td className="rv-cell--num">{fmtMultiple(pe)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="rv-placeholder-note">No peer data available. Populate analysis.peers to enable full comps analysis.</p>
        </div>

        <div className="rv-section">
          <h2 className="rv-section__title">Statistics for the Multiples</h2>
          <p className="rv-section__subtitle">Peer multiple distribution — outliers and negatives excluded from percentiles</p>
          <div className="rv-table-scroll">
            <table className="rv-stats-table">
              <thead>
                <tr>
                  <th className="rv-table__col-hdr">Statistic</th>
                  <th className="rv-table__col-hdr">EV/Revenue</th>
                  <th className="rv-table__col-hdr">EV/EBITDA</th>
                  <th className="rv-table__col-hdr">P/E</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>High</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>75th Percentile</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>Average</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>Median</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>25th Percentile</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>Low</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
              </tbody>
            </table>
          </div>
          <p className="rv-footnote">* Negative multiples and statistical outliers are excluded from percentile and average calculations but shown at High/Low.</p>
        </div>

        <div className="rv-section">
          <h2 className="rv-section__title">Implied Share Price Analysis</h2>
          <p className="rv-section__subtitle">Peer-implied share prices using each multiple applied to subject financials</p>
          <div className="rv-table-scroll">
            <table className="rv-stats-table">
              <thead>
                <tr>
                  <th className="rv-table__col-hdr">Implied Price</th>
                  <th className="rv-table__col-hdr">EV/Revenue</th>
                  <th className="rv-table__col-hdr">EV/EBITDA</th>
                  <th className="rv-table__col-hdr">P/E</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>High</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>75th Percentile</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>Average</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>Median</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>25th Percentile</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>Low</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rv-section">
          <h2 className="rv-section__title">Team Relative Valuation Model</h2>
          <p className="rv-section__subtitle">Scenario price targets derived from peer multiple percentiles</p>
          <div className="rv-table-scroll">
            <table className="rv-stats-table">
              <thead>
                <tr>
                  <th className="rv-table__col-hdr">Scenario</th>
                  <th className="rv-table__col-hdr">EV/Revenue</th>
                  <th className="rv-table__col-hdr">EV/EBITDA</th>
                  <th className="rv-table__col-hdr">P/E</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Bull<span className="rv-scenario-hint">75th percentile</span></td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>Neutral<span className="rv-scenario-hint">Median</span></td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
                <tr><td>Bear<span className="rv-scenario-hint">25th percentile</span></td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td><td className="rv-cell--num">—</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===== Main Render =====
  return (
    <div className="rv-wrap">
      {/* Section 1: Comps Table */}
      <div className="rv-section">
        <h2 className="rv-section__title">Relative Valuation for {symbol}</h2>
        <p className="rv-section__subtitle">Subject company benchmarked against peer multiples</p>
        <div className="rv-table-scroll">
          <table className="rv-table">
            <thead>
              <tr>
                <th colSpan="3" className="rv-table__group-hdr">Company Info</th>
                <th colSpan="2" className="rv-table__group-hdr">Market Data</th>
                <th colSpan="6" className="rv-table__group-hdr">Financial Data</th>
                <th colSpan="3" className="rv-table__group-hdr">Multiples</th>
              </tr>
              <tr>
                <th className="rv-table__col-hdr">#</th>
                <th className="rv-table__col-hdr">Name</th>
                <th className="rv-table__col-hdr">Ticker</th>
                <th className="rv-table__col-hdr">Share Price</th>
                <th className="rv-table__col-hdr">Diluted Shares (M)</th>
                <th className="rv-table__col-hdr">Equity Value ($M)</th>
                <th className="rv-table__col-hdr">Net Debt ($M)</th>
                <th className="rv-table__col-hdr">Enterprise Value ($M)</th>
                <th className="rv-table__col-hdr">Revenue ($M)</th>
                <th className="rv-table__col-hdr">EBITDA ($M)</th>
                <th className="rv-table__col-hdr">Net Income ($M)</th>
                <th className="rv-table__col-hdr">EV/Revenue</th>
                <th className="rv-table__col-hdr">EV/EBITDA</th>
                <th className="rv-table__col-hdr">P/E</th>
              </tr>
            </thead>
            <tbody>
              {/* Subject company row */}
              <tr className="rv-row--subject">
                <td className="rv-cell--text">—</td>
                <td className="rv-cell--text">{name}<span className="rv-subject-badge">← You</span></td>
                <td className="rv-cell--text">{symbol}</td>
                <td className={`rv-cell--num`}>{fmtPrice(price)}</td>
                <td className={`rv-cell--num`}>{fmtShares(dilutedSharesM)}</td>
                <td className={`rv-cell--num`}>{fmtDollarsM(equityValueM)}</td>
                <td className={`rv-cell--num ${netDebtM != null && netDebtM < 0 ? 'rv-cell--neg' : ''}`}>
                  {netDebtM != null && netDebtM < 0 ? `(${Math.abs(netDebtM).toFixed(2)})` : fmtDollarsM(netDebtM)}
                </td>
                <td className={`rv-cell--num`}>{fmtDollarsM(enterpriseValueM)}</td>
                <td className={`rv-cell--num`}>{fmtDollarsM(revenue)}</td>
                <td className={`rv-cell--num`}>{fmtDollarsM(ebitda)}</td>
                <td className={`rv-cell--num ${netIncome != null && netIncome < 0 ? 'rv-cell--neg' : ''}`}>
                  {netIncome != null && netIncome < 0 ? `(${Math.abs(netIncome).toFixed(2)})` : fmtDollarsM(netIncome)}
                </td>
                <td className={`rv-cell--num ${evRevenue != null && evRevenue < 0 ? 'rv-cell--neg' : ''}`}>
                  {evRevenue != null && evRevenue < 0 ? `-${Math.abs(evRevenue).toFixed(2)}x` : fmtMultiple(evRevenue)}
                </td>
                <td className={`rv-cell--num ${evEbitda != null && evEbitda < 0 ? 'rv-cell--neg' : ''}`}>
                  {evEbitda != null && evEbitda < 0 ? `-${Math.abs(evEbitda).toFixed(2)}x` : fmtMultiple(evEbitda)}
                </td>
                <td className={`rv-cell--num ${pe != null && pe < 0 ? 'rv-cell--neg' : ''}`}>
                  {pe != null && pe < 0 ? `-${Math.abs(pe).toFixed(2)}x` : fmtMultiple(pe)}
                </td>
              </tr>

              {/* Peer rows */}
              {peers.map((peer, idx) => {
                const peerEqVal = peer.equityValue ? peer.equityValue / 1e6 : null;
                const peerEV = peer.enterpriseValue ? peer.enterpriseValue / 1e6 : null;
                const peerRev = peer.revenue ? peer.revenue / 1e6 : null;
                const peerEbitda = peer.ebitda ? peer.ebitda / 1e6 : null;
                const peerNI = peer.netIncome ? peer.netIncome / 1e6 : null;
                const peerNetDebt = peerEV != null && peerEqVal != null ? peerEV - peerEqVal : null;

                const peerEVRev = peer.evRevenue ?? (peerEV && peerRev ? peerEV / peerRev : null);
                const peerEVEbitda = peer.evEbitda ?? (peerEV && peerEbitda ? peerEV / peerEbitda : null);
                const peerPE = peer.pe ?? (peerEqVal && peerNI ? peerEqVal / peerNI : null);

                const isOutlierEVRev = peerEVRev != null && outlierEVRevenue.has(peerEVRev);
                const isOutlierEVEbitda = peerEVEbitda != null && outlierEVEbitda.has(peerEVEbitda);
                const isOutlierPE = peerPE != null && outlierPE.has(peerPE);

                return (
                  <tr key={idx}>
                    <td className="rv-cell--text">{idx + 1}</td>
                    <td className="rv-cell--text">{peer.name}</td>
                    <td className="rv-cell--text">{peer.ticker}</td>
                    <td className="rv-cell--num">{fmtPrice(peer.sharePrice)}</td>
                    <td className="rv-cell--num">{fmtShares(peer.dilutedShares)}</td>
                    <td className="rv-cell--num">{fmtDollarsM(peerEqVal)}</td>
                    <td className={`rv-cell--num ${peerNetDebt != null && peerNetDebt < 0 ? 'rv-cell--neg' : ''}`}>
                      {peerNetDebt != null && peerNetDebt < 0 ? `(${Math.abs(peerNetDebt).toFixed(2)})` : fmtDollarsM(peerNetDebt)}
                    </td>
                    <td className="rv-cell--num">{fmtDollarsM(peerEV)}</td>
                    <td className="rv-cell--num">{fmtDollarsM(peerRev)}</td>
                    <td className="rv-cell--num">{fmtDollarsM(peerEbitda)}</td>
                    <td className={`rv-cell--num ${peerNI != null && peerNI < 0 ? 'rv-cell--neg' : ''}`}>
                      {peerNI != null && peerNI < 0 ? `(${Math.abs(peerNI).toFixed(2)})` : fmtDollarsM(peerNI)}
                    </td>
                    <td className={`rv-cell--num ${isOutlierEVRev ? 'rv-cell--excl' : peerEVRev != null && peerEVRev < 0 ? 'rv-cell--neg' : ''}`}>
                      {peerEVRev != null && peerEVRev < 0 ? `-${Math.abs(peerEVRev).toFixed(2)}x` : fmtMultiple(peerEVRev)}
                      {isOutlierEVRev && <span className="rv-outlier-badge">*excl</span>}
                    </td>
                    <td className={`rv-cell--num ${isOutlierEVEbitda ? 'rv-cell--excl' : peerEVEbitda != null && peerEVEbitda < 0 ? 'rv-cell--neg' : ''}`}>
                      {peerEVEbitda != null && peerEVEbitda < 0 ? `-${Math.abs(peerEVEbitda).toFixed(2)}x` : fmtMultiple(peerEVEbitda)}
                      {isOutlierEVEbitda && <span className="rv-outlier-badge">*excl</span>}
                    </td>
                    <td className={`rv-cell--num ${isOutlierPE ? 'rv-cell--excl' : peerPE != null && peerPE < 0 ? 'rv-cell--neg' : ''}`}>
                      {peerPE != null && peerPE < 0 ? `-${Math.abs(peerPE).toFixed(2)}x` : fmtMultiple(peerPE)}
                      {isOutlierPE && <span className="rv-outlier-badge">*excl</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Statistics */}
      <div className="rv-section">
        <h2 className="rv-section__title">Statistics for the Multiples</h2>
        <p className="rv-section__subtitle">Peer multiple distribution — outliers and negatives excluded from percentiles</p>
        <div className="rv-table-scroll">
          <table className="rv-stats-table">
            <thead>
              <tr>
                <th className="rv-table__col-hdr">Statistic</th>
                <th className="rv-table__col-hdr">EV/Revenue</th>
                <th className="rv-table__col-hdr">EV/EBITDA</th>
                <th className="rv-table__col-hdr">P/E</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>High</td>
                <td className={`rv-cell--num ${statsEVRevenue.high != null && statsEVRevenue.high < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVRevenue.high)}
                </td>
                <td className={`rv-cell--num ${statsEVEbitda.high != null && statsEVEbitda.high < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVEbitda.high)}
                </td>
                <td className={`rv-cell--num ${statsPE.high != null && statsPE.high < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsPE.high)}
                </td>
              </tr>
              <tr>
                <td>75th Percentile</td>
                <td className={`rv-cell--num ${statsEVRevenue.p75 != null && statsEVRevenue.p75 < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVRevenue.p75)}
                </td>
                <td className={`rv-cell--num ${statsEVEbitda.p75 != null && statsEVEbitda.p75 < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVEbitda.p75)}
                </td>
                <td className={`rv-cell--num ${statsPE.p75 != null && statsPE.p75 < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsPE.p75)}
                </td>
              </tr>
              <tr>
                <td>Average</td>
                <td className={`rv-cell--num ${statsEVRevenue.avg != null && statsEVRevenue.avg < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVRevenue.avg)}
                </td>
                <td className={`rv-cell--num ${statsEVEbitda.avg != null && statsEVEbitda.avg < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVEbitda.avg)}
                </td>
                <td className={`rv-cell--num ${statsPE.avg != null && statsPE.avg < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsPE.avg)}
                </td>
              </tr>
              <tr>
                <td>Median</td>
                <td className={`rv-cell--num ${statsEVRevenue.median != null && statsEVRevenue.median < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVRevenue.median)}
                </td>
                <td className={`rv-cell--num ${statsEVEbitda.median != null && statsEVEbitda.median < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVEbitda.median)}
                </td>
                <td className={`rv-cell--num ${statsPE.median != null && statsPE.median < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsPE.median)}
                </td>
              </tr>
              <tr>
                <td>25th Percentile</td>
                <td className={`rv-cell--num ${statsEVRevenue.p25 != null && statsEVRevenue.p25 < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVRevenue.p25)}
                </td>
                <td className={`rv-cell--num ${statsEVEbitda.p25 != null && statsEVEbitda.p25 < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVEbitda.p25)}
                </td>
                <td className={`rv-cell--num ${statsPE.p25 != null && statsPE.p25 < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsPE.p25)}
                </td>
              </tr>
              <tr>
                <td>Low</td>
                <td className={`rv-cell--num ${statsEVRevenue.low != null && statsEVRevenue.low < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVRevenue.low)}
                </td>
                <td className={`rv-cell--num ${statsEVEbitda.low != null && statsEVEbitda.low < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsEVEbitda.low)}
                </td>
                <td className={`rv-cell--num ${statsPE.low != null && statsPE.low < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtMultiple(statsPE.low)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="rv-footnote">* Negative multiples and statistical outliers are excluded from percentile and average calculations but shown at High/Low.</p>
      </div>

      {/* Section 3: Implied Prices */}
      <div className="rv-section">
        <h2 className="rv-section__title">Implied Share Price Analysis</h2>
        <p className="rv-section__subtitle">Peer-implied share prices using each multiple applied to subject financials</p>
        <div className="rv-table-scroll">
          <table className="rv-stats-table">
            <thead>
              <tr>
                <th className="rv-table__col-hdr">Implied Price</th>
                <th className="rv-table__col-hdr">EV/Revenue</th>
                <th className="rv-table__col-hdr">EV/EBITDA</th>
                <th className="rv-table__col-hdr">P/E</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>High</td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVRevenue.high, revenue) != null && impliedFromEV(statsEVRevenue.high, revenue) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVRevenue.high, revenue))}
                </td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVEbitda.high, ebitda) != null && impliedFromEV(statsEVEbitda.high, ebitda) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVEbitda.high, ebitda))}
                </td>
                <td className={`rv-cell--num ${impliedFromPE(statsPE.high) != null && impliedFromPE(statsPE.high) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromPE(statsPE.high))}
                </td>
              </tr>
              <tr>
                <td>75th Percentile</td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVRevenue.p75, revenue) != null && impliedFromEV(statsEVRevenue.p75, revenue) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVRevenue.p75, revenue))}
                </td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVEbitda.p75, ebitda) != null && impliedFromEV(statsEVEbitda.p75, ebitda) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVEbitda.p75, ebitda))}
                </td>
                <td className={`rv-cell--num ${impliedFromPE(statsPE.p75) != null && impliedFromPE(statsPE.p75) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromPE(statsPE.p75))}
                </td>
              </tr>
              <tr>
                <td>Average</td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVRevenue.avg, revenue) != null && impliedFromEV(statsEVRevenue.avg, revenue) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVRevenue.avg, revenue))}
                </td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVEbitda.avg, ebitda) != null && impliedFromEV(statsEVEbitda.avg, ebitda) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVEbitda.avg, ebitda))}
                </td>
                <td className={`rv-cell--num ${impliedFromPE(statsPE.avg) != null && impliedFromPE(statsPE.avg) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromPE(statsPE.avg))}
                </td>
              </tr>
              <tr>
                <td>Median</td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVRevenue.median, revenue) != null && impliedFromEV(statsEVRevenue.median, revenue) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVRevenue.median, revenue))}
                </td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVEbitda.median, ebitda) != null && impliedFromEV(statsEVEbitda.median, ebitda) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVEbitda.median, ebitda))}
                </td>
                <td className={`rv-cell--num ${impliedFromPE(statsPE.median) != null && impliedFromPE(statsPE.median) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromPE(statsPE.median))}
                </td>
              </tr>
              <tr>
                <td>25th Percentile</td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVRevenue.p25, revenue) != null && impliedFromEV(statsEVRevenue.p25, revenue) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVRevenue.p25, revenue))}
                </td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVEbitda.p25, ebitda) != null && impliedFromEV(statsEVEbitda.p25, ebitda) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVEbitda.p25, ebitda))}
                </td>
                <td className={`rv-cell--num ${impliedFromPE(statsPE.p25) != null && impliedFromPE(statsPE.p25) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromPE(statsPE.p25))}
                </td>
              </tr>
              <tr>
                <td>Low</td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVRevenue.low, revenue) != null && impliedFromEV(statsEVRevenue.low, revenue) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVRevenue.low, revenue))}
                </td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVEbitda.low, ebitda) != null && impliedFromEV(statsEVEbitda.low, ebitda) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVEbitda.low, ebitda))}
                </td>
                <td className={`rv-cell--num ${impliedFromPE(statsPE.low) != null && impliedFromPE(statsPE.low) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromPE(statsPE.low))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="rv-footnote">Current price: {fmtPrice(price)}</p>
      </div>

      {/* Section 4: Team RV Model */}
      <div className="rv-section">
        <h2 className="rv-section__title">Team Relative Valuation Model</h2>
        <p className="rv-section__subtitle">Scenario price targets derived from peer multiple percentiles</p>
        <div className="rv-table-scroll">
          <table className="rv-stats-table">
            <thead>
              <tr>
                <th className="rv-table__col-hdr">Scenario</th>
                <th className="rv-table__col-hdr">EV/Revenue</th>
                <th className="rv-table__col-hdr">EV/EBITDA</th>
                <th className="rv-table__col-hdr">P/E</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Bull<span className="rv-scenario-hint">75th percentile</span></td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVRevenue.p75, revenue) != null && impliedFromEV(statsEVRevenue.p75, revenue) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVRevenue.p75, revenue))}
                </td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVEbitda.p75, ebitda) != null && impliedFromEV(statsEVEbitda.p75, ebitda) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVEbitda.p75, ebitda))}
                </td>
                <td className={`rv-cell--num ${impliedFromPE(statsPE.p75) != null && impliedFromPE(statsPE.p75) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromPE(statsPE.p75))}
                </td>
              </tr>
              <tr>
                <td>Neutral<span className="rv-scenario-hint">Median</span></td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVRevenue.median, revenue) != null && impliedFromEV(statsEVRevenue.median, revenue) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVRevenue.median, revenue))}
                </td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVEbitda.median, ebitda) != null && impliedFromEV(statsEVEbitda.median, ebitda) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVEbitda.median, ebitda))}
                </td>
                <td className={`rv-cell--num ${impliedFromPE(statsPE.median) != null && impliedFromPE(statsPE.median) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromPE(statsPE.median))}
                </td>
              </tr>
              <tr>
                <td>Bear<span className="rv-scenario-hint">25th percentile</span></td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVRevenue.p25, revenue) != null && impliedFromEV(statsEVRevenue.p25, revenue) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVRevenue.p25, revenue))}
                </td>
                <td className={`rv-cell--num ${impliedFromEV(statsEVEbitda.p25, ebitda) != null && impliedFromEV(statsEVEbitda.p25, ebitda) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromEV(statsEVEbitda.p25, ebitda))}
                </td>
                <td className={`rv-cell--num ${impliedFromPE(statsPE.p25) != null && impliedFromPE(statsPE.p25) < 0 ? 'rv-cell--neg' : ''}`}>
                  {fmtPrice(impliedFromPE(statsPE.p25))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
