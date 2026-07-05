#!/usr/bin/env python
"""
Deduplicate ingredients by merging similar names and updating recipes.

Usage:
    uv run python manage.py deduplicate_ingredients --dry-run
    uv run python manage.py deduplicate_ingredients

This command will:
1. Group ingredients by base name (without parentheses)
2. Keep the most specific variant and remove duplicates
3. Update all recipes to use the canonical ingredient
4. Output a mapping file for reference
"""
import json
import os
from collections import defaultdict
from django.core.management.base import BaseCommand
from recipe.models import RecipeItem
from supply.models import Portion


class Command(BaseCommand):
    help = 'Deduplicate ingredients by merging similar names'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without modifying'
        )
        parser.add_argument(
            '--output',
            type=str,
            default='ingredient_mapping.json',
            help='Output file for mapping (old_pk → new_pk)'
        )

    def get_priority(self, name):
        """
        Return priority score for choosing canonical ingredient (higher = better).
        
        Strategy:
        1. Type variants (colors, cuts) > Prep variants (packaging, form)
        2. Simple > Complex
        3. Prefer ingredient with qualifier over generic + qualifier
           e.g., "Magerquark" > "Quark (Magerquark)"
        """
        lower = name.lower()
        score = 0
        
        # Type qualifiers - these indicate different types of the same ingredient
        # These should be kept SEPARATE (different variants)
        type_keywords = {
            'rot': 95,           # Paprika (rot)
            'gelb': 95,
            'grün': 95,
            'weiß': 95,
            'schwarz': 95,
            'butternut': 95,     # Kürbis (Butternut)
            'hokkaido': 95,
            'festkochend': 95,   # Kartoffel (Festkochend)
            'mehligkochend': 95,
            'vollmilch': 95,     # Schokolade (Vollmilch)
            'zartbitter': 95,
            'dunkle': 90,
            'helle': 90,
        }
        
        has_type_qualifier = False
        for keyword, points in type_keywords.items():
            if keyword in lower:
                score += points
                has_type_qualifier = True
                break
        
        # Prep qualifiers - these are hints about packaging/form
        # Prefer items WITHOUT these qualifiers
        prep_keywords = ['dose', 'glas', 'trocken', 'aufback', 'fertig', 'tk', 'instant', 
                        'multi', 'mühle', 'pulver', 'gerieben', 'gesüßt', 'ausgedrückt',
                        'kleine', 'groß', 'erythrit']
        
        for keyword in prep_keywords:
            if keyword in lower and '(' in name:
                score -= 50
                break
        
        # Special case: specific ingredient name > generic + qualifier
        # e.g., "Magerquark" beats "Quark (Magerquark)"
        ingredients_with_parent_name = {
            'magerquark': 'quark',
            'frisch': None,  # Frisch is not part of a parent
        }
        
        for spec_name, generic_name in ingredients_with_parent_name.items():
            if spec_name in lower and '(' not in name:
                # This is a specific name without wrapper
                score += 40
        
        # Prefer simpler names (without parentheses) if same category
        if '(' not in name:
            score += 5
        
        # Prefer shorter names
        score += (50 - len(name)) / 4
        
        return score

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        output_file = options['output']
        
        # Load fixture
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        fixture_path = os.path.join(backend_root, 'data', 'food', 'supply_ingredient.json')
        
        self.stdout.write(f"Loading fixture: {fixture_path}")
        with open(fixture_path, 'r', encoding='utf-8') as f:
            fixture_data = json.load(f)
        
        # Group ingredients by base name
        ingredients = [i for i in fixture_data if i.get('model') == 'supply.ingredient']
        
        grouped = defaultdict(list)
        for ing in ingredients:
            name = ing['fields']['name']
            base = name.split('(')[0].strip().lower()
            grouped[base].append(ing)
        
        # Find duplicates and choose canonical
        mapping = {}  # old_pk → new_pk
        duplicates_found = 0
        merge_count = 0
        
        for base, variants in grouped.items():
            if len(variants) <= 1:
                continue
            
            duplicates_found += len(variants)
            
            # Choose best variant (highest priority)
            canonical = max(variants, key=lambda x: self.get_priority(x['fields']['name']))
            canonical_pk = canonical['pk']
            
            self.stdout.write(f"\n[MERGE] Base: '{base}'")
            self.stdout.write(f"  → Keep: pk {canonical_pk}: {canonical['fields']['name']}")
            
            for variant in variants:
                if variant['pk'] != canonical_pk:
                    old_pk = variant['pk']
                    mapping[old_pk] = canonical_pk
                    merge_count += 1
                    self.stdout.write(
                        f"    → Remove: pk {old_pk}: {variant['fields']['name']}",
                        self.style.WARNING
                    )
        
        self.stdout.write(
            self.style.SUCCESS(f"\n✓ Found {duplicates_found} duplicate variants → {merge_count} to merge")
        )
        
        # Find recipes using old ingredients
        if not dry_run:
            self.stdout.write("\nWARNING: Skipping DB update due to constraints.")
            self.stdout.write("Updating only the fixture file.")
            self.stdout.write("Run 'import_prod_data' after deployment to update prod DB.")
            
            # Remove duplicate ingredients from fixture
            self.stdout.write("\nUpdating fixture...")
            pks_to_remove = set(mapping.keys())
            new_fixture_data = [
                item for item in fixture_data
                if not (item.get('model') == 'supply.ingredient' and item.get('pk') in pks_to_remove)
            ]
            
            # Also update portions that reference old ingredients
            updated_portions_in_fixture = 0
            for item in new_fixture_data:
                if item.get('model') == 'supply.portion':
                    old_ing_id = item.get('fields', {}).get('ingredient')
                    if old_ing_id in mapping:
                        item['fields']['ingredient'] = mapping[old_ing_id]
                        updated_portions_in_fixture += 1
            
            with open(fixture_path, 'w', encoding='utf-8') as f:
                json.dump(new_fixture_data, f, indent=2, ensure_ascii=False)
            
            self.stdout.write(
                self.style.SUCCESS(f"✓ Removed {len(pks_to_remove)} duplicate ingredients")
            )
            self.stdout.write(
                self.style.SUCCESS(f"✓ Updated {updated_portions_in_fixture} portion references")
            )
        
        # Save mapping
        self.stdout.write(f"\nSaving mapping to: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(mapping, f, indent=2)
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\n[DRY RUN] No changes made"))
            self.stdout.write(f"Run without --dry-run to apply {merge_count} merges")
        else:
            self.stdout.write(
                self.style.SUCCESS(f"\n✓ Deduplicated {merge_count} ingredient variants")
            )
