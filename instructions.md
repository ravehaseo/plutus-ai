# Plutus A.I — Project Instructions

## Project Overview
**Project Name:** Plutus A.I (AI Dividend Advisor)
**Type:** Personal Finance Tool — local-only, single-user
**Core Logic:** The "RaveInvestment" strategy
**Target Market:** Bursa Malaysia (MYR) — Non-Shariah high-dividend yielders
**Primary Objective:** Answer one question every month: *"I have RM X — what should I buy to maximize my dividend income?"* — and project the path to RM 2,000+/month passive income over 10 years.

## What This App Does

1. You input how much money you can allocate this month
2. Plutus fetches live prices, compares dividend yields, checks for discounts, and evaluates today's market news via Gemini
3. It outputs a **concrete buy plan**: which stocks, how many lots, exact RM cost, and why
4. It shows the **before/after impact**: how the purchase changes your projected annual dividend income
5. It projects your **10-year income trajectory** with snowball compounding

This is a personal tool. No login, no subscriptions, no cloud hosting. Everything runs locally via Docker.

## Tech Stack

### Frontend
- **Framework:** Next.js 15+ (App Router) with TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui components
- **Charts:** Recharts or Tremor for projections, allocations, and income curves
- **Theme:** Dark mode with "Greek Gold" accent palette (`#FFD700`, `#1A1A1B`)

### Backend
- **Runtime:** Python 3.12+
- **Framework:** FastAPI with Pydantic v2 for validation
- **Task Queue:** Celery with Redis (periodic market data + news refresh)

### AI Engine
- **Model:** Google Gemini 2.0 Flash API
- **Search Grounding:** Gemini with Google Search grounding enabled — gives the model access to real-time Malaysian financial news without manual scraping
- **Role:** Gemini is the analytical brain. It receives your portfolio, market data, and live news context, then returns structured buy recommendations within RaveInvestment constraints.

### Market Data
- **Primary:** `yfinance` (Ticker suffix: `.KL` for Bursa Malaysia)
- **Fallback:** Alpha Vantage API
- **Refresh:** Daily close prices cached in Postgres; on-demand for intraday checks

### News Intelligence
- **Primary:** Gemini with Google Search grounding — queries like "latest Bursa Malaysia news affecting dividend stocks" return real-time results the model can reason over
- **Secondary:** RSS feeds from The Edge Malaysia, Bursa Malaysia announcements — displayed as headlines on the dashboard for your own reading
- **No manual scraping/NLP:** Gemini handles all sentiment analysis and impact assessment natively

### Database
- **PostgreSQL 16** via Docker container
- Single-user, no auth layer
- Stores: portfolio holdings, market cache, dividend history, news cache, chat history, preferences

### Infrastructure
- **Everything runs locally** via `docker-compose`
- Services: PostgreSQL, Redis, FastAPI backend, Next.js frontend
- One command startup: `docker-compose up`

## Architecture Principles
1. **Local-Only:** No cloud dependencies except Gemini API and yfinance. All data lives on your machine.
2. **Profile-Based:** No auth, but supports multiple profiles (e.g., "Royce — Bursa" and "Wife — KRX"). Each profile has its own holdings, watchlist, preferences, and strategy. Market-specific values (ticker suffix, lot size, currency, sector targets) are stored per profile, not hardcoded.
3. **API-First:** Backend as a standalone FastAPI service; frontend consumes REST + SSE APIs.
4. **Type Safety:** TypeScript on frontend, Pydantic on backend — no `any` types, no untyped dicts.
5. **Gemini as Brain:** Business intelligence (news analysis, stock comparison, buy recommendations) is delegated to Gemini with structured prompts. Your code handles data fetching, math, and presentation.
6. **Domain-Driven:** RaveInvestment math lives in `logic/`, data fetching in `services/`, HTTP in `api/`.
7. **Region-Ready:** All market-specific values (ticker suffix, lot size, currency, yield expectations, news grounding queries) come from the active profile's config — never from global constants. This allows the same app to serve Bursa Malaysia, KRX Korea, or any market by switching profiles.

## The "RaveInvestment" Logic Rules

Hard constraints the AI must follow when recommending stocks.

### Sector Balance
| Sector | Target Allocation | Examples |
|--------|------------------|----------|
| Banks | 40% | Maybank, CIMB, Public Bank |
| REITs | 30% | Sunway REIT, IGB REIT, Pavilion REIT |
| Sin Stocks | 20% | Heineken Malaysia, Carlsberg |
| Cash (War Chest) | 10% | Versa, money market funds |

### Stock Universe
A curated watchlist of Bursa Malaysia Non-Shariah dividend stocks that Plutus tracks. This is the pool from which all buy recommendations are drawn.

