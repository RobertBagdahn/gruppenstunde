#!/usr/bin/env python
"""
Smart deduplication: Only merge true duplicates, not color/type variants.

Merges:
- Zubereitungshinweise in Klammern: "Zucker (für Topping)" + "Zucker" → "Zucker"
- Verpackungsvarianten: "Quark (Magerquark)" + "Magerquark" → one ingredient
- Multiple forms of same type

Keeps separate:
- Color variants: Paprika rot, Paprika gelb, Paprika grün
- Type variants: Kartoffel festkochend vs. mehligkochend
"""

import json
import os
import re
from difflib import SequenceMatcher
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Smart deduplication - merge only true duplicates, keep variants'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview without making changes'
        )

    def normalize_name(self, name):
        """Extract base name, removing parenthetical notes."""
        # Remove content in parentheses
        base = re.sub(r'\s*\([^)]*\)\s*', '', name).strip()
        # Normalize spaces
        base = re.sub(r'\s+', ' ', base)
        return base.lower()

    def should_merge(self, name1, name2):
        """Decide if two ingredients should be merged.
        
        Only merge if the parenthetical note is a prep/packaging hint, NOT a product variant.
        
        MERGE: "Zucker (für Topping)" + "Zucker" (not sold separately)
        KEEP SEPARATE: "Kartoffel (Festkochend)" + "Kartoffel" (both sold separately)
        """
        norm1 = self.normalize_name(name1)
        norm2 = self.normalize_name(name2)
        
        # If normalized names are identical, consider merging
        if norm1 == norm2:
            # Product variants that CAN be bought separately - keep them apart
            product_variants = {
                # Colors
                'rot', 'grün', 'gelb', 'orange', 'braun', 'schwarz', 'weiß', 'blau', 'violett',
                # Potato types
                'festkochend', 'mehligkochend', 'vorwiegend',
                # Cheese types
                'gouda', 'emmentaler', 'cheddar', 'mozzarella', 'feta',
                # Squash types
                'hokkaido', 'butternut', 'muskat',
                # Bean types
                'kidney', 'weiß', 'schwarz',
                # Rice types
                'basmati', 'arborio', 'jasmin',
                # Pasta shapes (if both are sold)
                'penne', 'rigatoni', 'tagliatelle', 'spaghetti', 'fusilli',
            }
            
            # Prep/packaging hints that should be merged away - these are NOT product variants
            prep_hints = {
                'für topping', 'zum bestreuen', 'trocken', 'instant', 'fertiggericht',
                'glas', 'dose', 'tk', 'tiefkühl', 'gefroren', 'aufback', 'frische',
                'gemahlenes', 'mahlen', 'gemahlen', 'gehackt', 'granuliert',
            }
            
            paren1 = re.findall(r'\(([^)]*)\)', name1)
            paren2 = re.findall(r'\(([^)]*)\)', name2)
            
            has_variant1 = False
            has_variant2 = False
            
            # Check parentheses for product variants vs prep hints
            for p1 in paren1:
                p1_lower = p1.lower()
                if any(v in p1_lower for v in product_variants):
                    has_variant1 = True
                    break
            
            for p2 in paren2:
                p2_lower = p2.lower()
                if any(v in p2_lower for v in product_variants):
                    has_variant2 = True
                    break
            
            # If one has a product variant, don't merge
            # (because both can be bought separately)
            if has_variant1 or has_variant2:
                return False
            
            # If both have no product variants, they can be merged
            # (prep hints are not separate product lines)
            return True
        
        return False

    def choose_canonical_name(self, names):
        """Choose the best name: prefer one without parentheses or most specific."""
        # Sort by: no parentheses first, then shortest, then first in list
        def priority(name):
            has_paren = 1 if '(' in name else 0
            return (has_paren, len(name), names.index(name))
        
        return min(names, key=priority)

    def find_groups(self, ingredients):
        """Find groups of ingredients that should be merged."""
        merged = set()
        groups = {}  # canonical_name -> list of (pk, name)
        
        for idx1, ing1 in enumerate(ingredients):
            if ing1['pk'] in merged:
                continue
            
            group = [(ing1['pk'], ing1['name'])]
            
            for idx2, ing2 in enumerate(ingredients[idx1+1:], start=idx1+1):
                if ing2['pk'] in merged:
                    continue
                
                if self.should_merge(ing1['name'], ing2['name']):
                    group.append((ing2['pk'], ing2['name']))
                    merged.add(ing2['pk'])
            
            if len(group) > 1:
                canonical = self.choose_canonical_name([n for _, n in group])
                groups[canonical] = group
                merged.add(ing1['pk'])
        
        return groups

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        fixture_path = os.path.join(backend_root, 'data', 'food', 'supply_ingredient.json')
        
        self.stdout.write(f"Loading fixture: {fixture_path}")
        with open(fixture_path, 'r', encoding='utf-8') as f:
            fixture_data = json.load(f)
        
        ingredients = [
            {
                'pk': item['pk'],
                'name': item['fields'].get('name', ''),
                'item': item
            }
            for item in fixture_data
            if item.get('model') == 'supply.ingredient'
        ]
        
        self.stdout.write(f"Analyzing {len(ingredients)} ingredients...")
        groups = self.find_groups(ingredients)
        
        if not groups:
            self.stdout.write(self.style.SUCCESS("✓ No duplicates found!"))
            return
        
        self.stdout.write(f"\nFound {len(groups)} duplicate groups to merge:\n")
        
        for canonical, group in sorted(groups.items()):
            self.stdout.write(f"\n→ KEEP: {canonical}")
            for pk, name in group:
                if name != canonical:
                    self.stdout.write(f"  MERGE: pk {pk} - {name}")
        
        self.stdout.write(f"\nTotal: {len(groups)} groups to merge")
        
        # Create mapping: old_pk -> keep_pk
        merge_map = {}
        for canonical, group in groups.items():
            # Keep the first one (by pk)
            keep_pk = min(pk for pk, _ in group)
            for pk, _ in group:
                if pk != keep_pk:
                    merge_map[pk] = keep_pk
        
        self.stdout.write(f"\nWill merge {len(merge_map)} duplicate PKs")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN: No changes made"))
            return
        
        # Remove duplicates from fixture
        keep_pks = {keep_pk for keep_pk in set(pk for pk in merge_map.values())}
        remove_pks = set(merge_map.keys())
        
        new_fixture = [
            item for item in fixture_data
            if not (item.get('model') == 'supply.ingredient' and item.get('pk') in remove_pks)
        ]
        
        initial_count = len(ingredients)
        final_count = len([x for x in new_fixture if x.get('model') == 'supply.ingredient'])
        
        self.stdout.write(f"\nWriting updated fixture...")
        with open(fixture_path, 'w', encoding='utf-8') as f:
            json.dump(new_fixture, f, indent=2, ensure_ascii=False)
        
        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Ingredients: {initial_count} → {final_count} (merged {len(merge_map)})"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(f"✓ Updated: {fixture_path}")
        )
