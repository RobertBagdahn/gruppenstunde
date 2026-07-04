#!/usr/bin/env bash
# Apply local fixture files to the production database via Cloud SQL Proxy.
#
# Usage:
#   ./bin/apply_to_prod.sh                         # uses PROD_DB_PASSWORD env var
#   ./bin/apply_prod.sh <DB_PASSWORD>              # password as argument
#   ./bin/apply_prod.sh <PASSWORD> food            # only food fixtures
#
# Reads fixture files from backend/data/ and applies them to prod
# using loaddata --replace (upsert).

set -euo pipefail
cd "$(dirname "$0")/.."

PASSWORD="${1:-${PROD_DB_PASSWORD:-}}"
ONLY="${2:-}"

if [ -z "$PASSWORD" ]; then
    echo "Fehler: DB-Passwort benötigt. Setze PROD_DB_PASSWORD oder übergib als Argument."
    exit 1
fi

export DB_HOST="localhost"
export DB_PORT="5433"
export DB_NAME="inspi"
export DB_USER="inspi"
export DB_PASSWORD="$PASSWORD"
export DJANGO_SETTINGS_MODULE="inspi.settings.local"
export GOOGLE_CLOUD_PROJECT="inspi-441320"

DATA_DIR="$PWD/data"

echo "=== Applye lokale Daten auf Produktion ==="
echo ""

if [ -n "$ONLY" ]; then
    FILES="$DATA_DIR/$ONLY/0_${ONLY}.json"
else
    FILES="$DATA_DIR"/*/0_*.json
fi

for f in $FILES; do
    if [ ! -f "$f" ]; then
        continue
    fi
    count=$(uv run python -c "
import json
with open('$f') as fh:
    try:
        data = json.load(fh)
        print(len(data) if isinstance(data, list) else 0)
    except:
        print(0)
" 2>/dev/null)
    
    if [ "$count" -eq 0 ]; then
        continue
    fi
    
    echo "  → Apply $f ($count Einträge)..."
    uv run python manage.py loaddata "$f" --replace --verbosity=0 2>&1 | { grep -v "objects imported" || true; }
    echo "    ✓"
done

echo ""
echo "=== Fertig ==="
