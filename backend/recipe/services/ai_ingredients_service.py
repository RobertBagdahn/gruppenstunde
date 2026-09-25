"""AI-powered ingredient suggestion for recipes (Gemini Flash).

Suggests ingredients, matches them against the DB, assigns portions,
and estimates realistic quantities per person.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

from django.contrib.auth.models import AbstractBaseUser
from django.utils.text import slugify
from ninja.errors import HttpError
from pydantic import BaseModel, Field

from core.services.gemini import gemini_call
from supply.services.term_normalization import normalize_term

if TYPE_CHECKING:
    from recipe.models import Recipe

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"


# ---------------------------------------------------------------------------
# Duplicate / trivial detection for "weitere Zutaten" suggestions
# ---------------------------------------------------------------------------

# Words describing state, colour, size or packaging — not the ingredient itself.
_DESCRIPTOR_WORDS = {
    "frisch", "tk", "tiefgekühlt", "trocken", "getrocknet", "geräuchert", "eingelegt",
    "gemahlen", "gerieben", "geröstet", "gekocht", "roh", "ganz", "gehackt", "natur", "bio",
    "aus", "der", "die", "das", "dem", "den", "dose", "glas", "und", "mit", "von", "vom",
    "leitung", "fein", "grob", "klein", "kleine", "groß", "große", "mittel",
    "rot", "rote", "roter", "gelb", "gelbe", "gelber", "grün", "grüne", "grüner",
    "weiß", "weiße", "weißer", "schwarz", "schwarze", "schwarzer",
}  # fmt: skip

# Compound heads where any two variants count as the same ingredient
# (a recipe rarely needs a second salt or a second cooking oil).
_GROUP_HEADS = tuple(normalize_term(w) for w in ("salz", "öl"))

_TRIVIAL_WORDS = {"wasser", "leitungswasser", "trinkwasser", "eiswürfel", "eis"}

_UUID_PLACEHOLDER = re.compile(r"\{[0-9a-fA-F-]{32,36}\}")


def _core_stems(name: str) -> set[str]:
    """Stemmed core words of an ingredient name (descriptors removed)."""
    words = re.findall(r"[a-zäöüß]+", name.lower())
    return {normalize_term(w) for w in words if w not in _DESCRIPTOR_WORDS and len(w) >= 3}


def is_duplicate_ingredient_name(name: str, existing_names: list[str]) -> bool:
    """True if `name` denotes an ingredient that is already among `existing_names`.

    Matches identical core words and German compound heads, so "Reis trocken"
    counts as duplicate of "Langkornreis" and "Zwiebel frisch" of "Speisezwiebel".
    Salt and oil variants are grouped ("Meersalz" vs. "Jodsalz").
    """
    stems = _core_stems(name)
    if not stems:
        return False
    for existing in existing_names:
        for a in stems:
            for b in _core_stems(existing):
                if a == b:
                    return True
                short, long_ = (a, b) if len(a) <= len(b) else (b, a)
                if len(short) >= 4 and long_.endswith(short):
                    return True
                if any(a.endswith(head) and b.endswith(head) for head in _GROUP_HEADS):
                    return True
    return False


def is_trivial_ingredient_name(name: str) -> bool:
    """True for ingredients that add no value as a suggestion (e.g. tap water)."""
    words = set(re.findall(r"[a-zäöüß]+", name.lower()))
    return bool(words & _TRIVIAL_WORDS)


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
        ingredient_id: int | None,
        ingredient_name: str,
        portion_id: int | None,
        portion_name: str | None,
        quantity: float,
        measuring_unit_id: int | None,
        measuring_unit_name: str | None,
        is_new_ingredient: bool = False,
        note: str = "",
        replacement_for_item_id: int | None = None,
        replacement_reason: str | None = None,
        replacement_confidence: float | None = None,
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
        self.replacement_for_item_id = replacement_for_item_id
        self.replacement_reason = replacement_reason
        self.replacement_confidence = replacement_confidence


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class RecipeAiIngredientsService:
    """Service for AI-powered recipe ingredient suggestions."""

    def suggest_ingredients(
        self, recipe: Recipe, user: AbstractBaseUser | None = None
    ) -> tuple[AiIngredientsOutput | None, str | None]:
        """Call Gemini to suggest ingredients for a recipe.

        Returns (structured output, ai_interaction_id).
        """
        prompt = self._build_suggest_prompt(recipe, user)

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
                return None, None
            result = AiIngredientsOutput.model_validate_json(response.text)
            logger.info(
                "AI ingredients suggestion for recipe '%s': %d items",
                recipe.title,
                len(result.items),
            )
            return result, str(interaction_id) if interaction_id else None

        except HttpError:
            raise
        except Exception:
            logger.warning(
                "AI ingredients suggestion failed for recipe '%s'",
                recipe.title,
                exc_info=True,
            )
            return None, None

    def match_ingredients(
        self,
        suggestions: list[AiIngredientSuggestion],
        *,
        recipe: Recipe | None = None,
        create_missing: bool = True,
        user: AbstractBaseUser | None = None,
    ) -> list[MatchedIngredientResult]:
        """Match suggested ingredient names via IngredientMatcher.

        Returns a MatchedIngredientResult per suggestion. When `recipe` is
        given, replacement context (generic-to-concrete mappings) is resolved
        via the matcher.

        With `create_missing=False` (preview mode) unmatched names are NOT
        persisted — unresolved candidates keep `ingredient_id=None` and
        `is_new_ingredient=True` so the caller can surface them without
        leaving draft Ingredient rows behind.
        """
        from recipe.services.ingredient_matcher import IngredientMatcher

        results: list[MatchedIngredientResult] = []

        for suggestion in suggestions:
            raw_name = suggestion.name.strip()
            match_result = IngredientMatcher.match(raw_name, user, recipe=recipe)

            ingredient_id = match_result.ingredient_id
            ingredient_name = match_result.name if match_result.name else raw_name
            is_new = match_result.is_new
            note = match_result.note

            if not ingredient_id:
                existing = self._resolve_existing_ingredient(raw_name, match_result)
                if existing:
                    ingredient_id = existing.id
                    ingredient_name = existing.name
                    is_new = False
                elif create_missing:
                    ingredient_id, ingredient_name, is_new = self._create_draft_ingredient(raw_name, user)
                else:
                    is_new = True

            results.append(
                MatchedIngredientResult(
                    ingredient_id=ingredient_id,
                    ingredient_name=ingredient_name if ingredient_id else raw_name,
                    portion_id=None,
                    portion_name=None,
                    quantity=suggestion.estimated_grams,
                    measuring_unit_id=None,
                    measuring_unit_name=None,
                    is_new_ingredient=is_new,
                    note=note,
                    replacement_for_item_id=match_result.replacement_for_item_id,
                    replacement_reason=match_result.replacement_reason,
                    replacement_confidence=match_result.replacement_confidence,
                )
            )

        return results

    @staticmethod
    def _resolve_existing_ingredient(raw_name: str, match_result) -> Any:
        """Resolve an existing Ingredient by exact name, alias or slug."""
        from supply.models import Ingredient, IngredientAlias

        clean_name = match_result.name.strip() if match_result.name else raw_name
        existing = (
            Ingredient.objects.filter(name__iexact=raw_name, deleted_at__isnull=True)
            .order_by("-usage_count", "id")
            .first()
            or Ingredient.objects.filter(name__iexact=clean_name, deleted_at__isnull=True)
            .order_by("-usage_count", "id")
            .first()
        )
        if not existing:
            alias = (
                IngredientAlias.objects.filter(name__iexact=clean_name)
                .select_related("ingredient")
                .filter(ingredient__deleted_at__isnull=True)
                .first()
                or IngredientAlias.objects.filter(name__iexact=raw_name)
                .select_related("ingredient")
                .filter(ingredient__deleted_at__isnull=True)
                .first()
            )
            if alias:
                existing = alias.ingredient

        base_slug = slugify(raw_name) or slugify(clean_name) or "zutat"
        if not existing and base_slug:
            existing = Ingredient.objects.filter(slug=base_slug, deleted_at__isnull=True).first()

        return existing

    @staticmethod
    def _create_draft_ingredient(raw_name: str, user: AbstractBaseUser | None = None) -> tuple[int, str, bool]:
        """Create a draft Ingredient for an unresolved name. Returns (id, name, True)."""
        from supply.choices import IngredientStatusChoices
        from supply.models import Ingredient

        base_slug = slugify(raw_name) or "zutat"
        slug = base_slug
        counter = 1
        while Ingredient.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        new_ingredient = Ingredient.objects.create(
            name=raw_name,
            slug=slug,
            status=IngredientStatusChoices.DRAFT,
            created_by=user if user is not None and user.is_authenticated else None,
        )
        return new_ingredient.id, new_ingredient.name, True

    def assign_portions(
        self,
        matched: list[MatchedIngredientResult],
        *,
        create_missing: bool = True,
    ) -> list[MatchedIngredientResult]:
        """Assign best portion for each matched ingredient and calculate quantity.

        Logic:
        1. Use rank=1 portion (Normalportion/default) if available
        2. Otherwise use first portion by rank
        3. If no portions exist: create a "g" (Gramm) fallback portion when
           `create_missing` is True; otherwise leave portion_id=None so the
           caller can surface an unresolved candidate without persisting data.
        """
        from supply.models import Ingredient, MeasuringUnit, Portion

        for result in matched:
            if result.ingredient_id is None:
                continue

            ingredient = Ingredient.objects.get(id=result.ingredient_id)

            # Find best portion: rank=1 is the Normalportion
            portion = (
                Portion.objects.filter(ingredient_id=result.ingredient_id, rank=1, deleted_at__isnull=True)
                .select_related("measuring_unit")
                .first()
            )

            if not portion:
                # Fallback: get any portion ordered by rank
                portion = (
                    Portion.objects.filter(ingredient_id=result.ingredient_id, deleted_at__isnull=True)
                    .select_related("measuring_unit")
                    .order_by("rank")
                    .first()
                )

            if not portion:
                if not create_missing:
                    continue
                # Create "g" fallback portion
                gramm_unit, _ = MeasuringUnit.objects.get_or_create(
                    name="g",
                    defaults={"description": "Gramm", "quantity": 1.0, "unit": "g"},
                )
                portion = Portion.objects.filter(
                    ingredient=ingredient,
                    name="g",
                    deleted_at__isnull=True,
                ).first()
                if not portion:
                    portion = Portion.objects.create(
                        name="g",
                        ingredient=ingredient,
                        measuring_unit=gramm_unit,
                        quantity=1.0,
                        weight_g=1.0,
                        rank=1,
                    )

            # Calculate quantity
            from supply.services.portion_resolution import resolve_trusted_weight

            weight_g = resolve_trusted_weight(portion)
            if weight_g is None:
                continue
            result.portion_id = portion.id
            result.portion_name = str(portion)
            result.quantity = round(result.quantity / weight_g, 2)
            result.measuring_unit_id = portion.measuring_unit_id
            result.measuring_unit_name = portion.measuring_unit.name if portion.measuring_unit else None

        return matched

    def get_full_suggestions(
        self, recipe: Recipe, user: AbstractBaseUser | None = None
    ) -> tuple[list[MatchedIngredientResult] | None, str | None]:
        """Full pipeline: suggest → match → assign portions → filter existing.

        Runs in preview mode: unresolved candidates are returned without
        persisting draft Ingredient or Portion rows. Replacement candidates
        (generic-to-concrete mappings against existing RecipeItems) are
        annotated via the matcher and kept so the caller can offer a direct
        `Ersetzen` action instead of adding a duplicate.

        Returns (results, ai_interaction_id).
        """
        ai_output, interaction_id = self.suggest_ingredients(recipe, user=user)
        if not ai_output or not ai_output.items:
            return None, interaction_id

        matched = self.match_ingredients(ai_output.items, recipe=recipe, create_missing=False, user=user)
        results = self.assign_portions(matched, create_missing=False)

        # Filter out ingredients already present in the recipe (by id and by
        # name/compound overlap, e.g. "Reis trocken" vs. "Langkornreis") as a
        # safety net in case the model ignores the exclusion list in the prompt.
        existing_ids, existing_names = self._existing_ingredients(recipe)
        results = [
            r
            for r in results
            if r.replacement_for_item_id is not None
            or (
                r.ingredient_id not in existing_ids
                and not is_duplicate_ingredient_name(r.ingredient_name, existing_names)
                and not (existing_names and is_trivial_ingredient_name(r.ingredient_name))
            )
        ]

        return results, interaction_id

    @staticmethod
    def _existing_ingredients(recipe: Recipe) -> tuple[set[int], list[str]]:
        """Return (ingredient ids, ingredient names) already used in the recipe."""
        from recipe.models import RecipeItem

        rows = (
            RecipeItem.objects.filter(recipe=recipe, portion__isnull=False)
            .order_by("sort_order", "id")
            .values_list("portion__ingredient_id", "portion__ingredient__name")
        )
        ids: set[int] = set()
        names: list[str] = []
        for ingredient_id, name in rows:
            if ingredient_id is None or ingredient_id in ids:
                continue
            ids.add(ingredient_id)
            if name:
                names.append(name)
        return ids, names

    def _build_suggest_prompt(self, recipe: Recipe, user: AbstractBaseUser | None = None) -> str:
        """Build prompt for ingredient suggestion."""
        parts = [
            "Du bist ein erfahrener Koch und Ernährungsexperte. ",
            f'Für das Rezept "{recipe.title}"',
        ]

        if recipe.recipe_type:
            parts.append(f" (Typ: {recipe.recipe_type})")

        if recipe.summary:
            parts.append(f"\nKurzbeschreibung: {recipe.summary}")

        if recipe.description:
            parts.append(f"\nBeschreibung: {recipe.description}")

        steps = [
            _UUID_PLACEHOLDER.sub("Zutat", step.instruction).strip()
            for step in recipe.steps.order_by("sort_order", "id")
            if step.instruction.strip()
        ]
        if steps:
            parts.append("\nZubereitung:\n" + "\n".join(f"{i}. {step}" for i, step in enumerate(steps, 1)))

        _, existing_names = self._existing_ingredients(recipe)
        if existing_names:
            parts.append(self._build_extend_instructions(existing_names))
        else:
            parts.append(self._build_full_list_instructions())

        from core.services.prompt_context import build_prompt_context

        context_block = build_prompt_context(user)
        if context_block:
            parts.append(f"\n\n{context_block}")

        return "".join(parts)

    @staticmethod
    def _build_extend_instructions(existing_names: list[str]) -> str:
        """Instructions for extending a recipe that already has ingredients."""
        existing_list = "\n".join(f"- {name}" for name in existing_names)
        return (
            "\n\nDas Rezept enthält BEREITS diese Zutaten:\n"
            f"{existing_list}\n\n"
            "AUFGABE: Schlage ausschließlich NEUE, ergänzende Zutaten vor, die das Rezept "
            "sinnvoll erweitern und geschmacklich abrunden. Passend zum Gericht sind z.B. "
            "weitere Gemüsesorten, frische Kräuter, Gewürze, Aromaten (Knoblauch, Ingwer, Chili), "
            "Säure (Zitrone, Essig), Toppings (Nüsse, Saaten, Käse) oder eine passende Proteinquelle.\n\n"
            "STRENG VERBOTEN:\n"
            "- Jede Zutat aus der obigen Liste erneut vorzuschlagen – auch nicht in anderer "
            "Schreibweise, Sorte, Form oder als Ober-/Unterbegriff (ist 'Langkornreis' "
            "vorhanden, KEIN 'Reis trocken'; ist 'Speisezwiebel' vorhanden, KEINE 'Zwiebel frisch'; "
            "ist 'Jodsalz' vorhanden, KEIN weiteres Salz; ist ein Öl vorhanden, KEIN weiteres Bratöl)\n"
            "- Wasser, Leitungswasser, Trinkwasser oder Eiswürfel\n"
            "- Zutaten, die nicht zum Gericht passen\n\n"
            "Schlage 3 bis 8 Zutaten vor, die wirklich einen Mehrwert bringen. Gib realistische "
            "Gramm-Mengen für EINE Person an (Gemüse: 50-150g, Gewürze/Kräuter: 1-5g, "
            "Toppings: 10-30g, Protein: 80-150g).\n\n"
            "REGELN FÜR ZUTATENNAMEN:\n"
            "- Jeder Name MUSS eine Zustandsform enthalten: frisch, TK, getrocknet, geräuchert, "
            "aus der Dose, eingelegt, gemahlen, gerieben, geröstet\n"
            "- Richtig: 'Paprika rot frisch', 'Knoblauch frisch', 'Schwarzer Pfeffer gemahlen'\n"
            "- VERBOTEN: Zutaten mit 'und' im Namen (nie 'Salz und Pfeffer' — stattdessen zwei "
            "getrennte Zutaten)\n"
            "Gib nur die Zutaten zurück, keine Anleitung."
        )

    @staticmethod
    def _build_full_list_instructions() -> str:
        """Instructions for a recipe without any ingredients yet."""
        return (
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
        self,
        recipe: Recipe,
        user: Any = None,
        *,
        bypass_limits: bool = False,
        is_background: bool = False,
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

            response, _ = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AiQuantityEstimatesOutput,
                ),
                context="ai_quantity_estimation",
                bypass_limits=bypass_limits,
                is_background=is_background,
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
        from supply.services.portion_resolution import is_pre_weighed_metric_portion, resolve_trusted_weight

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
                    "AI quantity estimation: no active rank=1 portion for item %s (ingredient '%s') — skipping",
                    item.id,
                    ingredient_name,
                )
                continue

            # Unresolved piece weights (unknown/AI-proposed) cannot serve as a
            # conversion base — the portion must be confirmed first.
            trusted_weight = resolve_trusted_weight(target_portion)
            if trusted_weight is None:
                logger.warning(
                    "AI quantity estimation: portion %s (%s) has no trusted weight — skipping item %s",
                    target_portion.id,
                    target_portion.name,
                    item.id,
                )
                continue

            # Composite-portion labeling rule (same as frontend normalizeItems(),
            # fixed for recipe #434): portions with quantity != 1 are pre-scaled
            # conversion factors (e.g. "1 Portion Nudeln" = 125g). Their own name
            # MUST be used as the label — using the underlying measuring_unit
            # name ("Gramm") is misleading, since quantity_per_portion here is a
            # count of that portion, not a gram amount.
            if target_portion.name and (target_portion.quantity != 1 or is_pre_weighed_metric_portion(target_portion)):
                unit = target_portion.name
            elif target_portion.measuring_unit:
                unit = target_portion.measuring_unit.name
            else:
                unit = "g"

            # Use the trusted weight as the conversion base.
            weight_g = trusted_weight

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
                    "weight_status": target_portion.weight_status,
                    "is_weight_trusted": True,
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
            item_lines.append(f"  - id={item.id}: {name} (aktuelle Menge: {item.quantity})")

        items_str = "\n".join(item_lines)
        servings = recipe.portions or 1

        return (
            "Du bist ein erfahrener Koch und Ernährungsexperte.\n"
            f'Rezept: "{recipe.title}" (für {servings} Portionen)\n'
            f"{f'Beschreibung: {recipe.description}' if recipe.description else ''}\n\n"
            f"Folgende Zutaten sind bereits im Rezept:\n{items_str}\n\n"
            "Schätze für JEDE Zutat eine realistische Menge in Gramm für EINE Person.\n"
            "Gib für JEDE aufgeführte item_id genau einen Eintrag zurück. Das gilt auch für "
            "Zutaten mit aktueller Menge 0; 0 bedeutet nicht, dass die Zutat ignoriert werden soll, "
            "sondern dass eine neue realistische Menge vorgeschlagen werden muss.\n"
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
            "Gib ausschließlich die item_id und estimated_grams_per_person für jedes Item zurück."
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
        which may itself be stale/derived from the same bad data). Only
        trusted portion weights are summed; unresolved piece weights do not
        contribute fabricated gram values."""
        from recipe.models import RecipeItem
        from supply.services.portion_resolution import resolve_trusted_weight

        items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient")
        total_g = 0.0
        for item in items:
            if item.portion:
                trusted = resolve_trusted_weight(item.portion)
                if trusted is not None:
                    total_g += item.quantity * trusted
        servings = recipe.portions or 1
        return total_g / servings if servings else total_g

    def is_implausible(self, recipe: Recipe) -> bool:
        low, high = self.PLAUSIBLE_WEIGHT_PER_PORTION_RANGE_G
        weight = self.compute_weight_per_portion_g(recipe)
        return weight <= 0 or weight < low or weight > high

    def check_and_repair_recipe(
        self,
        recipe: Recipe,
        user: Any = None,
        *,
        bypass_limits: bool = False,
        is_background: bool = False,
    ) -> bool:
        """If `recipe`'s total weight per portion is implausible, re-estimate
        realistic quantities via Gemini and persist them automatically
        (portion_id + quantity together, per-item, no manual approval).

        Returns True if the recipe was changed.
        """
        from recipe.models import RecipeItem

        if not self.is_implausible(recipe):
            return False

        results = self.estimate_quantities(recipe, user=user, bypass_limits=bypass_limits, is_background=is_background)
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
