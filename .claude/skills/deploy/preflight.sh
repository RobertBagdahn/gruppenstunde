#!/usr/bin/env bash
# Preflight before a manual deploy (see SKILL.md, "Phase 0"). Read-only: gh, git and gcloud queries only.
# Exit 0 = no findings, 10 = findings (ask the user to confirm before deploying), 2 = a check could not run.
#
#   preflight.sh [--ref <rev>] [--scaling] [--max-age-minutes N] [service ...]
#
# --ref      revision to be deployed (default HEAD)
# --scaling  the change touches concurrency, instances or Gunicorn values
# services   Cloud Run services whose latest revisions are listed (default: inspi-backend inspi-frontend-food)
set -u

REF=HEAD
SCALING=0
MAX_AGE_MIN=15
SERVICES=()
REGION=europe-west1
WORKFLOW=deploy.yml
SCALING_FILES=(.github/workflows/deploy.yml Dockerfile.backend terraform Makefile)

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) REF="$2"; shift 2 ;;
    --scaling) SCALING=1; shift ;;
    --max-age-minutes) MAX_AGE_MIN="$2"; shift 2 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) SERVICES+=("$1"); shift ;;
  esac
done
[ ${#SERVICES[@]} -eq 0 ] && SERVICES=(inspi-backend inspi-frontend-food)

findings=0
errors=0
finding() { findings=$((findings + 1)); echo "FINDING: $*"; }
failed() { errors=$((errors + 1)); echo "ERROR: $*"; }

echo "== 1. CI deploys of $WORKFLOW (a running deploy overwrites manual scaling and env values)"
for status in in_progress queued; do
  if ! runs=$(gh run list --workflow "$WORKFLOW" --status "$status" --json databaseId,headSha,createdAt,displayTitle \
      --jq '.[] | "\(.databaseId) \(.createdAt) \(.headSha[0:8]) \(.displayTitle)"' 2>&1); then
    failed "gh run list ($status): $runs"; continue
  fi
  [ -n "$runs" ] && while IFS= read -r line; do finding "CI deploy $status: $line"; done <<< "$runs"
done

echo "== 2. Deploy revision vs origin/main (the next CI deploy replaces anything that is not on main)"
if git fetch -q origin main 2>/dev/null; then
  head_sha=$(git rev-parse "$REF"); main_sha=$(git rev-parse origin/main)
  if [ "$head_sha" != "$main_sha" ]; then
    ahead=$(git rev-list --count "origin/main..$head_sha"); behind=$(git rev-list --count "$head_sha..origin/main")
    finding "$REF (${head_sha:0:8}) differs from origin/main (${main_sha:0:8}): $ahead ahead, $behind behind. Ship the fix through main so CI deploys it."
  fi
else
  failed "git fetch origin main failed"
fi

echo "== 3. Recent Cloud Run revisions (same account can mean another session)"
now=$(date -u +%s)
for service in "${SERVICES[@]}"; do
  if ! revs=$(gcloud run revisions list --service "$service" --region "$REGION" --limit 5 \
      --format="value(metadata.name,metadata.creationTimestamp,metadata.annotations.'serving.knative.dev/creator')" 2>&1); then
    failed "gcloud run revisions list $service: $revs"; continue
  fi
  while IFS=$'\t' read -r name created creator; do
    [ -z "$name" ] && continue
    created_s=$(python3 -c "import sys,datetime;print(int(datetime.datetime.fromisoformat(sys.argv[1].replace('Z','+00:00')).timestamp()))" "$created")
    age=$(( (now - created_s) / 60 ))
    echo "   $service $name  ${age} min ago  by $creator"
    [ "$age" -le "$MAX_AGE_MIN" ] && finding "$service revision $name is only $age min old (created by $creator)"
  done <<< "$revs"
done

echo "== 4. Scaling and Gunicorn values live in four files that must change together"
changed=()
if git rev-parse -q --verify origin/main >/dev/null; then
  for f in "${SCALING_FILES[@]}"; do
    git diff --name-only "origin/main...$REF" -- "$f" | grep -q . && changed+=("$f")
  done
fi
if [ ${#changed[@]} -gt 0 ] && [ ${#changed[@]} -lt ${#SCALING_FILES[@]} ]; then
  finding "only ${#changed[@]} of 4 scaling files changed (${changed[*]}); change .github/workflows/deploy.yml, Dockerfile.backend, terraform and Makefile together (backend/core/tests/test_runtime_limits.py enforces it)"
elif [ "$SCALING" -eq 1 ]; then
  finding "scaling change: update .github/workflows/deploy.yml, Dockerfile.backend, terraform and Makefile together (backend/core/tests/test_runtime_limits.py enforces it)"
fi

echo
if [ "$errors" -gt 0 ]; then echo "Preflight incomplete: $errors check(s) failed."; exit 2; fi
if [ "$findings" -gt 0 ]; then echo "Preflight: $findings finding(s). Confirm explicitly before deploying; the safe path is: fix to main, CI deploys."; exit 10; fi
echo "Preflight: no findings."
exit 0