| Sector | Tickers (examples) |
|--------|-------------------|
| Banks | Maybank (1155.KL), CIMB (1023.KL), Public Bank (1295.KL), RHB (1066.KL), Hong Leong Bank (5819.KL) |
| REITs | Sunway REIT (5176.KL), IGB REIT (5227.KL), Pavilion REIT (5212.KL), KLCC REIT (5235SS.KL) |
| Sin Stocks | Heineken Malaysia (3255.KL), Carlsberg (2836.KL), BAT Malaysia (4162.KL) |

The watchlist is user-configurable — you can add or remove tickers.

### The "War/Fear" Multiplier
If a stock's current price is **>10% below its 52-week high**, flag it as a **"Sale Opportunity"** and bias recommendations toward accumulation — provided dividend yield and fundamentals remain intact.

### Yield Target
Prioritize stocks with an annual dividend yield between **5.0% – 8.0%**. Stocks below 4% or above 10% require explicit justification from Gemini (growth thesis or unsustainable payout risk).

### Lot Size
Bursa Malaysia minimum lot size is **100 shares**. All buy recommendations must be in whole lots.

### Snowball Reinvestment Formula

$$
\text{FutureValue} = P\left(1 + \frac{r}{n}\right)^{nt} + \text{PMT} \times \frac{\left(1 + \frac{r}{n}\right)^{nt} - 1}{\frac{r}{n}}
$$

| Variable | Meaning |
|----------|---------|
| P | Current portfolio value (RM) |
| PMT | Monthly top-up amount (RM) |
| r | Weighted average dividend yield (decimal) |
| n | Compounding frequency (12 for monthly reinvestment) |
| t | Time horizon (years) |

## Feature Requirements

### 1. "Allocate My Money" — The Primary Feature
This is the homepage. The main thing you use every month.

**Input:**
- "I have RM _____ to invest this month" (amount field)

**Processing:**
- Fetch latest prices for all stocks in the watchlist via yfinance
- Calculate current dividend yield per stock
- Check 52-week high/low for War/Fear discounts
- Check current portfolio sector balance vs. 40/30/20/10 target
- Send portfolio + market data + news context to Gemini with the prompt: *"Given this portfolio, these prices, and today's market news, how should RM X be allocated across dividend stocks to maximize yield while maintaining sector balance?"*

**Output — The Buy Plan:**
- A table of recommended purchases:
  | Stock | Sector | Price | Lots | Cost (RM) | Yield | Reasoning |
  |-------|--------|-------|------|-----------|-------|-----------|
  | Maybank | Bank | 9.50 | 2 | 1,900 | 6.2% | Underweight in banks, strong Q4 results |
  | Sunway REIT | REIT | 1.58 | 1 | 158 | 5.8% | Sale Opportunity (12% below 52w high) |
- Remainder allocated to War Chest
- Gemini's reasoning for each pick (1-2 sentences)

**Output — Impact Preview:**
- Before: Annual dividend RM 3,200 → After: RM 3,850 (+RM 650)
- Before: Monthly income RM 267 → After: RM 321
- Sector balance before/after bar chart

**Output — 10-Year Projection:**
- Year-by-year table assuming continued monthly top-ups at the same rate:
  | Year | Portfolio Value | Annual Dividend | Monthly Income |
  |------|----------------|-----------------|----------------|
  | Now | RM 52,000 | RM 3,850 | RM 321 |
  | 1 | RM 78,400 | RM 5,200 | RM 433 |
  | 3 | RM 142,000 | RM 9,800 | RM 817 |
  | 5 | RM 218,000 | RM 15,600 | RM 1,300 |
  | 10 | RM 412,000 | RM 29,400 | RM 2,450 |
- Three scenario lines: conservative (4%), base (5.5%), optimistic (7%)

**Confirm Purchase — Closing the Loop:**

After you review the buy plan and execute the trades in your brokerage:
1. Click **"I Bought This"** on the buy plan
2. Plutus adds the purchased shares to your `holdings` table (updates share count and recalculates avg buy price if you already hold that stock)
3. Deducts any War Chest usage
4. Marks the allocation as `executed` in `allocation_history`
5. All dashboard values immediately update: portfolio value, sector pie, monthly income, 10-year projection
6. Next time you run "Allocate My Money", Gemini sees the **updated** portfolio — recommendations always build on your actual cumulative position

You can also partially confirm (e.g., "I bought the Maybank but skipped Sunway REIT") — the system updates only the confirmed items.

### 2. Stock Comparison Table
A live-updating table of all stocks in the watchlist:

