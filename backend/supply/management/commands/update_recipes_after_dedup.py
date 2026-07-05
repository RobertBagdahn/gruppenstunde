"""Update RecipeItems after ingredient deduplication.

Finds Portions that reference deleted (merged) ingredient PKs and updates them
to point to the kept ingredient PKs based on the deduplication mapping.
"""

import json
import os
import re
from django.core.management.base import BaseCommand
from supply.models import Portion, Ingredient


class Command(BaseCommand):
    help = "Update Portions after ingredient deduplication to fix broken recipe references"

    def normalize_name(self, name):
        """Normalize ingredient name for comparison."""
        # Remove parenthetical notes
        name = re.sub(r'\s*\([^)]*\)\s*', ' ', name)
        return name.strip().lower()

    def should_merge(self, name1, name2):
        """Decide if two ingredients should be merged (copied from deduplicate_smart)."""
        norm1 = self.normalize_name(name1)
        norm2 = self.normalize_name(name2)
        
        if norm1 == norm2:
            product_variants = {
                'rot', 'grün', 'gelb', 'orange', 'braun', 'schwarz', 'weiß', 'blau', 'violett',
                'festkochend', 'mehligkochend', 'vorwiegend',
                'gouda', 'emmentaler', 'cheddar', 'mozzarella', 'feta',
                'hokkaido', 'butternut', 'muskat',
                'kidney', 'weiß', 'schwarz',
                'basmati', 'arborio', 'jasmin',
                'penne', 'rigatoni', 'tagliatelle', 'spaghetti', 'fusilli',
            }
            
            paren1 = re.findall(r'\(([^)]*)\)', name1)
            paren2 = re.findall(r'\(([^)]*)\)', name2)
            
            has_variant1 = any(v in p.lower() for p in paren1 for v in product_variants)
            has_variant2 = any(v in p.lower() for p in paren2 for v in product_variants)
            
            if has_variant1 or has_variant2:
                return False
            
            return True
        
        return False

    def choose_canonical_name(self, names):
        """Choose the best name."""
        def priority(name):
            has_paren = 1 if '(' in name else 0
            return (has_paren, len(name), names.index(name))
        
        return min(names, key=priority)

    def build_merge_map(self):
        """Reconstruct merge_map from current fixture."""
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        fixture_path = os.path.join(backend_root, 'data', 'food', 'supply_ingredient.json')
        
        with open(fixture_path, 'r', encoding='utf-8') as f:
            fixture_data = json.load(f)
        
        ingredients = [
            {
                'pk': item['pk'],
                'name': item['fields'].get('name', ''),
            }
            for item in fixture_data
            if item.get('model') == 'supply.ingredient'
        ]
        
        # Find groups using same logic as deduplicate_smart
        merged = set()
        groups = {}
        
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
        
        # Build merge_map: deleted_pk -> kept_pk
        merge_map = {}
        for canonical, group in groups.items():
            keep_pk = min(pk for pk, _ in group)
            for pk, _ in group:
                if pk != keep_pk:
                    merge_map[pk] = keep_pk
        
        return merge_map

    def handle(self, *args, **options):
        self.stdout.write("Building merge map from fixture...")
        merge_map = self.build_merge_map()
        
        if not merge_map:
            self.stdout.write(self.style.SUCCESS("✓ No merges found, nothing to update"))
            return
        
        self.stdout.write(f"Merge map: {len(merge_map)} deleted → kept mappings")
        
        # Find orphaned portions (those referencing deleted ingredients)
        deleted_pks = set(merge_map.keys())
        orphan_portions = list(Portion.objects.filter(ingredient_id__in=deleted_pks))
        
        count = len(orphan_portions)
        self.stdout.write(f"\nFound {count} Portions referencing deleted ingredients:")
        
        from recipe.models import RecipeItem
        
        updated = 0
        deleted = 0
        
        for orphan_portion in orphan_portions:
            old_ing_pk = orphan_portion.ingredient_id
            new_ing_pk = merge_map[old_ing_pk]
            
            # Find or create equivalent portion with new ingredient
            portion_name = orphan_portion.name
            new_portion = Portion.objects.filter(
                ingredient_id=new_ing_pk,
                name=portion_name
            ).first()
            
            if new_portion:
                self.stdout.write(
                    f"  Portion {orphan_portion.pk} ('{portion_name}', ing {old_ing_pk}) → "
                    f"using existing Portion {new_portion.pk} (ing {new_ing_pk})"
                )
                # Redirect all RecipeItems from orphan to new portion
                recipe_items = RecipeItem.objects.filter(portion_id=orphan_portion.pk)
                recipe_items.update(portion_id=new_portion.pk)
                updated += len(recipe_items)
                
                # Delete orphan portion
                orphan_portion.delete()
                deleted += 1
            else:
                self.stdout.write(
                    f"  WARNING: Portion {orphan_portion.pk} ('{portion_name}', ing {old_ing_pk}) → "
                    f"no equivalent found for ing {new_ing_pk}"
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ Updated {updated} RecipeItems, deleted {deleted} orphan Portions"
            )
        )
