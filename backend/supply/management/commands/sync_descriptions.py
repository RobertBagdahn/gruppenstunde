#!/usr/bin/env python
"""
Management command to sync only description fields from local DB to fixture JSON.
"""
import json
import os
from django.core.management.base import BaseCommand
from supply.models import Ingredient


class Command(BaseCommand):
    help = 'Sync only description fields from local DB to fixture JSON'

    def handle(self, *args, **options):
        # Get backend root directory
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        fixture_path = os.path.join(backend_root, 'data', 'food', 'supply_ingredient.json')
        
        self.stdout.write(f"Loading fixture from: {fixture_path}")
        with open(fixture_path, 'r', encoding='utf-8') as f:
            fixture_data = json.load(f)
        
        # Load all ingredients from DB
        db_ingredients = {ing.pk: ing for ing in Ingredient.objects.all()}
        self.stdout.write(f"Loaded {len(db_ingredients)} ingredients from local DB")
        
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
                            self.stdout.write(
                                f"  pk {pk} ({db_ing.name}): still empty in DB",
                                self.style.WARNING
                            )
        
        self.stdout.write(f"\nUpdated {updated_count} descriptions")
        if empty_in_db:
            self.stdout.write(f"  ({empty_in_db} are still empty in local DB)")
        
        # Write back to fixture
        self.stdout.write(f"\nWriting updated fixture...")
        with open(fixture_path, 'w', encoding='utf-8') as f:
            json.dump(fixture_data, f, indent=2, ensure_ascii=False)
        
        self.stdout.write(
            self.style.SUCCESS(f"✓ Descriptions synced to: {fixture_path}")
        )
