"""Consolidated seed command for the breakfast catalog.

Creates:
- 4 content.Tag instances: breakfast-base, breakfast-topping, breakfast-drink, breakfast-warm-meal
- 6 base bread ingredients (tagged breakfast-base)
- 17 specific topping ingredients (tagged breakfast-topping)
- 6 drink ingredients (tagged breakfast-drink) — Milch, Säfte, Hafermilch
- 3 drink recipes (tagged breakfast-drink) — Kaffee, Kakao, Tee

Idempotent: uses slug-based deduplication.
"""

from django.core.management.base import BaseCommand

from content.models import Tag
from recipe.models import Recipe, RecipeItem
from supply.models import Ingredient, MeasuringUnit, Portion

BASE_TAG_SLUG = "breakfast-base"
TOPPING_TAG_SLUG = "breakfast-topping"
DRINK_TAG_SLUG = "breakfast-drink"
WARM_MEAL_TAG_SLUG = "breakfast-warm-meal"

BREAKFAST_DAY_NAMES = ["Tag 1", "Tag 2", "Tag 3", "Tag 4", "Tag 5"]

# (name, slug, standard_recipe_weight_g, energy_kcal, protein_g, carb_g)
BASE_INGREDIENTS = [
    ("Bauernbrot", "bauernbrot", 50, 265, 9, 52),
    ("Toastbrot", "toastbrot", 30, 265, 8, 46),
    ("Stuten", "stuten", 45, 280, 8, 50),
    ("Körnerbrot", "koernerbrot", 55, 230, 10, 40),
    ("Brötchen (halbes)", "broetchen-halb", 35, 265, 9, 48),
    ("Brötchen (ganzes)", "broetchen-ganzes", 70, 265, 9, 48),
]

# (name, slug, energy_kcal, protein_g, carb_g, fat_g, price_per_kg, portions_grams, package_g)
# portions_grams: (knapp, normal, üppig)
TOPPING_INGREDIENTS = [
    # Spreads
    ("Butter", "butter", 717, 0.7, 0.1, 81, 15.0, (8, 10, 15), 250),
    ("Nutella", "nutella", 540, 6.3, 63, 31, 8.0, (15, 20, 25), 450),
    ("Marmelade", "marmelade", 265, 0.3, 63, 0.1, 5.0, (15, 20, 30), 500),
    ("Honig", "honig", 304, 0.3, 82, 0, 12.0, (12, 15, 20), 500),
    ("Erdnussbutter", "erdnussbutter", 580, 25, 8, 51, 10.0, (15, 20, 25), 500),
    ("Frischkäse", "frischkaese", 342, 5.9, 4.3, 35, 6.0, (20, 30, 40), 200),
    ("Leberwurst", "leberwurst", 330, 14, 0.5, 30, 7.0, (25, 30, 40), 250),
    ("Hummus", "hummus", 166, 5.1, 15, 9, 6.0, (20, 30, 40), 400),
    ("Avocado", "avocado", 160, 2, 9, 15, 8.0, (40, 50, 70), 200),
    ("Marmelade Erdbeere", "marmelade-erdbeere", 260, 0.3, 65, 0.1, 5.0, (15, 20, 30), 500),
    ("Konfitüre Himbeere", "konfituere-himbeere", 265, 0.4, 63, 0.2, 6.0, (15, 20, 30), 350),
    # Cheese (specific)
    ("Gouda", "gouda", 356, 24, 0.1, 28, 12.0, (20, 25, 35), 250),
    ("Emmentaler", "emmentaler", 380, 29, 0.1, 30, 14.0, (20, 25, 35), 250),
    ("Edamer", "edamer", 330, 25, 0.1, 25, 11.0, (20, 25, 35), 250),
    # Cold cuts (specific)
    ("Salami", "salami", 400, 22, 1, 35, 15.0, (25, 30, 40), 200),
    ("Schinken (gekocht)", "schinken-gekocht", 120, 20, 1, 4, 10.0, (25, 30, 40), 200),
    ("Putenbrust (Aufschnitt)", "putenbrust-aufschnitt", 105, 22, 0.5, 2, 12.0, (25, 30, 40), 200),
]

# (name, slug, energy_kcal, protein_g, carb_g, fat_g, sugar_g)
DRINK_INGREDIENTS = [
    ("Milch", "milch", 65, 3.4, 4.8, 3.6, 4.8),
    ("Milch (laktosefrei)", "milch-laktosefrei", 65, 3.4, 4.8, 3.6, 4.8),
    ("Hafermilch", "hafermilch", 46, 1, 7, 1.5, 4),
    ("Saft (Orange)", "saft-orange", 45, 0.7, 10, 0.1, 9),
    ("Saft (Apfel)", "saft-apfel", 46, 0.1, 11, 0.1, 10),
    ("Saft (Multivitamin)", "saft-multivitamin", 47, 0.3, 11, 0.1, 10),
]

