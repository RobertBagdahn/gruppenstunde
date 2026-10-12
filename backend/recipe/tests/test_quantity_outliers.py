# Pyright does not model Django ORM descriptors in tests; backend checks use the django-stubs mypy plugin.
# pyright: reportAttributeAccessIssue=false, reportGeneralTypeIssues=false, reportArgumentType=false
"""Tests for quantity outlier checks (recipe-quantity-outlier-checks)."""

import datetime as dt

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from content.choices import ContentStatus
from planner.models import MealItemOverride, MealTypeChoices
from planner.services.plan_check import build_plan_check_alerts
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.management.commands.normalize_recipe_servings import normalize_recipe_to_one_portion
from recipe.models import RecipeItem
from recipe.schemas.items import RecipeItemOut
from recipe.services.quantity_outliers import Baseline, evaluate_grams, recipe_outliers, undivided_item_ids
from recipe.services.quantity_report import alias_conflicts, suspicious_portions
from recipe.tests import make_recipe
from supply.models import Ingredient, IngredientAlias, IngredientQuantityStats, MeasuringUnit, Portion
from supply.services.ingredient_quantity_stats import recalculate_ingredient_quantity_stats

User = get_user_model()


def _ingredient(name: str) -> Ingredient:
    return baker.make(Ingredient, name=name)


def _piece(ingredient: Ingredient, name: str = "mittelgroße Zwiebel", weight: float = 80, **kwargs) -> Portion:
    unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"quantity": 1.0})
    defaults = {"weight_status": "confirmed", "rank": 1}
    defaults.update(kwargs)
    return baker.make(
        Portion, ingredient=ingredient, measuring_unit=unit, name=name, quantity=1, weight_g=weight, **defaults
    )


def _recipe_with_grams(ingredient: Ingredient, grams: float, recipe_type: str = "warm_meal", **kwargs):
    recipe = make_recipe(portions=1, recipe_type=recipe_type, status=ContentStatus.APPROVED, **kwargs)
    baker.make(RecipeItem, recipe=recipe, portion=None, ingredient=ingredient, quantity=grams)
    return recipe


@pytest.mark.django_db
class TestStatistics:
    def test_median_p90_and_one_entry_per_recipe(self):
        onion = _ingredient("Speisezwiebel")
        for grams in (20, 25, 30, 35, 40):
            _recipe_with_grams(onion, grams)
        double = _recipe_with_grams(onion, 10)
        baker.make(RecipeItem, recipe=double, portion=None, ingredient=onion, quantity=20)

        recalculate_ingredient_quantity_stats()

        stats = IngredientQuantityStats.objects.get(ingredient=onion)
        assert stats.sample_count == 6
        assert stats.median_g == pytest.approx(30)
        assert stats.by_recipe_type["warm_meal"]["sample_count"] == 6

    def test_drafts_optional_and_unknown_weights_are_ignored(self):
        onion = _ingredient("Speisezwiebel")
        _recipe_with_grams(onion, 30)
        draft = make_recipe(portions=1, status=ContentStatus.DRAFT)
        baker.make(RecipeItem, recipe=draft, portion=None, ingredient=onion, quantity=999)
        optional = make_recipe(portions=1, status=ContentStatus.APPROVED)
        baker.make(RecipeItem, recipe=optional, portion=None, ingredient=onion, quantity=999, is_optional=True)

        recalculate_ingredient_quantity_stats()

        assert IngredientQuantityStats.objects.get(ingredient=onion).median_g == pytest.approx(30)


class TestEvaluateGrams:
    baseline = Baseline(median_g=25, p90_g=60, sample_count=10)

    def test_below_threshold_is_quiet(self):
        assert evaluate_grams(80, self.baseline) is None  # threshold max(75, 90) = 90

    def test_warning_and_danger(self):
        assert evaluate_grams(100, self.baseline).severity == "warning"
        outlier = evaluate_grams(160, self.baseline)
        assert outlier.severity == "danger"
        assert outlier.message == "160 g pro Person – üblich sind 25 g"

    def test_small_amounts_need_twenty_grams_excess(self):
        assert evaluate_grams(5, Baseline(median_g=1, p90_g=2, sample_count=10)) is None

    def test_no_baseline(self):
        assert evaluate_grams(500, None) is None


