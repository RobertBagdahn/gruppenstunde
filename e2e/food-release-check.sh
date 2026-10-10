#!/bin/sh
set -eu

repo_root=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
food_log=${TMPDIR:-/tmp}/inspi-food-e2e-vite.log

cd "$repo_root/e2e"
npm ci --quiet
npx playwright install chromium

cd "$repo_root/frontend-food"
./node_modules/.bin/vite --host 127.0.0.1 --strictPort >"$food_log" 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT HUP INT TERM

ready=0
attempt=0
while [ "$attempt" -lt 60 ]; do
  if curl -fsS http://127.0.0.1:5174/ >/dev/null; then
    ready=1
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  cat "$food_log"
  exit 1
fi

cd "$repo_root/e2e"
E2E_BASE_URL=http://127.0.0.1:5174 npx playwright test \
  --project=mocked tests/food-release-hardening.mocked.spec.ts
