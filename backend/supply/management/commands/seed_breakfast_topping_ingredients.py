"""Seed breakfast topping/spread ingredients.

Each topping ingredient gets:
- Tag: "frühstücks-belag" (breakfast topping)
- is_standalone_food: True
- Three intensity portions: "Belag knapp", "Belag normal" (default), "Belag üppig"
- One "Packung" portion (typical package size)
- price_per_kg for cost calculation

Idempotent: uses slug-based deduplication.
"""

from django.core.management.base import BaseCommand

from supply.models import Ingredient, NutritionalTag, MeasuringUnit, Portion

# (name, slug, energy_kcal, protein_g, carb_g, fat_g, price_per_kg, portions_grams, package_g)
# portions_grams: (knapp, normal, üppig)
TOPPING_INGREDIENTS = [
    ("Butter", "butter", 717, 0.7, 0.1, 81, 15.0, (8, 10, 15), 250),
    ("Nutella", "nutella", 540, 6.3, 63, 31, 8.0, (15, 20, 25), 450),
    ("Marmelade", "marmelade", 265, 0.3, 63, 0.1, 5.0, (15, 20, 30), 500),
    ("Honig", "honig", 304, 0.3, 82, 0, 12.0, (12, 15, 20), 500),
    ("Erdnussbutter", "erdnussbutter", 580, 25, 8, 51, 10.0, (15, 20, 25), 500),
    ("Frischkäse", "frischkaese", 342, 5.9, 4.3, 35, 6.0, (20, 30, 40), 200),
    ("Käse (Scheiben)", "kaese-scheiben", 404, 25, 3.7, 33, 12.0, (20, 25, 35), 250),
    ("Wurst (Scheiben)", "wurst-scheiben", 290, 12, 1, 25, 8.0, (25, 30, 40), 250),
    ("Leberwurst", "leberwurst", 330, 14, 0.5, 30, 7.0, (25, 30, 40), 250),
    ("Lachs (Scheiben)", "lachs-scheiben", 155, 22, 0, 9, 25.0, (25, 30, 40), 100),
    ("Avocado", "avocado", 160, 2, 9, 15, 8.0, (40, 50, 70), 200),
    ("Hummus", "hummus", 166, 5.1, 15, 9, 6.0, (20, 30, 40), 400),
    ("Marmelade Erdbeere", "marmelade-erdbeere", 260, 0.3, 65, 0.1, 5.0, (15, 20, 30), 500),
    ("Konfitüre Himbeere", "konfituere-himbeere", 265, 0.4, 63, 0.2, 6.0, (15, 20, 30), 350),
]


class Command(BaseCommand):
    help = "Seed breakfast topping ingredients with 3 intensity portions and packaging."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be done without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)

        # Get or create the breakfast topping tag
        tag, tag_created = NutritionalTag.objects.get_or_create(
            name="frühstücks-belag",
            defaults={
                "description": "Belag-Zutaten für Frühstück (Butter, Marmelade, Käse, etc.)",
            },
        )
        if tag_created:
            self.stdout.write(f"  Created tag: {tag.name}")
        else:
            self.stdout.write(f"  Tag exists: {tag.name}")

        # Get measuring units
        g_unit = MeasuringUnit.objects.get(name="g")

        created_count = 0
        updated_count = 0

        for name, slug, energy_kcal, protein_g, carb_g, fat_g, price_per_kg, portions, package_g in TOPPING_INGREDIENTS:
            try:
                ing, created = Ingredient.objects.get_or_create(
                    slug=slug,
                    defaults={
                        "name": name,
                        "is_standalone_food": True,
                        "status": "verified",
                        "energy_kcal": energy_kcal,
                        "protein_g": protein_g,
                        "carbohydrate_g": carb_g,
                        "fat_g": fat_g,
                        "sugar_g": carb_g * 0.7,  # Rough estimate
                        "fibre_g": 0.5,
                        "salt_g": 0.5,
                        "price_per_kg": price_per_kg,
                    },
                )

                if created:
                    created_count += 1
                    self.stdout.write(f"  ✓ Created: {ing.name}")
                else:
                    updated_count += 1

                # Add tag if not already present
                if not ing.nutritional_tags.filter(id=tag.id).exists():
                    if not dry_run:
                        ing.nutritional_tags.add(tag)

                # Create three intensity portions
                if not dry_run:
                    knapp_g, normal_g, uppig_g = portions

                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name="Belag knapp",
                        defaults={
                            "measuring_unit": g_unit,
                            "quantity": knapp_g,
                            "weight_g": float(knapp_g),
                            "is_default": False,
                            "priority": 1,
                        },
                    )

                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name="Belag normal",
                        defaults={
                            "measuring_unit": g_unit,
                            "quantity": normal_g,
                            "weight_g": float(normal_g),
                            "is_default": True,
                            "priority": 2,
                        },
                    )

                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name="Belag üppig",
                        defaults={
                            "measuring_unit": g_unit,
                            "quantity": uppig_g,
                            "weight_g": float(uppig_g),
                            "is_default": False,
                            "priority": 3,
                        },
                    )

                    # Create packaging portion
                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name=f"Packung ({package_g}g)",
                        defaults={
                            "measuring_unit": g_unit,
                            "quantity": package_g,
                            "weight_g": float(package_g),
                            "is_default": False,
                            "priority": 10,
                        },
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  ✗ Failed to process {name}: {e}")
                )

        # Summary
        self.stdout.write(self.style.SUCCESS("\n✓ Breakfast topping ingredients seed complete"))
        self.stdout.write(f"  Created: {created_count}")
        self.stdout.write(f"  Updated: {updated_count}")

        if dry_run:
            self.stdout.write(
                self.style.WARNING("\nDry run — no changes made.")
            )