| Stock | Price | Div Yield | 52w High | Discount | Cost/Lot | Div/Lot/Year | Sector |
|-------|-------|-----------|----------|----------|----------|--------------|--------|
| Maybank | 9.50 | 6.2% | 10.20 | -6.9% | RM 950 | RM 58.90 | Bank |
| Heineken | 23.40 | 5.1% | 27.80 | -15.8% ⚡ | RM 2,340 | RM 119.34 | Sin |

Key columns:
- **Cost per lot**: how much RM for 100 shares
- **Dividend per lot per year**: the actual RM income one lot generates annually
- **Discount**: percentage below 52-week high, flagged with ⚡ when >10% (Sale Opportunity)
- Sortable by yield, discount, cost per lot, or dividend per lot

### 3. Market Pulse — News Intelligence
A dashboard panel powered by Gemini with search grounding:
- **Headline Feed:** Latest Malaysian financial news from RSS (The Edge, Bursa announcements)
- **AI Market Summary:** Gemini-generated daily briefing: "Here's what's happening today and how it affects dividend stocks"
- **Stock Impact Flags:** If news affects a stock in your watchlist, flag it: "Bank Negara holds OPR → positive for bank dividend stocks"
- Refreshed on app load and on-demand via button

### 4. "Best Move Now" Widget
A persistent card at the top of the dashboard:
- Gemini analyzes: your current portfolio, sector balance gaps, War Chest level, today's news, and current prices
- Outputs one clear recommendation: *"Your best move right now: Buy 2 lots of CIMB at RM 6.20 — your bank allocation is 8% below target and CIMB is on a 14% discount with dividend yield at 6.5%."*
- Updates when market data or news refreshes

### 5. Portfolio Dashboard
- Holdings table: stock, shares, avg buy price, current price, P&L, yield, sector
- Sector allocation pie chart with target overlay (actual vs. 40/30/20/10)
- War Chest status bar (current vs. target RM 7,000)
- Total portfolio value, weighted average yield, projected monthly income

### 6. Dividend Calendar
- 12-month grid showing which months are "Payday" per stock
- Based on historical ex-dates from yfinance
- Highlight income gaps (months with no expected dividends)
- Annual dividend total: projected vs. actual received

### 7. Income Goal Tracker
- Target: RM 2,000/month (configurable)
- Progress bar: current monthly income vs. target
- "Years to goal" metric based on current top-up rate and yield
- Milestone markers: "You'll hit RM 500/month by June 2027"

### 8. AI Chat Advisor
- Conversational interface with Gemini (streaming responses via SSE)
- Context-aware: knows your portfolio, watchlist, and today's market data
- Example questions:
  - "Should I buy more Maybank at this price?"
  - "Which stock gives the best dividend per RM spent right now?"
  - "When is the next CIMB ex-date?"
  - "How do I rebalance to hit my sector targets?"
- Tone: supportive, data-driven, skeptical of hype, celebrates discounts

### 9. War Chest Tracker
- Current uninvested cash (default: RM 7,000 in Versa / money market)
- Opportunity cost display: "Your War Chest in Versa earns 3.5%, deploying it into Maybank would yield 6.2%"
- Alert when War Chest exceeds 15% of total portfolio

