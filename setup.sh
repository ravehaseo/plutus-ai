#!/bin/bash
# Plutus A.I — First-time setup
# Run this ONCE after cloning the repo.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "⚡ Plutus A.I — First-Time Setup"
echo "================================="

# 1. Environment file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example"
  echo "  → Edit .env and add your GEMINI_API_KEY before using AI features"
else
  echo "✓ .env already exists — skipping"
fi

# 2. Start Docker services
echo ""
echo "Starting PostgreSQL and Redis..."
docker-compose up -d
echo "✓ Docker services running"

# Wait for Postgres to be ready
echo "Waiting for PostgreSQL to accept connections..."
until docker-compose exec -T db pg_isready -U plutus -q 2>/dev/null; do
  sleep 1
done
echo "✓ PostgreSQL ready"

# 3. Python virtual environment + dependencies
echo ""
echo "Setting up Python backend..."
cd backend

if [ ! -d .venv ]; then
  python3 -m venv .venv
  echo "✓ Created virtual environment"
fi

source .venv/bin/activate
pip install -q -r requirements.txt
echo "✓ Python dependencies installed"

# 4. Run database migrations
echo ""
echo "Running database migrations..."
alembic upgrade head
echo "✓ Database tables created"

# 5. Seed default data
echo ""
echo "Seeding default Bursa Malaysia profile..."
python -m app.seed
echo "✓ Database seeded"

cd "$SCRIPT_DIR"

# 6. Frontend dependencies
echo ""
echo "Setting up Next.js frontend..."
cd frontend
npm install
cd "$SCRIPT_DIR"
echo "✓ Frontend dependencies installed"

echo ""
echo "================================="
echo "⚡ Setup complete!"
echo ""
echo "To start the app, run: ./start.sh"
echo ""
