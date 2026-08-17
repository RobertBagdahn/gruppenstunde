"""Tests for intelligent recipe suggestions — IngredientSeason, scoring, categorization, API."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe, make_recipe_item
from supply.models import IngredientSeason
from supply.tests import make_ingredient

User = get_user_model()


# =============================================================================
# Tests for IngredientSeason model
# =============================================================================


@pytest.mark.django_db
class TestIngredientSeasonModel:
    def test_create_season_entry(self):
        ing = make_ingredient(name="Tomate")
        season = IngredientSeason.objects.create(
            ingredient=ing,
            month=7,
            is_high_season=True,
        )
        assert season.ingredient == ing
        assert season.month == 7
        assert season.is_high_season is True
        assert str(season) == "Tomate – Monat 7"

    def test_unique_constraint(self):
        ing = make_ingredient(name="Gurke")
        IngredientSeason.objects.create(ingredient=ing, month=7)
        with pytest.raises(Exception):
            IngredientSeason.objects.create(ingredient=ing, month=7)

    def test_multiple_months_allowed(self):
        ing = make_ingredient(name="Erdbeere")
        IngredientSeason.objects.create(ingredient=ing, month=5, is_high_season=True)
        IngredientSeason.objects.create(ingredient=ing, month=6, is_high_season=True)
        assert ing.seasons.count() == 2


# =============================================================================
# Tests for scoring dimensions
# =============================================================================


@pytest.mark.django_db
class TestSeasonScore:
    def test_season_score_full_match(self):
        ing_tomato = make_ingredient(name="Tomate")
        IngredientSeason.objects.create(ingredient=ing_tomato, month=7)
        recipe = make_recipe()
        make_recipe_item(recipe, ingredient=ing_tomato)

        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        score = service._compute_season_score(recipe, month=7)
        assert score == 1.0

    def test_season_score_no_match(self):
        ing_tomato = make_ingredient(name="Tomate")
        IngredientSeason.objects.create(ingredient=ing_tomato, month=7)
        recipe = make_recipe()
        make_recipe_item(recipe, ingredient=ing_tomato)

        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        score = service._compute_season_score(recipe, month=1)
        assert score == 0.0

    def test_season_score_no_ingredients(self):
        recipe = make_recipe()
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        score = service._compute_season_score(recipe, month=7)
        assert score == 0.0


@pytest.mark.django_db
class TestRecencyScore:
    def test_never_used(self):
        recipe = make_recipe()
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        score = service._compute_recency_score(recipe)
        assert score == 1.0


@pytest.mark.django_db
class TestBudgetScore:
    def test_no_budget_set(self):
        recipe = make_recipe()
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan(budget_per_person_per_day=None)
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        score = service._compute_budget_score(recipe)
        assert score == 1.0

    def test_within_budget(self):
        recipe = make_recipe(cached_price_total=10.0, portions=4)
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        budget_per_person_per_day = 20.0
        plan = make_meal_plan(budget_per_person_per_day=budget_per_person_per_day)
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        score = service._compute_budget_score(recipe)
        assert score == 1.0


# =============================================================================
# Tests for categorization
# =============================================================================


@pytest.mark.django_db
class TestCategorization:
    def test_fewer_than_9_candidates(self):
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService, ScoredRecipe

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)

        recipes = [make_recipe(title=f"Recipe {i}") for i in range(3)]
        scored = []
        for r in recipes:
            sr = ScoredRecipe(r)
            sr.total_score = float(len(scored))
            sr.popularity_score = float(len(scored))
            sr.set_reason()
            scored.append(sr)

        categorized = service._categorize(scored)
        assert len(categorized["top_picks"]) <= 3
        assert len(categorized["variety"]) <= 3
        assert len(categorized["discovery"]) <= 3
        total = sum(len(v) for v in categorized.values())
        assert total == 3

    def test_exactly_9_candidates(self):
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService, ScoredRecipe

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)

        recipes = [make_recipe(title=f"Recipe {i}") for i in range(9)]
        scored = []
        for i, r in enumerate(recipes):
            sr = ScoredRecipe(r)
            sr.total_score = float(9 - i)
            sr.popularity_score = float(9 - i)
            sr.set_reason()
            scored.append(sr)

        categorized = service._categorize(scored)
        assert len(categorized["top_picks"]) == 3
        assert len(categorized["variety"]) == 3
        assert len(categorized["discovery"]) == 3
        total = sum(len(v) for v in categorized.values())
        assert total == 9


# =============================================================================
# Tests for hard filters
# =============================================================================


@pytest.mark.django_db
class TestHardFilters:
    def test_exclude_already_in_plan(self):
        recipe = make_recipe()
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)

        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        candidates = service._get_candidate_recipes()
        assert recipe.id not in {c.id for c in candidates}


# =============================================================================
# Tests for API endpoint
# =============================================================================


@pytest.mark.django_db
class TestApiEndpoint:
    def test_unauthenticated_returns_403(self):
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        client = Client()
        response = client.get(f"/api/meal-plans/{plan.id}/meal/{meal.id}/suggestions/")
        assert response.status_code == 403

    def test_authenticated_returns_200(self):
        user = User.objects.create_user(username="testuser", password="pass")
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe()
        make_recipe_item(recipe)

        client = Client()
        client.force_login(user)
        response = client.get(f"/api/meal-plans/{plan.id}/meal/{meal.id}/suggestions/")
        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert data["total"] >= 0

    def test_returns_categorized_suggestions(self):
        user = User.objects.create_user(username="testuser2", password="pass")
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan)
        for i in range(3):
            r = make_recipe(title=f"Suggestion Recipe {i}", recipe_type="warm_meal")
            make_recipe_item(r)

        client = Client()
        client.force_login(user)
        response = client.get(f"/api/meal-plans/{plan.id}/meal/{meal.id}/suggestions/")
        assert response.status_code == 200
        data = response.json()
        assert "top_picks" in data["suggestions"]
        assert "variety" in data["suggestions"]
        assert "discovery" in data["suggestions"]

    def test_nonexistent_plan_returns_404(self):
        user = User.objects.create_user(username="testuser3", password="pass")
        client = Client()
        client.force_login(user)
        response = client.get("/api/meal-plans/99999/meal/1/suggestions/")
        assert response.status_code == 404


# =============================================================================
# Tests for context-enhanced suggestions
# =============================================================================


@pytest.mark.django_db
class TestContextEnhancedSuggestions:
    def test_build_context_includes_plan_name(self):
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan(name="Sommerlager 2026")
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        context = service._build_context()
        assert "Sommerlager 2026" in context

    def test_build_context_includes_meal_plan_tags(self):
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService
        from planner.models import MealPlanTag

        plan = make_meal_plan()
        MealPlanTag.objects.create(meal_plan=plan, name="sommerlager")
        MealPlanTag.objects.create(meal_plan=plan, name="lagerfeuer")
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        context = service._build_context()
        assert "sommerlager" in context
        assert "lagerfeuer" in context

    def test_build_context_includes_event_info(self):
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan(name="Plan mit Event")
        meal = make_meal(meal_plan=plan)
        from event.models import Event, EventMealPlanRelation

        event = Event.objects.create(
            name="Sommerlager 2026",
            description="Ein tolles Sommerlager am See",
            start_date=timezone.now(),
            end_date=timezone.now() + timezone.timedelta(days=7),
            created_by=plan.created_by,
        )
        EventMealPlanRelation.objects.create(event=event, meal_plan=plan)

        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        context = service._build_context()
        assert "Sommerlager 2026" in context
        assert "Ein tolles Sommerlager am See" in context

    def test_build_context_includes_planned_meals(self):
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService
        from recipe.tests import make_recipe, make_recipe_item as make_ri

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        # Add a planned recipe to a dinner meal (different type = same day ok)
        other_meal = make_meal(meal_plan=plan, meal_type="dinner", start_datetime=timezone.now() + timezone.timedelta(hours=6))
        recipe = make_recipe(title="Nudelsalat")
        make_ri(recipe)
        make_meal_item(meal=other_meal, recipe=recipe)

        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        context = service._build_context()
        assert "Nudelsalat" in context

    def test_get_suggestions_returns_dict_with_ai_enhanced_key(self):
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        result = service.get_suggestions(context_enhance=False)
        assert "suggestions" in result
        assert "ai_enhanced" in result
        assert result["ai_enhanced"] is False

    def test_context_enhance_true_without_gemini_falls_back(self):
        """When context_enhance=true but Gemini is unavailable, falls back to algorithmic."""
        from unittest.mock import patch
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        # Create enough recipes to trigger Gemini path
        for i in range(5):
            r = make_recipe(title=f"Test Recipe {i}")
            make_recipe_item(r)

        service = IntelligentSuggestionsService(plan, meal, plan.created_by)

        # Monkey-patch _ai_rerank to return None (simulating Gemini failure)
        with patch.object(service, "_ai_rerank", return_value=None):
            result = service.get_suggestions(context_enhance=True)
        assert result["ai_enhanced"] is False
        assert "suggestions" in result

    def test_context_enhance_false_returns_algorithmic(self):
        """When context_enhance=false, should return algorithmic suggestions."""
        from planner.services.intelligent_suggestions_service import IntelligentSuggestionsService

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        for i in range(3):
            r = make_recipe(title=f"Algo Recipe {i}")
            make_recipe_item(r)

        service = IntelligentSuggestionsService(plan, meal, plan.created_by)
        result = service.get_suggestions(context_enhance=False)
        assert result["ai_enhanced"] is False
        assert "suggestions" in result

    def test_api_returns_ai_enhanced_false_without_gemini(self):
        """The API endpoint should return ai_enhanced=false when Gemini is unavailable."""
        user = User.objects.create_user(username="test-context", password="pass")
        plan = make_meal_plan(created_by=user)
        meal = make_meal(meal_plan=plan)
        for i in range(3):
            r = make_recipe(title=f"API Recipe {i}")
            make_recipe_item(r)

        client = Client()
        client.force_login(user)
        response = client.get(f"/api/meal-plans/{plan.id}/meal/{meal.id}/suggestions/")
        assert response.status_code == 200
        data = response.json()
        assert "ai_enhanced" in data
        assert data["ai_enhanced"] is False  # No Gemini available in test