@pytest.mark.django_db
class TestRecipeOutliers:
    def _baseline(self, onion: Ingredient, recipe_type: str = "warm_meal") -> None:
        for grams in (20, 25, 25, 30, 40):
            _recipe_with_grams(onion, grams, recipe_type=recipe_type)
        recalculate_ingredient_quantity_stats()

    def test_high_quantity_line_is_flagged_and_serialized(self):
        onion = _ingredient("Speisezwiebel")
        self._baseline(onion)
        burger = _recipe_with_grams(onion, 160)

        item = burger.recipe_items.get()
        out = RecipeItemOut.resolve_quantity_outlier(item)

        assert out is not None
        assert out.kind == "high_quantity"
        assert out.severity == "danger"

    def test_recipe_type_baseline_is_preferred(self):
        onion = _ingredient("Speisezwiebel")
        self._baseline(onion, recipe_type="warm_meal")
        for grams in (100, 110, 120, 130, 140):
            _recipe_with_grams(onion, grams, recipe_type="soup")
        recalculate_ingredient_quantity_stats()
        soup = _recipe_with_grams(onion, 160, recipe_type="soup")

        assert recipe_outliers(soup) == {}

    def test_undivided_line_with_source_quantity(self):
        recipe = make_recipe(portions=1, source_servings=4)
        onion = _ingredient("Zwiebel")
        item = baker.make(RecipeItem, recipe=recipe, portion=_piece(onion), quantity=2, source_quantity=2)
        divided = baker.make(
            RecipeItem, recipe=recipe, portion=None, ingredient=_ingredient("Öl"), quantity=7, source_quantity=28
        )

        assert undivided_item_ids(recipe, [item, divided]) == {item.id}

    def test_undivided_heuristic_sweet_onion_sauce(self):
        recipe = make_recipe(portions=1, source_servings=4, title="Sweet Onion Sauce")
        onion_item = baker.make(RecipeItem, recipe=recipe, portion=_piece(_ingredient("Zwiebel")), quantity=2)
        for name, quantity in (("Butter", 0.63), ("Öl", 0.69)):
            baker.make(
                RecipeItem, recipe=recipe, portion=_piece(_ingredient(name), name="EL", weight=10), quantity=quantity
            )

        outliers = recipe_outliers(recipe)

        assert outliers[onion_item.id].kind == "undivided"
        assert "4 Personen" in outliers[onion_item.id].message

    def test_portion_units_are_not_undivided(self):
        recipe = make_recipe(portions=1, source_servings=4)
        noodles = baker.make(
            RecipeItem,
            recipe=recipe,
            portion=_piece(_ingredient("Nudeln"), name="1 Portion trocken (100g)", weight=100),
            quantity=1,
        )
        for name, quantity in (("Butter", 0.25), ("Milch", 0.5)):
            baker.make(
                RecipeItem, recipe=recipe, portion=_piece(_ingredient(name), name="EL", weight=10), quantity=quantity
            )

        assert noodles.id not in recipe_outliers(recipe)

    def test_normalize_stores_source_quantity(self):
        recipe = make_recipe(portions=1)
        item = baker.make(RecipeItem, recipe=recipe, portion=None, ingredient=_ingredient("Reis"), quantity=400)
        # Legacy state (portions > 1) only in memory: the DB now enforces portions = 1.
        recipe.portions = 4

        normalize_recipe_to_one_portion(recipe, quantities_are_total=True)

        item.refresh_from_db()
        assert item.quantity == pytest.approx(100)
        assert item.source_quantity == pytest.approx(400)