## Project Structure
```
plutus/
├── frontend/                        # Next.js 15+ application
│   ├── app/                        # App Router pages
│   │   ├── dashboard/              # Portfolio overview + Best Move + Market Pulse
│   │   ├── allocate/               # "Allocate My Money" — the primary feature
│   │   ├── compare/                # Stock comparison table
│   │   ├── calendar/               # Dividend calendar
│   │   ├── calculator/             # Income goal tracker + 10-year projection
│   │   ├── chat/                   # AI advisor chat
│   │   ├── profiles/               # Profile management (create, edit, switch)
│   │   └── api/                    # API route proxies to backend
│   ├── components/
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── portfolio/              # Holdings table, sector pie chart
│   │   ├── allocate/               # Buy plan table, impact preview, projection chart
│   │   ├── compare/                # Stock comparison grid
│   │   ├── calendar/               # Monthly dividend grid
│   │   ├── calculator/             # Snowball projection chart, sliders
│   │   ├── news/                   # Market Pulse panel, headline feed
│   │   └── chat/                   # Chat interface components
│   ├── lib/
│   │   ├── api.ts                  # API client (fetch wrapper)
│   │   ├── constants.ts            # App-wide constants, theme tokens
│   │   ├── utils.ts                # Helpers
│   │   └── hooks/                  # Custom React hooks
│   ├── types/                      # TypeScript type definitions
│   └── styles/                     # Global styles
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entry point
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── profiles.py     # Profile CRUD + switcher
│   │   │       ├── allocate.py     # "Allocate My Money" endpoint
│   │   │       ├── portfolio.py    # Portfolio CRUD + confirm purchase
│   │   │       ├── market.py       # Market data + stock comparison
│   │   │       ├── news.py         # Market Pulse + RSS feed
│   │   │       ├── calculator.py   # Snowball projection
│   │   │       ├── calendar.py     # Dividend calendar
│   │   │       └── chat.py         # AI chat (streaming SSE)
│   │   ├── services/
│   │   │   ├── ai_advisor.py       # Gemini integration — all AI calls go through here
│   │   │   ├── market_fetcher.py   # yfinance data retrieval + caching
│   │   │   ├── news_service.py     # RSS ingestion + Gemini search grounding
│   │   │   ├── profile_service.py  # Profile management + config resolution
│   │   │   ├── portfolio_service.py # Portfolio analysis + sector balance + confirm purchase
│   │   │   ├── allocation_service.py # Buy plan generation logic
│   │   │   └── dividend_service.py # Dividend history + calendar
│   │   ├── logic/
│   │   │   ├── calculations.py     # Snowball formula, yield math, compound growth
│   │   │   ├── rebalancer.py       # Sector rebalance algorithm
│   │   │   ├── comparator.py       # Stock-to-stock value comparison (yield/lot, cost/lot)
│   │   │   └── war_fear.py         # 52-week discount detection
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── core/
│   │   │   ├── config.py           # Settings (env vars, API keys)
│   │   │   ├── constants.py        # Domain constants
│   │   │   └── exceptions.py       # Custom exception classes
│   │   └── utils/
│   ├── tests/                      # Pytest test suite
│   └── alembic/                    # Database migrations
├── docker-compose.yml              # Postgres + Redis + Backend + Frontend
├── .env.example                    # Environment variable template
├── instructions.md                 # This file
└── README.md                       # Setup and usage guide
```

## Database Schema

```sql
-- Investment profiles (one per market/person)
profiles (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,              -- e.g. "Royce — Bursa Malaysia"
  currency VARCHAR NOT NULL,          -- MYR, KRW, SGD, HKD
  currency_symbol VARCHAR NOT NULL,   -- RM, ₩, S$, HK$
  ticker_suffix VARCHAR NOT NULL,     -- .KL, .KS, .KQ, .SI
  lot_size INTEGER NOT NULL,          -- 100 (Bursa), 1 (KRX)
  yield_band_min DECIMAL(4,2) DEFAULT 5.00,
  yield_band_max DECIMAL(4,2) DEFAULT 8.00,
  war_fear_threshold DECIMAL(4,2) DEFAULT 10.00,
  sector_targets JSONB NOT NULL,      -- {"bank": 0.40, "reit": 0.30, ...}
  news_grounding_query VARCHAR,       -- "latest Bursa Malaysia dividend stock news"
  rss_feeds JSONB,                    -- {"the_edge": "https://...", "bursa": "https://..."}
  monthly_topup_default DECIMAL(10,2) DEFAULT 500.00,
  income_goal DECIMAL(10,2) DEFAULT 2000.00,
  war_chest_balance DECIMAL(10,2) DEFAULT 7000.00,
  war_chest_target DECIMAL(10,2) DEFAULT 7000.00,
  is_active BOOLEAN DEFAULT TRUE,     -- the currently selected profile
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Portfolio holdings (per profile)
holdings (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ticker VARCHAR NOT NULL,            -- e.g. "1155.KL" (Maybank)
  stock_name VARCHAR NOT NULL,
  sector VARCHAR NOT NULL,            -- bank, reit, sin_stock, cash
  shares INTEGER NOT NULL,
  avg_buy_price DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, ticker)
)

-- Stock watchlist per profile (the universe Plutus tracks)
watchlist (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ticker VARCHAR NOT NULL,
  stock_name VARCHAR NOT NULL,
  sector VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(profile_id, ticker)
)

-- Cached market data (refreshed daily)
market_cache (
  ticker VARCHAR PRIMARY KEY,
  stock_name VARCHAR,
  last_close DECIMAL(10,4),
  week_52_high DECIMAL(10,4),
  week_52_low DECIMAL(10,4),
  dividend_yield DECIMAL(6,4),
  annual_dividend DECIMAL(10,4),
  pe_ratio DECIMAL(10,2),
  market_cap BIGINT,
  cost_per_lot DECIMAL(10,2),        -- last_close * 100
  dividend_per_lot DECIMAL(10,2),    -- annual_dividend * 100
  war_fear_discount DECIMAL(6,4),    -- % below 52-week high
  is_sale_opportunity BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMP DEFAULT NOW()
)

-- Historical dividend events
dividend_history (
  id UUID PRIMARY KEY,
  ticker VARCHAR NOT NULL,
  ex_date DATE NOT NULL,
  payment_date DATE,
  amount_per_share DECIMAL(10,4),
  dividend_type VARCHAR,             -- interim, final, special
  UNIQUE(ticker, ex_date)
)

-- News cache (Gemini analysis + RSS headlines)
news_cache (
  id UUID PRIMARY KEY,
  source VARCHAR NOT NULL,           -- gemini_grounding, rss_edge, rss_bursa
  headline VARCHAR,
  summary TEXT,
  affected_tickers VARCHAR[],        -- tickers mentioned or impacted
  sentiment VARCHAR,                 -- positive, negative, neutral
  ai_analysis TEXT,                  -- Gemini's impact assessment
  published_at TIMESTAMP,
  fetched_at TIMESTAMP DEFAULT NOW()
)

-- Chat conversation history (per profile)
chat_messages (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL,             -- user, assistant
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Allocation history / past buy plans (per profile)
allocation_history (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2),
  plan JSONB,                        -- the full buy plan as structured data
  projected_annual_dividend_before DECIMAL(10,2),
  projected_annual_dividend_after DECIMAL(10,2),
  executed BOOLEAN DEFAULT FALSE,    -- did the user actually buy?
  executed_items JSONB,              -- which items were confirmed (for partial confirms)
  created_at TIMESTAMP DEFAULT NOW()
)
```

