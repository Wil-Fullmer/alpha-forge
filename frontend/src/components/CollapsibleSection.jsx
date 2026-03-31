import React, { useState } from 'react';

export default function CollapsibleSection({ title, subtitle, defaultOpen = true, children, className }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-section${className ? ` ${className}` : ''}`}>
      <button
        className="collapsible-section__header"
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        type="button"
      >
        <svg
          className="collapsible-section__chevron"
          data-open={isOpen}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="collapsible-section__title">{title}</span>
        {subtitle && <span className="collapsible-section__subtitle">{subtitle}</span>}
      </button>
      <div
        className="collapsible-section__body"
        style={{ '--rows': isOpen ? '1fr' : '0fr' }}
      >
        <div className="collapsible-section__inner">
          {children}
        </div>
      </div>
    </div>
  );
}
