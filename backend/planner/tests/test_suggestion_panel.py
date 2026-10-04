"""Tests for the meal suggestion panel engine and endpoint."""

from __future__ import annotations

import datetime

import pytest
from django.utils import timezone
from model_bakery import baker

from planner.models import MealPlanGroupMember
from planner.services.suggestion_panel.engine import Filters, build_panel
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import Recipe
from recipe.tests import make_recipe, make_recipe_item
from supply.models import NutritionalTag
from supply.tests import make_ingredient, make_portion, make_retail_section

TODAY = datetime.date.today()


def _at(day_offset: int, hour: int) -> datetime.datetime:
    return timezone.make_aware(
        datetime.datetime.combine(TODAY + datetime.timedelta(days=day_offset), datetime.time(hour))
    )


def _plain(title: str, recipe_type: str, **kwargs):
    return make_recipe(
        title=title,
        summary="",
        description="",
        recipe_type=recipe_type,
        cached_price_total=4,
        portions=4,
        **kwargs,
    )


def _snack_recipe(title: str, sugar: float, **kwargs):
    return make_recipe(
        title=title,
        summary="",
        description="",
        recipe_type="snack",
        cached_sugar_g=sugar,
        cached_weight_g=100,
        cached_price_total=1.0,
        portions=1,
        **kwargs,
    )


def _standalone(name: str, section: str = "Obst", **kwargs):
    ing = make_ingredient(
        name=name, is_standalone_food=True, retail_section=make_retail_section(name=section), **kwargs
    )
    make_portion(ing, name="Stück", rank=1, weight_g=150)
    return ing


def _all_cards(result) -> list:
    return [c for _, cards in result.directions for c in cards]


@pytest.mark.django_db
class TestPanelShape:
    def test_snack_panel_has_four_directions_without_duplicates(self):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="snack", start_datetime=_at(0, 15), end_datetime=_at(0, 16))
        for i in range(6):
            _snack_recipe(f"Süßer Snack {i}", sugar=30)
            _snack_recipe(f"Herzhafter Snack {i}", sugar=1)
        for name in ("Apfel", "Banane", "Birne", "Kiwi", "Mango", "Orange"):
            _standalone(name)

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        assert [d.key for d, _ in result.directions] == ["fruit_veg", "sweet", "savory", "homemade"]
        assert all(len(cards) <= 4 for _, cards in result.directions)
        keys = [(c.kind, c.id) for c in _all_cards(result)]
        assert len(keys) == len(set(keys))
        assert any(c.kind == "ingredient" for c in _all_cards(result))
        assert any(c.kind == "recipe" for c in _all_cards(result))

    def test_lunch_panel_only_suggests_recipes(self):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="lunch", start_datetime=_at(0, 12), end_datetime=_at(0, 13))
        for i in range(5):
            _plain(f"Gericht {i}", "warm_meal")
        _standalone("Apfel")

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        assert result.total > 0
        assert {c.kind for c in _all_cards(result)} == {"recipe"}

    def test_dessert_direction_only_when_requested(self):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="dinner", start_datetime=_at(0, 18), end_datetime=_at(0, 19))
        _plain("Pudding", "dessert")

        without = build_panel(plan, meal, plan.created_by, Filters(), seed=1)
        with_dessert = build_panel(plan, meal, plan.created_by, Filters(with_dessert=True), seed=1)

        assert "dessert" not in [d.key for d, _ in without.directions]
        dessert_cards = dict((d.key, cards) for d, cards in with_dessert.directions)["dessert"]
        assert [c.title for c in dessert_cards] == ["Pudding"]


