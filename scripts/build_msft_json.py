import json, os

def load(f):
    try:
        with open(f) as fp:
            content = fp.read().strip()
            if not content or content.startswith('Premium') or content.startswith('Restricted') or content.startswith('{"Error'):
                return None
            return json.loads(content)
    except Exception as e:
        return None

# Load all MSFT data
profile = load('data/cache/MSFT-profile.json')
income_stmts = load('data/cache/MSFT-income-statement.json')
balance_sheets = load('data/cache/MSFT-balance-sheet-statement.json')
cash_flows = load('data/cache/MSFT-cash-flow-statement.json')
segments_raw = load('data/cache/MSFT-revenue-segments.json')
km_ttm = load('data/cache/MSFT-key-metrics-ttm.json')
km_annual = load('data/cache/MSFT-key-metrics.json')

p = profile[0] if profile else {}
km = km_ttm[0] if km_ttm else {}
km_a = km_annual[0] if km_annual else {}

# Derive shares outstanding from market cap / price
shares_out = None
if p.get('marketCap') and p.get('price') and p['price'] > 0:
    shares_out = round(p['marketCap'] / p['price'])

# 52-week from range string
week52_high, week52_low = None, None
rng = p.get('range', '')
if '-' in rng:
    parts = rng.split('-')
    try:
        week52_low = float(parts[0])
        week52_high = float(parts[1])
    except Exception:
        pass

# Dividend yield
div_yield = None
if p.get('lastDividend') and p.get('price') and p['price'] > 0:
    div_yield = round(p['lastDividend'] / p['price'], 6)

# EV from TTM key metrics
ev = km.get('enterpriseValueTTM')

# Float shares - not directly available in stable endpoints
float_shares = None

flags = []

def build_income(stmts):
    result = []
    for s in (stmts or []):
        rev = s.get('revenue')
        gp = s.get('grossProfit')
        ebitda = s.get('ebitda')
        ebit = s.get('ebit')
        ni = s.get('netIncome')
        result.append({
            "fiscal_year": s.get('fiscalYear'),
            "revenue": rev,
            "gross_profit": gp,
            "ebitda": ebitda,
            "ebit": ebit,
            "net_income": ni,
            "eps_diluted": s.get('epsDiluted'),
            "shares_diluted": s.get('weightedAverageShsOutDil'),
            "gross_margin": round(gp / rev, 6) if rev and gp else None,
            "ebitda_margin": round(ebitda / rev, 6) if rev and ebitda else None,
            "net_margin": round(ni / rev, 6) if rev and ni else None,
        })
    return result

def build_balance(stmts):
    result = []
    for s in (stmts or []):
        curr_assets = s.get('totalCurrentAssets')
        curr_liab = s.get('totalCurrentLiabilities')
        wc = None
        if curr_assets is not None and curr_liab is not None:
            wc = curr_assets - curr_liab
        result.append({
            "fiscal_year": s.get('fiscalYear'),
            "total_assets": s.get('totalAssets'),
            "total_liabilities": s.get('totalLiabilities'),
            "total_equity": s.get('totalEquity'),
            "cash_and_equivalents": s.get('cashAndCashEquivalents'),
            "total_debt": s.get('totalDebt'),
            "net_debt": s.get('netDebt'),
            "working_capital": wc,
        })
    return result

def build_cashflow(stmts):
    result = []
    for s in (stmts or []):
        result.append({
            "fiscal_year": s.get('fiscalYear'),
            "operating_cash_flow": s.get('operatingCashFlow'),
            "capital_expenditures": s.get('capitalExpenditure'),
            "free_cash_flow": s.get('freeCashFlow'),
            "depreciation_and_amortization": s.get('depreciationAndAmortization'),
        })
    return result

# Build segmented revenue (FY2021-2025 matching income statements)
seg_available = segments_raw is not None and len(segments_raw) > 0
seg_list = []

if seg_available:
    target_years = {'2021', '2022', '2023', '2024', '2025'}
    for seg_year in segments_raw:
        fy = str(seg_year.get('fiscalYear', ''))
        if fy not in target_years:
            continue
        data_map = seg_year.get('data', {})
        total_rev = None
        for inc in (income_stmts or []):
            if str(inc.get('fiscalYear', '')) == fy:
                total_rev = inc.get('revenue')
                break
        for seg_name, seg_rev in data_map.items():
            pct = round(seg_rev / total_rev, 6) if total_rev and seg_rev else None
            seg_list.append({
                "segment_name": seg_name,
                "fiscal_year": fy,
                "revenue": seg_rev,
                "percentage_of_total": pct,
            })
else:
    flags.append({
        "field": "segmented_revenue",
        "issue": "Segmented revenue data unavailable from FMP API",
        "severity": "warning"
    })

