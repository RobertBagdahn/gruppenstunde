# Pyright does not model Django ORM descriptors in tests; backend checks use the django-stubs mypy plugin.
# pyright: reportAttributeAccessIssue=false, reportGeneralTypeIssues=false, reportArgumentType=false
"""Tests for the plan-wide ingredient quantity overview and adjustment."""

import datetime as dt
import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import MealItemOverride, MealPlanCollaborator, MealPlanCollaboratorRole, MealTypeChoices
from planner.services.ingredient_quantities import build_ingredient_quantities
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import RecipeItem
from recipe.tests import make_recipe
from supply.models import Ingredient, MeasuringUnit, Portion
from supply.services.shopping_service import generate_shopping_list

User = get_user_model()


def _aware(day: int, hour: int = 12) -> dt.datetime:
    return timezone.make_aware(dt.datetime(2026, 10, day, hour, 0))


def _onion() -> tuple[Ingredient, Portion]:
    unit = baker.make(MeasuringUnit, name="Stück", quantity=1)
    onion = baker.make(Ingredient, name="Zwiebel")
    piece = baker.make(
        Portion,
        ingredient=onion,
        measuring_unit=unit,
        name="Stück",
        quantity=1,
        weight_g=150,
        rank=1,
        weight_status="confirmed",
    )
    return onion, piece