# (title, slug, energy_kcal, protein_g, carb_g, fat_g, sugar_g)
DRINK_RECIPES = [
    ("Kaffee", "kaffee", 4, 0.12, 0, 0, 0),
    ("Kakao", "kakao", 77, 3.4, 11, 2.3, 9.5),
    ("Tee", "tee", 1, 0, 0, 0, 0),
]


def _get_or_create_tag(slug: str, name: str) -> Tag:
    tag, _ = Tag.objects.get_or_create(slug=slug, defaults={"name": name})
    return tag


class Command(BaseCommand):
    help = "Seed complete breakfast catalog: tags, base/topping/drink ingredients, drink recipes, breakfast days."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
        parser.add_argument("--skip-tags", action="store_true", help="Skip tag creation (for re-seeding data only)")

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        skip_tags = options.get("skip_tags", False)

        g_unit = MeasuringUnit.objects.get(name="g")
        ml_unit = MeasuringUnit.objects.get(name="ml")

        # ── Tags ───────────────────────────────────────────────────────────
        if not skip_tags:
            tags = {
                BASE_TAG_SLUG: _get_or_create_tag(BASE_TAG_SLUG, "breakfast-base"),
                TOPPING_TAG_SLUG: _get_or_create_tag(TOPPING_TAG_SLUG, "breakfast-topping"),
                DRINK_TAG_SLUG: _get_or_create_tag(DRINK_TAG_SLUG, "breakfast-drink"),
                WARM_MEAL_TAG_SLUG: _get_or_create_tag(WARM_MEAL_TAG_SLUG, "breakfast-warm-meal"),
            }
            for slug, tag in tags.items():
                self.stdout.write(f"  Tag ready: {slug} (id={tag.id})")

            # Breakfast day tags
            for i, day_name in enumerate(BREAKFAST_DAY_NAMES):
                slug = f"breakfast-day-{i + 1}"
                tag, created = Tag.objects.get_or_create(
                    slug=slug,
                    defaults={"name": day_name, "group": "breakfast_day", "sort_order": i},
                )
                if created or tag.group != "breakfast_day":
                    tag.group = "breakfast_day"
                    tag.save(update_fields=["group"])
                self.stdout.write(f"  Breakfast day tag: {day_name} (slug={slug}, id={tag.id})")

        base_tag = _get_or_create_tag(BASE_TAG_SLUG, "breakfast-base")
        topping_tag = _get_or_create_tag(TOPPING_TAG_SLUG, "breakfast-topping")
        drink_tag = _get_or_create_tag(DRINK_TAG_SLUG, "breakfast-drink")

        created_base = 0
        created_topping = 0
        created_drink_ing = 0
        created_drink_recipe = 0

        # ── Base ingredients ───────────────────────────────────────────────
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
                        "fat_g": 4.0,
                        "sugar_g": 2.0,
                        "fibre_g": 2.5,
                        "salt_g": 1.2,
                    },
                )
                if created:
                    created_base += 1
                    self.stdout.write(f"  Created base: {ing.name}")

                if not ing.tags.filter(id=base_tag.id).exists() and not dry_run:
                    ing.tags.add(base_tag)

                if not dry_run:
                    Portion.objects.get_or_create(
                        ingredient=ing,
                        measuring_unit=g_unit,
                        name=f"Scheibe ({weight_g}g)",
                        defaults={"quantity": weight_g, "weight_g": weight_g, "rank": 1},
                    )

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Failed base {name}: {e}"))

        # ── Topping ingredients ────────────────────────────────────────────
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
                        "sugar_g": carb_g * 0.7,
                        "fibre_g": 0.5,
                        "salt_g": 0.5,
                        "price_per_kg": price_per_kg,
                    },
                )
                if created:
                    created_topping += 1
                    self.stdout.write(f"  Created topping: {ing.name}")

                if not ing.tags.filter(id=topping_tag.id).exists() and not dry_run:
                    ing.tags.add(topping_tag)

                if not dry_run:
                    knapp_g, normal_g, uppig_g = portions
                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name="Belag knapp",
                        defaults={
                            "measuring_unit": g_unit,
                            "quantity": knapp_g,
                            "weight_g": knapp_g,
                            "rank": 2,
                        },
                    )
                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name="Belag normal",
                        defaults={
                            "measuring_unit": g_unit,
                            "quantity": normal_g,
                            "weight_g": normal_g,
                            "rank": 1,
                        },
                    )
                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name="Belag üppig",
                        defaults={
                            "measuring_unit": g_unit,
                            "quantity": uppig_g,
                            "weight_g": uppig_g,
                            "rank": 3,
                        },
                    )
                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name=f"Packung ({package_g}g)",
                        defaults={
                            "measuring_unit": g_unit,
                            "quantity": package_g,
                            "weight_g": package_g,
                            "rank": 4,
                        },
                    )

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Failed topping {name}: {e}"))

        # ── Drink ingredients (tagged breakfast-drink, standalone food) ────
        for name, slug, energy_kcal, protein_g, carb_g, fat_g, sugar_g in DRINK_INGREDIENTS:
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
                        "sugar_g": sugar_g,
                        "fibre_g": 0.0,
                        "salt_g": 0.1,
                    },
                )
                if created:
                    created_drink_ing += 1
                    self.stdout.write(f"  Created drink ingredient: {ing.name}")

                if not ing.tags.filter(id=drink_tag.id).exists() and not dry_run:
                    ing.tags.add(drink_tag)

                if not dry_run:
                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name="1 Portion",
                        defaults={
                            "measuring_unit": ml_unit,
                            "quantity": 200,
                            "weight_g": 200,
                            "rank": 1,
                        },
                    )
                    Portion.objects.get_or_create(
                        ingredient=ing,
                        name="1 Liter",
                        defaults={
                            "measuring_unit": ml_unit,
                            "quantity": 1000,
                            "weight_g": 1000,
                            "rank": 2,
                        },
                    )

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Failed drink ingredient {name}: {e}"))

        # ── Drink recipes ──────────────────────────────────────────────────
        for title, slug, energy_kcal, protein_g, carb_g, fat_g, sugar_g in DRINK_RECIPES:
            try:
                recipe, created = Recipe.objects.get_or_create(
                    slug=slug,
                    defaults={
                        "title": title,
                        "recipe_type": "drink",
                        "status": "approved",
                        "portions": 1,
                        "description": "",
                        "difficulty": "easy",
                        "execution_time": "less_5",
                    },
                )
                if created:
                    created_drink_recipe += 1
                    self.stdout.write(f"  Created drink recipe: {recipe.title}")

                recipe.cached_energy_total_kcal = energy_kcal
                recipe.cached_energy_kcal = energy_kcal
                recipe.cached_protein_g = protein_g
                recipe.cached_carbohydrate_g = carb_g
                recipe.cached_fat_g = fat_g
                recipe.cached_sugar_g = sugar_g

                if not recipe.tags.filter(id=drink_tag.id).exists() and not dry_run:
                    recipe.tags.add(drink_tag)

                if not dry_run:
                    recipe.save(
                        update_fields=[
                            "cached_energy_total_kcal",
                            "cached_energy_kcal",
                            "cached_protein_g",
                            "cached_carbohydrate_g",
                            "cached_fat_g",
                            "cached_sugar_g",
                        ]
                    )

                # Kakao gets RecipeItems (Kakaopulver + Milch)
                if slug == "kakao" and created and not dry_run:
                    kakaopulver = Ingredient.objects.filter(name="Kakaopulver").first()
                    milch = Ingredient.objects.filter(name="Milch").first()
                    if kakaopulver:
                        portion, _ = Portion.objects.get_or_create(
                            ingredient=kakaopulver,
                            name="20g",
                            defaults={"measuring_unit": g_unit, "quantity": 20, "weight_g": 20},
                        )
                        RecipeItem.objects.create(
                            recipe=recipe, ingredient=kakaopulver, portion=portion, quantity=1, sort_order=0
                        )
                    if milch:
                        portion, _ = Portion.objects.get_or_create(
                            ingredient=milch,
                            name="200ml",
                            defaults={"measuring_unit": ml_unit, "quantity": 200, "weight_g": 200},
                        )
                        RecipeItem.objects.create(
                            recipe=recipe, ingredient=milch, portion=portion, quantity=1, sort_order=1
                        )

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  Failed drink recipe {title}: {e}"))

        # ── Summary ────────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS("\nBreakfast catalog seed complete"))
        self.stdout.write(f"  Base ingredients: {created_base} created")
        self.stdout.write(f"  Topping ingredients: {created_topping} created")
        self.stdout.write(f"  Drink ingredients: {created_drink_ing} created")
        self.stdout.write(f"  Drink recipes: {created_drink_recipe} created")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry run - no changes made."))
