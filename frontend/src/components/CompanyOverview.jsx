import React from 'react';
import { EM_DASH, formatEmployees } from '../utils/format.js';

export default function CompanyOverview({ company }) {
  if (!company) return null;

  const name       = company.companyName ?? EM_DASH;
  const symbol     = company.symbol ?? EM_DASH;
  const exchange   = company.exchange ?? EM_DASH;
  const sector     = company.sector ?? EM_DASH;
  const industry   = company.industry ?? EM_DASH;
  const country    = company.country ?? EM_DASH;
  const employees  = formatEmployees(company.fullTimeEmployees);
  const description = company.description ?? null;

  return (
    <section className="card company-overview" aria-label="Company Overview">
      <div className="company-overview__header">
        <div>
          <h1 className="company-overview__name">{name}</h1>
          <div className="company-overview__meta">
            <span className="badge badge--symbol">{symbol}</span>
            <span className="company-overview__exchange">{exchange}</span>
          </div>
        </div>
      </div>

      <dl className="stat-grid">
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Sector</dt>
          <dd className="stat-grid__value">{sector}</dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Industry</dt>
          <dd className="stat-grid__value">{industry}</dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Country</dt>
          <dd className="stat-grid__value">{country}</dd>
        </div>
        <div className="stat-grid__item">
          <dt className="stat-grid__label">Full-Time Employees</dt>
          <dd className="stat-grid__value">{employees}</dd>
        </div>
      </dl>

      {description && (
        <p className="company-overview__description">{description}</p>
      )}
    </section>
  );
}
