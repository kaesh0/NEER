#!/usr/bin/env bash
# ==============================================================================
# NEER Marine & Coastal Intelligence Platform — Single-Command Startup Script
#
# Starts all three tiers in the background, monitors their health,
# and terminates all child processes cleanly on exit (Ctrl+C).
# ==============================================================================

set -u

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# PIDs
PYTHON_PID=""
NODE_PID=""
FRONTEND_PID=""

# Cleanup on exit or interrupt
cleanup() {
  echo ""
  echo "[NEER] Shutting down all services..."
  if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
    kill "$NODE_PID" 2>/dev/null || true
  fi
  if [ -n "$PYTHON_PID" ] && kill -0 "$PYTHON_PID" 2>/dev/null; then
    kill "$PYTHON_PID" 2>/dev/null || true
  fi
  # Also clean up any lingering processes on ports 8000, 3001, 5173 started by this tree
  wait 2>/dev/null || true
  echo "[NEER] All services stopped cleanly."
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "=================================================================="
echo " Starting NEER Marine & Coastal Intelligence Platform"
echo "=================================================================="

# 1. Start Python AI Microservice via existing run_api.sh
# (Per architectural requirements: MUST use run_api.sh to preserve .venv python)
echo "[NEER] Launching Python AI Microservice on :8000..."
bash "$PROJECT_ROOT/NEER-main/run_api.sh" > /dev/null 2>&1 &
PYTHON_PID=$!

# 2. Start Node.js Backend Gateway
echo "[NEER] Launching Node Gateway & Auth on :3001..."
(cd "$PROJECT_ROOT/backend" && node index.js) > /dev/null 2>&1 &
NODE_PID=$!

# 3. Start Frontend Vite Dev Server
echo "[NEER] Launching Frontend Client on :5173..."
(cd "$PROJECT_ROOT/neerfd/frontend" && npm run dev) > /dev/null 2>&1 &
FRONTEND_PID=$!

# Function to poll an HTTP URL until it returns 200 OK or times out
wait_for_service() {
  local service_name="$1"
  local url="$2"
  local timeout="${3:-30}"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout" ]; do
    local status_code
    status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || true)
    if [ "$status_code" != "200" ] && [[ "$url" == *"127.0.0.1"* ]]; then
      local alt_url="${url//127.0.0.1/localhost}"
      status_code=$(curl -s -o /dev/null -w "%{http_code}" "$alt_url" 2>/dev/null || true)
    fi
    if [ "$status_code" = "200" ]; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  echo ""
  echo "[NEER] ❌ ERROR: $service_name failed to become healthy within ${timeout}s at $url" >&2
  return 1
}

# Verify health endpoints
echo "[NEER] Waiting for services to become healthy..."

if ! wait_for_service "Python AI Microservice" "http://127.0.0.1:8000/health" 30; then
  cleanup
  exit 1
fi
echo "[NEER] Python AI Microservice ready on http://localhost:8000"

if ! wait_for_service "Node Gateway" "http://127.0.0.1:3001/health" 30; then
  cleanup
  exit 1
fi
echo "[NEER] Node Gateway ready on http://localhost:3001"

if ! wait_for_service "Frontend" "http://127.0.0.1:5173/" 30; then
  cleanup
  exit 1
fi
echo "[NEER] Frontend ready on http://localhost:5173"

echo "=================================================================="
echo " [NEER] All services are online and healthy!"
echo " Web Application URL: http://localhost:5173"
echo " Press Ctrl+C to stop all services."
echo "=================================================================="

# Keep running until user presses Ctrl+C
wait
