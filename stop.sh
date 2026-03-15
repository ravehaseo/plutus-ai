#!/bin/bash
# Plutus A.I — Stop everything (including Docker)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "⚡ Plutus A.I — Shutting down"
echo "=============================="

# Kill any running backend/frontend processes
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "✓ Backend stopped" || echo "  Backend not running"
pkill -f "next dev" 2>/dev/null && echo "✓ Frontend stopped" || echo "  Frontend not running"

# Stop Docker (data is preserved in the volume)
docker-compose stop
echo "✓ Docker services stopped"

echo ""
echo "All stopped. Your data is preserved — run ./start.sh to resume."
echo ""
