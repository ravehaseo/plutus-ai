# Plutus A.I — Project Instructions

## Project Overview
**Project Name:** Plutus A.I (AI Dividend Advisor)
**Type:** Personal Finance Tool — local-only, single-user
**Core Logic:** The "RaveInvestment" strategy
**Target Market:** Bursa Malaysia (MYR) — Non-Shariah high-dividend yielders (expandable to any market via profiles)
**Primary Objective:** Answer one question every month: *"I have RM X — what should I buy to maximize my dividend income?"* — and project the path to RM 2,000+/month passive income over 10 years.

## What This App Does

1. You input how much money you can allocate this month
2. Plutus fetches live prices, compares dividend yields, checks for discounts, and evaluates entry timing via Gemini
3. It outputs a **concrete buy plan**: which stocks, how many lots, exact RM cost, entry signal, and why
4. It shows the **before/after impact**: how the purchase changes your projected annual dividend income
5. It projects your **10-year income trajectory** with snowball compounding
6. It **discovers new stocks** across the entire market via Gemini-powered scanning

This is a personal tool. No login, no subscriptions, no cloud hosting. Everything runs locally via Docker.

## Tech Stack

### Frontend
- **Framework:** Next.js 15+ (App Router) with TypeScript
- **Styling:** Tailwind CSS v4
- **Theme:** Dark mode with "Greek Gold" accent palette (`#FFD700`, `#1A1A1B`)

### Backend
- **Runtime:** Python 3.10+
- **Framework:** FastAPI with Pydantic v2 for validation
- **ORM:** SQLAlchemy 2.0 (async) with `asyncpg`
- **Migrations:** Alembic

### AI Engine
- **SDK:** `google-genai` (new Google GenAI SDK)
- **Default Model:** Configurable via `GEMINI_MODEL` env var (default: `gemini-2.5-flash`)
- **Role:** Gemini is the analytical brain — buy plan generation, stock discovery, entry point prediction, sector suggestions
- **Response Handling:** Custom `_extract_text` helper handles thinking-model responses (skips thought blocks, concatenates text parts). `_parse_json` robustly extracts JSON from markdown-fenced or truncated responses.

### Market Data
- **Primary:** `yfinance` (Ticker suffix: `.KL` for Bursa Malaysia)
- **Refresh:** Prices cached in Postgres via `market_cache` table; auto-refreshed when stale (configurable TTL)

### Database & Cache
- **PostgreSQL 16** via Docker container
- **Redis 7** via Docker container
- Single-user, no auth layer

### Infrastructure
- **Hybrid mode:** Docker for Postgres + Redis; FastAPI and Next.js run locally for hot-reload
- **Shell scripts:** `setup.sh` (first-time), `start.sh` (daily), `stop.sh` (shutdown)
- Venv location: `backend/venv/`

## Architecture Principles
1. **Local-Only:** No cloud dependencies except Gemini API and yfinance. All data lives on your machine.
2. **Profile-Based:** Supports multiple profiles (e.g., "Royce — Bursa" and "Wife — KRX"). Each profile has its own holdings, watchlist, preferences, and strategy.
3. **Dynamic Watchlist:** Stocks are NOT hardcoded — users can discover new stocks via Gemini, add manually by ticker, or remove. The seed data (11 Bursa stocks) is just the starting point.
4. **Flexible Sectors:** Not limited to bank/reit/sin_stock — Gemini discovery assigns sectors dynamically (utilities, telecom, consumer, etc.). Profile `sector_targets` supports any sector keys.
5. **API-First:** Backend as a standalone FastAPI service; frontend consumes REST APIs.
6. **Type Safety:** TypeScript on frontend, Pydantic on backend.
7. **Gemini as Brain:** Stock discovery, buy plan generation, entry point prediction, and sector suggestions all delegated to Gemini with structured prompts. Code handles data fetching, math, and presentation.

## The "RaveInvestment" Logic Rules

