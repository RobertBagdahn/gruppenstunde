"""Tests for the suggestion magic wand (free-text wish, one AI call, draft ingredients)."""

from __future__ import annotations

import datetime
from unittest.mock import patch

import pytest
from django.utils import timezone

from planner.schemas.suggestion_panel import SuggestionFilters
from planner.services.suggestion_panel import wand
from planner.services.suggestion_panel.wand import WandAiOutput, keyword_boosts, run_wand
from planner.tests import make_meal, make_meal_plan
from recipe.tests import make_recipe
from supply.models import Ingredient
from supply.tests import make_ingredient, make_portion, make_retail_section


def _snack_slot():
    plan = make_meal_plan()
    today = datetime.date.today()
    meal = make_meal(
        plan,
        meal_type="snack",
        start_datetime=timezone.make_aware(datetime.datetime.combine(today, datetime.time(15))),
        end_datetime=timezone.make_aware(datetime.datetime.combine(today, datetime.time(16))),
    )
    return plan, meal


def _snack(title: str):
    return make_recipe(
        title=title,
        summary="",
        description="",
        recipe_type="snack",
        cached_sugar_g=30,
        cached_weight_g=100,
        cached_price_total=1,
        portions=1,
    )


def _all_cards(response: dict) -> list[dict]:
    return [c for d in response["directions"] for c in d["cards"]]


@pytest.mark.django_db
class TestKeywordFallback:
    def test_keyword_boost_matches_title_substrings(self):
        plan, meal = _snack_slot()
        choco = _snack("Schokoladenbananen")
        other = _snack("Salzstange")

        from planner.services.suggestion_panel.engine import load_candidates

        boosts = keyword_boosts(load_candidates(plan, meal, plan.created_by), "etwas mit Schokolade")

        assert ("recipe", choco.id) in boosts
        assert ("recipe", other.id) not in boosts

    def test_wand_without_ai_uses_keywords_and_creates_nothing(self):
        plan, meal = _snack_slot()
        wish = _snack("Schokobananen")
        for i in range(6):
            _snack(f"Keks {i}")

        with (
            patch.object(wand, "_ask_gemini", return_value=None),
            patch("supply.services.ingredient_ai_suggest_service.ai_create_ingredient") as create,
        ):
            response = run_wand(plan, meal, plan.created_by, "Schoko", SuggestionFilters(), seed=1)

        assert response["ai_used"] is False
        assert wish.id in {c["id"] for c in _all_cards(response)}
        create.assert_not_called()


@pytest.mark.django_db
class TestAiWand:
    def test_ai_ranking_boosts_candidates_and_creates_new_draft(self):
        plan, meal = _snack_slot()
        favourite = _snack("Gummibärchen")
        for i in range(8):
            _snack(f"Keks {i}")
        key = f"recipe:{favourite.id}"

        def fake_create(name, user=None, **kwargs):
            ing = make_ingredient(
                name=name, status="draft", retail_section=make_retail_section(name="Obst"), sugar_g=12
            )
            make_portion(ing, name="Stück", rank=1, weight_g=40)
            return ing

        ai_output = WandAiOutput(ranked=[key], new_ingredients=["Schokobanane"])
        with (
            patch.object(wand, "_ask_gemini", return_value=ai_output),
            patch("supply.services.ingredient_ai_suggest_service.ai_create_ingredient", side_effect=fake_create),
        ):
            response = run_wand(plan, meal, plan.created_by, "etwas Süßes", SuggestionFilters(), seed=1)

        cards = _all_cards(response)
        assert response["ai_used"] is True
        assert favourite.id in {c["id"] for c in cards if c["kind"] == "recipe"}
        new_cards = [c for c in cards if c["is_new"]]
        assert [c["title"] for c in new_cards] == ["Schokobanane"]
        created = Ingredient.objects.get(name="Schokobanane")
        assert created.status == "draft"
        assert created.is_standalone_food is True

    def test_new_ingredients_ignored_for_main_meals(self):
        plan = make_meal_plan()
        today = datetime.date.today()
        meal = make_meal(
            plan,
            meal_type="dinner",
            start_datetime=timezone.make_aware(datetime.datetime.combine(today, datetime.time(18))),
            end_datetime=timezone.make_aware(datetime.datetime.combine(today, datetime.time(19))),
        )
        make_recipe(title="Eintopf", summary="", description="", recipe_type="warm_meal", cached_price_total=4)

        ai_output = WandAiOutput(ranked=[], new_ingredients=["Schokobanane"])
        with (
            patch.object(wand, "_ask_gemini", return_value=ai_output),
            patch("supply.services.ingredient_ai_suggest_service.ai_create_ingredient") as create,
        ):
            run_wand(plan, meal, plan.created_by, "etwas Warmes", SuggestionFilters(), seed=1)

        create.assert_not_called()


@pytest.mark.django_db
class TestWandEndpoint:
    def test_endpoint_returns_panel_without_ai(self, auth_client):
        plan = make_meal_plan(created_by=auth_client._user)
        today = datetime.date.today()
        meal = make_meal(
            plan,
            meal_type="snack",
            start_datetime=timezone.make_aware(datetime.datetime.combine(today, datetime.time(15))),
            end_datetime=timezone.make_aware(datetime.datetime.combine(today, datetime.time(16))),
        )
        _snack("Schokobananen")

        with patch.object(wand, "_ask_gemini", return_value=None):
            resp = auth_client.post(
                f"/api/meal-plans/{plan.id}/meal/{meal.id}/suggestions/wand/",
                data={"free_text": "Schoko", "filters": {}, "seed": 1},
                content_type="application/json",
            )

        assert resp.status_code == 200
        assert resp.json()["ai_used"] is False

    def test_wish_too_short_is_rejected(self, auth_client):
        plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(plan, meal_type="snack")
        resp = auth_client.post(
            f"/api/meal-plans/{plan.id}/meal/{meal.id}/suggestions/wand/",
            data={"free_text": "x"},
            content_type="application/json",
        )
        assert resp.status_code == 422
