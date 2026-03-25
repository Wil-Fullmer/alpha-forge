import React from 'react';

export default function WorkbenchTabs({ tabs, activeTab, onTabChange }) {
  return (
    <nav className="workbench-tabs" role="tablist" aria-label="Valuation workbench">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          role="tab"
          aria-selected={activeTab === id}
          aria-controls={`tabpanel-${id}`}
          className={`workbench-tabs__btn${activeTab === id ? ' workbench-tabs__btn--active' : ''}`}
          onClick={() => onTabChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