### Sector Balance (Default — Configurable)
| Sector | Default Target | Examples |
|--------|---------------|----------|
| Banks | 40% | Maybank, CIMB, Public Bank |
| REITs | 30% | Sunway REIT, IGB REIT, Pavilion REIT |
| Sin Stocks | 20% | Heineken, Carlsberg, BAT |
| Cash (War Chest) | 10% | Money market funds |

Sector targets are configurable per profile and expand dynamically as new sectors are discovered.

### Stock Universe
A **dynamic watchlist** per profile. Stocks can be added via:
- **Gemini Discovery:** Ask Gemini to find high-dividend non-Shariah stocks across all Bursa sectors
- **Manual Add:** Enter a ticker, app validates via yfinance and adds to watchlist
- **Seed Data:** 11 default Bursa Malaysia stocks seeded on first setup

The watchlist is the pool from which all buy recommendations are drawn.

### Entry Point Prediction
Each stock receives an entry signal during market data refresh:
| Signal | Meaning |
|--------|---------|
| `strong_buy` | Trading significantly below fair value, excellent entry |
| `buy` | Good value at current price, reasonable entry |
| `hold` | Fair value, not urgent to buy |
| `wait` | Overvalued or better entry likely soon |

Signals are determined by combining War/Fear discount (quantitative) with Gemini timing analysis (qualitative).

### The "War/Fear" Multiplier
If a stock's current price is **>10% below its 52-week high**, flag it as a **"Sale Opportunity"** and bias recommendations toward accumulation.

### Yield Target
Prioritize stocks with annual dividend yield between **5.0% – 8.0%** (configurable per profile).

### Lot Size
Bursa Malaysia minimum lot size is **100 shares**. All buy recommendations must be in whole lots.

### Snowball Reinvestment Formula

$$
\text{FutureValue} = P\left(1 + \frac{r}{n}\right)^{nt} + \text{PMT} \times \frac{\left(1 + \frac{r}{n}\right)^{nt} - 1}{\frac{r}{n}}
$$

| Variable | Meaning |
|----------|---------|
| P | Current portfolio value |
| PMT | Monthly top-up amount |
| r | Weighted average dividend yield (decimal) |
| n | Compounding frequency (12 for monthly) |
| t | Time horizon (years) |

## Implemented Features

### Allocate My Money (Primary Feature)
- Input amount, get AI-generated buy plan with entry signals
- Impact preview (before/after annual dividend, monthly income)
- 10-year projection with 3 scenarios (conservative/base/optimistic)
- Year 0 "Now" baseline row in projections
- Confirm purchase (full or partial) — updates holdings and all dashboard values
- Allocation history with past plans
- Plans cached in localStorage, fallback plans skipped on restore

### Watchlist Management
- View all tracked stocks grouped by sector
- Manually add stocks by ticker (validates via yfinance)
- Remove stocks (soft-delete via `is_active` flag)
- Gemini Discovery: discover 10-15 new dividend stocks across all Bursa sectors
- Select and add discovered stocks to watchlist

### Stock Comparison
- Live table of all watchlist stocks with price, yield, cost/lot, div/lot, 52w discount
- Entry signal badges (color-coded: green/emerald/yellow/red)
- Entry reasoning tooltip on hover
- Sortable columns, Sale Opportunity badges

### Portfolio Dashboard
- Stats row: total value, weighted yield, monthly income, years to goal
- Sector allocation with target comparison
- War Chest status
- War/Fear sale opportunity count badge
- "Allocate My Money" CTA card

### Income Goal Tracker
- Progress bar: current monthly income vs target
- "Years to goal" metric
- Adjustable top-up slider
- Year-by-year projection table with Year 0 baseline

### Profile Settings
- Editable sector targets, yield bands, war/fear threshold
- Monthly top-up, income goal, war chest target
- AI Suggest button for Gemini-recommended sector allocations

