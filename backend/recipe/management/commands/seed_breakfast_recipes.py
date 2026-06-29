"""Seed breakfast recipes + portion catalog for the wizard.

Creates:
- MeasuringUnits for portions: "Scheibe", "Portion", "Tasse (200ml)", "Schuss (30ml)"
- Portions for all base (breakfast-base) and topping (breakfast-topping) ingredients
- 5 warm breakfast dishes (recipe_type=breakfast) — Rührei, Pfannkuchen, Omelett, Porridge, Gekochte Eier
- 1 cold meal (recipe_type=cold_meal) — Müsli

Warm recipes are tagged with breakfast-warm-meal.
Bread+topping combinations are created dynamically via the wizard using ingredients.

Each recipe has RecipeItems for portion and energy calculation.
Portions are estimated for 1 person per serving.

Idempotent: uses slug-based deduplication, get_or_create for all seed data.
"""

from django.core.management.base import BaseCommand

from content.choices import ContentStatus
from content.models import Tag
from recipe.models import Recipe, RecipeItem
from supply.models import Ingredient, MeasuringUnit, Portion

WARM_MEAL_TAG_SLUG = "breakfast-warm-meal"

BASE_TAG_SLUG = "breakfast-base"
TOPPING_TAG_SLUG = "breakfast-topping"

# MeasuringUnits for portion-based wizard storage
# Each is a named portion unit (weight comes from Portion.weight_g)
PORTION_UNITS = [
    ("Scheibe", False),       # bread slices
    ("Portion", False),       # toppings
    ("Tasse (200ml)", False), # drinks
    ("Schuss (30ml)", False), # milk splash
]

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

        # ── Step 1: Create MeasuringUnits for portion-based wizard storage ──
        gram_unit = MeasuringUnit.objects.filter(name="g").first()
        ml_unit = MeasuringUnit.objects.filter(name="ml").first()
        scheibe_unit, _ = MeasuringUnit.objects.get_or_create(name="Scheibe", defaults={"description": "Brot-Scheibe für den Frühstücksassistenten"})
        portion_unit, _ = MeasuringUnit.objects.get_or_create(name="Portion", defaults={"description": "Belag-Portion für den Frühstücksassistenten"})
        tasse_unit, _ = MeasuringUnit.objects.get_or_create(name="Tasse (200ml)", defaults={"description": "Getränke-Tasse (200ml) für den Frühstücksassistenten"})
        schuss_unit, _ = MeasuringUnit.objects.get_or_create(name="Schuss (30ml)", defaults={"description": "Milch-Schuss (30ml) für den Frühstücksassistenten"})

        if not dry_run:
            self.stdout.write(f"  MeasuringUnits: Scheibe={scheibe_unit.id}, Portion={portion_unit.id}, Tasse={tasse_unit.id}, Schuss={schuss_unit.id}")

        # ── Step 2: Create Portions for base (breakfast-base) ingredients ──
        base_tag = Tag.objects.filter(slug=BASE_TAG_SLUG).first()
        if base_tag:
            base_ings = Ingredient.objects.filter(tags=base_tag, is_standalone_food=True)
            base_portions_created = 0
            for ing in base_ings:
                if not ing.standard_recipe_weight_g:
                    continue
                _, was_created = Portion.objects.get_or_create(
                    ingredient=ing,
                    measuring_unit=scheibe_unit,
                    name="Scheibe",
                    defaults={
                        "quantity": 1,
                        "weight_g": ing.standard_recipe_weight_g,
                    },
                )
                if was_created:
                    base_portions_created += 1
                    if not dry_run:
                        self.stdout.write(f"  PORTION Scheibe ({ing.standard_recipe_weight_g}g) → {ing.name}")
            if not dry_run and base_portions_created == 0:
                self.stdout.write(f"  Portions for base ingredients already exist ({base_ings.count()} found)")

        # ── Step 3: Create Portions for topping (breakfast-topping) ingredients ──
        topping_tag = Tag.objects.filter(slug=TOPPING_TAG_SLUG).first()
        if topping_tag:
            topping_ings = Ingredient.objects.filter(tags=topping_tag, is_standalone_food=True)
            topping_portions_created = 0
            for ing in topping_ings:
                portions = list(ing.portions.all())
                for intensity_name, key in [("Belag knapp", "knapp"), ("Belag normal", "normal"), ("Belag üppig", "üppig")]:
                    if not any(p.name == intensity_name for p in portions):
                        weight_g = None
                        for p in portions:
                            if p.name.lower().startswith("belag"):
                                if key in p.name.lower():
                                    weight_g = p.weight_g
                                    break
                        if weight_g is None and intensity_name == "Belag normal":
                            for p in portions:
                                if p.is_default:
                                    weight_g = p.weight_g
                                    break
                        if weight_g is None:
                            continue
                        Portion.objects.create(
                            ingredient=ing,
                            measuring_unit=portion_unit,
                            name=intensity_name,
                            quantity=1,
                            weight_g=weight_g,
                        )
                        topping_portions_created += 1
                        if not dry_run and not dry_run:
                            self.stdout.write(f"  PORTION {intensity_name} ({weight_g}g) → {ing.name}")
            if not dry_run and topping_portions_created == 0:
                self.stdout.write(f"  Portions for topping ingredients already exist ({topping_ings.count()} found)")

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