@pytest.mark.django_db
class TestDuplicateRules:
    def test_main_dish_excluded_across_event_plans(self):
        event = baker.make("event.Event")
        plan_a = make_meal_plan(event=event)
        plan_b = make_meal_plan(event=event, created_by=plan_a.created_by)
        used = _plain("Nudeln", "warm_meal")
        fresh = _plain("Reis", "warm_meal")
        make_meal_item(make_meal(plan_b, meal_type="dinner", start_datetime=_at(0, 18), end_datetime=_at(0, 19)), used)
        lunch = make_meal(plan_a, meal_type="lunch", start_datetime=_at(1, 12), end_datetime=_at(1, 13))

        result = build_panel(plan_a, lunch, plan_a.created_by, Filters(), seed=1)

        ids = {c.id for c in _all_cards(result)}
        assert fresh.id in ids
        assert used.id not in ids

    def test_snack_may_repeat_on_other_day_but_not_in_same_slot(self):
        plan = make_meal_plan()
        apple = _standalone("Apfel")
        day1 = make_meal(plan, meal_type="snack", start_datetime=_at(0, 15), end_datetime=_at(0, 16))
        day2 = make_meal(plan, meal_type="snack", start_datetime=_at(1, 15), end_datetime=_at(1, 16))
        from planner.models import MealItem

        MealItem.objects.create(meal=day1, ingredient=apple, quantity=1, factor=1.0)

        on_day2 = build_panel(plan, day2, plan.created_by, Filters(), seed=1)
        on_day1 = build_panel(plan, day1, plan.created_by, Filters(), seed=1)

        assert apple.id in {c.id for c in _all_cards(on_day2) if c.kind == "ingredient"}
        assert apple.id not in {c.id for c in _all_cards(on_day1) if c.kind == "ingredient"}

    def test_breakfast_excluded_only_on_same_day(self):
        event = baker.make("event.Event")
        plan_a = make_meal_plan(event=event)
        plan_b = make_meal_plan(event=event, created_by=plan_a.created_by)
        porridge = _plain("Porridge", "breakfast")
        make_meal_item(
            make_meal(plan_b, meal_type="breakfast", start_datetime=_at(0, 8), end_datetime=_at(0, 9)), porridge
        )
        same_day = make_meal(plan_a, meal_type="breakfast", start_datetime=_at(0, 8), end_datetime=_at(0, 9))
        next_day = make_meal(plan_a, meal_type="breakfast", start_datetime=_at(1, 8), end_datetime=_at(1, 9))

        on_same_day = build_panel(plan_a, same_day, plan_a.created_by, Filters(), seed=1)
        on_next_day = build_panel(plan_a, next_day, plan_a.created_by, Filters(), seed=1)

        assert porridge.id not in {c.id for c in _all_cards(on_same_day)}
        assert porridge.id in {c.id for c in _all_cards(on_next_day)}


@pytest.mark.django_db
class TestHardFilters:
    def test_no_cooking_source_excludes_warm_recipes(self):
        plan = make_meal_plan(cooking_sources=["none"])
        meal = make_meal(plan, meal_type="dinner", start_datetime=_at(0, 18), end_datetime=_at(0, 19))
        _plain("Suppe", "warm_meal")
        cold = _plain("Brotzeit", "cold_meal")

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        assert {c.id for c in _all_cards(result)} == {cold.id}

    def test_oven_recipe_needs_oven(self):
        plan = make_meal_plan(cooking_sources=["campfire"])
        meal = make_meal(plan, meal_type="dinner", start_datetime=_at(0, 18), end_datetime=_at(0, 19))
        _plain("Auflauf aus dem Ofen", "warm_meal")
        pan = _plain("Eintopf", "warm_meal")

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        assert {c.id for c in _all_cards(result)} == {pan.id}

    def test_diet_tags_are_never_relaxed(self):
        tag = baker.make(NutritionalTag, name="Glutenfrei (freiwillig)")
        plan = make_meal_plan()
        plan.nutritional_tags.add(tag)
        meal = make_meal(plan, meal_type="dinner", start_datetime=_at(0, 18), end_datetime=_at(0, 19))
        _plain("Pizza", "warm_meal")
        ok = _plain("Reispfanne", "warm_meal")
        ok.nutritional_tags.add(tag)

        result = build_panel(plan, meal, plan.created_by, Filters(budget="cheap", kids=True), seed=1)

        assert {c.id for c in _all_cards(result)} == {ok.id}

    def test_recipe_tags_come_from_ingredients_when_not_synced(self):
        tag = baker.make(NutritionalTag, name="Glutenfrei (freiwillig)")
        plan = make_meal_plan()
        plan.nutritional_tags.add(tag)
        meal = make_meal(plan, meal_type="dinner", start_datetime=_at(0, 18), end_datetime=_at(0, 19))
        rice = make_ingredient(name="Reis")
        rice.nutritional_tags.add(tag)
        flour = make_ingredient(name="Weizenmehl")
        good = _plain("Reispfanne", "warm_meal")
        make_recipe_item(good, ingredient=rice)
        bad = _plain("Mehlspeise", "warm_meal")
        make_recipe_item(bad, ingredient=rice)
        make_recipe_item(bad, ingredient=flour)

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        assert {c.id for c in _all_cards(result)} == {good.id}

    def test_cooling_none_removes_perishables(self):
        plan = make_meal_plan(cooling="none")
        meal = make_meal(plan, meal_type="snack", start_datetime=_at(0, 15), end_datetime=_at(0, 16))
        _snack_recipe("Quarkspeise", sugar=12)
        dry = _snack_recipe("Kekse", sugar=30)

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        assert {c.id for c in _all_cards(result) if c.kind == "recipe"} == {dry.id}


