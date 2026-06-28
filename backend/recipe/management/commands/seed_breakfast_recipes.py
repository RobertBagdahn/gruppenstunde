"""Seed breakfast recipes for the wizard.

Creates:
- 5 warm breakfast dishes (recipe_type=breakfast) — Rührei, Pfannkuchen, Omelett, Porridge, Gekochte Eier
- 1 cold meal (recipe_type=cold_meal) — Müsli

Warm recipes are tagged with breakfast-warm-meal.
Bread+topping combinations are created dynamically via the wizard using ingredients.

Each recipe has RecipeItems for portion and energy calculation.
Portions are estimated for 1 person per serving.

Idempotent: uses slug-based deduplication.
"""

from django.core.management.base import BaseCommand

from content.choices import ContentStatus
from content.models import Tag
from recipe.models import Recipe, RecipeItem
from supply.models import Ingredient, MeasuringUnit, Portion

WARM_MEAL_TAG_SLUG = "breakfast-warm-meal"

# (title, slug, recipe_type, items: [(ingredient_name, portion_name_or_none, quantity, weight_g_fallback)])
BREAKFAST_RECIPES = [
    # --- Warme Gerichte ---
    (
        "Rührei",
        "ruehrei",
        "breakfast",
        [
            ("Ei", None, 2, 120),
            ("Butter", None, 1, 5),
        ],
    ),
    (
        "Pfannkuchen",
        "pfannkuchen",
        "breakfast",
        [
            ("Ei", None, 1, 60),
            ("Mehl", None, 1, 50),
            ("Milch", None, 1, 100),
            ("Butter", None, 1, 10),
        ],
    ),
    (
        "Omelett",
        "omelett",
        "breakfast",
        [
            ("Ei", None, 3, 180),
            ("Butter", None, 1, 10),
        ],
    ),
    (
        "Porridge",
        "porridge",
        "breakfast",
        [
            ("Haferflocken", None, 1, 80),
            ("Milch", None, 1, 200),
            ("Honig", None, 1, 10),
        ],
    ),
    (
        "Gekochte Eier",
        "gekochte-eier",
        "breakfast",
        [
            ("Ei", None, 2, 120),
        ],
    ),
    # --- Kalte Gerichte ---
    (
        "Müsli",
        "muesli",
        "cold_meal",
        [
            ("Haferflocken", None, 1, 60),
            ("Milch", None, 1, 150),
            ("Obst gemischt", None, 1, 50),
        ],
    ),
]


class Command(BaseCommand):
    help = "Seed breakfast recipes for the RefMeal baukasten (warm + cold)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show what would be created without saving.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        created_count = 0
        skipped_count = 0

        warm_tag, _ = Tag.objects.get_or_create(slug=WARM_MEAL_TAG_SLUG, defaults={"name": "breakfast-warm-meal"})

        for title, slug, recipe_type, items_data in BREAKFAST_RECIPES:
            if Recipe.objects.filter(slug=slug).exists():
                skipped_count += 1
                self.stdout.write(f"  SKIP {slug} (already exists)")
                continue

            if dry_run:
                self.stdout.write(f"  WOULD CREATE {slug}: {title}")
                created_count += 1
                continue

            recipe = Recipe.objects.create(
                title=title,
                slug=slug,
                recipe_type=recipe_type,
                portions=1,
                status=ContentStatus.APPROVED,
                summary=f"Mini-Rezept: {title} (1 Portion)",
            )

            for sort_order, (ing_name, portion_name, quantity, weight_g) in enumerate(items_data):
                ingredient = Ingredient.objects.filter(name__icontains=ing_name).first()
                if not ingredient:
                    self.stderr.write(f"  WARNING: Ingredient '{ing_name}' not found, skipping item")
                    continue

                portion = None
                if portion_name:
                    portion = Portion.objects.filter(
                        ingredient=ingredient,
                        name__icontains=portion_name,
                    ).first()

                if not portion:
                    gram_unit = MeasuringUnit.objects.filter(name="g").first()
                    portion, _ = Portion.objects.get_or_create(
                        ingredient=ingredient,
                        name=f"{weight_g}g",
                        defaults={
                            "quantity": weight_g,
                            "weight_g": weight_g,
                            "measuring_unit": gram_unit,
                        },
                    )

                if portion:
                    RecipeItem.objects.create(
                        recipe=recipe,
                        portion=portion,
                        quantity=quantity,
                        sort_order=sort_order,
                    )

            # Tag warm meals with breakfast-warm-meal
            if recipe_type == "breakfast" and not dry_run:
                recipe.tags.add(warm_tag)

            created_count += 1
            self.stdout.write(f"  CREATED {slug}: {title} ({len(items_data)} items, type={recipe_type})")

        action = "Would create" if dry_run else "Created"
        self.stdout.write(
            self.style.SUCCESS(f"\n{action} {created_count} recipes, skipped {skipped_count} (already exist).")
        )
