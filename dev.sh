#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=3001
FRONTEND_PORT=5173

cleanup() {
  echo
  echo "Shutting down dev servers..."
  pkill -P $$ || true
}
trap cleanup EXIT INT

echo "Starting backend on :$BACKEND_PORT..."
( cd "$ROOT/backend" && node index.js ) &

# wait for backend to come up
until curl -sSf "http://localhost:${BACKEND_PORT}/health" >/dev/null; do
  echo "  waiting for backend..."
  sleep 0.5
done
echo "Backend is up."

echo "Starting frontend (Vite) on :$FRONTEND_PORT..."
( cd "$ROOT/frontend" && pnpm dev --strictPort --port $FRONTEND_PORT ) &

echo "All set. Open http://localhost:${FRONTEND_PORT}"
wait