@pytest.mark.django_db
class TestVegetarianInference:
    def test_vegetarian_direction_uses_ingredients_without_tags(self):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="dinner", start_datetime=_at(0, 18), end_datetime=_at(0, 19))
        veg = _plain("Gemüsepfanne", "warm_meal")
        make_recipe_item(veg, ingredient=make_ingredient(name="Paprika"))
        meat = _plain("Pfanne", "warm_meal")
        make_recipe_item(meat, ingredient=make_ingredient(name="Hackfleisch"))

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        directions = {d.key: [c.id for c in cards] for d, cards in result.directions}
        assert directions["vegetarian"] == [veg.id]

    def test_vegetarian_filter_excludes_meat(self):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="dinner", start_datetime=_at(0, 18), end_datetime=_at(0, 19))
        meat = _plain("Pfanne", "warm_meal")
        make_recipe_item(meat, ingredient=make_ingredient(name="Hackfleisch"))
        veg = _plain("Gemüsepfanne", "warm_meal")
        make_recipe_item(veg, ingredient=make_ingredient(name="Paprika"))

        result = build_panel(plan, meal, plan.created_by, Filters(diet="vegetarian"), seed=1)

        assert {c.id for c in _all_cards(result)} == {veg.id}


@pytest.mark.django_db
class TestRelaxing:
    def test_soft_filter_is_relaxed_and_reported(self):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="snack", start_datetime=_at(0, 15), end_datetime=_at(0, 16))
        for i in range(4):
            _snack_recipe(f"Salzstange {i}", sugar=1)

        result = build_panel(plan, meal, plan.created_by, Filters(taste="sweet"), seed=1)

        assert result.relaxed == ["taste"]
        assert result.total > 0

    def test_strict_filter_keeps_only_known_matches(self):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="snack", start_datetime=_at(0, 15), end_datetime=_at(0, 16))
        sweet = [_snack_recipe(f"Apfel-Keks {i}", sugar=30) for i in range(4)]
        baked = [_snack_recipe(f"Kuchen gebacken {i}", sugar=30) for i in range(4)]
        for recipe in baked:
            make_recipe_item(recipe)
        # Recipe cache signals recompute nutrition when items are added; restore the test value.
        Recipe.objects.filter(id__in=[r.id for r in baked]).update(cached_sugar_g=30, cached_weight_g=100)
        sweet += baked
        sweet += [_snack_recipe(f"Keks {i}", sugar=30) for i in range(4)]
        _snack_recipe("Salzstange", sugar=1)

        result = build_panel(plan, meal, plan.created_by, Filters(taste="sweet"), seed=1)

        assert result.relaxed == []
        assert {c.id for c in _all_cards(result)} <= {r.id for r in sweet}

    def test_seed_changes_selection(self):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="snack", start_datetime=_at(0, 15), end_datetime=_at(0, 16))
        for i in range(30):
            _snack_recipe(f"Snack {i}", sugar=30)

        first = {c.id for c in _all_cards(build_panel(plan, meal, plan.created_by, Filters(), seed=1))}
        again = {c.id for c in _all_cards(build_panel(plan, meal, plan.created_by, Filters(), seed=1))}
        other = {c.id for c in _all_cards(build_panel(plan, meal, plan.created_by, Filters(), seed=99))}

        assert first == again
        assert first != other


