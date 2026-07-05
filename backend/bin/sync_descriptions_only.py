#!/usr/bin/env python3
"""
Sync only description fields from local DB to fixture JSON.
Preserves all other fields in the JSON file.
"""
import os
import json

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inspi.settings.local')
django.setup()

from supply.models import Ingredient

def sync_descriptions():
    """Update only description fields in fixture JSON from local DB."""
    fixture_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'food', 'supply_ingredient.json')
    
    print(f"Loading fixture from: {fixture_path}")
    with open(fixture_path, 'r', encoding='utf-8') as f:
        fixture_data = json.load(f)
    
    # Load all ingredients from DB
    db_ingredients = {ing.pk: ing for ing in Ingredient.objects.all()}
    print(f"Loaded {len(db_ingredients)} ingredients from local DB")
    
    # Count updates
    updated_count = 0
    empty_in_db = 0
    
    # Update only description field in fixture
    for item in fixture_data:
        if item.get('model') == 'supply.ingredient':
            pk = item.get('pk')
            if pk in db_ingredients:
                db_ing = db_ingredients[pk]
                fixture_desc = item['fields'].get('description', '')
                db_desc = db_ing.description or ''
                
                # Only update if different
                if fixture_desc != db_desc:
                    item['fields']['description'] = db_desc
                    updated_count += 1
                    if not db_desc:
                        empty_in_db += 1
                        print(f"  pk {pk} ({db_ing.name}): still empty in DB")
    
    print(f"\nUpdated {updated_count} descriptions")
    if empty_in_db:
        print(f"  ({empty_in_db} are still empty in local DB)")
    
    # Write back to fixture
    print(f"\nWriting updated fixture...")
    with open(fixture_path, 'w', encoding='utf-8') as f:
        json.dump(fixture_data, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Descriptions synced to: {fixture_path}")

if __name__ == '__main__':
    sync_descriptions()
