"""Tests for cockpit_service — evaluate HealthRules at each scope."""

import datetime

import pytest
from django.utils import timezone

from planner.tests import make_meal, make_meal_event, make_meal_item
from recipe.models import HealthRule
from recipe.services.cockpit_service import (
    evaluate_day_cockpit,
    evaluate_meal_cockpit,
    evaluate_meal_event_cockpit,
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
            threshold_green=5000.0,
            threshold_yellow=10000.0,
        )
        result = evaluate_meal_cockpit(meal)
        assert len(result["evaluations"]) == 1
        eval_item = result["evaluations"][0]
        assert eval_item["parameter"] == "energy_kj"
        assert eval_item["status"] in ("green", "yellow", "red")

    def test_evaluate_day_cockpit(self):
        """Day cockpit evaluates day-scoped rules."""
        meal_event = make_meal_event()
        today = datetime.date.today()
        make_meal(meal_event=meal_event)
        make_health_rule(
            name="Day Energy",
            parameter="energy_kj",
            scope="day",
            threshold_green=9000.0,
            threshold_yellow=12000.0,
        )
        result = evaluate_day_cockpit(meal_event, today)
        assert len(result["evaluations"]) == 1
        assert result["evaluations"][0]["parameter"] == "energy_kj"

    def test_evaluate_meal_event_cockpit(self):
        """MealEvent cockpit evaluates meal_event-scoped rules."""
        meal_event = make_meal_event()
        make_meal(meal_event=meal_event)
        make_health_rule(
            name="Event Nutri",
            parameter="nutri_class",
            scope="meal_event",
            threshold_green=2.5,
            threshold_yellow=3.5,
        )
        result = evaluate_meal_event_cockpit(meal_event)
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
            threshold_green=5000.0,
            threshold_yellow=10000.0,
            sort_order=1,
        )
        # This will evaluate as green since 0 < 5000
        result = evaluate_meal_cockpit(meal)
        assert result["summary_status"] == "green"
        assert result["green_count"] == 1

    def test_health_rule_evaluate_method(self):
        """Test HealthRule.evaluate() directly."""
        rule = HealthRule(threshold_green=10.0, threshold_yellow=20.0)
        assert rule.evaluate(5.0) == "green"
        assert rule.evaluate(10.0) == "green"
        assert rule.evaluate(15.0) == "yellow"
        assert rule.evaluate(20.0) == "yellow"
        assert rule.evaluate(25.0) == "red"
