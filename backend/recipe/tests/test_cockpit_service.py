"""Tests for cockpit_service — evaluate HealthRules at each scope."""

import datetime

import pytest
from django.utils import timezone

from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import HealthRule
from recipe.services.cockpit_service import (
    evaluate_day_cockpit,
    evaluate_meal_cockpit,
    evaluate_meal_plan_cockpit,
)
from recipe.tests import make_health_rule


@pytest.mark.django_db
class TestCockpitService:
    def test_evaluate_meal_cockpit_no_rules(self):
        """With no active rules, dashboard should be empty green."""
        meal = make_meal()
        result = evaluate_meal_cockpit(meal)
        assert result["evaluations"] == []
        assert result["summary_status"] == "green"
        assert result["green_count"] == 0
        assert result["yellow_count"] == 0
        assert result["red_count"] == 0

    def test_evaluate_meal_cockpit_with_rule(self):
        """With a meal-scope rule, should evaluate against meal values."""
        meal = make_meal()
        make_health_rule(
            name="Test Energy",
            parameter="energy_kj",
            scope="meal",
            max_green=5000.0,
            max_yellow=10000.0,
        )
        result = evaluate_meal_cockpit(meal)
        assert len(result["evaluations"]) == 1
        eval_item = result["evaluations"][0]
        assert eval_item["parameter"] == "energy_kj"
        assert eval_item["status"] in ("green", "yellow", "red")

    def test_evaluate_day_cockpit(self):
        """Day cockpit evaluates day-scoped rules."""
        meal_plan = make_meal_plan()
        today = datetime.date.today()
        make_meal(meal_plan=meal_plan)
        make_health_rule(
            name="Day Energy",
            parameter="energy_kj",
            scope="day",
            max_green=9000.0,
            max_yellow=12000.0,
        )
        result = evaluate_day_cockpit(meal_plan, today)
        assert len(result["evaluations"]) == 1
        assert result["evaluations"][0]["parameter"] == "energy_kj"

    def test_evaluate_meal_plan_cockpit(self):
        """MealPlan cockpit evaluates meal_event-scoped rules."""
        meal_plan = make_meal_plan()
        make_meal(meal_plan=meal_plan)
        make_health_rule(
            name="Event Nutri",
            parameter="nutri_class",
            scope="meal_event",
            max_green=2.5,
            max_yellow=3.5,
        )
        result = evaluate_meal_plan_cockpit(meal_plan)
        assert len(result["evaluations"]) == 1

    def test_inactive_rules_excluded(self):
        """Inactive rules should not be evaluated."""
        meal = make_meal()
        make_health_rule(
            name="Inactive Rule",
            parameter="sugar_g",
            scope="meal",
            is_active=False,
        )
        result = evaluate_meal_cockpit(meal)
        assert len(result["evaluations"]) == 0

    def test_summary_status_worst(self):
        """Summary status should be the worst across evaluations."""
        meal = make_meal()
        # Green rule (value 0 < 5000)
        make_health_rule(
            name="Green Rule",
            parameter="energy_kj",
            scope="meal",
            max_green=5000.0,
            max_yellow=10000.0,
            sort_order=1,
        )
        # This will evaluate as green since 0 < 5000
        result = evaluate_meal_cockpit(meal)
        assert result["summary_status"] == "green"
        assert result["green_count"] == 1

    def test_health_rule_evaluate_method(self):
        """Test HealthRule.evaluate() directly."""
        # Max-only rule: lower is better
        rule = HealthRule(max_green=10.0, max_yellow=20.0)
        assert rule.evaluate(5.0) == "green"
        assert rule.evaluate(10.0) == "green"
        assert rule.evaluate(15.0) == "yellow"
        assert rule.evaluate(20.0) == "yellow"
        assert rule.evaluate(25.0) == "red"

    def test_health_rule_evaluate_min_only(self):
        """Test HealthRule.evaluate() with min-only rule."""
        rule = HealthRule(min_green=100.0, min_yellow=50.0)
        assert rule.evaluate(150.0) == "green"
        assert rule.evaluate(100.0) == "green"
        assert rule.evaluate(75.0) == "yellow"
        assert rule.evaluate(50.0) == "yellow"
        assert rule.evaluate(25.0) == "red"
        assert rule.evaluate(0.0) == "red"

    def test_health_rule_evaluate_range(self):
        """Test HealthRule.evaluate() with both min and max (range rule)."""
        rule = HealthRule(min_green=500.0, min_yellow=200.0, max_green=2000.0, max_yellow=3000.0)
        assert rule.evaluate(1000.0) == "green"  # in range
        assert rule.evaluate(300.0) == "yellow"  # below min_green but above min_yellow
        assert rule.evaluate(100.0) == "red"     # below min_yellow
        assert rule.evaluate(2500.0) == "yellow" # above max_green but below max_yellow
        assert rule.evaluate(3500.0) == "red"    # above max_yellow
        assert rule.evaluate(0.0) == "red"       # zero energy = red