## Coding Standards

### Code Quality
- **SOLID Principles:** Single Responsibility — one service per domain concept
- **DRY:** Extract reusable logic into `logic/` and `utils/`
- **KISS:** Readable over clever; financial accuracy matters more than elegance
- **YAGNI:** Build for the current feature set, not hypothetical future ones

### Naming Conventions
- **Python:** `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_CASE` for constants
- **TypeScript:** `camelCase` for functions/variables, `PascalCase` for components/types, `UPPER_CASE` for constants
- **Booleans:** `is_`, `has_`, `can_`, `should_` prefixes
- **Functions:** Verbs — `calculate_snowball`, `fetch_dividends`, `detect_war_discount`, `generate_buy_plan`

### Code Organization
- **`logic/`** — Pure math and algorithms (snowball, rebalancer, comparator, war/fear). No I/O, no database, no API calls. Fully unit-testable.
- **`services/`** — Orchestration layer. Calls `logic/` functions, fetches data from yfinance/Gemini/database, returns results.
- **`api/`** — HTTP handlers. Validates input via Pydantic, calls services, returns JSON responses. Zero business logic.

### Constants

Market-specific values (sector targets, yield bands, lot size, currency, ticker suffix, RSS feeds) are **not** global constants — they come from the active `profiles` row. Only truly universal values live in constants files.

```python
# backend/app/core/constants.py

# Universal defaults (used when seeding a new profile)
COMPOUNDING_FREQUENCY = 12

DEFAULT_BURSA_PROFILE = {
    "name": "Bursa Malaysia",
    "currency": "MYR",
    "currency_symbol": "RM",
    "ticker_suffix": ".KL",
    "lot_size": 100,
    "yield_band_min": 5.0,
    "yield_band_max": 8.0,
    "war_fear_threshold": 10.0,
    "sector_targets": {"bank": 0.40, "reit": 0.30, "sin_stock": 0.20, "cash": 0.10},
    "news_grounding_query": "latest Bursa Malaysia news affecting dividend stocks",
    "rss_feeds": {
        "the_edge": "https://theedgemalaysia.com/rss",
        "bursa": "https://www.bursamalaysia.com/rss/announcements",
    },
    "income_goal": 2000.00,
    "war_chest_target": 7000.00,
}

DEFAULT_KRX_PROFILE = {
    "name": "KRX Korea",
    "currency": "KRW",
    "currency_symbol": "₩",
    "ticker_suffix": ".KS",
    "lot_size": 1,
    "yield_band_min": 3.0,
    "yield_band_max": 6.0,
    "war_fear_threshold": 10.0,
    "sector_targets": {"financials": 0.35, "telecom": 0.25, "industrials": 0.25, "cash": 0.15},
    "news_grounding_query": "latest KOSPI KRX news affecting dividend stocks Korea",
    "rss_feeds": {},
    "income_goal": 500000.00,
    "war_chest_target": 2000000.00,
}
```

```typescript
// frontend/lib/constants.ts
// Theme is universal — not market-specific
export const THEME = {
  gold: '#FFD700',
  background: '#1A1A1B',
  surface: '#2A2A2B',
  textPrimary: '#FAFAFA',
  textSecondary: '#A0A0A0',
  positive: '#22C55E',
  negative: '#EF4444',
  saleOpportunity: '#F59E0B',
} as const;

// Market-specific values (sector targets, currency, lot size, etc.)
// are fetched from the active profile via API — never hardcoded here.
```

