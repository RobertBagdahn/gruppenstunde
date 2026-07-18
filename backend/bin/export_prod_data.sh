#!/usr/bin/env bash
# Export production data as Django fixture files via Cloud SQL Proxy.
#
# Usage:
#   ./bin/export_prod_data.sh                    # uses PROD_DB_PASSWORD env var
#   ./bin/export_prod_data.sh <DB_PASSWORD>      # password as argument
#   ./bin/export_prod_data.sh <PASSWORD> food    # only food group
#
# Groups: masterdata, users, food, activity, event, planner, profiles, packing, shopping
#
# Prerequisites:
#   - Cloud SQL Proxy running on localhost:5433
#   - gcloud authenticated

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

dump() {
    local group="$1"
    local apps="$2"
    local dir="$DATA_DIR/$group"
    local file="$dir/0_${group}.json"
    local extra="${3:-}"
    
    mkdir -p "$dir"
    echo "  → $group ..."
    
    # shellcheck disable=SC2086
    uv run python manage.py dumpdata $apps \
        --natural-primary --natural-foreign \
        --exclude contenttypes --exclude auth.permission --exclude sessions \
        --indent 2 --output "$file" \
        $extra 2>&1 | { grep -v "objects imported" || true; }
    
    if [ -f "$file" ]; then
        local count
        count=$(uv run python -c "
import json
with open('$file') as f:
    try:
        data = json.load(f)
        print(len(data) if isinstance(data, list) else 0)
    except:
        print(0)
" 2>/dev/null)
        echo "    ✓ ${count:-0} Einträge"
    fi
}

echo "=== Export Produktionsdaten ==="
echo ""

GROUPS=(
    "masterdata:content.Tag content.ScoutLevel supply.MeasuringUnit supply.RetailSection supply.NutritionalTag supply.UnitConversion"
    "users:auth.User auth.Group account"
    "food:supply.Ingredient supply.Portion recipe.Recipe recipe.RecipeItem recipe.Rule recipe.RecipeFolder"
    "planner:planner"
    "shopping:shopping"
)

if [ -n "$ONLY" ]; then
    for entry in "${GROUPS[@]}"; do
        group="${entry%%:*}"
        apps="${entry#*:}"
        if [ "$group" = "$ONLY" ]; then
            dump "$group" "$apps"
            break
        fi
    done
else
    for entry in "${GROUPS[@]}"; do
        group="${entry%%:*}"
        apps="${entry#*:}"
        dump "$group" "$apps"
    done
fi

echo ""
echo "=== Fertig ==="
echo "Dateien in $DATA_DIR:"
for f in "$DATA_DIR"/*/0_*.json; do
    if [ -f "$f" ]; then
        count=$(uv run python -c "
import json
with open('$f') as fh:
    try:
        data = json.load(fh)
        print(len(data) if isinstance(data, list) else 0)
    except:
        print('?')
" 2>/dev/null)
        echo "  $f: $count Einträge"
    fi
done