@pytest.mark.django_db
class TestIngredientQuantities:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(created_by=self.user, norm_portions=20, reserve_factor=1.1)
        self.onion, self.piece = _onion()
        self.recipe = make_recipe(title="Sandwich", portions=1)
        self.onion_item = baker.make(RecipeItem, recipe=self.recipe, portion=self.piece, quantity=0.25)
        self.meal_items = []
        for day in (9, 10, 11):
            meal = make_meal(
                meal_plan=self.plan,
                meal_type=MealTypeChoices.DINNER,
                start_datetime=_aware(day, 18),
                end_datetime=_aware(day, 19),
            )
            self.meal_items.append(make_meal_item(meal=meal, recipe=self.recipe, factor=1.0))

    def _url(self, suffix: str = "") -> str:
        return f"/api/meal-plans/{self.plan.id}/ingredient-quantities/{suffix}"

    def _adjust(self, payload: dict):
        return self.client.post(
            self._url(f"{self.onion.id}/adjust/"), data=json.dumps(payload), content_type="application/json"
        )

    def _onion_entry(self) -> dict:
        response = self.client.get(self._url())
        assert response.status_code == 200
        return next(entry for entry in response.json() if entry["ingredient_id"] == self.onion.id)

    def test_overview_lists_lines_per_meal(self):
        entry = self._onion_entry()

        assert entry["net_quantity_g"] == pytest.approx(2250)
        assert entry["total_quantity_g"] == pytest.approx(2475)
        assert len(entry["lines"]) == 3
        line = entry["lines"][0]
        assert line["kind"] == "recipe"
        assert line["quantity_per_person"] == pytest.approx(0.25)
        assert line["unit_label"] == "Stück"
        assert line["effective_portions"] == 20
        assert line["net_quantity_g"] == pytest.approx(750)
        assert line["editable"] is True
        assert line["meal_label"].startswith("Fr, 09.10.")
        assert entry["unit_options"] == [{"name": "Stück", "weight_g": 150.0, "is_default": True}]

    def test_overview_totals_match_shopping_list(self):
        self.meal_items[0].meal.override_portions = 35
        self.meal_items[0].meal.save()
        self.meal_items[1].factor = 1.5
        self.meal_items[1].save()
        MealItemOverride.objects.create(
            meal_item=self.meal_items[2], recipe_item=self.onion_item, quantity_override=0.1
        )

        overview = {entry.ingredient_id: entry for entry in build_ingredient_quantities(self.plan)}
        for item in generate_shopping_list(self.plan):
            assert overview[item.ingredient_id].total_quantity_g == pytest.approx(item.total_quantity_g)
            assert overview[item.ingredient_id].net_quantity_g == pytest.approx(item.net_quantity_g)

    def test_target_total_distributes_proportionally(self):
        response = self._adjust({"mode": "target_total", "target_total_g": 450})

        assert response.status_code == 200
        body = response.json()
        assert body["changed_lines"] == 3
        assert body["item"]["net_quantity_g"] == pytest.approx(450)
        assert body["item"]["is_adjusted"] is True
        overrides = MealItemOverride.objects.filter(recipe_item=self.onion_item)
        assert sorted(float(o.quantity_override) for o in overrides) == [0.05, 0.05, 0.05]
        assert {p["quantity_override"] for p in body["previous"]} == {None}

    def test_target_total_is_idempotent(self):
        self._adjust({"mode": "target_total", "target_total_g": 450})
        response = self._adjust({"mode": "target_total", "target_total_g": 450})

        assert response.json()["changed_lines"] == 0
        assert MealItemOverride.objects.filter(recipe_item=self.onion_item).count() == 3

    def test_target_total_keeps_synced_meal_fixed(self):
        synced_meal = self.meal_items[0].meal
        ref = make_meal(meal_plan=self.plan, is_reference=True, start_datetime=None, end_datetime=None)
        synced_meal.ref_meal = ref
        synced_meal.is_synced = True
        synced_meal.save()

        response = self._adjust({"mode": "target_total", "target_total_g": 1050})

        assert response.status_code == 200
        assert response.json()["skipped_lines"] == 1
        assert not MealItemOverride.objects.filter(meal_item=self.meal_items[0]).exists()
        assert response.json()["item"]["net_quantity_g"] == pytest.approx(1050)
        synced_line = next(
            line for line in response.json()["item"]["lines"] if line["meal_item_id"] == self.meal_items[0].id
        )
        assert synced_line["editable"] is False
        assert "Vorlage" in synced_line["not_editable_reason"]

    def test_target_below_fixed_share_is_rejected(self):
        direct_meal = self.meal_items[0].meal
        baker.make(
            "planner.MealItem",
            meal=direct_meal,
            ingredient=self.onion,
            portion=self.piece,
            quantity=1,
            factor=1.0,
        )

        response = self._adjust({"mode": "target_total", "target_total_g": 1000})

        assert response.status_code == 422
        assert not MealItemOverride.objects.exists()

    def test_percent_reduces_current_quantities(self):
        response = self._adjust({"mode": "percent", "percent": -50})

        assert response.status_code == 200
        assert response.json()["item"]["net_quantity_g"] == pytest.approx(1125, abs=10)

    def test_reset_keeps_exclusions(self):
        MealItemOverride.objects.create(meal_item=self.meal_items[0], recipe_item=self.onion_item, excluded=True)
        self._adjust({"mode": "target_total", "target_total_g": 450})
        MealItemOverride.objects.filter(meal_item=self.meal_items[0]).update(quantity_override=0.1)

        response = self._adjust({"mode": "reset"})

        assert response.status_code == 200
        assert MealItemOverride.objects.filter(quantity_override__isnull=False).count() == 0
        remaining = MealItemOverride.objects.get()
        assert remaining.excluded is True
        excluded_line = next(line for line in response.json()["item"]["lines"] if line["excluded"])
        assert excluded_line["net_quantity_g"] == 0

    def test_restore_returns_previous_state(self):
        first = self._adjust({"mode": "target_total", "target_total_g": 450}).json()

        response = self._adjust({"mode": "restore", "restore": first["previous"]})

        assert response.status_code == 200
        assert not MealItemOverride.objects.exists()
        assert response.json()["item"]["net_quantity_g"] == pytest.approx(2250)

    def test_adjust_requires_mode_fields(self):
        assert self._adjust({"mode": "target_total"}).status_code == 422
        assert self._adjust({"mode": "percent", "percent": 0}).status_code == 422
        assert self._adjust({"mode": "percent", "percent": -95}).status_code == 422

    def test_adjust_unknown_ingredient_is_404(self):
        other = baker.make(Ingredient, name="Salz")
        response = self.client.post(
            self._url(f"{other.id}/adjust/"),
            data=json.dumps({"mode": "percent", "percent": 10}),
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_viewer_can_read_but_not_adjust(self):
        viewer = baker.make(User)
        MealPlanCollaborator.objects.create(meal_plan=self.plan, user=viewer, role=MealPlanCollaboratorRole.VIEWER)
        client = Client()
        client.force_login(viewer)

        assert client.get(self._url()).status_code == 200
        response = client.post(
            self._url(f"{self.onion.id}/adjust/"),
            data=json.dumps({"mode": "percent", "percent": 10}),
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_anonymous_is_rejected(self):
        assert Client().get(self._url()).status_code == 401

    def test_single_line_upsert_keeps_other_overrides(self):
        cucumber = baker.make(Ingredient, name="Gurke")
        cucumber_item = baker.make(RecipeItem, recipe=self.recipe, ingredient=cucumber, portion=None, quantity=30)
        meal_item = self.meal_items[0]
        MealItemOverride.objects.create(meal_item=meal_item, recipe_item=cucumber_item, quantity_override=10)
        url = f"/api/meal-plans/{self.plan.id}/meal-items/{meal_item.id}/overrides/{self.onion_item.id}/"

        response = self.client.put(url, data=json.dumps({"quantity_override": 0.1}), content_type="application/json")

        assert response.status_code == 200
        assert len(response.json()) == 2
        assert float(MealItemOverride.objects.get(recipe_item=cucumber_item).quantity_override) == 10

        response = self.client.delete(url)
        assert response.status_code == 200
        assert not MealItemOverride.objects.filter(recipe_item=self.onion_item).exists()
        assert MealItemOverride.objects.filter(recipe_item=cucumber_item).exists()

    def test_single_line_rejects_synced_meal(self):
        meal_item = self.meal_items[0]
        ref = make_meal(meal_plan=self.plan, is_reference=True, start_datetime=None, end_datetime=None)
        meal_item.meal.ref_meal = ref
        meal_item.meal.is_synced = True
        meal_item.meal.save()
        url = f"/api/meal-plans/{self.plan.id}/meal-items/{meal_item.id}/overrides/{self.onion_item.id}/"

        response = self.client.put(url, data=json.dumps({"quantity_override": 0.1}), content_type="application/json")

        assert response.status_code == 422
        assert not MealItemOverride.objects.exists()

    def test_cooking_schedule_marks_overridden_ingredient(self):
        MealItemOverride.objects.create(
            meal_item=self.meal_items[0], recipe_item=self.onion_item, quantity_override=0.1
        )

        response = self.client.get(f"/api/meal-plans/{self.plan.id}/cooking-schedule/")

        assert response.status_code == 200
        flags = [
            ingredient["is_overridden"]
            for day in response.json()["days"]
            for meal in day["meals"]
            for block in meal["recipe_blocks"]
            for variant in block["variants"]
            for ingredient in variant["ingredients"]
        ]
        assert flags.count(True) == 1
