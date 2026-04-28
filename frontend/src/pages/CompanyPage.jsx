import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCompanyPage } from '../hooks/useCompanyPage.js';
import { AssumptionsProvider } from '../contexts/AssumptionsContext.jsx';
import { ProjectedValuesProvider } from '../contexts/ProjectedValuesContext.jsx';
import { RevenueProvider } from '../contexts/RevenueContext.jsx';
import CompanyOverview from '../components/CompanyOverview.jsx';
import WorkbenchTabs from '../components/WorkbenchTabs.jsx';
import AssumptionsTab from '../tabs/AssumptionsTab.jsx';
import RevenueTab from '../tabs/RevenueTab.jsx';
import ProjectionsTab from '../tabs/ProjectionsTab.jsx';
import WaccTab from '../tabs/WaccTab.jsx';
import RelativeValuationTab from '../tabs/RelativeValuationTab.jsx';
import DcfTab from '../tabs/DcfTab.jsx';
import FinalValuationTab from '../tabs/FinalValuationTab.jsx';

const TABS = [
  { id: 'assumptions',        label: 'Assumptions' },
  { id: 'revenue',            label: 'Revenue' },
  { id: 'projections',        label: 'Projections' },
  { id: 'wacc',               label: 'WACC' },
  { id: 'relative-valuation', label: 'Relative Valuation' },
  { id: 'dcf',                label: 'DCF' },
  { id: 'final-valuation',    label: 'Final Valuation' },
];

export default function CompanyPage({ ticker = 'AAPL' }) {
  const { company, analysis, peers, peersLoading, loading, error } = useCompanyPage(ticker);
  const [activeTab, setActiveTab] = useState('assumptions');
  const [waccOverride, setWaccOverride] = useState(null);
  const [waccModel, setWaccModel] = useState(null);
  const [dcfPrices, setDcfPrices] = useState(null);
  const [rvPrices, setRvPrices] = useState(null);
  const [dcfWeight, setDcfWeight] = useState(0.5);

  const handleDcfPricesChange = useCallback((p) => setDcfPrices(p), []);
  const handleRvPricesChange  = useCallback((p) => setRvPrices(p),  []);

  // Reset to default tab and WACC override whenever the ticker changes.
  useEffect(() => {
    setActiveTab('assumptions');
    setWaccOverride(null);
    setWaccModel(null);
    setDcfPrices(null);
    setRvPrices(null);
    setDcfWeight(0.5);
  }, [ticker]);

  // Listen for global command events from CommandBar
  useEffect(() => {
    function onCmd(e) {
      const { type, tab, value } = e.detail ?? {};
      if (type === 'view-tab' && tab) setActiveTab(tab);
      if (type === 'reset') {
        setWaccOverride(null);
        setWaccModel(null);
      }
      if (type === 'set-wacc' && value != null) setWaccOverride(value);
      if (type === 'export-csv') exportCsv();
    }
    window.addEventListener('af:cmd', onCmd);
    return () => window.removeEventListener('af:cmd', onCmd);
  }, [analysis, company, dcfPrices, rvPrices]);

  function exportCsv() {
    if (!analysis || !company) return;
    const t = company.symbol ?? 'ticker';
    const rows = [
      ['Field', 'Value'],
      ['Ticker', t],
      ['Name', company.companyName ?? ''],
      ['Price', company.price ?? ''],
      ['WACC', analysis.wacc?.wacc ?? ''],
      ['DCF FCFF', dcfPrices?.fcff ?? ''],
      ['DCF FCFE', dcfPrices?.fcfe ?? ''],
      ['RV P/E Neutral', rvPrices?.peNeutral ?? ''],
      ['RV EV/EBITDA Neutral', rvPrices?.evEbitdaNeutral ?? ''],
      ['ROE', analysis.coreMetrics?.roe ?? ''],
      ['D/E', analysis.coreMetrics?.debtToEquity ?? ''],
      ['Beta', analysis.costOfCapital?.beta ?? ''],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t}-alpha-forge.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="page-state page-state--loading" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p>Loading {ticker}&hellip;</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-state page-state--error" role="alert">
        <h2>Unable to load data</h2>
        <p className="page-state__detail">{error}</p>
        <p className="page-state__hint">
          Make sure the fixture server is running:&nbsp;
          <code>npm run web:fixtures</code>
        </p>
      </div>
    );
  }

  return (
    <AssumptionsProvider analysis={analysis} company={company}>
    <RevenueProvider>
    <ProjectedValuesProvider>
      <div className="workbench">
        {/* Identity band — always visible above tabs */}
        <CompanyOverview company={company} />

        {/* Top-level tab navigation */}
        <WorkbenchTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* DcfTab and RelativeValuationTab always mounted — emit prices as soon as data loads */}
        <div style={{ display: activeTab === 'dcf' ? 'block' : 'none' }}>
          <DcfTab company={company} analysis={analysis} waccOverride={waccOverride} waccModel={waccModel} onPricesChange={handleDcfPricesChange} />
        </div>
        <div style={{ display: activeTab === 'relative-valuation' ? 'block' : 'none' }}>
          <RelativeValuationTab company={company} analysis={analysis} peers={peers} peersLoading={peersLoading} onPricesChange={handleRvPricesChange} />
        </div>

        {/* Active tab panel — all other tabs, keyed for fade-in animation */}
        <div className="workbench__panel tab-panel-enter" key={activeTab}>
          {activeTab === 'assumptions'     && <AssumptionsTab company={company} analysis={analysis} />}
          {activeTab === 'revenue'         && <RevenueTab analysis={analysis} />}
          {activeTab === 'projections'     && <ProjectionsTab analysis={analysis} />}
          {activeTab === 'wacc'            && <WaccTab company={company} analysis={analysis} onWaccChange={setWaccOverride} onModelChange={setWaccModel} />}
          {activeTab === 'final-valuation' && <FinalValuationTab analysis={analysis} company={company} dcfPrices={dcfPrices} rvPrices={rvPrices} dcfWeight={dcfWeight} onDcfWeightChange={setDcfWeight} />}
        </div>
      </div>
    </ProjectedValuesProvider>
    </RevenueProvider>
    </AssumptionsProvider>
  );
}
