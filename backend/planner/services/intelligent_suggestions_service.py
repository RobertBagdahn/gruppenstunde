"""Intelligent recipe suggestions — context-aware scoring and categorization.

Provides the IntelligentSuggestionsService which:
1. Applies hard filters (approved, meal_type, nutritional_tags, already in plan)
2. Scores candidates across 5 dimensions (season, popularity, variety, recency, budget)
3. Categorizes top results into top_picks, variety, discovery
4. Optionally reranks via Gemini
"""

from __future__ import annotations

import datetime as dt
import logging
from collections import Counter
from typing import TYPE_CHECKING

from django.db.models import Count, Max, Q
from django.utils import timezone

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from planner.models import Meal, MealPlan

logger = logging.getLogger(__name__)

# Meal type → allowed recipe types mapping
MEAL_TYPE_TO_RECIPE_TYPES: dict[str, list[str]] = {
    "breakfast": ["breakfast", "drink", "dessert"],
    "lunch": ["warm_meal", "cold_meal", "soup", "salad", "side", "drink"],
    "dinner": ["warm_meal", "cold_meal", "soup", "salad", "side", "drink"],
    "snack": ["snack", "drink", "dessert"],
}

# Scoring weights (total = 100)
SEASON_WEIGHT = 30
POPULARITY_WEIGHT = 25
VARIETY_WEIGHT = 20
RECENCY_WEIGHT = 15
BUDGET_WEIGHT = 10

# Recency: days considered "recently used"
RECENCY_LOOKBACK_DAYS = 60


class ScoredRecipe:
    """A recipe candidate with computed scores."""

    def __init__(self, recipe: Recipe):
        self.recipe = recipe
        self.season_score: float = 0.0
        self.popularity_score: float = 0.0
        self.variety_score: float = 0.0
        self.recency_score: float = 0.0
        self.budget_score: float = 0.0
        self.total_score: float = 0.0
        self.reason: str = "popular"
        self.reason_text: str = ""

    def compute_total(self) -> None:
        self.total_score = (
            self.season_score
            + self.popularity_score
            + self.variety_score
            + self.recency_score
            + self.budget_score
        )

    def set_reason(self) -> None:
        """Determine the primary reason for this suggestion based on which score dimension dominated."""
        scores = {
            "season": self.season_score,
            "popular": self.popularity_score,
            "variety": self.variety_score,
            "budget_friendly": self.budget_score,
        }
        if max(scores.values()) <= 0:
            self.reason = "discovery"
            self.reason_text = "Ein Rezept, das du vielleicht noch nicht kennst"
            return

        best = max(scores, key=scores.get)
        self.reason = best
        reasons = {
            "season": "Hat in dieser Jahreszeit besonders viel Saison",
            "popular": "Das beliebteste Rezept seiner Kategorie",
            "variety": "Eine gute Abwechslung zu den anderen Gerichten",
            "budget_friendly": "Besonders günstig pro Portion",
        }
        self.reason_text = reasons.get(best, "")