### Security
- **No credentials storage:** No bank passwords, brokerage tokens, or payment info
- **Manual entry only:** Share counts and buy prices are user-entered
- **API keys in `.env`:** Never committed; `.env.example` as template
- **Input validation:** Pydantic schemas on all endpoints; sanitize ticker symbols
- **Price verification:** Always verify against latest close before any buy suggestion

### Error Handling
```python
# backend/app/core/exceptions.py
class PlutusError(Exception):
    """Base exception for all Plutus operations."""

class MarketDataError(PlutusError):
    """yfinance or Alpha Vantage fetch failed."""

class InvalidTickerError(PlutusError):
    """Ticker not found or delisted."""

class InsufficientFundsError(PlutusError):
    """Allocation amount too small to buy any lots."""

class NewsUnavailableError(PlutusError):
    """Gemini search grounding or RSS feed unreachable."""
```

### Design Patterns
- **Strategy Pattern:** Swappable market data providers (yfinance → Alpha Vantage)
- **Service Layer:** `AllocationService`, `PortfolioService`, `DividendService`, `NewsService`, `AIAdvisorService`
- **Repository Pattern:** Abstract DB access for holdings, watchlist, market cache
- **Factory Pattern:** Constructing Gemini prompts with varying context depth

### Code Style
- No over-commenting; let the math speak
- No template-like boilerplate
- Use `yfinance` directly — don't over-abstract
- Handle partial data gracefully (missing dividends, delisted tickers, API timeouts)

## AI Integration

### Gemini System Prompt

The system prompt is **templated** with values from the active profile. Variables like `{currency}`, `{lot_size}`, `{sector_targets}`, and `{market_name}` are injected at runtime.

```
You are Plutus, a personal AI dividend investment advisor for the {market_name} stock market.

You MUST follow the investment strategy for this profile:
- Target allocation: {sector_targets_formatted}
- Only recommend stocks yielding {yield_band_min}%–{yield_band_max}% annually
- Flag any stock trading >{war_fear_threshold}% below its 52-week high as a "Sale Opportunity"
- All purchases must be in whole lots of {lot_size} shares
- Use {currency} ({currency_symbol}) for all amounts
{additional_rules}

You have access to real-time market news via Google Search. Use it to:
- Identify news that impacts dividend stocks in the portfolio or watchlist
- Assess whether news changes the buy/hold thesis for specific stocks
- Flag macro events (interest rate changes, government policy, sector regulation)

When recommending a buy plan:
1. Compare all watchlist stocks by: dividend yield, cost per lot, dividend per lot per year, and War/Fear discount
2. Prioritize stocks that bring the portfolio closer to the sector targets
3. Maximize dividend income per {currency_symbol} invested
4. Return a structured JSON buy plan with reasoning for each pick

Your tone: supportive, data-driven, direct. You are skeptical of unverified news and hype.
You celebrate "discount" opportunities during market fear. You never recommend speculative
or penny stocks. You always verify against the latest closing price.
```

For the default Bursa Malaysia profile, `{additional_rules}` includes:
```
- Non-Shariah stocks (including breweries and tobacco) are acceptable and encouraged
```

### Gemini Usage Patterns
- **Allocation Analysis:** Portfolio + market data + news context → structured JSON buy plan
- **Best Move Now:** Portfolio + prices + news → single top recommendation
- **Market Pulse:** Search grounding query → daily news summary + stock impact assessment
- **Chat:** Conversational Q&A with portfolio context injected per message
- **Streaming:** All chat responses via SSE for low perceived latency

### Cost Control
- Cache Gemini responses keyed on portfolio hash + date (same portfolio on same day = cached)
- Batch market data context (one prompt with all stocks, not per-stock calls)
- RSS headlines are free; only call Gemini for analysis
- Log token usage per call for monitoring

## UI/UX Guidelines

### Design System
- **Theme:** Dark mode — background `#1A1A1B`, surface `#2A2A2B`
- **Accent:** Greek Gold `#FFD700` for CTAs, highlights, positive returns
- **Sale Opportunity:** Amber `#F59E0B` for War/Fear discount badges
- **Typography:** Inter or Geist Sans; monospace (JetBrains Mono) for financial figures
- **Components:** shadcn/ui with Tailwind v4 — 4px spacing grid
- **Charts:** Gold/amber for gains, muted red for losses, gray for neutral

### Page Layout

**Global: Profile Switcher**
- Dropdown in the top navigation bar: "Royce — Bursa Malaysia ▼"
- Switch between profiles — all dashboard data, watchlist, holdings, and AI context update accordingly
- "Create New Profile" option opens a setup wizard (name, market, currency, sector targets)