def build_peer(sym, name):
    prof = load(f'data/cache/MSFT-peers-{sym}-profile.json')
    km_t = load(f'data/cache/MSFT-peers-{sym}-km-ttm.json')
    inc = load(f'data/cache/MSFT-peers-{sym}-income.json')
    bs = load(f'data/cache/MSFT-peers-{sym}-bs.json')

    p_d = prof[0] if prof else {}
    km_d = km_t[0] if km_t else {}
    inc_d = inc[0] if inc else {}
    bs_d = bs[0] if bs else {}

    mkt_cap = p_d.get('marketCap') or km_d.get('marketCap')
    ev_v = km_d.get('enterpriseValueTTM')
    rev = inc_d.get('revenue')
    ebitda = inc_d.get('ebitda')
    ni = inc_d.get('netIncome')
    gp = inc_d.get('grossProfit')

    # P/E from earnings yield TTM (1 / earningsYield)
    pe = None
    ey = km_d.get('earningsYieldTTM')
    if ey and ey != 0:
        pe = round(1 / ey, 4)

    ev_ebitda = km_d.get('evToEBITDATTM')
    ev_rev = km_d.get('evToSalesTTM')

    # Debt/Equity from balance sheet
    de = None
    td = bs_d.get('totalDebt')
    te = bs_d.get('totalEquity')
    if td is not None and te and te != 0:
        de = round(td / te, 4)

    gm = round(gp / rev, 6) if rev and gp else None
    nm = round(ni / rev, 6) if rev and ni else None

    if not km_t:
        flags.append({
            "field": f"peers.{sym}.ttm_metrics",
            "issue": f"TTM key metrics unavailable for {sym} under current API subscription tier",
            "severity": "warning"
        })
    if not inc:
        flags.append({
            "field": f"peers.{sym}.revenue_ttm",
            "issue": f"Annual income statement restricted for {sym}; revenue_ttm, ebitda_ttm, net_income_ttm, gross_margin, net_margin are null",
            "severity": "warning"
        })

    return {
        "name": name,
        "ticker": sym,
        "market_cap": mkt_cap,
        "enterprise_value": ev_v,
        "revenue_ttm": rev,
        "ebitda_ttm": ebitda,
        "net_income_ttm": ni,
        "ev_to_ebitda": ev_ebitda,
        "ev_to_revenue": ev_rev,
        "pe_ratio": pe,
        "price_to_book": None,
        "debt_to_equity": de,
        "gross_margin": gm,
        "net_margin": nm,
    }

peers_list = [
    build_peer('AAPL', 'Apple Inc.'),
    build_peer('GOOGL', 'Alphabet Inc.'),
    build_peer('NVDA', 'NVIDIA Corporation'),
    build_peer('ORCL', 'Oracle Corporation'),
    build_peer('FTNT', 'Fortinet, Inc.'),
]

# Global flags
flags.append({
    "field": "market.float_shares",
    "issue": "Float shares not available in FMP stable profile or key-metrics endpoints",
    "severity": "info"
})
flags.append({
    "field": "peers.*.price_to_book",
    "issue": "Price-to-book ratio not returned by FMP stable key-metrics-ttm endpoint; null for all peers",
    "severity": "info"
})
flags.append({
    "field": "annual_financials",
    "issue": "MSFT fiscal year ends June 30. FY2025 = July 2024 through June 2025. All figures in USD.",
    "severity": "info"
})
flags.append({
    "field": "peers.revenue_ttm",
    "issue": "Peer revenue_ttm values sourced from most recent annual filing (not rolling TTM) due to TTM income statement endpoint being subscription-restricted",
    "severity": "info"
})

result = {
    "company": {
        "name": p.get('companyName'),
        "ticker": p.get('symbol', 'MSFT'),
        "exchange": p.get('exchange'),
        "sector": p.get('sector'),
        "industry": p.get('industry'),
        "description": p.get('description'),
        "country": p.get('country'),
        "currency": p.get('currency'),
        "fiscal_year_end": "June 30",
        "employees": int(p['fullTimeEmployees']) if p.get('fullTimeEmployees') else None,
    },
    "market": {
        "current_price": p.get('price'),
        "market_cap": p.get('marketCap'),
        "enterprise_value": ev,
        "shares_outstanding": shares_out,
        "float_shares": float_shares,
        "beta": p.get('beta'),
        "52_week_high": week52_high,
        "52_week_low": week52_low,
        "dividend_yield": div_yield,
    },
    "annual_financials": {
        "income_statement": build_income(income_stmts),
        "balance_sheet": build_balance(balance_sheets),
        "cash_flow_statement": build_cashflow(cash_flows),
    },
    "segmented_revenue": {
        "available": seg_available,
        "segments": seg_list,
    },
    "peers": peers_list,
    "flags": flags,
}

with open('data/MSFT-collected.json', 'w') as f:
    json.dump(result, f, indent=2)

print("SUCCESS: data/MSFT-collected.json written")
print(f"Income years: {len(result['annual_financials']['income_statement'])}")
print(f"Balance years: {len(result['annual_financials']['balance_sheet'])}")
print(f"CF years: {len(result['annual_financials']['cash_flow_statement'])}")
print(f"Segments count: {len(result['segmented_revenue']['segments'])}")
print(f"Peers count: {len(result['peers'])}")
print(f"Flags count: {len(result['flags'])}")
