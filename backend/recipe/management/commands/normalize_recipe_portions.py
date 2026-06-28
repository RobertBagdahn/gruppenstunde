"""One-time management command: normalize recipe portions using Gemini AI.

Calls Gemini to estimate realistic 1-person portion quantities for all recipes,
updates RecipeItem.quantity values, and recalculates nutritional caches.
"""

from __future__ import annotations

import logging

from django.core.management.base import BaseCommand
from pydantic import BaseModel, Field

from recipe.models import Recipe, RecipeItem
from recipe.services.recipe_checks import recalculate_recipe_cache

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


# ---------------------------------------------------------------------------
# Pydantic schemas for structured output
# ---------------------------------------------------------------------------


class NormalizedItem(BaseModel):
    index: int = Field(description="0-basierter Index der Zutat in der Liste")
    quantity_g: float = Field(description="Realistische Menge in Gramm für 1 Portion")


class NormalizationOutput(BaseModel):
    items: list[NormalizedItem] = Field(description="Korrigierte Mengen für jede Zutat")


# ---------------------------------------------------------------------------
# Command
# ---------------------------------------------------------------------------


class Command(BaseCommand):
    help = "Normalize recipe portions to realistic 1-person amounts using Gemini AI."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show proposed changes without updating the database.",
        )
        parser.add_argument(
            "--recipe-id",
            type=int,
            default=None,
            help="Only normalize a specific recipe by ID.",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        recipe_id: int | None = options["recipe_id"]

        qs = Recipe.objects.prefetch_related("recipe_items__ingredient", "recipe_items__measuring_unit")
        if recipe_id:
            qs = qs.filter(id=recipe_id)

        recipes = list(qs)
        if not recipes:
            self.stdout.write("No recipes found.")
            return

        self.stdout.write(f"{'[DRY RUN] ' if dry_run else ''}Normalizing {len(recipes)} recipes...\n")

        for recipe in recipes:
            self._process_recipe(recipe, dry_run)

    def _process_recipe(self, recipe: Recipe, dry_run: bool) -> None:
        from google.genai import types

        from core.services.gemini import gemini_call

        items = list(recipe.recipe_items.order_by("sort_order", "id"))
        if not items:
            return

        prompt = self._build_prompt(recipe, items)

        try:
            response, _interaction_id = gemini_call(
                user=None,
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=NormalizationOutput,
                ),
                bypass_limits=True,
                context="normalize_portions",
            )
            if response is None:
                self.stderr.write(self.style.WARNING(f"  SKIP {recipe.title} (client unavailable)"))
                return
            result = NormalizationOutput.model_validate_json(response.text)
        except Exception:
            logger.warning("Gemini call failed for recipe %s", recipe.title, exc_info=True)
            self.stderr.write(self.style.WARNING(f"  SKIP {recipe.title} (Gemini error)"))
            return

        # Apply changes
        self.stdout.write(self.style.SUCCESS(f"\n=== {recipe.title} ==="))
        self.stdout.write(f"  {'Zutat':<30} {'Alt':>10} {'Neu':>10}")
        self.stdout.write(f"  {'-'*30} {'-'*10} {'-'*10}")

        changed = False
        for normalized in result.items:
            if normalized.index < 0 or normalized.index >= len(items):
                continue
            item = items[normalized.index]
            old_qty = item.quantity
            new_qty = normalized.quantity_g
            ing_name = item.portion.ingredient.name if item.portion and item.portion.ingredient else "?"

            self.stdout.write(f"  {ing_name:<30} {old_qty:>10.1f} {new_qty:>10.1f}")

            if not dry_run and abs(old_qty - new_qty) > 0.01:
                item.quantity = new_qty
                item.save(update_fields=["quantity"])
                changed = True

        if changed and not dry_run:
            recalculate_recipe_cache(recipe)
            self.stdout.write("  → Cache recalculated")

    def _build_prompt(self, recipe: Recipe, items: list[RecipeItem]) -> str:
        ingredient_lines = []
        for i, item in enumerate(items):
            name = item.portion.ingredient.name if item.portion and item.portion.ingredient else "Unbekannt"
            unit = item.portion.measuring_unit.name if item.portion and item.portion.measuring_unit else "g"
            ingredient_lines.append(f"{i}. {item.quantity:.1f} {unit} {name}")

        ingredients_text = "\n".join(ingredient_lines)
        recipe_type = recipe.recipe_type or "Nicht angegeben"

        return (
            "Du bist ein Ernährungsexperte für deutsche Haushaltsküche. "
            f'Rezept: "{recipe.title}" (Typ: {recipe_type}).\n'
            f"Aktuelle Zutaten (angeblich 1 Portion):\n{ingredients_text}\n\n"
            "Schätze realistische Gramm-Mengen für eine sättigende Einzelportion "
            "eines Erwachsenen. Orientierung:\n"
            "- Sättigungsbeilagen (Nudeln, Reis, Kartoffeln, Brot): 100-200g\n"
            "- Gemüse/Obst: 80-200g\n"
            "- Fleisch/Fisch: 100-150g\n"
            "- Milchprodukte (Käse, Joghurt): 30-150g\n"
            "- Eier: 50-60g pro Ei\n"
            "- Gewürze/Öle/Butter: realistisch klein (1-15g)\n"
            "- Flüssigkeiten (Milch, Brühe): 100-250ml\n"
            "- Das Rezept soll als vollständige Mahlzeit sättigen\n\n"
            "Gib für JEDEN Index die korrigierte Menge in Gramm zurück.\n"
            'Antwortformat JSON: {"items": [{"index": 0, "quantity_g": 150.0}, ...]}'
        )
