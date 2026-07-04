#!/usr/bin/env python3
"""
Export production data to Django fixture files via Cloud SQL Proxy.

Connects to prod DB (localhost:5433 via proxy) using raw psycopg,
reads all rows + M2M relations, and writes Django-compatible fixture JSON.

Usage:
    uv run python bin/export_prod_data.py
    uv run python bin/export_prod_data.py --password PASSWORD
    uv run python bin/export_prod_data.py --only food
    uv run python bin/export_prod_data.py --only masterdata
"""

from __future__ import annotations

import json
import os
import sys
import time
from collections import defaultdict
from datetime import date, datetime, time as dtime
from decimal import Decimal
from pathlib import Path
from typing import Any
from uuid import UUID

# Set up Django for model metadata
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inspi.settings.local")
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "inspi-441320")
import django
django.setup()

PROXY_PORT = 5433
DATA_DIR = BACKEND_DIR / "data"

# Models to export grouped by directory/file
# Format: (group_name, [(app_label, model_name, pk_field, [m2m_fields])])
GROUPS: dict[str, list[tuple[str, str, str, list[str]]]] = {
    "masterdata": [
        ("content", "Tag", "id", []),
        ("content", "ScoutLevel", "id", []),
        ("supply", "MeasuringUnit", "id", []),
        ("supply", "RetailSection", "id", []),
        ("supply", "NutritionalTag", "id", []),
        ("supply", "UnitConversion", "id", []),
        ("supply", "DgeReference", "id", []),
    ],
    "food": [
        ("supply", "Ingredient", "id", ["nutritional_tags"]),
        ("supply", "Portion", "id", []),
        ("supply", "IngredientAlias", "id", []),
        ("recipe", "Rule", "id", []),
        ("recipe", "Recipe", "id", ["nutritional_tags", "tags", "scout_levels", "authors"]),
        ("recipe", "RecipeItem", "id", []),
        ("recipe", "RecipeFolder", "id", []),
        ("recipe", "RecipeItemExchangeGroup", "id", []),
        ("recipe", "RecipeTypeStats", "id", []),
    ],
    "planner": [
        ("planner", "MealPlan", "id", []),
        ("planner", "Meal", "id", []),
        ("planner", "MealItem", "id", []),
        ("planner", "MealItemOverride", "id", []),
        ("planner", "Planner", "id", []),
        ("planner", "PlannerEntry", "id", []),
        ("planner", "PlannerCollaborator", "id", []),
    ],
    "shopping": [
        ("shopping", "ShoppingList", "id", []),
        ("shopping", "ShoppingListItem", "id", []),
        ("shopping", "ShoppingListItemSource", "id", []),
        ("shopping", "ShoppingListCollaborator", "id", []),
        ("shopping", "KitchenReminder", "id", []),
        ("shopping", "KitchenReminderCategory", "id", []),
    ],
}


def get_model_column_map(app_label: str, model_name: str) -> dict[str, str]:
    """Build column_name -> field_name mapping for a Django model.

    Returns dict like {'registration_id': 'registration', 'created_by_id': 'created_by', ...}
    """
    try:
        from django.apps import apps
        model_cls = apps.get_model(app_label, model_name)
        if model_cls is None:
            return {}

        column_map = {}
        # Map PK column
        column_map[model_cls._meta.pk.column] = model_cls._meta.pk.attname

        # Map all regular fields
        for field in model_cls._meta.get_fields():
            if hasattr(field, 'column') and field.column:
                # For FK fields, column is 'foo_id', attname is 'foo_id' or 'foo'
                # We want the FK field name (without _id) for fixtures
                if field.is_relation and hasattr(field, 'attname'):
                    column_map[field.column] = field.attname
                else:
                    column_map[field.column] = field.attname

        return column_map
    except LookupError:
        return {}


def fix_recipe_item_quantity(fields: dict) -> dict:
    """Ensure quantity is positive for RecipeItem."""
    if "quantity" in fields and fields["quantity"] is not None:
        try:
            qty = float(fields["quantity"])
            if qty <= 0:
                fields["quantity"] = 0.1  # minimum positive quantity
        except (ValueError, TypeError):
            pass
    return fields


