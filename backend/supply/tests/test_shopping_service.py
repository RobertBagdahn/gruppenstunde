"""Tests for shopping list generation service."""

from decimal import Decimal

import pytest

from planner.tests import make_meal, make_meal_plan
from supply.models import MeasuringUnit, Portion
from supply.services.shopping_service import generate_shopping_list
from supply.tests import make_ingredient


@pytest.mark.django_db
class TestShoppingService:
    def test_direct_ingredient_aggregation_basic(self):
        """Should aggregate and scale direct ingredient items without recipes."""
        # 1. Create a meal plan
        meal_plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=meal_plan)

        # 2. Create measuring unit and ingredient
        mu, _ = MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
        ing = make_ingredient(name="Direct Mehl")

        # 3. Create Portion with weight for the ingredient
        Portion.objects.create(
            name="100g",
            measuring_unit=mu,
            ingredient=ing,
            quantity=1.0,
            weight_g=100.0,
        )

        # 4. Create MealItem with direct ingredient
        from model_bakery import baker

        from planner.models import MealItem

        baker.make(
            MealItem,
            meal=meal,
            recipe=None,
            ingredient=ing,
            quantity=Decimal("5.0"),  # 5 * 100g = 500g base
            measuring_unit=mu,
            factor=1.0,
        )

        # Generate shopping list
        items = generate_shopping_list(meal_plan)
        assert len(items) == 1
        item = items[0]
        assert item.ingredient_name == "Direct Mehl"
        # Total weight: 5 (quantity) * 100g (weight) * 1.0 (factor) * 10.0 (scaling) = 5000g
        assert item.total_quantity_g == 5000.0

    def test_portion_override_scaling(self):
        """Should use override_portions on a meal instead of global plan portions."""
        # 1. Create a meal plan with portions = 10, but override_portions = 20
        meal_plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=meal_plan, override_portions=20)

        mu, _ = MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
        ing = make_ingredient(name="Override Zucker")

        Portion.objects.create(
            name="100g",
            measuring_unit=mu,
            ingredient=ing,
            quantity=1.0,
            weight_g=100.0,
        )

        from model_bakery import baker

        from planner.models import MealItem

        baker.make(
            MealItem,
            meal=meal,
            recipe=None,
            ingredient=ing,
            quantity=Decimal("2.0"),  # 2 * 100g = 200g base
            measuring_unit=mu,
            factor=1.0,
        )

        # Generate shopping list
        items = generate_shopping_list(meal_plan)
        assert len(items) == 1
        item = items[0]
        assert item.ingredient_name == "Override Zucker"
        # Total weight: 2 * 100g * 1.0 * 20 (override scaling) = 4000g (instead of 2000g if using global 10 portions)
        assert item.total_quantity_g == 4000.0

    def test_scaling_uses_reserve_without_pal(self):
        """Shopping quantity scales by norm_portions * reserve_factor, no PAL."""
        # 18 portions, reserve 1.2 -> scaling_factor = 21.6 (no activity factor)
        meal_plan = make_meal_plan(norm_portions=18, reserve_factor=1.2)
        assert meal_plan.scaling_factor == pytest.approx(21.6)

        meal = make_meal(meal_plan=meal_plan)
        mu, _ = MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
        ing = make_ingredient(name="PAL-Frei Brot")
        # 300 g per portion modelled as quantity=300 on a weight_g=1.0 portion
        Portion.objects.create(name="g", measuring_unit=mu, ingredient=ing, quantity=1.0, weight_g=1.0)

        from model_bakery import baker

        from planner.models import MealItem

        baker.make(
            MealItem,
            meal=meal,
            recipe=None,
            ingredient=ing,
            quantity=Decimal("300.0"),
            measuring_unit=mu,
            factor=1.0,
        )

        items = generate_shopping_list(meal_plan)
        assert len(items) == 1
        # 300 * 18 * 1.2 = 6480 g (no PAL factor applied)
        assert items[0].total_quantity_g == pytest.approx(6480.0)
