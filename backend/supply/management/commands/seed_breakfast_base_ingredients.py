"""Seed base breakfast ingredients (bread/rolls).

Each base ingredient represents a bread type with:
- Tag: "frühstücks-basis" (breakfast base)
- standard_recipe_weight_g: typical slice weight
- is_standalone_food: True (can be eaten directly)
- Nutrition data populated from similar ingredients or defaults

Idempotent: uses slug-based deduplication.
"""

from django.core.management.base import BaseCommand

from supply.models import Ingredient, NutritionalTag, MeasuringUnit, Portion

# (name, slug, standard_recipe_weight_g, energy_kcal, protein_g, carb_g, notes)
BASE_INGREDIENTS = [
    ("Bauernbrot", "bauernbrot", 50, 265, 9, 52),
    ("Toastbrot", "toastbrot", 30, 265, 8, 46),
    ("Stuten", "stuten", 45, 280, 8, 50),
    ("Körnerbrot", "koernerbrot", 55, 230, 10, 40),
    ("Brötchen (halbes)", "broetchen-halb", 35, 265, 9, 48),
    ("Brötchen (ganzes)", "broetchen-ganzes", 70, 265, 9, 48),
]


class Command(BaseCommand):
    help = "Seed breakfast base ingredients (bread types) with portions and tag."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be done without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)

        # Get or create the breakfast base tag
        tag, tag_created = NutritionalTag.objects.get_or_create(
            name="frühstücks-basis",
            defaults={
                "description": "Basis-Zutaten für Frühstück (Brot, Brötchen, etc.)",
            },
        )
        if tag_created:
            self.stdout.write(f"  Created tag: {tag.name}")
        else:
            self.stdout.write(f"  Tag exists: {tag.name}")

        # Get the gram measuring unit
        g_unit = MeasuringUnit.objects.get(name="g")

        created_count = 0
        updated_count = 0
        skipped_count = 0

        for name, slug, weight_g, energy_kcal, protein_g, carb_g in BASE_INGREDIENTS:
            try:
                ing, created = Ingredient.objects.get_or_create(
                    slug=slug,
                    defaults={
                        "name": name,
                        "is_standalone_food": True,
                        "status": "verified",
                        "standard_recipe_weight_g": weight_g,
                        "energy_kcal": energy_kcal,
                        "protein_g": protein_g,
                        "carbohydrate_g": carb_g,
                        "fat_g": 4.0,  # Average for bread
                        "sugar_g": 2.0,
                        "fibre_g": 2.5,
                        "salt_g": 1.2,
                    },
                )

                if created:
                    created_count += 1
                    self.stdout.write(f"  ✓ Created: {ing.name}")
                else:
                    # Update if exists but missing tag or standard weight
                    if ing.standard_recipe_weight_g is None:
                        ing.standard_recipe_weight_g = weight_g
                        ing.save()
                        updated_count += 1
                        self.stdout.write(f"  ↻ Updated: {ing.name}")
                    else:
                        skipped_count += 1

                # Add tag if not already present
                if not ing.nutritional_tags.filter(id=tag.id).exists():
                    if not dry_run:
                        ing.nutritional_tags.add(tag)
                    self.stdout.write(f"    → Tagged: {tag.name}")

                # Create default portion (1g = 1g for simplicity; full weight is in standard_recipe_weight_g)
                if not dry_run:
                    Portion.objects.get_or_create(
                        ingredient=ing,
                        measuring_unit=g_unit,
                        name=f"Scheibe ({weight_g}g)",
                        defaults={
                            "quantity": weight_g,
                            "weight_g": weight_g,
                            "is_default": True,
                            "priority": 1,
                        },
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  ✗ Failed to process {name}: {e}")
                )

        # Summary
        self.stdout.write(self.style.SUCCESS("\n✓ Breakfast base ingredients seed complete"))
        self.stdout.write(f"  Created: {created_count}")
        self.stdout.write(f"  Updated: {updated_count}")
        self.stdout.write(f"  Skipped: {skipped_count}")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("\nDry run — no changes made.")
            )