@pytest.mark.django_db
class TestPlanCheckRule:
    def test_outlier_alert_and_override_removes_it(self):
        onion = _ingredient("Speisezwiebel")
        for grams in (20, 25, 25, 30, 40):
            _recipe_with_grams(onion, grams, recipe_type="cold_meal")
        recalculate_ingredient_quantity_stats()
        sauce = make_recipe(portions=1, recipe_type="cold_meal", title="Sweet Onion Sauce")
        onion_item = baker.make(RecipeItem, recipe=sauce, portion=_piece(onion), quantity=2)
        plan = make_meal_plan(norm_portions=35)
        meal = make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime(2026, 10, 10, 12, 0)),
        )
        meal_item = make_meal_item(meal=meal, recipe=sauce)

        alerts = [a for a in build_plan_check_alerts(plan, "owner") if a.type == "quantity_outlier"]

        assert len(alerts) == 1
        assert "160 g pro Person" in alerts[0].description
        assert alerts[0].action_type == "open_quantities"
        assert alerts[0].action_payload == {"ingredient_name": "Speisezwiebel"}

        MealItemOverride.objects.create(meal_item=meal_item, recipe_item=onion_item, quantity_override=0.25)
        assert not [a for a in build_plan_check_alerts(plan, "owner") if a.type == "quantity_outlier"]


@pytest.mark.django_db
class TestDataQualityReports:
    def test_suspicious_portion_only_when_used(self):
        iceberg = _ingredient("Eisbergsalat")
        used = _piece(iceberg, name="1 Stück (150g)", weight=150, weight_status="imported")
        unused = _piece(
            _ingredient("Eisbergsalat mit Kräutern"), name="1 Stück (150g)", weight=150, weight_status="imported"
        )
        baker.make(RecipeItem, recipe=make_recipe(portions=1), portion=used, quantity=0.5)

        ids = {row.portion_id for row in suspicious_portions()}

        assert used.id in ids
        assert unused.id not in ids

    def test_alias_conflict_name_is_alias(self):
        onion = _ingredient("Zwiebel")
        target = _ingredient("Speisezwiebel")
        IngredientAlias.objects.create(ingredient=target, name="Zwiebel", rank=1)

        rows = [
            row
            for row in alias_conflicts()
            if {row.ingredient_id, row.conflicting_ingredient_id} == {onion.id, target.id}
        ]

        assert len(rows) == 1
        assert rows[0].kind == "name_is_alias"


@pytest.mark.django_db
class TestDataQualityEndpoints:
    urls = (
        "/api/admin/data-quality/recipes/quantity-outliers/",
        "/api/admin/data-quality/recipes/undivided-lines/",
        "/api/admin/data-quality/ingredients/suspicious-portions/",
        "/api/admin/data-quality/ingredients/alias-conflicts/",
    )

    def test_staff_gets_paginated_lists(self):
        client = Client()
        client.force_login(baker.make(User, is_staff=True))
        for url in self.urls:
            response = client.get(url, {"page_size": 10})
            assert response.status_code == 200, url
            assert set(response.json()) >= {"items", "total", "page", "page_size", "total_pages"}
            assert response.json()["page_size"] == 10

    def test_rights(self):
        anonymous = Client()
        user = Client()
        user.force_login(baker.make(User))
        for url in self.urls:
            assert anonymous.get(url).status_code == 401, url
            assert user.get(url).status_code == 403, url

    def test_outlier_endpoint_returns_flagged_line(self):
        onion = _ingredient("Speisezwiebel")
        for grams in (20, 25, 25, 30, 40):
            _recipe_with_grams(onion, grams)
        recalculate_ingredient_quantity_stats()
        _recipe_with_grams(onion, 160, title="Burger")
        client = Client()
        client.force_login(baker.make(User, is_staff=True))

        body = client.get("/api/admin/data-quality/recipes/quantity-outliers/", {"severity": "danger"}).json()

        assert body["total"] == 1
        assert body["items"][0]["recipe_title"] == "Burger"
        assert body["items"][0]["outlier"]["median_g"] == pytest.approx(25)


@pytest.mark.django_db
def test_check_recipe_quantities_writes_csv_via_call_command(tmp_path):
    from django.core.management import call_command

    target = tmp_path / "report.csv"
    call_command("check_recipe_quantities", csv=str(target))

    assert target.read_text(encoding="utf-8").startswith("check,detail,id,name,finding")
