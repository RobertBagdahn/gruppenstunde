"""Seed breakfast mini-recipes for the RefMeal baukasten.

Each mini-recipe is a small Recipe (recipe_type=breakfast/drink) with 1-3 RecipeItems.
Portions are AI-estimated for 1 person per serving.

Idempotent: uses slug-based deduplication.
"""

from django.core.management.base import BaseCommand

from content.choices import ContentStatus
from recipe.models import Recipe, RecipeItem
from supply.models import Ingredient, MeasuringUnit, Portion


# Recipes: (title, slug, recipe_type, items: [(ingredient_name, portion_name_or_none, quantity, weight_g_fallback)])
BREAKFAST_RECIPES = [
    # --- Brot + Belag ---
    ("Brot mit Nutella", "brot-mit-nutella", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Nutella", None, 1, 25),
    ]),
    ("Brot mit Wurst", "brot-mit-wurst", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Wurst", "Scheibe", 1, 25),
    ]),
    ("Brot mit Käse", "brot-mit-kaese", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Käse", "Scheibe", 1, 30),
    ]),
    ("Brot mit Frischkäse", "brot-mit-frischkaese", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Frischkäse", None, 1, 30),
    ]),
    ("Brot mit Marmelade", "brot-mit-marmelade", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Marmelade", None, 1, 25),
    ]),
    ("Brot mit Honig", "brot-mit-honig", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Honig", None, 1, 20),
    ]),
    ("Brot mit Butter", "brot-mit-butter", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Butter", None, 1, 10),
    ]),
    ("Brot mit Erdnussbutter", "brot-mit-erdnussbutter", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Erdnussbutter", None, 1, 20),
    ]),
    ("Brot mit Leberwurst", "brot-mit-leberwurst", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Leberwurst", None, 1, 30),
    ]),
    ("Brot mit Lachs", "brot-mit-lachs", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Lachs", "Scheibe", 1, 30),
    ]),
    ("Brot mit Avocado", "brot-mit-avocado", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Avocado", None, 0.25, 50),
    ]),
    ("Brot mit Hummus", "brot-mit-hummus", "breakfast", [
        ("Brot", "Scheibe", 1, 50),
        ("Hummus", None, 1, 30),
    ]),
    # --- Cerealien ---
    ("Müsli mit Milch", "muesli-mit-milch", "breakfast", [
        ("Haferflocken", None, 1, 60),
        ("Milch", None, 1, 150),
    ]),
    ("Cornflakes mit Milch", "cornflakes-mit-milch", "breakfast", [
        ("Cornflakes", None, 1, 40),
        ("Milch", None, 1, 150),
    ]),
    ("Porridge", "porridge", "breakfast", [
        ("Haferflocken", None, 1, 50),
        ("Milch", None, 1, 200),
        ("Zucker", None, 1, 10),
    ]),
    ("Overnight Oats", "overnight-oats", "breakfast", [
        ("Haferflocken", None, 1, 50),
        ("Joghurt", None, 1, 100),
        ("Milch", None, 1, 50),
    ]),
    # --- Getränke ---
    ("Kakao", "kakao-fruehstueck", "drink", [
        ("Milch", None, 1, 200),
        ("Kakaopulver", None, 1, 15),
        ("Zucker", None, 1, 10),
    ]),
    ("Milch", "milch-fruehstueck", "drink", [
        ("Milch", None, 1, 200),
    ]),
    ("Orangensaft", "orangensaft-fruehstueck", "drink", [
        ("Orangensaft", None, 1, 200),
    ]),
    ("Apfelsaft", "apfelsaft-fruehstueck", "drink", [
        ("Apfelsaft", None, 1, 200),
    ]),
    ("Tee", "tee-fruehstueck", "drink", [
        ("Tee", None, 1, 250),
    ]),
    ("Kaffee", "kaffee-fruehstueck", "drink", [
        ("Kaffee", None, 1, 200),
    ]),
    # --- Extras ---
    ("Joghurt", "joghurt-fruehstueck", "breakfast", [
        ("Joghurt", None, 1, 150),
    ]),
    ("Obst gemischt", "obst-gemischt-fruehstueck", "breakfast", [
        ("Obst", None, 1, 150),
    ]),
    ("Ei gekocht", "ei-gekocht", "breakfast", [
        ("Ei", None, 1, 60),
    ]),
    ("Rührei", "ruehrei", "breakfast", [
        ("Ei", None, 2, 120),
        ("Butter", None, 1, 5),
    ]),
]


class Command(BaseCommand):
    help = "Seed breakfast mini-recipes for the RefMeal baukasten."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show what would be created without saving.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        created_count = 0
        skipped_count = 0

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

                # Try to find a matching portion
                portion = None
                if portion_name:
                    portion = Portion.objects.filter(
                        ingredient=ingredient,
                        name__icontains=portion_name,
                    ).first()

                if not portion:
                    # No named portion found — create a fallback gram-based portion
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

            created_count += 1
            self.stdout.write(f"  CREATED {slug}: {title} ({len(items_data)} items)")

        action = "Would create" if dry_run else "Created"
        self.stdout.write(self.style.SUCCESS(
            f"\n{action} {created_count} recipes, skipped {skipped_count} (already exist)."
        ))
