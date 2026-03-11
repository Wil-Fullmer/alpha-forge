import json

data = {
  "company": {
    "name": "Apple Inc.",
    "ticker": "AAPL",
    "exchange": "NASDAQ",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "description": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company offers iPhone, Mac, iPad, and wearables including AirPods, Apple TV, Apple Watch, Beats products, and HomePod. It also provides AppleCare support, cloud services, and operates the App Store platform.",
    "country": "US",
    "currency": "USD",
    "fiscal_year_end": "September",
    "employees": 164000
  },
  "market": {
    "current_price": 260.83,
    "market_cap": 3833659815049,
    "enterprise_value": 3878851815049,
    "shares_outstanding": 14697924526,
    "float_shares": 14664480994,
    "beta": 1.116,
    "52_week_high": 288.62,
    "52_week_low": 169.21,
    "dividend_yield": round(1.04 / 260.83, 6)
  },
  "annual_financials": {
    "income_statement": [
      {
        "fiscal_year": "2025",
        "revenue": 416161000000,
        "gross_profit": 195201000000,
        "ebitda": 144427000000,
        "ebit": 132729000000,
        "net_income": 112010000000,
        "eps_diluted": 7.46,
        "shares_diluted": 15004697000,
        "gross_margin": round(195201000000 / 416161000000, 6),
        "ebitda_margin": round(144427000000 / 416161000000, 6),
        "net_margin": round(112010000000 / 416161000000, 6)
      },
      {
        "fiscal_year": "2024",
        "revenue": 391035000000,
        "gross_profit": 180683000000,
        "ebitda": 134930000000,
        "ebit": 123485000000,
        "net_income": 93736000000,
        "eps_diluted": 6.08,
        "shares_diluted": 15408095000,
        "gross_margin": round(180683000000 / 391035000000, 6),
        "ebitda_margin": round(134930000000 / 391035000000, 6),
        "net_margin": round(93736000000 / 391035000000, 6)
      },
      {
        "fiscal_year": "2023",
        "revenue": 383285000000,
        "gross_profit": 169148000000,
        "ebitda": 129188000000,
        "ebit": 117669000000,
        "net_income": 96995000000,
        "eps_diluted": 6.13,
        "shares_diluted": 15812547000,
        "gross_margin": round(169148000000 / 383285000000, 6),
        "ebitda_margin": round(129188000000 / 383285000000, 6),
        "net_margin": round(96995000000 / 383285000000, 6)
      },
      {
        "fiscal_year": "2022",
        "revenue": 394328000000,
        "gross_profit": 170782000000,
        "ebitda": 133138000000,
        "ebit": 122034000000,
        "net_income": 99803000000,
        "eps_diluted": 6.11,
        "shares_diluted": 16325819000,
        "gross_margin": round(170782000000 / 394328000000, 6),
        "ebitda_margin": round(133138000000 / 394328000000, 6),
        "net_margin": round(99803000000 / 394328000000, 6)
      },
      {
        "fiscal_year": "2021",
        "revenue": 365817000000,
        "gross_profit": 152836000000,
        "ebitda": 123136000000,
        "ebit": 111852000000,
        "net_income": 94680000000,
        "eps_diluted": 5.61,
        "shares_diluted": 16864919000,
        "gross_margin": round(152836000000 / 365817000000, 6),
        "ebitda_margin": round(123136000000 / 365817000000, 6),
        "net_margin": round(94680000000 / 365817000000, 6)
      }
    ],
    "balance_sheet": [
      {
        "fiscal_year": "2025",
        "total_assets": 359241000000,
        "total_liabilities": 285508000000,
        "total_equity": 73733000000,
        "cash_and_equivalents": 35934000000,
        "total_debt": 112377000000,
        "net_debt": 76443000000,
        "working_capital": 147957000000 - 165631000000
      },
      {
        "fiscal_year": "2024",
        "total_assets": 364980000000,
        "total_liabilities": 308030000000,
        "total_equity": 56950000000,
        "cash_and_equivalents": 29943000000,
        "total_debt": 119059000000,
        "net_debt": 89116000000,
        "working_capital": 152987000000 - 176392000000
      },
      {
        "fiscal_year": "2023",
        "total_assets": 352583000000,
        "total_liabilities": 290437000000,
        "total_equity": 62146000000,
        "cash_and_equivalents": 29965000000,
        "total_debt": 123930000000,
        "net_debt": 93965000000,
        "working_capital": 143566000000 - 145308000000
      },
      {
        "fiscal_year": "2022",
        "total_assets": 352755000000,
        "total_liabilities": 302083000000,
        "total_equity": 50672000000,
        "cash_and_equivalents": 23646000000,
        "total_debt": 132480000000,
        "net_debt": 108834000000,
        "working_capital": 135405000000 - 153982000000
      },
      {
        "fiscal_year": "2021",
        "total_assets": 351002000000,
        "total_liabilities": 287912000000,
        "total_equity": 63090000000,
        "cash_and_equivalents": 34940000000,
        "total_debt": 136522000000,
        "net_debt": 101582000000,
        "working_capital": 134836000000 - 125481000000
      }
    ],
    "cash_flow_statement": [
      {
        "fiscal_year": "2025",
        "operating_cash_flow": 111482000000,
        "capital_expenditures": -12715000000,
        "free_cash_flow": 98767000000,
        "depreciation_and_amortization": 11698000000
      },
      {
        "fiscal_year": "2024",
        "operating_cash_flow": 118254000000,
        "capital_expenditures": -9447000000,
        "free_cash_flow": 108807000000,
        "depreciation_and_amortization": 11445000000
      },
      {
        "fiscal_year": "2023",
        "operating_cash_flow": 110543000000,
        "capital_expenditures": -10959000000,
        "free_cash_flow": 99584000000,
        "depreciation_and_amortization": 11519000000
      },
      {
        "fiscal_year": "2022",
        "operating_cash_flow": 122151000000,
        "capital_expenditures": -10708000000,
        "free_cash_flow": 111443000000,
        "depreciation_and_amortization": 11104000000
      },
      {
        "fiscal_year": "2021",
        "operating_cash_flow": 104038000000,
        "capital_expenditures": -11085000000,
        "free_cash_flow": 92953000000,
        "depreciation_and_amortization": 11284000000
      }
    ]
  },
  "segmented_revenue": {
    "available": True,
    "segments": [
      {"segment_name": "iPhone", "fiscal_year": "2025", "revenue": 209586000000, "percentage_of_total": round(209586000000/416161000000, 6)},
      {"segment_name": "Services", "fiscal_year": "2025", "revenue": 109158000000, "percentage_of_total": round(109158000000/416161000000, 6)},
      {"segment_name": "Wearables, Home and Accessories", "fiscal_year": "2025", "revenue": 35686000000, "percentage_of_total": round(35686000000/416161000000, 6)},
      {"segment_name": "Mac", "fiscal_year": "2025", "revenue": 33708000000, "percentage_of_total": round(33708000000/416161000000, 6)},
      {"segment_name": "iPad", "fiscal_year": "2025", "revenue": 28023000000, "percentage_of_total": round(28023000000/416161000000, 6)},
      {"segment_name": "iPhone", "fiscal_year": "2024", "revenue": 201183000000, "percentage_of_total": round(201183000000/391035000000, 6)},
      {"segment_name": "Services", "fiscal_year": "2024", "revenue": 96169000000, "percentage_of_total": round(96169000000/391035000000, 6)},
      {"segment_name": "Wearables, Home and Accessories", "fiscal_year": "2024", "revenue": 37005000000, "percentage_of_total": round(37005000000/391035000000, 6)},
      {"segment_name": "Mac", "fiscal_year": "2024", "revenue": 29984000000, "percentage_of_total": round(29984000000/391035000000, 6)},
      {"segment_name": "iPad", "fiscal_year": "2024", "revenue": 26694000000, "percentage_of_total": round(26694000000/391035000000, 6)},
      {"segment_name": "iPhone", "fiscal_year": "2023", "revenue": 200583000000, "percentage_of_total": round(200583000000/383285000000, 6)},
      {"segment_name": "Services", "fiscal_year": "2023", "revenue": 85200000000, "percentage_of_total": round(85200000000/383285000000, 6)},
      {"segment_name": "Wearables, Home and Accessories", "fiscal_year": "2023", "revenue": 39845000000, "percentage_of_total": round(39845000000/383285000000, 6)},
      {"segment_name": "Mac", "fiscal_year": "2023", "revenue": 29357000000, "percentage_of_total": round(29357000000/383285000000, 6)},
      {"segment_name": "iPad", "fiscal_year": "2023", "revenue": 28300000000, "percentage_of_total": round(28300000000/383285000000, 6)},
      {"segment_name": "iPhone", "fiscal_year": "2022", "revenue": 205489000000, "percentage_of_total": round(205489000000/394328000000, 6)},
      {"segment_name": "Services", "fiscal_year": "2022", "revenue": 78129000000, "percentage_of_total": round(78129000000/394328000000, 6)},
      {"segment_name": "Wearables, Home and Accessories", "fiscal_year": "2022", "revenue": 41241000000, "percentage_of_total": round(41241000000/394328000000, 6)},
      {"segment_name": "Mac", "fiscal_year": "2022", "revenue": 40177000000, "percentage_of_total": round(40177000000/394328000000, 6)},
      {"segment_name": "iPad", "fiscal_year": "2022", "revenue": 29292000000, "percentage_of_total": round(29292000000/394328000000, 6)},
      {"segment_name": "iPhone", "fiscal_year": "2021", "revenue": 191973000000, "percentage_of_total": round(191973000000/365817000000, 6)},
      {"segment_name": "Services", "fiscal_year": "2021", "revenue": 68425000000, "percentage_of_total": round(68425000000/365817000000, 6)},
      {"segment_name": "Wearables, Home and Accessories", "fiscal_year": "2021", "revenue": 38367000000, "percentage_of_total": round(38367000000/365817000000, 6)},
      {"segment_name": "Mac", "fiscal_year": "2021", "revenue": 35190000000, "percentage_of_total": round(35190000000/365817000000, 6)},
      {"segment_name": "iPad", "fiscal_year": "2021", "revenue": 31862000000, "percentage_of_total": round(31862000000/365817000000, 6)}
    ]
  },
  "peers": [
    {
      "name": "Microsoft Corporation",
      "ticker": "MSFT",
      "market_cap": 3013023628800,
      "enterprise_value": 3112005628800,
      "revenue_ttm": 281724000000,
      "ebitda_ttm": 160165000000,
      "net_income_ttm": 101832000000,
      "ev_to_ebitda": round(3112005628800 / 160165000000, 4),
      "ev_to_revenue": round(3112005628800 / 281724000000, 4),
      "pe_ratio": round(1 / 0.03955356153584587, 4),
      "price_to_book": round(3013023628800 / 343479000000, 4),
      "debt_to_equity": round(112184000000 / 343479000000, 4),
      "gross_margin": round(193893000000 / 281724000000, 6),
      "net_margin": round(101832000000 / 281724000000, 6)
    },
    {
      "name": "Alphabet Inc.",
      "ticker": "GOOGL",
      "market_cap": 3714262904870,
      "enterprise_value": 3755589904870,
      "revenue_ttm": 402963000000,
      "ebitda_ttm": 179962000000,
      "net_income_ttm": 132170000000,
      "ev_to_ebitda": round(3755589904870 / 179962000000, 4),
      "ev_to_revenue": round(3755589904870 / 402963000000, 4),
      "pe_ratio": round(1 / 0.03565518810422285, 4),
      "price_to_book": round(3714262904870 / 415265000000, 4),
      "debt_to_equity": round(72035000000 / 415265000000, 4),
      "gross_margin": round(240428000000 / 402963000000, 6),
      "net_margin": round(132170000000 / 402963000000, 6)
    },
    {
      "name": "Amazon.com, Inc.",
      "ticker": "AMZN",
      "market_cap": 2300815590067,
      "enterprise_value": 2366992590067,
      "revenue_ttm": 716924000000,
      "ebitda_ttm": 165341000000,
      "net_income_ttm": 77670000000,
      "ev_to_ebitda": round(2366992590067 / 165341000000, 4),
      "ev_to_revenue": round(2366992590067 / 716924000000, 4),
      "pe_ratio": round(1 / 0.033839304050599546, 4),
      "price_to_book": round(2300815590067 / 411065000000, 4),
      "debt_to_equity": round(152987000000 / 411065000000, 4),
      "gross_margin": round(360510000000 / 716924000000, 6),
      "net_margin": round(77670000000 / 716924000000, 6)
    },
    {
      "name": "Meta Platforms, Inc.",
      "ticker": "META",
      "market_cap": 1648905871234,
      "enterprise_value": 1696929871234,
      "revenue_ttm": 200966000000,
      "ebitda_ttm": 104548000000,
      "net_income_ttm": 60458000000,
      "ev_to_ebitda": round(1696929871234 / 104548000000, 4),
      "ev_to_revenue": round(1696929871234 / 200966000000, 4),
      "pe_ratio": round(1 / 0.0366654230778218, 4),
      "price_to_book": round(1648905871234 / 217243000000, 4),
      "debt_to_equity": round(83897000000 / 217243000000, 4),
      "gross_margin": round(164791000000 / 200966000000, 6),
      "net_margin": round(60458000000 / 200966000000, 6)
    },
    {
      "name": "NVIDIA Corporation",
      "ticker": "NVDA",
      "market_cap": 4490834573399,
      "enterprise_value": 4491641573399,
      "revenue_ttm": 215938000000,
      "ebitda_ttm": 144552000000,
      "net_income_ttm": 120067000000,
      "ev_to_ebitda": round(4491641573399 / 144552000000, 4),
      "ev_to_revenue": round(4491641573399 / 215938000000, 4),
      "pe_ratio": round(1 / 0.026737108850841476, 4),
      "price_to_book": round(4490834573399 / 157293000000, 4),
      "debt_to_equity": round(11412000000 / 157293000000, 4),
      "gross_margin": round(153463000000 / 215938000000, 6),
      "net_margin": round(120067000000 / 215938000000, 6)
    }
  ],
  "flags": [
    {
      "field": "market.dividend_yield",
      "issue": "Dividend yield calculated from lastDividend (trailing annual $1.04) divided by current price $260.83. FMP stable/profile does not return a dedicated dividend_yield field.",
      "severity": "info"
    },
    {
      "field": "annual_financials.income_statement[FY2025,FY2024].interest_expense",
      "issue": "FMP income-statement endpoint returned 0 for interestExpense in FY2025 and FY2024. Apple does carry long-term debt; interest may be netted into other line items. Cross-reference with 10-K footnotes for exact interest charges.",
      "severity": "warning"
    },
    {
      "field": "segmented_revenue.segments[FY2025].reportedCurrency",
      "issue": "FMP revenue-product-segmentation returned null for reportedCurrency for the FY2025 row. USD assumed consistent with all other fiscal years.",
      "severity": "info"
    },
    {
      "field": "peers.MSFT.fiscal_year_basis",
      "issue": "Microsoft FY2025 ends June 30, 2025. Metrics are based on the most recently filed annual period; cross-period comparison with AAPL (September FY-end) should account for this ~3-month offset.",
      "severity": "warning"
    },
    {
      "field": "peers.NVDA.fiscal_year_basis",
      "issue": "NVIDIA fiscal year labeled FY2026 ends January 25, 2026. Most recent annual data used for peer comparables; fiscal year labeling differs from calendar-year peers.",
      "severity": "warning"
    },
    {
      "field": "peers.*.pe_ratio",
      "issue": "P/E ratios for all peers derived by inverting earningsYieldTTM from FMP key-metrics-ttm endpoint. Values are internally consistent but may differ marginally from consensus screens due to share count timing.",
      "severity": "info"
    },
    {
      "field": "annual_financials.balance_sheet[FY2025,FY2024,FY2023,FY2022].working_capital",
      "issue": "AAPL carries structural negative working capital in FY2022-2025. This reflects AAPL capital allocation strategy (large AP, deferred revenue) and is not a data error. FY2021 working capital is positive.",
      "severity": "info"
    },
    {
      "field": "market.enterprise_value",
      "issue": "Enterprise value sourced from FMP key-metrics-ttm endpoint. Reflects TTM data as of data retrieval date March 10, 2026.",
      "severity": "info"
    }
  ]
}

output = json.dumps(data, indent=2)
parsed = json.loads(output)
assert parsed["company"]["ticker"] == "AAPL"
assert len(parsed["annual_financials"]["income_statement"]) == 5
assert len(parsed["annual_financials"]["balance_sheet"]) == 5
assert len(parsed["annual_financials"]["cash_flow_statement"]) == 5
assert len(parsed["peers"]) == 5
assert parsed["segmented_revenue"]["available"] == True
assert len(parsed["segmented_revenue"]["segments"]) == 25

with open("C:/Users/kakvl/projects/1/.claude/worktrees/tender-stonebraker/data/aapl_financial_data.json", "w") as f:
    f.write(output)

print("Validation passed. JSON written to data/aapl_financial_data.json")
print(f"Total lines: {len(output.splitlines())}")