## Project Structure
```
plutus-ai/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── profiles.py      # Profile CRUD + AI sector suggest
│   │   │   ├── allocate.py      # Buy plan generation + confirm
│   │   │   ├── portfolio.py     # Holdings CRUD + summary
│   │   │   ├── market.py        # Market data + refresh
│   │   │   └── watchlist.py     # Watchlist management + discovery
│   │   ├── services/
│   │   │   ├── ai_advisor.py    # Gemini buy plan generation
│   │   │   ├── stock_discovery.py # Gemini stock discovery + yfinance validation
│   │   │   ├── market_fetcher.py  # yfinance data + entry signal generation
│   │   │   └── portfolio_service.py # Portfolio summary + projections
│   │   ├── logic/
│   │   │   ├── calculations.py  # Snowball formula, projections
│   │   │   ├── comparator.py    # Stock ranking by yield/RM
│   │   │   └── war_fear.py      # 52-week discount detection
│   │   ├── models/              # SQLAlchemy ORM (8 models)
│   │   ├── schemas/             # Pydantic schemas (market, allocate, watchlist, profile, portfolio)
│   │   ├── core/
│   │   │   ├── config.py        # Settings from .env (gemini_model, api keys, cache TTL)
│   │   │   ├── constants.py     # KNOWN_SECTORS, default profiles, seed watchlist
│   │   │   ├── database.py      # SQLAlchemy engine + session
│   │   │   └── exceptions.py    # Custom exceptions
│   │   └── seed.py              # Database seeder
│   ├── alembic/
│   │   └── versions/
│   │       ├── 001_initial_schema.py
│   │       └── 002_add_entry_signals.py
│   ├── venv/                    # Python virtual environment
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── dashboard/           # Portfolio overview + sale badges + allocate CTA
│   │   ├── watchlist/           # Watchlist management + Gemini discovery
│   │   ├── compare/             # Stock comparison with entry signals
│   │   ├── allocate/            # Buy plan generation + confirm + history
│   │   ├── calculator/          # Income goal tracker + projections
│   │   └── profiles/            # Settings (sector targets, yield bands, etc.)
│   ├── components/
│   │   ├── layout/              # Sidebar, Topbar
│   │   ├── portfolio/           # Stats row, sector chart
│   │   ├── allocate/            # Buy plan table, impact preview, projection, confirm, history
│   │   └── compare/             # Stock table, sale badge, entry signal badge
│   ├── lib/
│   │   ├── api.ts               # API client (profiles, portfolio, market, allocate, watchlist)
│   │   ├── constants.ts         # Theme, sector labels/colors, entry signal config
│   │   └── utils.ts             # formatCurrency, formatYield, formatPct, cn
│   └── types/index.ts           # All TypeScript interfaces
├── docker-compose.yml
├── .env.example
├── setup.sh / start.sh / stop.sh
├── instructions.md              # This file
└── README.md
```

## Database Schema

```sql
-- 8 tables total

profiles (id, name, currency, currency_symbol, ticker_suffix, lot_size,
  yield_band_min, yield_band_max, war_fear_threshold, sector_targets JSONB,
  news_grounding_query, rss_feeds JSONB, monthly_topup_default, income_goal,
  war_chest_balance, war_chest_target, is_active, created_at, updated_at)

holdings (id, profile_id FK, ticker, stock_name, sector, shares, avg_buy_price,
  created_at, updated_at, UNIQUE(profile_id, ticker))

watchlist (id, profile_id FK, ticker, stock_name, sector, is_active,
  added_at, UNIQUE(profile_id, ticker))

market_cache (ticker PK, stock_name, last_close, week_52_high, week_52_low,
  dividend_yield, annual_dividend, pe_ratio, market_cap, cost_per_lot,
  dividend_per_lot, war_fear_discount, is_sale_opportunity,
  entry_signal VARCHAR, entry_reasoning TEXT, fetched_at)

allocation_history (id, profile_id FK, total_amount, plan JSONB,
  projected_annual_dividend_before, projected_annual_dividend_after,
  executed, executed_items JSONB, created_at)

dividend_history (id, ticker, ex_date, payment_date, amount_per_share, dividend_type)
news_cache (id, source, headline, summary, affected_tickers, sentiment, ai_analysis, published_at, fetched_at)
chat_messages (id, profile_id FK, role, content, created_at)
```

