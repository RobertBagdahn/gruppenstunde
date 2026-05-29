"""AI-powered ingredient suggestion for recipes (Gemini Flash).

Suggests ingredients, matches them against the DB, assigns portions,
and estimates realistic quantities per person.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from django.conf import settings
from django.contrib.auth.models import AbstractBaseUser
from django.utils.text import slugify
from pydantic import BaseModel, Field

from core.services.gemini import gemini_call

if TYPE_CHECKING:
    from recipe.models import Recipe

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash-lite"


# ---------------------------------------------------------------------------
# Pydantic schemas for Gemini structured output
# ---------------------------------------------------------------------------


class AiIngredientSuggestion(BaseModel):
    """Single ingredient suggestion from Gemini."""

    name: str = Field(description="Name der Zutat auf Deutsch")
    estimated_grams: float = Field(
        ge=0, description="Geschätzte Menge in Gramm für 1 Person"
    )


class AiIngredientsOutput(BaseModel):
    """Gemini response: list of suggested ingredients."""

    items: list[AiIngredientSuggestion] = Field(
        description="Liste der vorgeschlagenen Zutaten mit Gramm-Mengen pro Person"
    )


# ---------------------------------------------------------------------------
# Result dataclass for matched ingredients
# ---------------------------------------------------------------------------


class MatchedIngredientResult:
    """Result of matching + portion assignment for one ingredient."""

    def __init__(
        self,
        ingredient_id: int,
        ingredient_name: str,
        portion_id: int | None,
        portion_name: str | None,
        quantity: float,
        measuring_unit_id: int | None,
        measuring_unit_name: str | None,
        is_new_ingredient: bool = False,
    ):
        self.ingredient_id = ingredient_id
        self.ingredient_name = ingredient_name
        self.portion_id = portion_id
        self.portion_name = portion_name
        self.quantity = quantity
        self.measuring_unit_id = measuring_unit_id
        self.measuring_unit_name = measuring_unit_name
        self.is_new_ingredient = is_new_ingredient


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class RecipeAiIngredientsService:
    """Service for AI-powered recipe ingredient suggestions."""

    def suggest_ingredients(self, recipe: "Recipe", user: AbstractBaseUser | None = None) -> AiIngredientsOutput | None:
        """Call Gemini to suggest ingredients for a recipe.

        Returns structured output with ingredient names and estimated grams per person.
        """
        prompt = self._build_suggest_prompt(recipe)

        try:
            from google.genai import types

            response = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AiIngredientsOutput,
                ),
                context="ai_ingredients",
            )
            if response is None:
                return None
            result = AiIngredientsOutput.model_validate_json(response.text)
            logger.info(
                "AI ingredients suggestion for recipe '%s': %d items",
                recipe.title,
                len(result.items),
            )
            return result

        except Exception:
            logger.warning(
                "AI ingredients suggestion failed for recipe '%s'",
                recipe.title,
                exc_info=True,
            )
            return None

    def match_ingredients(
        self, suggestions: list[AiIngredientSuggestion]
    ) -> list[tuple[AiIngredientSuggestion, int, bool]]:
        """Match suggested ingredient names against the database.

        Returns list of (suggestion, ingredient_id, is_new) tuples.
        Creates missing ingredients with status='draft'.
        """
        from supply.choices import IngredientStatusChoices
        from supply.models import Ingredient, IngredientAlias

        results: list[tuple[AiIngredientSuggestion, int, bool]] = []

        for suggestion in suggestions:
            name_lower = suggestion.name.strip().lower()
            slug = slugify(suggestion.name)

            # Try exact name match (case-insensitive)
            ingredient = Ingredient.objects.filter(name__iexact=name_lower).first()

            # Try slug match
            if not ingredient:
                ingredient = Ingredient.objects.filter(slug=slug).first()

            # Try alias match
            if not ingredient:
                alias = IngredientAlias.objects.filter(
                    name__iexact=name_lower
                ).select_related("ingredient").first()
                if alias:
                    ingredient = alias.ingredient

            # Try contains match as fallback
            if not ingredient:
                ingredient = Ingredient.objects.filter(
                    name__icontains=name_lower
                ).first()

            if ingredient:
                results.append((suggestion, ingredient.id, False))
            else:
                # Create new ingredient
                new_ingredient = Ingredient.objects.create(
                    name=suggestion.name.strip(),
                    slug=slug,
                    status=IngredientStatusChoices.DRAFT,
                )
                results.append((suggestion, new_ingredient.id, True))

        return results

    def assign_portions(
        self, matched: list[tuple[AiIngredientSuggestion, int, bool]]
    ) -> list[MatchedIngredientResult]:
        """Assign best portion for each matched ingredient and calculate quantity.

        Logic:
        1. Use is_default=True portion if available
        2. Otherwise use lowest priority value
        3. If no portions exist, create a "Gramm" portion
        """
        from supply.models import Ingredient, MeasuringUnit, Portion

        results: list[MatchedIngredientResult] = []

        for suggestion, ingredient_id, is_new in matched:
            ingredient = Ingredient.objects.get(id=ingredient_id)

            # Find best portion
            portion = (
                Portion.objects.filter(ingredient_id=ingredient_id, is_default=True)
                .select_related("measuring_unit")
                .first()
            )

            if not portion:
                portion = (
                    Portion.objects.filter(ingredient_id=ingredient_id)
                    .select_related("measuring_unit")
                    .order_by("priority", "-rank")
                    .first()
                )

            if not portion:
                # Create "Gramm" fallback portion
                gramm_unit, _ = MeasuringUnit.objects.get_or_create(
                    name="g",
                    defaults={"description": "Gramm", "quantity": 1.0},
                )
                portion = Portion.objects.create(
                    name="Gramm",
                    ingredient=ingredient,
                    measuring_unit=gramm_unit,
                    quantity=1.0,
                    weight_g=1.0,
                    is_default=True,
                    priority=1,
                )

            # Calculate quantity
            weight_g = portion.weight_g if portion.weight_g and portion.weight_g > 0 else 1.0
            quantity = round(suggestion.estimated_grams / weight_g, 2)

            results.append(
                MatchedIngredientResult(
                    ingredient_id=ingredient_id,
                    ingredient_name=ingredient.name,
                    portion_id=portion.id,
                    portion_name=str(portion),
                    quantity=quantity,
                    measuring_unit_id=portion.measuring_unit_id,
                    measuring_unit_name=portion.measuring_unit.name if portion.measuring_unit else None,
                    is_new_ingredient=is_new,
                )
            )

        return results

    def get_full_suggestions(self, recipe: "Recipe", user: AbstractBaseUser | None = None) -> list[MatchedIngredientResult] | None:
        """Full pipeline: suggest → match → assign portions."""
        ai_output = self.suggest_ingredients(recipe, user=user)
        if not ai_output or not ai_output.items:
            return None

        matched = self.match_ingredients(ai_output.items)
        return self.assign_portions(matched)

    def _build_suggest_prompt(self, recipe: "Recipe") -> str:
        """Build prompt for ingredient suggestion."""
        parts = [
            "Du bist ein erfahrener Koch und Ernährungsexperte. ",
            f'Für das Rezept "{recipe.title}"',
        ]

        if recipe.recipe_type:
            parts.append(f" (Typ: {recipe.recipe_type})")

        if recipe.description:
            parts.append(f"\nBeschreibung: {recipe.description}")

        parts.append(
            "\n\nGib eine vollständige Zutatenliste mit realistischen Gramm-Mengen "
            "für EINE Person an. Orientierung:\n"
            "- Sättigungsbeilagen (Nudeln, Reis, Kartoffeln): 100-200g\n"
            "- Gemüse/Obst: 80-200g\n"
            "- Fleisch/Fisch: 100-150g\n"
            "- Milchprodukte (Joghurt, Quark): 100-200g\n"
            "- Käse: 30-60g\n"
            "- Eier: 50-60g pro Ei\n"
            "- Gewürze/Kräuter: 1-5g\n"
            "- Öle/Butter: 5-15g\n"
            "- Flüssigkeiten (Milch, Brühe): 100-250ml\n\n"
            "Verwende deutsche Standard-Zutatennamen (z.B. 'Joghurt', 'Knoblauch', "
            "'Olivenöl', nicht 'griechischer Joghurt' oder 'natives Olivenöl extra').\n"
            "Gib nur die Zutaten zurück, keine Anleitung."
        )

        return "".join(parts)


# ---------------------------------------------------------------------------
# Pydantic schemas for quantity estimation (existing items)
# ---------------------------------------------------------------------------


class AiQuantityEstimate(BaseModel):
    """Single quantity estimate from Gemini for an existing recipe item."""

    item_id: int = Field(description="ID des RecipeItems")
    estimated_grams_per_person: float = Field(
        ge=0, description="Geschätzte Menge in Gramm für 1 Person"
    )


class AiQuantityEstimatesOutput(BaseModel):
    """Gemini response: estimated quantities for existing recipe items."""

    items: list[AiQuantityEstimate] = Field(
        description="Liste der geschätzten Mengen pro Item"
    )


# ---------------------------------------------------------------------------
# Quantity estimation for existing items
# ---------------------------------------------------------------------------


class RecipeQuantityEstimationService:
    """Estimates realistic quantities for existing recipe items via Gemini."""

    def estimate_quantities(
        self, recipe: "Recipe", user: Any = None
    ) -> list[dict] | None:
        """Estimate quantities for all existing recipe items.

        Returns list of dicts with item_id, ingredient_name,
        quantity_per_person, quantity_total, unit.
        """
        from recipe.models import RecipeItem

        items = list(
            RecipeItem.objects.filter(recipe=recipe)
            .select_related("portion", "portion__ingredient", "portion__measuring_unit")
            .order_by("sort_order")
        )

        if not items:
            return None

        prompt = self._build_estimate_prompt(recipe, items)

        try:
            from google.genai import types

            response = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AiQuantityEstimatesOutput,
                ),
                context="ai_quantity_estimation",
            )
            if response is None:
                return None

            result = AiQuantityEstimatesOutput.model_validate_json(response.text)
            logger.info(
                "AI quantity estimation for recipe '%s': %d items",
                recipe.title,
                len(result.items),
            )

            servings = recipe.servings or 1
            return self._build_response(result, items, servings)

        except Exception:
            logger.warning(
                "AI quantity estimation failed for recipe '%s'",
                recipe.title,
                exc_info=True,
            )
            return None

    def _build_response(
        self,
        ai_output: AiQuantityEstimatesOutput,
        items: list,
        servings: int,
    ) -> list[dict]:
        """Build response dicts from AI output."""
        estimates_by_id = {e.item_id: e for e in ai_output.items}
        results = []

        for item in items:
            estimate = estimates_by_id.get(item.id)
            if not estimate:
                continue

            ingredient_name = ""
            if item.portion and item.portion.ingredient:
                ingredient_name = item.portion.ingredient.name

            unit = "g"
            if item.portion and item.portion.measuring_unit:
                unit = item.portion.measuring_unit.name

            # Convert grams to portion-based quantity (minimum 1g)
            weight_g = item.portion.weight_g if item.portion and item.portion.weight_g else 1.0
            estimated_grams = max(estimate.estimated_grams_per_person, 1.0)
            quantity_per_portion = estimated_grams / weight_g

            results.append({
                "item_id": item.id,
                "ingredient_name": ingredient_name,
                "quantity_per_portion": round(quantity_per_portion, 2),
                "unit": unit,
            })

        return results

    def _build_estimate_prompt(self, recipe: "Recipe", items: list) -> str:
        """Build prompt for quantity estimation of existing items."""
        item_lines = []
        for item in items:
            name = ""
            if item.portion and item.portion.ingredient:
                name = item.portion.ingredient.name
            else:
                name = f"Item {item.id}"
            item_lines.append(f"  - id={item.id}: {name}")

        items_str = "\n".join(item_lines)
        servings = recipe.servings or 1

        return (
            "Du bist ein erfahrener Koch und Ernährungsexperte.\n"
            f'Rezept: "{recipe.title}" (für {servings} Portionen)\n'
            f"{f'Beschreibung: {recipe.description}' if recipe.description else ''}\n\n"
            f"Folgende Zutaten sind bereits im Rezept:\n{items_str}\n\n"
            "Schätze für JEDE Zutat eine realistische Menge in Gramm für EINE Person.\n"
            "Orientierung:\n"
            "- Sättigungsbeilagen (Nudeln, Reis, Kartoffeln): 100-200g\n"
            "- Gemüse/Obst: 80-200g\n"
            "- Fleisch/Fisch: 100-150g\n"
            "- Milchprodukte (Joghurt, Quark): 100-200g\n"
            "- Käse: 30-60g\n"
            "- Eier: 50-60g pro Ei\n"
            "- Gewürze/Kräuter: 1-5g\n"
            "- Öle/Butter: 5-15g\n"
            "- Flüssigkeiten (Milch, Brühe): 100-250ml\n\n"
            "Gib die item_id und estimated_grams_per_person für jedes Item zurück."
        )
