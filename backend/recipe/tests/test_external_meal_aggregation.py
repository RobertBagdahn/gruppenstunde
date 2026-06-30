"""Tests for external-meal aggregation in _aggregate_meal_values.

External meals are a special case: they report a fixed kcal value (or
derive it from NORM_PERSON_DAILY_KCAL × day_part_factor) and return
immediately without itemising ingredients.
"""

import pytest

from planner.tests import make_meal, make_meal_plan
from recipe.services.nutrition_aggregation import _aggregate_meal_values
from supply.data.dge_reference import NORM_PERSON_DAILY_KCAL


@pytest.mark.django_db
class TestExternalMealAggregation:
    def test_external_meal_uses_explicit_kcal(self):
        """is_external=True with external_energy_kcal → that value is returned."""
        plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan, is_external=True, external_energy_kcal=1200.0)

        totals = _aggregate_meal_values(meal)

        assert totals["energy_kcal"] == 1200.0
        # All other nutrients are zero (external meals don't itemise)
        assert totals["protein_g"] == 0.0
        assert totals["weight_g"] == 0.0

    def test_external_meal_falls_back_to_day_part_factor(self):
        """is_external=True with no explicit kcal → NORM_PERSON_DAILY_KCAL * day_part_factor."""
        plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
        meal = make_meal(
            meal_plan=plan,
            is_external=True,
            external_energy_kcal=None,
            day_part_factor=0.3,
        )

        totals = _aggregate_meal_values(meal)

        expected = NORM_PERSON_DAILY_KCAL * 0.3
        assert totals["energy_kcal"] == pytest.approx(expected)

    def test_external_meal_with_zero_day_part_factor(self):
        """day_part_factor=0 produces 0 kcal (edge case, no ZeroDivision)."""
        plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
        meal = make_meal(
            meal_plan=plan,
            is_external=True,
            external_energy_kcal=None,
            day_part_factor=0.0,
        )

        totals = _aggregate_meal_values(meal)
        assert totals["energy_kcal"] == pytest.approx(0.0)
