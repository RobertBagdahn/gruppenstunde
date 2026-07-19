"""AI-powered ingredient suggestion for recipes (Gemini Flash).

Suggests ingredients, matches them against the DB, assigns portions,
and estimates realistic quantities per person.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from django.contrib.auth.models import AbstractBaseUser
from django.utils.text import slugify
from ninja.errors import HttpError
from pydantic import BaseModel, Field

from core.services.gemini import gemini_call

if TYPE_CHECKING:
    from recipe.models import Recipe

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"


# ---------------------------------------------------------------------------
# Pydantic schemas for Gemini structured output
# ---------------------------------------------------------------------------


class AiIngredientSuggestion(BaseModel):
    """Single ingredient suggestion from Gemini."""

    name: str = Field(description="Name der Zutat auf Deutsch")
    estimated_grams: float = Field(ge=0, description="Geschätzte Menge in Gramm für 1 Person")


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
        note: str = "",
    ):
        self.ingredient_id = ingredient_id
        self.ingredient_name = ingredient_name
        self.portion_id = portion_id
        self.portion_name = portion_name
        self.quantity = quantity
        self.measuring_unit_id = measuring_unit_id
        self.measuring_unit_name = measuring_unit_name
        self.is_new_ingredient = is_new_ingredient
        self.note = note


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class RecipeAiIngredientsService:
    """Service for AI-powered recipe ingredient suggestions."""

    def suggest_ingredients(self, recipe: Recipe, user: AbstractBaseUser | None = None) -> AiIngredientsOutput | None:
        """Call Gemini to suggest ingredients for a recipe.

        Returns structured output with ingredient names and estimated grams per person.
        """
        prompt = self._build_suggest_prompt(recipe)

        try:
            from google.genai import types

            response, interaction_id = gemini_call(
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

        except HttpError:
            raise
        except Exception:
            logger.warning(
                "AI ingredients suggestion failed for recipe '%s'",
                recipe.title,
                exc_info=True,
            )
            return None

    def match_ingredients(
        self, suggestions: list[AiIngredientSuggestion]
    ) -> list[tuple[AiIngredientSuggestion, int, bool, str]]:
        """Match suggested ingredient names via IngredientMatcher.

        Returns list of (suggestion, ingredient_id, is_new, note) tuples.
        Uses the central IngredientMatcher with cascading stages.
        """
        from recipe.services.ingredient_matcher import IngredientMatcher

        results: list[tuple[AiIngredientSuggestion, int, bool, str]] = []

        for suggestion in suggestions:
            raw_name = suggestion.name.strip()
            match_result = IngredientMatcher.match(raw_name)

            if match_result.needs_review and not match_result.ingredient_id:
                from supply.choices import IngredientStatusChoices
                from supply.models import Ingredient
                from django.utils.text import slugify

                slug = slugify(raw_name)
                new_ingredient = Ingredient.objects.create(
                    name=raw_name,
                    slug=slug,
                    status=IngredientStatusChoices.DRAFT,
                )
                results.append((suggestion, new_ingredient.id, True, match_result.note))
                continue

            if match_result.ingredient_id:
                results.append((suggestion, match_result.ingredient_id, match_result.is_new, match_result.note))
            else:
                from supply.choices import IngredientStatusChoices
                from supply.models import Ingredient
                from django.utils.text import slugify

                slug = slugify(raw_name)
                new_ingredient = Ingredient.objects.create(
                    name=raw_name,
                    slug=slug,
                    status=IngredientStatusChoices.DRAFT,
                )
                results.append((suggestion, new_ingredient.id, True, match_result.note))

        return results

    def assign_portions(self, matched: list[tuple[AiIngredientSuggestion, int, bool, str]]) -> list[MatchedIngredientResult]:
        """Assign best portion for each matched ingredient and calculate quantity.

        Logic:
        1. Use rank=1 portion (Normalportion/default) if available
        2. Otherwise use first portion by rank
        3. If no portions exist, create a "g" (Gramm) fallback portion
        """
        from supply.models import Ingredient, MeasuringUnit, Portion

        results: list[MatchedIngredientResult] = []

        for suggestion, ingredient_id, is_new, note in matched:
            ingredient = Ingredient.objects.get(id=ingredient_id)

            # Find best portion: rank=1 is the Normalportion
            portion = (
                Portion.objects.filter(ingredient_id=ingredient_id, rank=1, deleted_at__isnull=True)
                .select_related("measuring_unit")
                .first()
            )

            if not portion:
                # Fallback: get any portion ordered by rank
                portion = (
                    Portion.objects.filter(ingredient_id=ingredient_id, deleted_at__isnull=True)
                    .select_related("measuring_unit")
                    .order_by("rank")
                    .first()
                )

            if not portion:
                # Create "g" fallback portion
                gramm_unit, _ = MeasuringUnit.objects.get_or_create(
                    name="g",
                    defaults={"description": "Gramm", "quantity": 1.0, "unit": "g"},
                )
                portion = Portion.objects.create(
                    name="g",
                    ingredient=ingredient,
                    measuring_unit=gramm_unit,
                    quantity=1.0,
                    weight_g=1.0,
                    rank=1,
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
                    note=note,
                )
            )

        return results

    def get_full_suggestions(
        self, recipe: Recipe, user: AbstractBaseUser | None = None
    ) -> list[MatchedIngredientResult] | None:
        """Full pipeline: suggest → match → assign portions → filter existing."""
        ai_output = self.suggest_ingredients(recipe, user=user)
        if not ai_output or not ai_output.items:
            return None

        matched = self.match_ingredients(ai_output.items)
        results = self.assign_portions(matched)

        # Filter out ingredients already present in the recipe
        from recipe.models import RecipeItem

        existing_ingredient_ids = set(
            RecipeItem.objects.filter(recipe=recipe)
            .select_related("portion__ingredient")
            .values_list("portion__ingredient_id", flat=True)
        )
        results = [r for r in results if r.ingredient_id not in existing_ingredient_ids]

        return results

    def _build_suggest_prompt(self, recipe: Recipe) -> str:
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
            "REGELN FÜR ZUTATENNAMEN:\n"
            "- Jeder Name MUSS eine Zustandsform enthalten: frisch, TK, getrocknet, geräuchert, "
            "aus der Dose, eingelegt, gemahlen, gerieben, geröstet\n"
            "- Richtig: 'Zwiebel frisch', 'Erdbeere TK', 'Fusilli trocken', 'Tomaten aus der Dose'\n"
            "- FALSCH: 'Nudeln', 'Erdbeere', 'Zwiebel' (zu generisch)\n"
            "- VERBOTEN: Zutaten mit 'und' im Namen (nie 'Salz und Pfeffer' — stattdessen zwei "
            "getrennte Zutaten)\n"
            "- Salz, Pfeffer, Wasser NICHT weglassen, sondern konkretisieren und regulär mit "
            "Menge angeben: 'Jodsalz', 'Schwarzer Pfeffer gemahlen', 'Leitungswasser'\n"
            "Gib nur die Zutaten zurück, keine Anleitung."
        )

        return "".join(parts)


# ---------------------------------------------------------------------------
# Pydantic schemas for quantity estimation (existing items)
# ---------------------------------------------------------------------------


class AiQuantityEstimate(BaseModel):
    """Single quantity estimate from Gemini for an existing recipe item."""

    item_id: int = Field(description="ID des RecipeItems")
    estimated_grams_per_person: float = Field(ge=0, description="Geschätzte Menge in Gramm für 1 Person")


class AiQuantityEstimatesOutput(BaseModel):
    """Gemini response: estimated quantities for existing recipe items."""

    items: list[AiQuantityEstimate] = Field(description="Liste der geschätzten Mengen pro Item")


# ---------------------------------------------------------------------------
# Quantity estimation for existing items
# ---------------------------------------------------------------------------


class RecipeQuantityEstimationService:
    """Estimates realistic quantities for existing recipe items via Gemini."""

    def estimate_quantities(
        self, recipe: Recipe, user: Any = None, *, bypass_limits: bool = False,
    ) -> list[dict] | None:
        """Estimate quantities for all existing recipe items.

        Returns list of dicts with item_id, ingredient_name,
        quantity_per_person, quantity_total, unit.

        `bypass_limits=True` skips the auth/rate-limit check in `gemini_call` —
        used by the `repair_portion_integrity` management command, which runs
        without an authenticated request user.
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

            response, interaction_id = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AiQuantityEstimatesOutput,
                ),
                context="ai_quantity_estimation",
                bypass_limits=bypass_limits,
            )
            if response is None:
                return None

            result = AiQuantityEstimatesOutput.model_validate_json(response.text)
            logger.info(
                "AI quantity estimation for recipe '%s': %d items",
                recipe.title,
                len(result.items),
            )

            servings = recipe.portions or 1
            return self._build_response(result, items, servings)

        except HttpError:
            raise
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
        """Build response dicts from AI output.

        Target portion resolution (fix-portion-integrity-and-ai-estimate):
        Always resolves to the ingredient's currently ACTIVE (non-deleted)
        rank=1 portion — never the RecipeItem's stored portion, and never a
        soft-deleted portion. `portion_id` is included in every result so the
        frontend can apply `portion_id` and `quantity_per_portion` atomically
        instead of only overwriting `quantity` on the item's old (potentially
        mismatched or deleted) portion — the root cause of a reproducible data
        corruption bug (see design.md for the recipe #59 "Linsensuppe" case).
        """
        from supply.services.portion_integrity import get_active_rank1_portion

        estimates_by_id = {e.item_id: e for e in ai_output.items}
        results = []

        for item in items:
            estimate = estimates_by_id.get(item.id)
            if not estimate:
                continue

            ingredient_name = ""
            if item.portion and item.portion.ingredient:
                ingredient_name = item.portion.ingredient.name

            target_portion = None
            if item.portion and item.portion.ingredient_id:
                target_portion = get_active_rank1_portion(item.portion.ingredient)

            if target_portion is None:
                # No active rank=1 portion exists for this ingredient (e.g. all
                # candidates soft-deleted) — nothing safe to estimate against.
                logger.warning(
                    "AI quantity estimation: no active rank=1 portion for item %s "
                    "(ingredient '%s') — skipping",
                    item.id,
                    ingredient_name,
                )
                continue

            # Composite-portion labeling rule (same as frontend normalizeItems(),
            # fixed for recipe #434): portions with quantity != 1 are pre-scaled
            # conversion factors (e.g. "1 Portion Nudeln" = 125g). Their own name
            # MUST be used as the label — using the underlying measuring_unit
            # name ("Gramm") is misleading, since quantity_per_portion here is a
            # count of that portion, not a gram amount.
            if target_portion.quantity != 1 and target_portion.name:
                unit = target_portion.name
            elif target_portion.measuring_unit:
                unit = target_portion.measuring_unit.name
            else:
                unit = "g"

            # Convert AI grams into the editable unit. Use consistent logic with
            # assign_portions (line 238): check weight_g > 0, not just falsy.
            # This prevents items with weight_g=0 from incorrectly falling back to 1.0.
            weight_g = target_portion.weight_g if (target_portion.weight_g and target_portion.weight_g > 0) else 1.0

            # Use the AI estimate directly without clamping to 1.0.
            # Small amounts (0.1-0.5g) for spices should pass through unchanged.
            # Clamping contradicts assign_portions (line 239) which uses no clamping.
            estimated_grams = max(estimate.estimated_grams_per_person, 0)

            # Avoid division by zero and ensure we always return a valid quantity
            if estimated_grams <= 0 or weight_g <= 0:
                quantity_per_portion = 1.0
            else:
                quantity_per_portion = estimated_grams / weight_g

            # Total gram equivalent for the resolved quantity_per_portion, so the
            # UI can always show a gram value next to the (possibly non-gram)
            # portion unit — recomputed from quantity_per_portion × weight_g
            # (rather than using estimated_grams directly) so it stays consistent
            # with the rounded quantity_per_portion shown to the user.
            grams_total = round(quantity_per_portion * weight_g, 1)

            results.append(
                {
                    "item_id": item.id,
                    "ingredient_name": ingredient_name,
                    # Clamp away from exactly 0 after rounding: RecipeItem.quantity
                    # has a DB check constraint (> 0). A tiny estimated_grams
                    # against a large weight_g portion could otherwise round to
                    # 0.00 at 2 decimals and fail to save (observed live during
                    # the production repair rollout for a different rebind path —
                    # same class of issue, guarded here too for consistency).
                    "quantity_per_portion": max(round(quantity_per_portion, 2), 0.01),
                    "portion_id": target_portion.id,
                    "unit": unit,
                    "grams_total": grams_total,
                }
            )

        return results

    def _build_estimate_prompt(self, recipe: Recipe, items: list) -> str:
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
        servings = recipe.portions or 1

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

    # -------------------------------------------------------------------
    # Bulk plausibility check + repair (used by `repair_portion_integrity`)
    # -------------------------------------------------------------------

    #: Total recipe weight per portion outside this range is considered
    #: implausible and triggers an automatic AI re-estimate.
    PLAUSIBLE_WEIGHT_PER_PORTION_RANGE_G = (30.0, 1500.0)

    def compute_weight_per_portion_g(self, recipe: Recipe) -> float:
        """Total recipe weight in grams divided by the number of portions,
        computed fresh from RecipeItems (does NOT rely on `cached_weight_g`,
        which may itself be stale/derived from the same bad data)."""
        from recipe.models import RecipeItem

        items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient")
        total_g = 0.0
        for item in items:
            if item.portion and item.portion.weight_g:
                total_g += item.quantity * item.portion.weight_g
        servings = recipe.portions or 1
        return total_g / servings if servings else total_g

    def is_implausible(self, recipe: Recipe) -> bool:
        low, high = self.PLAUSIBLE_WEIGHT_PER_PORTION_RANGE_G
        weight = self.compute_weight_per_portion_g(recipe)
        return weight <= 0 or weight < low or weight > high

    def check_and_repair_recipe(self, recipe: Recipe, user: Any = None, *, bypass_limits: bool = False) -> bool:
        """If `recipe`'s total weight per portion is implausible, re-estimate
        realistic quantities via Gemini and persist them automatically
        (portion_id + quantity together, per-item, no manual approval).

        Returns True if the recipe was changed.
        """
        from recipe.models import RecipeItem

        if not self.is_implausible(recipe):
            return False

        results = self.estimate_quantities(recipe, user=user, bypass_limits=bypass_limits)
        if not results:
            logger.warning("AI plausibility repair: no estimate available for recipe '%s'", recipe.title)
            return False

        changed = False
        for entry in results:
            item = RecipeItem.objects.filter(id=entry["item_id"]).first()
            if not item:
                continue
            if item.portion_id != entry["portion_id"] or item.quantity != entry["quantity_per_portion"]:
                item.portion_id = entry["portion_id"]
                item.quantity = entry["quantity_per_portion"]
                item.save(update_fields=["portion", "quantity"])
                changed = True

        return changed