@pytest.mark.django_db
class TestContext:
    def test_age_derived_from_group_members(self):
        plan = make_meal_plan()
        MealPlanGroupMember.objects.create(meal_plan=plan, age=9, gender="no_answer")
        meal = make_meal(plan, meal_type="snack", start_datetime=_at(0, 15), end_datetime=_at(0, 16))

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        assert result.context.age_groups == ["children"]
        assert result.context.age_derived is True
        assert "age_groups" not in result.context.missing

    def test_missing_context_reported(self):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="dinner", start_datetime=_at(0, 18), end_datetime=_at(0, 19))

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        assert set(result.context.missing) == {"age_groups", "cooking_sources", "cooling", "setting"}

    def test_season_defaults_from_start_date(self):
        winter = timezone.make_aware(datetime.datetime(2026, 1, 15, 0, 0))
        plan = make_meal_plan(start_datetime=winter)
        meal = make_meal(plan, meal_type="drinks", start_datetime=_at(0, 10), end_datetime=_at(0, 18))

        result = build_panel(plan, meal, plan.created_by, Filters(), seed=1)

        assert result.context.season_hint == "cold"
        assert "season_hint" not in result.context.missing


@pytest.mark.django_db
class TestEndpoint:
    def test_requires_login(self, api_client):
        plan = make_meal_plan()
        meal = make_meal(plan, meal_type="snack")
        resp = api_client.post(
            f"/api/meal-plans/{plan.id}/meal/{meal.id}/suggestions/", data={}, content_type="application/json"
        )
        assert resp.status_code in (401, 403)

    def test_returns_panel_with_context(self, auth_client):
        plan = make_meal_plan(created_by=auth_client._user, setting="camp")
        meal = make_meal(plan, meal_type="snack", start_datetime=_at(0, 15), end_datetime=_at(0, 16))
        _snack_recipe("Keks", sugar=30)
        _standalone("Apfel")

        resp = auth_client.post(
            f"/api/meal-plans/{plan.id}/meal/{meal.id}/suggestions/",
            data={"filters": {}, "seed": 3},
            content_type="application/json",
        )

        assert resp.status_code == 200
        body = resp.json()
        assert body["meal_type"] == "snack"
        assert [d["key"] for d in body["directions"]] == ["fruit_veg", "sweet", "savory", "homemade"]
        assert body["total"] == sum(len(d["cards"]) for d in body["directions"])
        assert body["context"]["setting"] == "camp"
        apple = next(c for d in body["directions"] for c in d["cards"] if c["kind"] == "ingredient")
        assert apple["title"] == "Apfel"
        assert apple["portion_id"] is not None and apple["quantity"] == 1.0

    def test_context_fields_can_be_saved_on_plan(self, auth_client):
        plan = make_meal_plan(created_by=auth_client._user)
        resp = auth_client.patch(
            f"/api/meal-plans/{plan.id}/",
            data={"setting": "camp", "cooking_sources": ["campfire", "gas_burner"], "age_groups": ["children"]},
            content_type="application/json",
        )
        assert resp.status_code == 200
        plan.refresh_from_db()
        assert plan.setting == "camp"
        assert plan.cooking_sources == ["campfire", "gas_burner"]
        assert resp.json()["age_groups"] == ["children"]