**1. Dashboard (Home)**
- "Best Move Now" card at top — gold-accented, one clear recommendation
- Market Pulse panel — latest news headlines + AI summary
- Portfolio stats row: total value, weighted yield, monthly income, years to goal
- Sector allocation pie chart (actual vs. target)
- War Chest status bar

**2. Allocate My Money (Primary Feature)**
- Large input field: "I have {currency_symbol} _____ to invest"
- "Generate Buy Plan" button → loading state → results
- Buy Plan table with per-stock reasoning
- Impact Preview: before/after annual dividend, monthly income
- 10-Year Projection table with 3 scenario lines
- **"I Bought This" button** — confirms the purchase, updates holdings and all projections
- Partial confirm: checkboxes per stock in the plan to confirm only what you actually bought

**3. Stock Comparison**
- Full watchlist table: price, yield, cost/lot, dividend/lot/year, 52w discount
- Sortable columns, Sale Opportunity badges
- Click stock → detail view with dividend history chart

**4. Dividend Calendar**
- 12-month grid, per-stock payout schedule
- Income gap warnings
- Annual total: projected vs. actual

**5. Income Goal Tracker**
- Progress bar: current monthly income → RM 2,000 target
- "Years to goal" headline metric
- Year-by-year projection table
- Milestone markers on timeline

**6. AI Chat**
- Streaming chat interface
- Portfolio context sidebar
- Quick-action buttons: "Best buys now", "Rebalance advice", "Dividend forecast"

### UX Patterns
- **Loading:** Skeleton screens during market data fetch
- **Errors:** Clear messages with retry buttons (especially for yfinance/Gemini timeouts)
- **Desktop-first:** Optimized for 1440px+ width, functional on tablet/mobile
- **Contrast:** WCAG 2.1 AA — gold on dark background needs careful contrast ratios

## Environment Variables
```bash
# Database
DATABASE_URL=postgresql://plutus:plutus@localhost:5432/plutus

# Redis (task queue + caching)
REDIS_URL=redis://localhost:6379/0

# AI
GEMINI_API_KEY=your-gemini-api-key

# Market Data (fallback)
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Development Workflow

### Local Setup
1. Clone repository
2. Copy `.env.example` → `.env` and fill in API keys
3. Run `docker-compose up -d` — starts Postgres, Redis, backend, frontend
4. Run migrations: `docker-compose exec backend alembic upgrade head`
5. Seed default profile + watchlist: `docker-compose exec backend python -m app.seed` (creates the Bursa Malaysia profile with RaveInvestment defaults)
6. Open `http://localhost:3000`

### Docker Compose Services
```yaml
services:
  db:       # PostgreSQL 16
  redis:    # Redis 7 (task queue + cache)
  backend:  # FastAPI (uvicorn, hot-reload in dev)
  frontend: # Next.js (npm run dev)
```

