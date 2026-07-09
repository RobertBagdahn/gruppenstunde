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
