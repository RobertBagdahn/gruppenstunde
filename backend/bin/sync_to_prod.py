#!/usr/bin/env python3
"""
Sync ingredient cleanup and descriptions from fixture to production database.
Uses Cloud SQL Proxy (localhost:5433).

Usage:
    uv run python bin/sync_to_prod.py
"""

import json
import os
import sys
from pathlib import Path

# Setup Django
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inspi.settings.local")
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "inspi-441320")

import django
django.setup()

from django.db import connections
from supply.models import Ingredient


def sync_to_prod():
    """Sync cleaned ingredients from fixture to prod database."""
    
    fixture_path = BACKEND_DIR / "data" / "food" / "supply_ingredient.json"
    
    print(f"Loading fixture: {fixture_path}")
    with open(fixture_path, 'r', encoding='utf-8') as f:
        fixture_data = json.load(f)
    
    # Extract ingredient PKs and descriptions from fixture
    fixture_ingredients = {}
    for item in fixture_data:
        if item.get('model') == 'supply.ingredient':
            pk = item['pk']
            fields = item['fields']
            fixture_ingredients[pk] = {
                'name': fields.get('name', ''),
                'description': fields.get('description', ''),
            }
    
    print(f"✓ Loaded {len(fixture_ingredients)} ingredients from fixture")
    
    # Count total in prod
    total_prod = Ingredient.objects.using('default').count()
    print(f"✓ Total ingredients in local DB: {total_prod}")
    
    # Get all prod ingredients
    prod_ingredients = {}
    for ing in Ingredient.objects.using('default').all():
        prod_ingredients[ing.pk] = ing
    
    # Sync: Remove unsuitable, update descriptions
    removed_count = 0
    updated_count = 0
    not_found = []
    
    for pk, data in fixture_ingredients.items():
        if pk not in prod_ingredients:
            not_found.append(pk)
    
    # Find ingredients to delete (in prod but not in fixture)
    for pk in prod_ingredients:
        if pk not in fixture_ingredients:
            ing = prod_ingredients[pk]
            print(f"  DELETE: pk {pk} - {ing.name[:50]}")
            ing.delete()
            removed_count += 1
    
    # Update descriptions
    for pk, data in fixture_ingredients.items():
        if pk in prod_ingredients:
            ing = prod_ingredients[pk]
            if ing.description != data['description']:
                print(f"  UPDATE: pk {pk} - {ing.name[:40]} (description)")
                ing.description = data['description']
                ing.save()
                updated_count += 1
    
    print(f"\n✓ Removed: {removed_count} ingredients")
    print(f"✓ Updated: {updated_count} descriptions")
    print(f"✓ Total now: {Ingredient.objects.using('default').count()} ingredients")
    
    if not_found:
        print(f"\n⚠ {len(not_found)} fixture ingredients not found in DB (skipped)")


if __name__ == '__main__':
    try:
        sync_to_prod()
        print("\n✓ Sync complete!")
    except Exception as e:
        print(f"\n✗ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
