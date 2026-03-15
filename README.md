# Plutus A.I

Personal AI-powered dividend investment advisor built for Bursa Malaysia. Helps you decide what to buy each month, tracks your portfolio, and projects your path to passive income.

## What It Does

1. **You input** how much money you can allocate this month
2. **Plutus fetches** live stock prices, compares dividend yields, checks for discounts, and reads today's market news via Gemini
3. **You get** a concrete buy plan — which stocks, how many lots, exact cost, and why
4. **You see** how the purchase changes your projected annual dividend income
5. **You track** your 10-year income trajectory with snowball compounding

## Key Features

- **Allocate My Money** — Input your budget, get an AI-generated buy plan optimized for dividend yield and sector balance
- **Stock Comparison** — Live watchlist table sortable by yield, cost per lot, dividend per lot, and 52-week discount
- **War/Fear Detection** — Stocks trading >10% below their 52-week high are flagged as "Sale Opportunities"
- **Portfolio Dashboard** — Holdings, P&L, sector allocation vs targets, war chest tracker
- **Dividend Calendar** — Monthly view of expected payouts based on historical ex-dates
- **AI Chat Advisor** — Conversational Gemini-powered advisor that knows your portfolio
- **Income Goal Tracker** — Progress toward your monthly passive income target with year-by-year projections
- **Multi-Region Ready** — Profile-based architecture supports Bursa Malaysia, KRX Korea, or any market

## The RaveInvestment Strategy

| Sector | Target Allocation | Examples |
|--------|------------------|----------|
| Banks | 40% | Maybank, CIMB, Public Bank |
| REITs | 30% | Sunway REIT, IGB REIT, Pavilion REIT |
| Sin Stocks | 20% | Heineken Malaysia, Carlsberg |
| Cash (War Chest) | 10% | Versa, money market funds |

- Yield target: **5.0% – 8.0%** annually
- Buy in whole lots of **100 shares** (Bursa standard)
- Snowball compounding with monthly dividend reinvestment + top-ups

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Recharts |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0 (async) |
| AI | Google Gemini 2.0 Flash with Search Grounding |
| Market Data | yfinance (`.KL` tickers for Bursa Malaysia) |
| Database | PostgreSQL 16 (Docker) |
| Cache | Redis 7 (Docker) |

## Quick Start

### First-Time Setup

```bash
./setup.sh
```

This creates the `.env` file, starts Docker (Postgres + Redis), installs Python and Node dependencies, runs database migrations, and seeds the default Bursa Malaysia profile with 11 watchlist stocks.

Before running, make sure you have:
- Docker Desktop running
- Python 3.12+
- Node.js 18+

### Daily Usage

```bash
./start.sh
```

Opens the app at [http://localhost:3000](http://localhost:3000) with the API at [http://localhost:8000/docs](http://localhost:8000/docs).

Press `Ctrl+C` to stop the backend and frontend. Docker stays running.

### Full Shutdown

```bash
./stop.sh
```

Stops everything including Docker. Your data is preserved.

### Manual Setup

If you prefer running things manually:

```bash
# Start infrastructure
docker-compose up -d

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql+asyncpg://plutus:plutus@localhost:5432/plutus
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your-gemini-api-key
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
```

The Gemini API key is only needed for Phase 2+ features (AI chat, buy plan generation, news analysis).

## Project Structure

```
plutus-ai/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # FastAPI route handlers
│   │   ├── core/            # Config, constants, database, exceptions
│   │   ├── logic/           # Pure math (snowball, war/fear, comparator)
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic (market fetcher, portfolio)
│   │   └── seed.py          # Database seeder
│   ├── alembic/             # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── app/                 # Next.js pages (dashboard, compare, etc.)
│   ├── components/          # React components
│   ├── lib/                 # API client, utils, constants
│   └── types/               # TypeScript interfaces
├── docker-compose.yml
├── setup.sh                 # First-time setup
├── start.sh                 # Daily startup
└── stop.sh                  # Full shutdown
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profiles` | List all profiles |
| GET | `/api/v1/profiles/active` | Get active profile |
| POST | `/api/v1/profiles/{id}/activate` | Switch profile |
| GET | `/api/v1/portfolio` | List holdings with live prices |
| GET | `/api/v1/portfolio/summary` | Portfolio stats, sector balance, income projection |
| POST | `/api/v1/portfolio` | Add a holding |
| PUT | `/api/v1/portfolio/{id}` | Update shares or buy price |
| DELETE | `/api/v1/portfolio/{id}` | Remove a holding |
| POST | `/api/v1/portfolio/import` | Import holdings from CSV |
| GET | `/api/v1/market/watchlist` | Stock comparison data (cached) |
| POST | `/api/v1/market/refresh` | Force refresh market prices |

Full interactive docs available at `http://localhost:8000/docs` when running.

## Roadmap

- [x] **Phase 1** — Portfolio, watchlist, market data, dashboard, stock comparison
- [ ] **Phase 2** — "Allocate My Money" with Gemini buy plans, income projections
- [ ] **Phase 3** — News intelligence, AI chat, dividend calendar
- [ ] **Phase 4** — Multi-region profiles (KRX Korea, SGX), brokerage cost modeling

## License

Private — personal use only.
