#!/bin/sh
# Regenerates the UI baselines (projects ui-mobile and ui-desktop) inside the pinned Playwright
# image, so that the references do not depend on the developer's machine (food-ui-quality-gates).
# The production build is served with `vite preview` (a dev server reading the bind mount is too slow).
# Dependencies live in named volumes; the host's node_modules stay untouched.
# Usage: sh e2e/update-ui-baselines.sh   (needs podman; run it twice and compare the PNGs)
set -eu

repo_root=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
image=mcr.microsoft.com/playwright:v1.61.1-noble

podman run --rm \
  -v "$repo_root/frontend-food:/work/frontend-food" \
  -v "$repo_root/e2e:/work/e2e" \
  -v inspi-food-node-modules:/work/frontend-food/node_modules \
  -v inspi-e2e-node-modules:/work/e2e/node_modules \
  -w /work \
  -e CI=1 \
  -e HOME=/tmp \
  "$image" \
  sh -c '
    set -eu
    cd /work/frontend-food && npm ci --quiet
    cd /work/e2e && npm ci --quiet
    cd /work/frontend-food && ./node_modules/.bin/vite build >/tmp/vite-build.log 2>&1
    cd /work/frontend-food && ./node_modules/.bin/vite preview --host 127.0.0.1 --strictPort --port 5174 >/tmp/vite.log 2>&1 &
    node -e "
      const started = Date.now();
      (async function wait() {
        try { await fetch(\"http://127.0.0.1:5174/\"); }
        catch { if (Date.now() - started > 90000) process.exit(1); setTimeout(wait, 1000); }
      })();
    "
    cd /work/e2e && E2E_BASE_URL=http://127.0.0.1:5174 npx playwright test --project=ui-mobile --project=ui-desktop --update-snapshots
  '