def serialize_value(val: Any) -> Any:
    """Convert a Python value to JSON-serializable form matching Django fixture format."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, dtime):
        return val.strftime("%H:%M:%S")
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, UUID):
        return str(val)
    if isinstance(val, bytes):
        return val.hex()
    return val


def export_group(cur: Any, group_key: str, models: list[tuple]) -> int:
    """Export a group of models, returns total row count."""
    group_dir = DATA_DIR / group_key
    group_dir.mkdir(parents=True, exist_ok=True)
    total = 0

    print(f"  → {group_key}")

    for app_label, model_name, pk_field, m2m_fields in models:
        db_table = f"{app_label}_{model_name.lower()}"
        start = time.time()

        # Get columns
        cur.execute(
            f"SELECT column_name, data_type FROM information_schema.columns "
            f"WHERE table_schema='public' AND table_name='{db_table}' "
            f"ORDER BY ordinal_position"
        )
        columns_info = cur.fetchall()
        if not columns_info:
            print(f"    - {app_label}.{model_name}: Tabelle nicht gefunden")
            continue

        columns = [c[0] for c in columns_info]

        # Get model field names to filter out columns not in the model
        model_fields = get_model_fields(app_label, model_name)
        if model_fields:
            filtered_columns = [c for c in columns if c in model_fields or c == pk_field]
            if len(filtered_columns) < len(columns):
                skipped_cols = set(columns) - set(filtered_columns)
                if skipped_cols:
                    columns = filtered_columns

        # Fetch all rows
        select_cols = ", ".join(f'"{c}"' for c in columns)
        cur.execute(f'SELECT {select_cols} FROM "{db_table}"')
        rows = cur.fetchall()

        if not rows:
            print(f"    - {app_label}.{model_name}: 0 Einträge")
            continue

        # For M2M fields, fetch junction table data
        m2m_data: dict[int, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))
        for m2m_field in m2m_fields:
            junction_table = f"{db_table}_{m2m_field}"
            try:
                cur.execute(f'SELECT * FROM "{junction_table}"')
                for row in cur.fetchall():
                    if len(row) >= 3:
                        obj_id = row[1]
                        rel_id = row[2]
                        m2m_data[obj_id][m2m_field].append(rel_id)
            except Exception:
                try:
                    cur.execute(f'SELECT * FROM "{junction_table}"')
                    for row in cur.fetchall():
                        if len(row) >= 3:
                            obj_id = row[1]
                            rel_id = row[2]
                            m2m_data[obj_id][m2m_field].append(rel_id)
                except Exception as e:
                    pass

        # Build fixture entries
        entries: list[dict] = []
        for row in rows:
            row_dict = dict(zip(columns, row))
            pk = row_dict[pk_field]

            fields = {}
            for col, val in row_dict.items():
                if col != pk_field:
                    fields[col] = serialize_value(val)

            # Apply data fixes
            if app_label == "recipe" and model_name == "RecipeItem":
                fields = fix_recipe_item_quantity(fields)

            # Add M2M fields
            obj_m2m = m2m_data.get(pk, {})
            for m2m_field in m2m_fields:
                if m2m_field in obj_m2m:
                    fields[m2m_field] = obj_m2m[m2m_field]

            entries.append({
                "model": f"{app_label}.{model_name.lower()}",
                "pk": pk,
                "fields": fields,
            })

        # Write to file
        filepath = group_dir / f"{app_label}_{model_name.lower()}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(entries, f, indent=2, ensure_ascii=False)

        elapsed = time.time() - start
        count = len(entries)
        total += count
        print(f"    ✓ {app_label}.{model_name}: {count} Einträge ({elapsed:.1f}s)")

    return total


def main():
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--password", default=os.environ.get("PROD_DB_PASSWORD"))
    parser.add_argument("--only", default=None, choices=list(GROUPS.keys()))
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=PROXY_PORT)
    args = parser.parse_args()

    password = args.password
    if not password:
        print("Fehler: PROD_DB_PASSWORD oder --password benötigt.")
        sys.exit(1)

    import psycopg

    conn = psycopg.connect(
        dbname="inspi",
        user="inspi",
        password=password,
        host=args.host,
        port=args.port,
    )
    conn.autocommit = True
    cur = conn.cursor()

    groups = [args.only] if args.only else list(GROUPS.keys())

    print("=== Export Produktionsdaten ===")
    print(f"DB: {args.host}:{args.port}/inspi")
    print(f"Dir: {DATA_DIR}")
    print()

    grand_total = 0
    for group_key in groups:
        total = export_group(cur, group_key, GROUPS[group_key])
        grand_total += total

    cur.close()
    conn.close()

    print(f"\n=== Fertig: {grand_total} Einträge ===")


if __name__ == "__main__":
    main()
