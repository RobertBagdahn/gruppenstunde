"""Cross-consumer consistency tests for active recipe-item resolution.

Ensures nutrition_summary and cost_summary use the canonical
``active_recipe_items`` resolver and honour the empty-selection defaults
(exchange group -> position 0, optional -> included), plus soft-deleted
portion handling and the per-person ``portion_display`` semantics.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import RecipeItemExchangeGroup
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()


@pytest.mark.django_db
class TestCrossConsumerConsistency:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

    def _make_variant_recipe(self):
        """Recipe with: normal A, exchange (B default / C alt), optional D."""
        recipe = make_recipe(portions=1)

        a = make_ingredient(name="Normal", energy_kcal=100.0, price_per_kg=Decimal("1.00"))
        make_recipe_item(recipe=recipe, portion=make_portion(ingredient=a, weight_g=100.0), quantity=1.0)

        b = make_ingredient(name="Käse", energy_kcal=200.0, price_per_kg=Decimal("2.00"))
        c = make_ingredient(name="Hefeflocken", energy_kcal=300.0, price_per_kg=Decimal("3.00"))
        item_b = make_recipe_item(recipe=recipe, portion=make_portion(ingredient=b, weight_g=100.0), quantity=1.0)
        item_c = make_recipe_item(recipe=recipe, portion=make_portion(ingredient=c, weight_g=100.0), quantity=1.0)
        group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name="Käse-Ersatz")
        item_b.exchange_group = group
        item_b.exchange_position = 0
        item_b.save()
        item_c.exchange_group = group
        item_c.exchange_position = 1
        item_c.save()

        d = make_ingredient(name="Chili", energy_kcal=400.0, price_per_kg=Decimal("4.00"))
        item_d = make_recipe_item(recipe=recipe, portion=make_portion(ingredient=d, weight_g=100.0), quantity=1.0)
        item_d.is_optional = True
        item_d.save()

        return recipe

    def test_nutrition_summary_includes_default_exchange_and_optional(self):
        recipe = self._make_variant_recipe()
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)  # empty active_recipe_item_ids

        resp = self.client.get(f"/api/meal-plans/{plan.id}/nutrition-summary/")
        assert resp.status_code == 200
        data = resp.json()

        # A(100) + B(200) + D(400) = 700 kcal/100g, scale=10 -> 7000. C excluded.
        assert data["energy_kcal"] == pytest.approx(7000.0)

    def test_cost_summary_includes_default_exchange_and_optional(self):
        recipe = self._make_variant_recipe()
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        resp = self.client.get(f"/api/meal-plans/{plan.id}/costs/")
        assert resp.status_code == 200
        data = resp.json()

        # Active items: A, B (default), D (optional) -> 3 priced ingredients.
        assert data["total_ingredients"] == 3
        assert data["priced_ingredients"] == 3
        # A(1.0) + B(2.0) + D(4.0) = 7.0
        assert float(data["total_cost"]) == pytest.approx(7.0)

    def test_resolve_ingredient_weight_g_skips_soft_deleted_portion(self):
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        ing = make_ingredient(name="Brot", price_per_kg=Decimal("5.00"))
        mu = make_measuring_unit(name="Scheibe", unit="stk", quantity=1.0)
        deleted = make_portion(ingredient=ing, measuring_unit=mu, weight_g=50.0, name="Scheibe alt")
        deleted.soft_delete()
        make_portion(
            ingredient=ing,
            measuring_unit=mu,
            weight_g=35.0,
            name="Scheibe",
            rank=2,
            weight_status="confirmed",
        )

        from planner.models import MealItem

        item = MealItem.objects.create(meal=meal, ingredient=ing, quantity=2, measuring_unit=mu, factor=1.0)

        from planner.services.meal_item_helpers import (
            _resolve_ingredient_weight_g,
            resolve_ingredient_cost_eur,
            resolve_ingredient_energy_kcal,
        )

        assert _resolve_ingredient_weight_g(item) == pytest.approx(70.0)  # 2 * 35
        assert resolve_ingredient_energy_kcal(item, effective_portions=10) == pytest.approx(
            float(ing.energy_kcal) * 70.0 * 10.0 / 100.0
        )
        assert float(resolve_ingredient_cost_eur(item, effective_portions=10)) == pytest.approx(
            float(ing.price_per_kg) * 70.0 * 10.0 / 1000.0
        )

    def test_shopping_portion_options_exclude_soft_deleted_portions(self):
        ing = make_ingredient(name="Brot")
        deleted = make_portion(ingredient=ing, weight_g=50.0, name="Scheibe alt")
        deleted.soft_delete()
        make_portion(ingredient=ing, weight_g=35.0, name="Scheibe aktiv", rank=2, weight_status="confirmed")

        from supply.services.shopping_service import ShoppingListItem, _enrich_display_fields

        shopping_item = ShoppingListItem(
            ingredient_id=ing.id,
            ingredient_name=ing.name,
            total_quantity_g=70.0,
        )
        _enrich_display_fields({ing.id: shopping_item})

        option_names = [option["name"] for option in shopping_item.portion_options or []]
        assert "Scheibe aktiv" in option_names
        assert "Scheibe alt" not in option_names

    def test_portion_display_is_per_person(self):
        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        ing = make_ingredient(name="Haferflocken")
        mu = make_measuring_unit(name="g", unit="g", quantity=1.0)

        from planner.models import MealItem

        item = MealItem.objects.create(meal=meal, ingredient=ing, quantity=180, measuring_unit=mu, factor=1.0)

        from planner.schemas.meal_plan import MealItemOut

        display = MealItemOut.resolve_portion_display(item)
        # 180g per person, not divided by norm_portions
        assert display == "180 g Haferflocken (180g)"

    def test_shopping_list_reserve_zero_falls_back(self):
        from supply.services.shopping_service import generate_shopping_list

        plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=0.0)
        meal = make_meal(meal_plan=plan)
        recipe = make_recipe(portions=1)
        ing = make_ingredient(name="Mehl")
        make_recipe_item(recipe=recipe, portion=make_portion(ingredient=ing, weight_g=100.0), quantity=1.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        items = generate_shopping_list(plan)
        by_name = {i.ingredient_name: i for i in items}
        assert "Mehl" in by_name
        # reserve_factor 0 -> fallback to 1.0, so total = 100 * 1 * 10 = 1000g
        assert by_name["Mehl"].total_quantity_g == pytest.approx(1000.0)