## Environment Variables
```bash
DATABASE_URL=postgresql+asyncpg://plutus:plutus@localhost:5432/plutus
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash          # configurable: gemini-2.5-flash, gemini-2.0-flash, gemini-2.0-flash-lite
ALPHA_VANTAGE_API_KEY=                  # optional fallback
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profiles` | List all profiles |
| GET | `/api/v1/profiles/active` | Get active profile |
| POST | `/api/v1/profiles/{id}/activate` | Switch profile |
| PUT | `/api/v1/profiles/active` | Update profile settings |
| POST | `/api/v1/profiles/active/suggest-sectors` | AI-suggested sector allocations |
| GET | `/api/v1/portfolio` | List holdings with live prices |
| GET | `/api/v1/portfolio/summary` | Portfolio stats, projections |
| POST | `/api/v1/portfolio` | Add a holding |
| PUT | `/api/v1/portfolio/{id}` | Update shares or buy price |
| DELETE | `/api/v1/portfolio/{id}` | Remove a holding |
| GET | `/api/v1/market/watchlist` | Stock comparison data (cached) |
| POST | `/api/v1/market/refresh` | Force refresh market prices + entry signals |
| POST | `/api/v1/allocate` | Generate AI buy plan with entry signals |
| POST | `/api/v1/allocate/{id}/confirm` | Confirm purchase |
| GET | `/api/v1/allocate/history` | Past allocation plans |
| GET | `/api/v1/watchlist` | List watchlist items |
| POST | `/api/v1/watchlist` | Add stock by ticker |
| DELETE | `/api/v1/watchlist/{id}` | Remove stock |
| POST | `/api/v1/watchlist/discover` | Gemini stock discovery |
| POST | `/api/v1/watchlist/discover/add` | Add discovered stocks |

## Coding Standards

### Code Organization
- **`logic/`** — Pure math and algorithms. No I/O, no database, no API calls.
- **`services/`** — Orchestration. Calls logic, fetches from yfinance/Gemini/database.
- **`api/`** — HTTP handlers. Validates via Pydantic, calls services, returns JSON. Zero business logic.

### Naming
- **Python:** `snake_case` functions/variables, `PascalCase` classes, `UPPER_CASE` constants
- **TypeScript:** `camelCase` functions/variables, `PascalCase` components/types

### Gemini Integration Pattern
All Gemini calls follow this pattern:
1. Build prompt with profile-specific context (currency, lot size, sector targets, yield bands)
2. Call `client.models.generate_content(model=get_settings().gemini_model, ...)`
3. Extract text via `_extract_text()` (handles thinking blocks)
4. Parse JSON via `_parse_json()` (handles markdown fences, truncation)
5. Fallback to rule-based logic on any error

### Constants
Market-specific values come from the active profile — not hardcoded. `KNOWN_SECTORS` in `constants.py` provides display labels for all recognized sectors. `ENTRY_SIGNAL_CONFIG` in frontend `constants.ts` defines badge colors.

## Feature Roadmap

- [x] **Phase 1** — Portfolio, watchlist, market data, dashboard, stock comparison
- [x] **Phase 2** — Allocate My Money, Gemini buy plans, income projections, profile settings
- [x] **Phase 2.5** — Dynamic watchlist, stock discovery, entry point prediction
- [ ] **Phase 3** — News intelligence (Market Pulse), AI chat, dividend calendar
- [ ] **Phase 4** — Multi-region profiles (KRX Korea, SGX), brokerage cost modeling, PDF export
