#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/output"
LOG_DIR="$OUTPUT_DIR"
SCREENSHOT_DIR="$OUTPUT_DIR/screenshots"

BACKEND_PORT=8000
FRONTEND_PORT=5173
FOOD_FRONTEND_PORT=5174

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PIDS=()

cleanup() {
  echo ""
  echo -e "${YELLOW}Cleaning up servers...${NC}"
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait "${PIDS[@]:-}" 2>/dev/null || true
  echo -e "${GREEN}Servers stopped.${NC}"
}

trap cleanup EXIT INT TERM

mkdir -p "$LOG_DIR" "$SCREENSHOT_DIR"

# ─── Database Check ──────────────────────────────────────────────

echo -e "${YELLOW}Checking database...${NC}"

if ! podman compose ps --format '{{.Names}}' 2>/dev/null | grep -q 'db'; then
  echo "  Starting database container..."
  cd "$REPO_ROOT" && podman compose up -d db
  echo "  Waiting for PostgreSQL..."
  sleep 3
else
  echo "  Database container already running."
fi

cd "$REPO_ROOT/backend"
echo "  Running migrations..."
uv run python manage.py migrate --noinput > /dev/null 2>&1

echo "  Ensuring seed users exist..."
uv run python manage.py add_users --if-empty 2>&1

echo -e "${GREEN}Database ready.${NC}"

# ─── Start Servers ───────────────────────────────────────────────

kill_port() {
  local port="$1"
  if lsof -ti "tcp:$port" > /dev/null 2>&1; then
    echo "  Killing process on port $port..."
    lsof -ti "tcp:$port" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

kill_port "$BACKEND_PORT"
kill_port "$FRONTEND_PORT"
kill_port "$FOOD_FRONTEND_PORT"

echo -e "${YELLOW}Starting backend on port $BACKEND_PORT...${NC}"
cd "$REPO_ROOT/backend"
uv run python manage.py runserver "localhost:$BACKEND_PORT" \
  > "$LOG_DIR/backend.log" 2>&1 &
PIDS+=($!)

echo -e "${YELLOW}Starting main frontend on port $FRONTEND_PORT...${NC}"
cd "$REPO_ROOT/frontend"
npm run dev -- --port "$FRONTEND_PORT" --strictPort \
  > "$LOG_DIR/frontend.log" 2>&1 &
PIDS+=($!)

echo -e "${YELLOW}Starting food frontend on port $FOOD_FRONTEND_PORT...${NC}"
cd "$REPO_ROOT/frontend-food"
npm run dev -- --port "$FOOD_FRONTEND_PORT" --strictPort \
  > "$LOG_DIR/frontend-food.log" 2>&1 &
PIDS+=($!)

# ─── Health Checks ───────────────────────────────────────────────

wait_for_server() {
  local url="$1"
  local name="$2"
  local max_attempts=30
  local attempt=0

  while [ $attempt -lt $max_attempts ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null | grep -q '^[23]'; then
      echo "  $name ready."
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  echo -e "${RED}  ERROR: $name failed to start after ${max_attempts}s${NC}"
  return 1
}

echo -e "${YELLOW}Waiting for servers...${NC}"
wait_for_server "http://localhost:$BACKEND_PORT/api/auth/csrf/" "Backend" || exit 1
wait_for_server "http://localhost:$FRONTEND_PORT" "Frontend" || exit 1
wait_for_server "http://localhost:$FOOD_FRONTEND_PORT" "Food Frontend" || exit 1
echo -e "${GREEN}All servers healthy.${NC}"

# ─── Run Playwright Tests ────────────────────────────────────────

echo ""
echo -e "${YELLOW}Running Playwright smoke tests...${NC}"
echo ""

cd "$SCRIPT_DIR"

TEST_EXIT=0
npx playwright test || TEST_EXIT=$?

echo ""

# ─── Check Logs for Errors ───────────────────────────────────────

echo -e "${YELLOW}Checking server logs for errors...${NC}"
LOG_ERRORS=0

for logfile in "$LOG_DIR"/*.log; do
  if [ -f "$logfile" ]; then
    if grep -qinE "ERROR| 500 |Traceback|ECONNREFUSED|Unhandled exception" "$logfile" 2>/dev/null; then
      echo -e "${RED}  Errors found in $(basename "$logfile"):${NC}"
      grep -inE "ERROR| 500 |Traceback|ECONNREFUSED|Unhandled exception" "$logfile" 2>/dev/null | head -20
      LOG_ERRORS=$((LOG_ERRORS + 1))
    else
      echo -e "${GREEN}  $(basename "$logfile"): clean${NC}"
    fi
  fi
done

# ─── Summary ─────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════"
echo "  Smoke Test Results"
echo "═══════════════════════════════════════════"

if [ $TEST_EXIT -eq 0 ]; then
  echo -e "  Playwright:  ${GREEN}PASSED${NC}"
else
  echo -e "  Playwright:  ${RED}FAILED (exit $TEST_EXIT)${NC}"
fi

if [ $LOG_ERRORS -eq 0 ]; then
  echo -e "  Logs:        ${GREEN}CLEAN${NC}"
else
  echo -e "  Logs:        ${RED}ERRORS FOUND ($LOG_ERRORS files)${NC}"
fi

echo "  Screenshots: $SCREENSHOT_DIR"
echo "  Logs:        $LOG_DIR"
echo "═══════════════════════════════════════════"

if [ $TEST_EXIT -ne 0 ] || [ $LOG_ERRORS -ne 0 ]; then
  exit 1
fi

exit 0