class IntelligentSuggestionsService:
    """Generates context-aware recipe suggestions for a meal slot."""

    def __init__(self, meal_plan: MealPlan, meal: Meal, user: AbstractBaseUser):
        self.meal_plan = meal_plan
        self.meal = meal
        self.user = user
        self._already_in_plan_ids: set[int] | None = None
        self._planned_recipe_ingredient_ids: set[int] | None = None
        self._usage_count_max: int | None = None
        self._usage_percentiles: dict[int, float] | None = None

    # ------------------------------------------------------------------
    # Hard filters
    # ------------------------------------------------------------------

    def _get_already_in_plan_recipe_ids(self) -> set[int]:
        """Return recipe IDs already used anywhere in this meal plan."""
        if self._already_in_plan_ids is None:
            from planner.models import MealItem

            ids = (
                MealItem.objects.filter(meal__meal_plan=self.meal_plan, recipe__isnull=False)
                .values_list("recipe_id", flat=True)
                .distinct()
            )
            self._already_in_plan_ids = set(ids)
        return self._already_in_plan_ids

    def _get_planned_ingredient_ids(self) -> set[int]:
        """Return ingredient IDs already used in planned recipes (for variety scoring)."""
        if self._planned_recipe_ingredient_ids is None:
            from planner.models import MealItem
            from recipe.models import RecipeItem

            planned_recipe_ids = (
                MealItem.objects.filter(meal__meal_plan=self.meal_plan, recipe__isnull=False)
                .values_list("recipe_id", flat=True)
                .distinct()
            )
            ingredient_ids = (
                RecipeItem.objects.filter(recipe_id__in=list(planned_recipe_ids), portion__isnull=False)
                .exclude(portion__ingredient__isnull=True)
                .values_list("portion__ingredient_id", flat=True)
                .distinct()
            )
            self._planned_recipe_ingredient_ids = set(ingredient_ids)
        return self._planned_recipe_ingredient_ids

    def _get_candidate_recipes(self) -> list[Recipe]:
        """Return recipes that pass all hard filters.

        Filters:
        - status=approved AND (owner=null OR owner=user)
        - recipe_type matches meal_type
        - not already in this meal plan
        - nutritional_tags match plan tags (if any)
        """
        from content.choices import ContentStatus
        from recipe.models import Recipe

        allowed_types = MEAL_TYPE_TO_RECIPE_TYPES.get(self.meal.meal_type, ["warm_meal"])
        already_planned = self._get_already_in_plan_recipe_ids()

        qs = Recipe.objects.filter(
            status=ContentStatus.APPROVED,
            recipe_type__in=allowed_types,
        ).filter(Q(owner__isnull=True) | Q(owner=self.user))

        if already_planned:
            qs = qs.exclude(id__in=already_planned)

        # Nutritional tags hard filter
        plan_tags = list(self.meal_plan.nutritional_tags.all())
        if plan_tags:
            from recipe.models import RecipeItem
            from supply.models import Ingredient

            tag_ids = [t.id for t in plan_tags]
            # Find all recipes where ALL ingredients have the required tags
            # Subquery: recipe_ids where ANY ingredient lacks a required tag
            bad_recipe_ids = set()
            for recipe in qs.only("id").iterator():
                ingredient_ids = (
                    RecipeItem.objects.filter(recipe=recipe, portion__isnull=False)
                    .exclude(portion__ingredient__isnull=True)
                    .values_list("portion__ingredient_id", flat=True)
                )
                for ing_id in ingredient_ids:
                    ingredient_tags = set(
                        Ingredient.nutritional_tags.through.objects.filter(ingredient_id=ing_id).values_list(
                            "nutritionaltag_id", flat=True
                        )
                    )
                    missing = [tid for tid in tag_ids if tid not in ingredient_tags]
                    if missing:
                        bad_recipe_ids.add(recipe.id)
                        break

            if bad_recipe_ids:
                qs = qs.exclude(id__in=bad_recipe_ids)

        return list(qs)

    # ------------------------------------------------------------------
    # Scoring dimensions
    # ------------------------------------------------------------------

    def _compute_season_score(self, recipe: Recipe, month: int) -> float:
        """Proportion of recipe ingredients in season this month (0.0-1.0)."""
        from recipe.models import RecipeItem

        items = RecipeItem.objects.filter(recipe=recipe, portion__isnull=False).exclude(
            portion__ingredient__isnull=True
        ).select_related("portion__ingredient")

        if not items:
            return 0.0

        in_season = 0
        total = 0
        for item in items:
            ing = item.portion.ingredient
            if ing is None:
                continue
            total += 1
            if ing.seasons.filter(month=month).exists():
                in_season += 1

        if total == 0:
            return 0.0
        return in_season / total

    def _compute_popularity_score(self, recipe: Recipe) -> float:
        """Percentile rank of usage_count (0.0-1.0)."""
        from recipe.models import Recipe

        if self._usage_count_max is None:
            agg = Recipe.objects.aggregate(max_usage=Max("usage_count"))
            self._usage_count_max = agg["max_usage"] or 1

            all_counts = list(
                Recipe.objects.filter(status="approved")
                .values_list("usage_count", flat=True)
                .order_by("usage_count")
            )
            n = len(all_counts)
            self._usage_percentiles = {}
            for i, count in enumerate(all_counts):
                self._usage_percentiles[count] = i / max(n - 1, 1)

        uc = recipe.usage_count or 0
        if uc == 0:
            return 0.0
        # Find the percentile for this usage_count value
        counts = list(self._usage_percentiles.keys())
        for c in reversed(sorted(counts)):
            if uc >= c:
                return self._usage_percentiles[c]
        return 0.0

    def _compute_variety_score(self, recipe: Recipe) -> float:
        """Score based on ingredient overlap with already planned recipes (1.0 = no overlap)."""
        from recipe.models import RecipeItem

        planned_ids = self._get_planned_ingredient_ids()
        if not planned_ids:
            return 1.0

        my_ingredient_ids = set(
            RecipeItem.objects.filter(recipe=recipe, portion__isnull=False)
            .exclude(portion__ingredient__isnull=True)
            .values_list("portion__ingredient_id", flat=True)
        )

        if not my_ingredient_ids:
            return 0.5

        overlap = len(my_ingredient_ids & planned_ids)
        total = len(my_ingredient_ids)
        overlap_ratio = overlap / total

        # Inverse: less overlap = higher score
        return 1.0 - overlap_ratio

    def _compute_recency_score(self, recipe: Recipe) -> float:
        """Score based on days since last use (1.0 = never used or >30 days)."""
        from planner.models import MealItem

        last_use = (
            MealItem.objects.filter(
                recipe=recipe,
                meal__meal_plan__created_by=self.user,
            )
            .order_by("-id")
            .first()
        )

        if last_use is None:
            return 1.0

        now = timezone.now()
        if last_use.meal and last_use.meal.start_datetime:
            days_since = (now - last_use.meal.start_datetime).days
        else:
            days_since = RECENCY_LOOKBACK_DAYS

        if days_since >= RECENCY_LOOKBACK_DAYS:
            return 1.0
        return days_since / RECENCY_LOOKBACK_DAYS

    def _compute_budget_score(self, recipe: Recipe) -> float:
        """Score based on fit within plan budget per person per day (1.0 = within budget)."""
        budget = self.meal_plan.budget_per_person_per_day
        if budget is None:
            return 1.0

        price = recipe.cached_price_total
        if price is None:
            return 0.5

        # Estimate cost per person for this recipe
        portions = recipe.portions or 1
        cost_per_person = float(price) / portions

        budget_float = float(budget)
        # How many meals per day? Assuming 3 main meals, each gets budget/3
        meals_per_day = 3
        meal_budget = budget_float / meals_per_day

        if cost_per_person <= meal_budget:
            return 1.0
        if cost_per_person > meal_budget * 1.5:
            return 0.0
        # Linear interpolation between budget and 1.5× budget
        return 1.0 - (cost_per_person - meal_budget) / (meal_budget * 0.5)

    # ------------------------------------------------------------------
    # Categorization
    # ------------------------------------------------------------------

    def _categorize(self, scored: list[ScoredRecipe]) -> dict[str, list[ScoredRecipe]]:
        """Categorize scored recipes into top_picks, variety, discovery (3 each)."""
        result: dict[str, list[ScoredRecipe]] = {
            "top_picks": [],
            "variety": [],
            "discovery": [],
        }

        if not scored:
            return result

        # Sort by total score descending
        scored.sort(key=lambda s: s.total_score, reverse=True)

        # Keep track of which recipes have been assigned
        assigned_ids: set[int] = set()
        remaining = list(scored)

        # --- top_picks: highest scoring, diverse recipe_types ---
        top_picks_candidates = []
        used_types: set[str] = set()
        for s in remaining:
            if len(top_picks_candidates) >= 3:
                break
            rt = s.recipe.recipe_type
            if rt not in used_types or len(used_types) >= 2:
                top_picks_candidates.append(s)
                assigned_ids.add(s.recipe.id)
                used_types.add(rt)

        # If we couldn't fill 3 with diverse types, fill with next highest
        if len(top_picks_candidates) < 3:
            for s in remaining:
                if len(top_picks_candidates) >= 3:
                    break
                if s.recipe.id not in assigned_ids:
                    top_picks_candidates.append(s)
                    assigned_ids.add(s.recipe.id)

        result["top_picks"] = top_picks_candidates

        # --- variety: minimal ingredient overlap with top_picks ---
        remaining = [s for s in remaining if s.recipe.id not in assigned_ids]
        variety_candidates = []
        for s in remaining:
            if len(variety_candidates) >= 3:
                break
            variety_candidates.append(s)
            assigned_ids.add(s.recipe.id)

        result["variety"] = variety_candidates

        # --- discovery: remaining, with bonus for low usage_count ---
        remaining = [s for s in remaining if s.recipe.id not in assigned_ids]
        # Sort remaining by: low usage_count first (discovery aspect)
        remaining.sort(key=lambda s: s.recipe.usage_count or 0)
        discovery_candidates = []
        for s in remaining:
            if len(discovery_candidates) >= 3:
                break
            s.reason = "discovery"
            s.reason_text = "Ein Geheimtipp, den du vielleicht noch nicht kennst"
            discovery_candidates.append(s)
            assigned_ids.add(s.recipe.id)

        result["discovery"] = discovery_candidates

        return result

    # ------------------------------------------------------------------
    # AI Reranking
    # ------------------------------------------------------------------

    def _build_context(self) -> str:
        """Build enriched context string for the Gemini prompt."""
        parts = []

        # Event context
        event = self.meal_plan.event
        if event:
            parts.append("=== Veranstaltungskontext ===")
            parts.append(f"Titel: {event.name}")
            if event.description:
                parts.append(f"Beschreibung: {event.description}")
            parts.append(f"Zeitraum: {event.start_date} bis {event.end_date}")
            if event.location:
                parts.append(f"Ort: {event.location}")
            parts.append("")

        # MealPlan context
        parts.append("=== Essensplan ===")
        parts.append(f"Titel: {self.meal_plan.name}")
        if self.meal_plan.description:
            parts.append(f"Beschreibung: {self.meal_plan.description}")
        parts.append(f"Mahlzeit: {self.meal.get_meal_type_display()}")
        parts.append(f"Aktueller Monat: {timezone.now().month}")

        # MealPlan tags
        plan_tags = list(self.meal_plan.tags.all())
        if plan_tags:
            tag_names = [t.name for t in plan_tags]
            parts.append(f"Tags vom Nutzer: {', '.join(tag_names)}")
        parts.append("")

        # Nutritional tags
        nutritional_tags = list(self.meal_plan.nutritional_tags.all())
        if nutritional_tags:
            parts.append(f"Ernährungseinschränkungen: {', '.join(t.name for t in nutritional_tags)}")

        # Budget context
        budget = self.meal_plan.budget_per_person_per_day
        if budget:
            parts.append(f"Budget: {budget}€ pro Person und Tag")

        # Already planned meals (full overview)
        parts.append("")
        parts.append("=== Bereits geplante Mahlzeiten ===")
        meals_qs = self.meal_plan.meals.filter(is_reference=False).order_by("start_datetime")
        for m in meals_qs:
            date_str = m.start_datetime.strftime("%a %d.%m.") if m.start_datetime else "?"
            item_titles = [
                item.recipe.title
                for item in m.items.select_related("recipe").all()
                if item.recipe
            ]
            items_str = ", ".join(item_titles) if item_titles else "(leer)"
            parts.append(f"- {date_str} {m.get_meal_type_display()}: {items_str}")
        parts.append("")

        return "\n".join(parts)

    def _ai_rerank(self, scored: list[ScoredRecipe]) -> list[ScoredRecipe] | None:
        """Rerank top candidates via Gemini with enriched context. Returns None if unavailable."""
        try:
            from google.genai import types as genai_types
            from pydantic import BaseModel, Field

            from core.services.gemini import gemini_call

            class AiRerankedSuggestion(BaseModel):
                recipe_id: int = Field(description="ID of the suggested recipe")
                category: str = Field(description="One of: top_pick, variety, discovery")
                reason_text: str = Field(description="Why this recipe fits the current meal context")

            class AiRerankOutput(BaseModel):
                suggestions: list[AiRerankedSuggestion] = Field(
                    description="Exactly 9 reranked recipe suggestions in display order"
                )

            # Build enriched context
            context_str = self._build_context()

            recipes_context = "\n".join(
                f"- ID {s.recipe.id}: {s.recipe.title} ({s.recipe.recipe_type}, {s.recipe.usage_count}x verwendet, {s.total_score:.1f} Punkte)"
                for s in scored[:30]
            )

            prompt = (
                f"Du bist ein Koch-Assistent für Pfadfinder-Lager. Wähle aus den folgenden Rezepten "
                f"die 9 besten für eine bestimmte Mahlzeit aus.\n\n"
                f"{context_str}\n"
                f"Verfügbare Rezepte (nach Eignung sortiert):\n{recipes_context}\n\n"
                f"Wähle genau 9 Rezepte aus. Kategorisiere sie in:\n"
                f"- top_pick: Die besten, passendsten Rezepte für diesen Kontext\n"
                f"- variety: Rezepte, die für Abwechslung sorgen (andere Küche, andere Zutaten)\n"
                f"- discovery: Überraschende, weniger bekannte Rezepte\n\n"
                f"Gib pro Rezept einen kurzen deutschen Grund an (max 1 Satz). "
                f"Berücksichtige bei der Auswahl: Lagertyp, Jahreszeit, Location, bereits Geplantes, "
                f"Tags vom Nutzer und ob das Gericht zum Kontext passt."
            )

            response, _interaction_id = gemini_call(
                user=self.user,
                model="gemini-3.1-flash-lite",
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AiRerankOutput,
                    http_options=genai_types.HttpOptions(timeout=10_000),
                ),
                context="intelligent_suggestions_rerank",
            )

            if response is None:
                return None

            result = AiRerankOutput.model_validate_json(response.text)

            # Map AI results back to ScoredRecipe objects
            recipe_map = {s.recipe.id: s for s in scored}
            reranked: list[ScoredRecipe] = []
            for suggestion in result.suggestions:
                sr = recipe_map.get(suggestion.recipe_id)
                if sr is None:
                    continue
                sr.reason_text = suggestion.reason_text
                reranked.append(sr)
                if len(reranked) >= 9:
                    break

            return reranked if reranked else None

        except Exception:
            logger.warning("AI reranking failed, falling back to algorithmic", exc_info=True)
            return None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_suggestions(
        self, context_enhance: bool = True
    ) -> dict[str, list[dict]]:
        """Generate 9 categorized recipe suggestions.

        When context_enhance is True (default), Gemini receives enriched context
        (event info, tags, meal plan) and top 30 candidates for intelligent selection.
        Falls back to algorithmic scoring when Gemini is unavailable.

        Returns:
            dict with keys: top_picks, variety, discovery.
            Each value is a list of dicts (or empty list).
        """
        # 1. Get candidates (hard filters)
        candidates = self._get_candidate_recipes()
        if not candidates:
            return {
                "suggestions": {"top_picks": [], "variety": [], "discovery": []},
                "ai_enhanced": False,
            }

        # 2. Score each candidate
        month = timezone.now().month
        scored: list[ScoredRecipe] = []
        for recipe in candidates:
            sr = ScoredRecipe(recipe)
            sr.season_score = self._compute_season_score(recipe, month) * SEASON_WEIGHT
            sr.popularity_score = self._compute_popularity_score(recipe) * POPULARITY_WEIGHT
            sr.variety_score = self._compute_variety_score(recipe) * VARIETY_WEIGHT
            sr.recency_score = self._compute_recency_score(recipe) * RECENCY_WEIGHT
            sr.budget_score = self._compute_budget_score(recipe) * BUDGET_WEIGHT
            sr.compute_total()
            sr.set_reason()
            scored.append(sr)

        # 3. Sort for AI reranking
        scored.sort(key=lambda s: s.total_score, reverse=True)

        # 4. Context-enhanced suggestions via Gemini (default, with algorithmic fallback)
        if context_enhance and len(scored) >= 9:
            reranked = self._ai_rerank(scored)
            if reranked is not None:
                categorized = self._categorize_from_ai_result(reranked)
                return {
                    "suggestions": self._to_dict(categorized, ai_enhanced=True),
                    "ai_enhanced": True,
                }

        # 5. Pure algorithmic categorization
        categorized = self._categorize(scored)
        return {
            "suggestions": self._to_dict(categorized, ai_enhanced=False),
            "ai_enhanced": False,
        }

    def _categorize_from_ai_result(
        self, reranked: list[ScoredRecipe]
    ) -> dict[str, list[ScoredRecipe]]:
        """Categorize AI-reranked results by their reason_text category assignment."""
        result: dict[str, list[ScoredRecipe]] = {
            "top_picks": [],
            "variety": [],
            "discovery": [],
        }
        for sr in reranked:
            if len(result["top_picks"]) < 3:
                result["top_picks"].append(sr)
            elif len(result["variety"]) < 3:
                result["variety"].append(sr)
            else:
                result["discovery"].append(sr)
        return result

    def _to_dict(
        self, categorized: dict[str, list[ScoredRecipe]], ai_enhanced: bool
    ) -> dict[str, list[dict]]:
        """Convert ScoredRecipe objects to serializable dicts."""
        result: dict[str, list[dict]] = {}
        for category, recipes in categorized.items():
            result[category] = [
                {
                    "id": sr.recipe.id,
                    "title": sr.recipe.title,
                    "slug": sr.recipe.slug,
                    "image_url": sr.recipe.image.url if sr.recipe.image else None,
                    "recipe_type": sr.recipe.recipe_type,
                    "recipe_badge": "verified" if sr.recipe.owner_id is None else "community",
                    "reason": sr.reason,
                    "reason_text": sr.reason_text,
                    "usage_count": sr.recipe.usage_count or 0,
                    "price_per_serving": (
                        round(float(sr.recipe.cached_price_total) / (sr.recipe.portions or 1), 2)
                        if sr.recipe.cached_price_total
                        else None
                    ),
                }
                for sr in recipes
            ]
        return result
