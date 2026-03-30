import React, { useState, useEffect } from 'react';
import { useCompanyPage } from '../hooks/useCompanyPage.js';
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
  const { company, analysis, loading, error } = useCompanyPage(ticker);
  const [activeTab, setActiveTab] = useState('assumptions');

  // Reset to default tab whenever the ticker changes.
  useEffect(() => {
    setActiveTab('assumptions');
  }, [ticker]);

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
    <div className="workbench">
      {/* Identity band — always visible above tabs */}
      <CompanyOverview company={company} />

      {/* Top-level tab navigation */}
      <WorkbenchTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Active tab panel */}
      <div className="workbench__panel">
        {activeTab === 'assumptions'        && <AssumptionsTab company={company} analysis={analysis} />}
        {activeTab === 'revenue'            && <RevenueTab analysis={analysis} />}
        {activeTab === 'projections'        && <ProjectionsTab analysis={analysis} />}
        {activeTab === 'wacc'               && <WaccTab company={company} analysis={analysis} />}
        {activeTab === 'relative-valuation' && <RelativeValuationTab />}
        {activeTab === 'dcf'                && <DcfTab analysis={analysis} />}
        {activeTab === 'final-valuation'    && <FinalValuationTab analysis={analysis} />}
      </div>
    </div>
  );
}
