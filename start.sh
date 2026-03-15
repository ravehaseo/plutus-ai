#!/bin/bash
# Plutus A.I - Daily startup
# Run this each time you want to use the app.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Plutus A.I - Starting up"
echo "============================"

# 1. Ensure Docker services are running
if ! docker-compose ps --services --filter "status=running" 2>/dev/null | grep -q db; then
  echo "Starting PostgreSQL and Redis..."
  docker-compose up -d
  until docker-compose exec -T db pg_isready -U plutus -q 2>/dev/null; do
    sleep 1
  done
  echo "Docker services running"
else
  echo "Docker services already running"
fi

# 2. Start backend
echo "Starting FastAPI backend on http://localhost:8000 ..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# 3. Start frontend
echo "Starting Next.js frontend on http://localhost:3000 ..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

echo ""
echo "============================"
echo "Plutus A.I is running!"
echo ""
echo "  Dashboard:  http://localhost:3000"
echo "  API docs:   http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop everything."
echo ""

# Handle shutdown
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Stopped. Docker services still running (use docker-compose stop to shut those down too)."
  exit 0
}

trap cleanup INT TERM

wait
