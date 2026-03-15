# Plutus A.I

Personal AI-powered dividend investment advisor built for Bursa Malaysia. Discovers high-dividend stocks across the entire market, tells you when to buy, and projects your path to passive income.

## What It Does

1. **Discovers stocks** — Gemini scans the entire Bursa Malaysia market for non-Shariah dividend stocks across all sectors
2. **You input** how much money you can allocate this month
3. **Plutus generates** a concrete buy plan — which stocks, how many lots, exact cost, entry signal, and why
4. **You see** the before/after impact on your projected annual dividend income
5. **You track** your 10-year income trajectory with snowball compounding

## Key Features

- **Stock Discovery** — Gemini finds high-dividend stocks across all sectors (banks, REITs, utilities, telecoms, etc.)
- **Watchlist Management** — Add stocks manually or via AI discovery, remove anytime
- **Allocate My Money** — Input your budget, get an AI-generated buy plan with entry point signals
- **Entry Point Prediction** — Each stock rated as Strong Buy / Buy / Hold / Wait based on price analysis
- **Stock Comparison** — Live table with yield, cost per lot, dividend per lot, 52-week discount, and entry signals
- **War/Fear Detection** — Stocks >10% below 52-week high flagged as "Sale Opportunities"
- **Portfolio Dashboard** — Holdings, P&L, sector allocation vs targets, war chest tracker
- **Income Goal Tracker** — Progress toward monthly passive income target with year-by-year projections
- **Profile Settings** — Configurable sector targets, yield bands, and AI-suggested allocations
- **Multi-Region Ready** — Profile-based architecture supports Bursa Malaysia, KRX Korea, or any market

## The RaveInvestment Strategy

| Sector | Default Target | Examples |
|--------|---------------|----------|
| Banks | 40% | Maybank, CIMB, Public Bank |
| REITs | 30% | Sunway REIT, IGB REIT, Pavilion REIT |
| Sin Stocks | 20% | Heineken Malaysia, Carlsberg |
| Cash (War Chest) | 10% | Money market funds |

Sector targets are configurable and expand dynamically as new sectors are discovered.

- Yield target: **5.0% – 8.0%** annually (configurable)
- Buy in whole lots of **100 shares** (Bursa standard)
- Snowball compounding with monthly dividend reinvestment + top-ups

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4 |
| Backend | Python 3.10+, FastAPI, SQLAlchemy 2.0 (async) |
| AI | Google Gemini (configurable model via `GEMINI_MODEL` env var) |
| Market Data | yfinance (`.KL` tickers for Bursa Malaysia) |
| Database | PostgreSQL 16 (Docker) |
| Cache | Redis 7 (Docker) |

## Quick Start

### First-Time Setup

```bash
./setup.sh
```

This creates the `.env` file, starts Docker (Postgres + Redis), installs Python and Node dependencies, runs database migrations, and seeds the default Bursa Malaysia profile with starter watchlist stocks.

Before running, make sure you have:
- Docker Desktop running
- Python 3.10+
- Node.js 18+

### Daily Usage

```bash
./start.sh
```

Opens the app at [http://localhost:3000](http://localhost:3000) with the API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

Press `Ctrl+C` to stop the backend and frontend. Docker stays running.

### Full Shutdown

```bash
./stop.sh
```

Stops everything including Docker. Your data is preserved.

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
DATABASE_URL=postgresql+asyncpg://plutus:plutus@localhost:5432/plutus
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash    # options: gemini-2.5-flash, gemini-2.0-flash, gemini-2.0-flash-lite
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Project Structure

```
plutus-ai/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # FastAPI routes (profiles, portfolio, market, allocate, watchlist)
│   │   ├── services/         # AI advisor, stock discovery, market fetcher, portfolio service
│   │   ├── logic/            # Pure math (snowball, war/fear, comparator)
│   │   ├── models/           # SQLAlchemy ORM (8 models)
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── core/             # Config, constants, database, exceptions
│   │   └── seed.py           # Database seeder
│   ├── alembic/              # Database migrations
│   ├── venv/                 # Python virtual environment
│   └── requirements.txt
├── frontend/
│   ├── app/                  # Pages: dashboard, watchlist, compare, allocate, calculator, profiles
│   ├── components/           # React components (layout, portfolio, allocate, compare)
│   ├── lib/                  # API client, utils, constants
│   └── types/                # TypeScript interfaces
├── docker-compose.yml
├── setup.sh / start.sh / stop.sh
└── instructions.md           # Full project specification
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profiles` | List all profiles |
| GET | `/api/v1/profiles/active` | Get active profile |
| PUT | `/api/v1/profiles/active` | Update profile settings |
| POST | `/api/v1/profiles/active/suggest-sectors` | AI sector suggestions |
| GET | `/api/v1/portfolio` | List holdings with live prices |
| GET | `/api/v1/portfolio/summary` | Portfolio stats + projections |
| POST | `/api/v1/portfolio` | Add a holding |
| GET | `/api/v1/market/watchlist` | Cached stock comparison data |
| POST | `/api/v1/market/refresh` | Refresh prices + entry signals |
| POST | `/api/v1/allocate` | Generate AI buy plan |
| POST | `/api/v1/allocate/{id}/confirm` | Confirm purchase |
| GET | `/api/v1/allocate/history` | Past allocation plans |
| GET | `/api/v1/watchlist` | List watchlist stocks |
| POST | `/api/v1/watchlist` | Add stock by ticker |
| DELETE | `/api/v1/watchlist/{id}` | Remove stock |
| POST | `/api/v1/watchlist/discover` | AI stock discovery |
| POST | `/api/v1/watchlist/discover/add` | Add discovered stocks |

Full interactive docs at `http://localhost:8000/docs` when running.

## License

Private — personal use only.