### Git Workflow
- Main branch: stable
- Feature branches: `feature/allocate-my-money`, `feature/market-pulse`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`

## Testing Strategy
- **Unit Tests (`logic/`):** Snowball formula, rebalancer, comparator, war/fear detection — test against hand-calculated expected values
- **Integration Tests (`services/`):** Market data fetch mocking, AI prompt construction, portfolio CRUD
- **E2E:** Add holdings → allocate money → see buy plan → check projection
- **Target Coverage:** 90%+ for `logic/`, 70%+ for `services/`
- **Financial Accuracy:** Every calculation function tested against a manual spreadsheet

## Feature Priorities

### Phase 1 — Core (Weeks 1–2)
- [ ] Docker Compose setup (Postgres + Redis + FastAPI + Next.js)
- [ ] Portfolio input (manual entry + CSV import)
- [ ] Stock watchlist with configurable tickers
- [ ] Market data fetching via yfinance
- [ ] Stock comparison table (price, yield, cost/lot, div/lot, discount)
- [ ] Basic dashboard with holdings table and sector pie
- [ ] Dark mode UI with gold accents

### Phase 2 — The Brain (Weeks 3–4)
- [ ] "Allocate My Money" feature — the primary workflow
- [ ] Gemini 2.0 Flash integration for buy plan generation
- [ ] Impact preview (before/after dividend income)
- [ ] 10-year projection table with 3 scenarios
- [ ] War/Fear discount detection and Sale Opportunity badges
- [ ] Income goal tracker with progress bar

### Phase 3 — Intelligence (Weeks 5–6)
- [ ] Market Pulse — Gemini search grounding for news analysis
- [ ] "Best Move Now" widget on dashboard
- [ ] RSS feed display (The Edge, Bursa announcements)
- [ ] Dividend calendar from historical ex-dates
- [ ] AI Chat advisor with streaming responses
- [ ] Allocation history (past buy plans)

### Phase 4 — Polish & Multi-Region
- [ ] War Chest tracker with opportunity cost analysis
- [ ] Sector rebalance advisor with specific trade suggestions
- [ ] Chat conversation history persistence
- [ ] Export portfolio report as PDF
- [ ] Brokerage cost modeling (stamp duty, clearing fees)
- [ ] Mobile-responsive refinements
- [ ] Profile management UI (create / edit / switch profiles)
- [ ] KRX Korea profile template (₩, .KS suffix, 1-share lots, Korean sector targets)
- [ ] Additional market templates: SGX Singapore, HKEX Hong Kong

## Multi-Region Support

The app is designed from day one to support multiple stock markets via the **profiles** system. Each profile encapsulates all market-specific configuration:

| Config | Bursa Malaysia (default) | KRX Korea | SGX Singapore |
|--------|-------------------------|-----------|---------------|
| Ticker suffix | `.KL` | `.KS` / `.KQ` | `.SI` |
| Currency | MYR (RM) | KRW (₩) | SGD (S$) |
| Lot size | 100 shares | 1 share | 100 shares |
| Yield expectations | 5–8% | 3–6% | 4–7% |
| Sector targets | 40/30/20/10 | Customizable | Customizable |
| News grounding | Bursa Malaysia news | KOSPI/KRX news | SGX/Straits Times news |
| Non-Shariah focus | Yes | N/A | N/A |

**How it works:**
- On first launch, the app seeds the default Bursa Malaysia profile with the RaveInvestment strategy
- You can create additional profiles from the Profiles page (or from pre-built templates like KRX Korea)
- Switch profiles via the dropdown in the top nav — all data (holdings, watchlist, projections, chat) switches with it
- The Gemini system prompt is re-templated per profile — it automatically adjusts currency, lot sizes, sector targets, and news queries
- Market data fetching uses the profile's `ticker_suffix` to query yfinance correctly
- The snowball formula, war/fear detection, and rebalancer logic are currency-agnostic — they work with any numeric inputs

**What stays the same across all profiles:**
- The snowball compounding math
- War/Fear discount detection (parameterized by profile's threshold)
- The "Allocate My Money" workflow
- AI chat with portfolio context
- Dividend calendar logic
- The UI theme and layout

**What changes per profile:**
- Stock universe (watchlist)
- Holdings and allocation history
- Currency formatting and lot size calculations
- Sector categories and target percentages
- Gemini prompt context (market name, rules, news queries)
- Yield band expectations
- RSS feed sources

## Performance Targets
- **Page Load:** < 2 seconds
- **Market Data Refresh:** < 3 seconds for full watchlist (parallel yfinance calls)
- **Buy Plan Generation:** < 5 seconds (Gemini call + market data)
- **Snowball Calculation:** < 100ms (client-side math)
- **AI Chat First Token:** < 1 second (SSE streaming)
- **Database Queries:** < 50ms with indexes

## AI Assistant Guidelines

When helping build Plutus:
- **Financial Accuracy First:** Double-check all compound interest and yield math. Verify against manual calculations.
- **RaveInvestment Rules Are Law:** Never suggest allocations that violate 40/30/20/10 without explicit override.
- **"Allocate My Money" Is the Core Feature:** Everything else supports this workflow. Build it first, build it right.
- **Gemini Is the Brain:** Don't rebuild what Gemini can do. Feed it structured data, get structured recommendations.
- **Cost per Lot Matters:** Users think in lots and RM, not share prices. Always show cost/lot and dividend/lot.
- **Natural Code Style:** Senior engineer code — no over-commenting, no boilerplate, no AI-generated patterns.
- **Domain Knowledge:** Bursa lot sizes (100), `.KL` suffix, MYR denomination, ex-date patterns, Non-Shariah focus.
- **Test the Math:** Every formula in `logic/` must have tests with known expected outputs.

## Code Review Checklist

Before committing:
- [ ] Financial calculations verified against manual computation
- [ ] No hardcoded API keys or secrets
- [ ] Pydantic schemas validate all API inputs
- [ ] Error handling for yfinance/Gemini timeouts
- [ ] Constants in `constants.py` / `constants.ts` (no magic numbers)
- [ ] TypeScript types for all API responses
- [ ] RaveInvestment rules enforced (sector balance, yield band, lot sizes)
- [ ] Tests for `logic/` layer functions
- [ ] UI follows dark mode + gold accent theme
- [ ] Buy recommendations always show cost/lot and dividend/lot
- [ ] Code reads naturally — no template patterns or redundant comments
