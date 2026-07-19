"""Fix breakfast recipe items and enrich ingredients with missing nutritional data via AI.

Steps:
1. Replace known-wrong RecipeItem ingredients (Milch kalt → Kuhmilch 3.5%, Kaffeweißer → Kuhmilch)
2. AI-enrich ingredients with kcal=None or kcal=0.0
3. Recalculate affected recipe caches
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from content.models import Tag
from recipe.models import Recipe, RecipeItem
from supply.models import Ingredient, Portion

User = get_user_model()

# Ingredients that need AI enrichment (missing kcal data)
INGREDIENTS_TO_ENRICH = [
    184,   # Haferflocken
    1875,  # Margarine
    378,   # Nuss-Nougat-Creme
    931,   # Nuss-Nougat-Creme Bio
    7092,  # Dinkelmehl Type 630
    6986,  # Zarte Haferflocken
    7291,  # Schokodrops backfest
    6987,  # Schoko-Chunks
    6985,  # Whey-Protein Vanille
    131,   # Sesam
    7102,  # Saatenmischung
    5289,  # Kaffeeweißer
    7290,  # Backmalz enzymaktiv
    5397,  # Röstzwiebeln
    152,   # Zimt
]

# (recipe_id, old_portion_id, new_portion_id, new_qty) for RecipeItem fixes
RECIPE_ITEM_FIXES = [
    {
        "recipe_id": 413,
        "old_ingredient_name": "Milch kalt",
        "new_portion_id": 415,  # Kuhmilch 3,5%: "100g Milch" (weight=100g)
        "new_qty": 0.3,  # 30g total (= 0.15 × 200g Glas)
        "note": "Milch kalt → Kuhmilch 3.5% (Schokobrötchen)",
    },
    {
        "recipe_id": 413,
        "old_ingredient_name": "Kaffeeweißer",
        "new_portion_id": 415,  # Kuhmilch 3,5%: "100g Milch"
        "new_qty": 0.02,  # 2g total (= 0.01 × 200ml)
        "note": "Kaffeeweißer → Kuhmilch 3.5% (Schokobrötchen, negligible amount)",
    },
]


class Command(BaseCommand):
    help = "Fix breakfast recipe items and AI-enrich ingredients with missing nutrition."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--skip-ai", action="store_true", help="Skip AI enrichment")
        parser.add_argument("--only", type=str, help="Comma-separated ingredient IDs to enrich")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        skip_ai = options["skip_ai"]

        admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if not admin_user and not skip_ai:
            self.stdout.write(self.style.WARNING("No admin user found, skipping AI enrichment"))
            skip_ai = True

        # ── Step 1: Fix RecipeItems ────────────────────────────────────
        self.stdout.write("\n── Step 1: Fixing wrong RecipeItems ──")
        fixed_items = 0
        for fix in RECIPE_ITEM_FIXES:
            old_ing = Ingredient.objects.filter(name=fix["old_ingredient_name"]).first()
            if not old_ing:
                self.stdout.write(f"  SKIP: ingredient '{fix['old_ingredient_name']}' not found")
                continue
            old_portions = Portion.objects.filter(ingredient=old_ing)
            qs = RecipeItem.objects.filter(
                recipe_id=fix["recipe_id"],
                portion__in=old_portions,
            )
            count = qs.count()
            if count == 0:
                self.stdout.write(f"  SKIP: no RecipeItems with {fix['old_ingredient_name']} in recipe {fix['recipe_id']}")
                continue
            if not dry_run:
                qs.update(portion_id=fix["new_portion_id"], quantity=fix["new_qty"])
            fixed_items += count
            new_port = Portion.objects.get(id=fix["new_portion_id"])
            self.stdout.write(f"  Fixed {count} RecipeItem(s): {fix['old_ingredient_name']} → {new_port.ingredient.name} ({new_port.name})")

        # ── Step 2: AI Enrichment ──────────────────────────────────────
        if not skip_ai:
            self.stdout.write("\n── Step 2: AI Enrichment ──")
            from supply.services.ingredient_ai_suggest_service import suggest_all_fields

            ids_to_enrich = INGREDIENTS_TO_ENRICH
            if options["only"]:
                ids_to_enrich = [int(x) for x in options["only"].split(",")]

            enriched = 0
            skipped = 0
            errors = 0

            for i, ing_id in enumerate(ids_to_enrich, 1):
                try:
                    ing = Ingredient.objects.get(id=ing_id)
                except Ingredient.DoesNotExist:
                    self.stdout.write(f"  [{i}/{len(ids_to_enrich)}] NOT FOUND: id={ing_id}")
                    errors += 1
                    continue

                nutrient_fields = [
                    "energy_kcal", "protein_g", "fat_g", "fat_sat_g",
                    "carbohydrate_g", "sugar_g", "fibre_g", "salt_g",
                ]

                if all(getattr(ing, f) and getattr(ing, f) > 0 for f in nutrient_fields):
                    self.stdout.write(f"  [{i}/{len(ids_to_enrich)}] SKIP: {ing.name} already has data")
                    skipped += 1
                    continue

                if dry_run:
                    self.stdout.write(f"  [{i}/{len(ids_to_enrich)}] WOULD ENRICH: {ing.name} (id={ing_id})")
                    continue

                self.stdout.write(f"  [{i}/{len(ids_to_enrich)}] AI for {ing.name}...")
                try:
                    suggestions = suggest_all_fields(ing, admin_user)
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"    AI call failed: {e}"))
                    errors += 1
                    continue

                updated = False
                for field, value in suggestions.items():
                    if value is not None and hasattr(ing, field):
                        current = getattr(ing, field)
                        if current != value and (current == 0.0 or current is None):
                            setattr(ing, field, value)
                            self.stdout.write(f"    {field}: {current} → {value}")
                            updated = True

                if updated:
                    ing.save()
                    self.stdout.write(f"    ✓ Saved")
                    enriched += 1
                else:
                    self.stdout.write(f"    ⊘ No changes")
                    skipped += 1

            self.stdout.write(f"\n  Enriched: {enriched}, Skipped: {skipped}, Errors: {errors}")

        # ── Step 3: Recalculate recipe caches ───────────────────────────
        self.stdout.write("\n── Step 3: Recalculating recipe caches ──")
        from recipe.services.recipe_checks import recalculate_recipe_cache

        warm_tag = Tag.objects.get(slug="breakfast-warm-meal")
        recipes = Recipe.objects.filter(tags=warm_tag).order_by("title")

        recalc_count = 0
        for recipe in recipes:
            old_kcal = recipe.cached_energy_total_kcal
            if not dry_run:
                recalculate_recipe_cache(recipe)
                recipe.refresh_from_db()
            new_kcal = recipe.cached_energy_total_kcal
            if old_kcal != new_kcal:
                recalc_count += 1
                self.stdout.write(f"  Recalculated: {recipe.title} ({old_kcal} → {new_kcal} kcal)")

        self.stdout.write(f"\n  Recipes with changed kcal: {recalc_count}/{recipes.count()}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN — no changes made."))
        else:
            self.stdout.write(self.style.SUCCESS("\nDone!"))
