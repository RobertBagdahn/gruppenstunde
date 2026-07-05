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
        Portion.objects.get_or_create(
            name="100g",
            ingredient=ing,
            defaults={"measuring_unit": mu, "quantity": 1.0, "weight_g": 100.0, "rank": 1},
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
        # Total weight: 5 (quantity) * 1.0 (measuring_unit.quantity for "g") * 1.0 (factor) * 10.0 (scaling) = 50g
        assert item.total_quantity_g == 50.0

    def test_portion_override_scaling(self):
        """Should use override_portions on a meal instead of global plan portions."""
        # 1. Create a meal plan with portions = 10, but override_portions = 20
        meal_plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=meal_plan, override_portions=20)

        mu, _ = MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
        ing = make_ingredient(name="Override Zucker")

        Portion.objects.get_or_create(
            name="100g",
            ingredient=ing,
            defaults={"measuring_unit": mu, "quantity": 1.0, "weight_g": 100.0, "rank": 1},
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
        # Total weight: 2 * 1.0 (measuring_unit.quantity for "g") * 1.0 * 20 (override scaling) = 40g
        assert item.total_quantity_g == 40.0

    def test_scaling_uses_reserve_without_pal(self):
        """Shopping quantity scales by norm_portions * reserve_factor, no PAL."""
        # 18 portions, reserve 1.2 -> scaling_factor = 21.6 (no activity factor)
        meal_plan = make_meal_plan(norm_portions=18, reserve_factor=1.2)
        assert meal_plan.scaling_factor == pytest.approx(21.6)

        meal = make_meal(meal_plan=meal_plan)
        mu, _ = MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
        ing = make_ingredient(name="PAL-Frei Brot")
        # 300 g per portion modelled as quantity=300 on a weight_g=1.0 portion
        # Signal already creates "g" portion; update its weight_g to what we need
        p, _ = Portion.objects.get_or_create(
            name="g",
            ingredient=ing,
            defaults={"measuring_unit": mu, "quantity": 1.0, "weight_g": 1.0, "rank": 9999},
        )
        if p.weight_g != 1.0:
            p.weight_g = 1.0
            p.save()

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

    def _make_single_item_plan(self, *, norm_portions, reserve_factor, quantity):
        """Helper: build a meal plan with a single direct-ingredient MealItem (grams unit)."""
        from model_bakery import baker

        from planner.models import MealItem

        meal_plan = make_meal_plan(norm_portions=norm_portions, reserve_factor=reserve_factor)
        meal = make_meal(meal_plan=meal_plan)
        mu, _ = MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
        ing = make_ingredient(name="Reserve-Test Zutat")
        baker.make(
            MealItem,
            meal=meal,
            recipe=None,
            ingredient=ing,
            quantity=Decimal(str(quantity)),
            measuring_unit=mu,
            factor=1.0,
        )
        return meal_plan

    def test_reserve_breakdown_with_reserve_factor_1_1(self):
        """reserve_factor=1.1 -> net/reserve split correctly, sum equals total."""
        meal_plan = self._make_single_item_plan(norm_portions=10, reserve_factor=1.1, quantity=100.0)
        items = generate_shopping_list(meal_plan)
        assert len(items) == 1
        item = items[0]
        # total = 100g (quantity) * 1.0 (factor) * (10 * 1.1) = 1100g
        assert item.total_quantity_g == pytest.approx(1100.0)
        assert item.net_quantity_g == pytest.approx(1000.0, abs=0.5)
        assert item.reserve_quantity_g == pytest.approx(100.0, abs=0.5)
        assert item.net_quantity_g + item.reserve_quantity_g == pytest.approx(item.total_quantity_g)

    def test_reserve_breakdown_with_reserve_factor_1_0(self):
        """reserve_factor=1.0 -> reserve_quantity_g == 0, net == total."""
        meal_plan = self._make_single_item_plan(norm_portions=10, reserve_factor=1.0, quantity=100.0)
        items = generate_shopping_list(meal_plan)
        item = items[0]
        assert item.total_quantity_g == pytest.approx(1000.0)
        assert item.reserve_quantity_g == 0.0
        assert item.net_quantity_g == pytest.approx(item.total_quantity_g)

    def test_reserve_breakdown_with_reserve_factor_1_15(self):
        """reserve_factor=1.15 -> correct split."""
        meal_plan = self._make_single_item_plan(norm_portions=10, reserve_factor=1.15, quantity=100.0)
        items = generate_shopping_list(meal_plan)
        item = items[0]
        # total = 100g * (10 * 1.15) = 1150g
        assert item.total_quantity_g == pytest.approx(1150.0)
        assert item.net_quantity_g == pytest.approx(1000.0, abs=0.5)
        assert item.reserve_quantity_g == pytest.approx(150.0, abs=0.5)
        assert item.net_quantity_g + item.reserve_quantity_g == pytest.approx(item.total_quantity_g)


@pytest.mark.django_db
class TestShoppingListRankOrdering:
    """5.1 — Shopping list groups follow RetailSection rank (Laden-Rundgang), not alphabetical name."""

    def test_sorted_by_retail_section_rank_not_name(self):
        from model_bakery import baker

        from planner.models import MealItem
        from supply.models import RetailSection

        meal_plan = make_meal_plan(norm_portions=1, reserve_factor=1.0)
        meal = make_meal(meal_plan=meal_plan)
        mu, _ = MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})

        # "Sonstiges" (rank 22, alphabetically first) vs. "Obst" (rank 1, alphabetically last
        # among these two) — a name-based sort would put Sonstiges before Obst; rank-based
        # sort must put Obst first.
        rs_obst = RetailSection.objects.create(name="Obst", rank=1)
        rs_sonstiges = RetailSection.objects.create(name="Sonstiges", rank=22)

        ing_obst = make_ingredient(name="Zzz Apfel", retail_section=rs_obst)
        ing_sonstiges = make_ingredient(name="Aaa Sonstige Zutat", retail_section=rs_sonstiges)

        for ing in (ing_obst, ing_sonstiges):
            Portion.objects.get_or_create(
                name="100g",
                ingredient=ing,
                defaults={"measuring_unit": mu, "quantity": 1.0, "weight_g": 100.0, "rank": 1},
            )
            baker.make(
                MealItem,
                meal=meal,
                recipe=None,
                ingredient=ing,
                quantity=Decimal("1.0"),
                measuring_unit=mu,
                factor=1.0,
            )

        items = generate_shopping_list(meal_plan)
        names_in_order = [item.ingredient_name for item in items]
        assert names_in_order == ["Zzz Apfel", "Aaa Sonstige Zutat"]
