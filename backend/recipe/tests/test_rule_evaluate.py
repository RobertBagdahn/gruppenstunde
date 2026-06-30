"""Unit tests for Rule.evaluate() — the green/yellow/red ampel core.

This logic gates every nutrition verdict in the cockpit and recipe checks, so an
inverted operator or threshold regression would silently flip results app-wide.
The table tests below pin the behaviour at the boundary values for all four
threshold configurations (max-only, min-only, range, none).
"""

import pytest
from django.core.exceptions import ValidationError

from recipe.models import Rule
from recipe.tests import make_rule


@pytest.mark.django_db
class TestRuleEvaluate:
    def test_max_only_upper_limit(self):
        """Only max thresholds set → too much is bad."""
        rule = make_rule(
            min_green=None, min_yellow=None, max_green=10.0, max_yellow=20.0
        )
        assert rule.evaluate(5.0) == "green"
        assert rule.evaluate(10.0) == "green"  # == max_green is still green
        assert rule.evaluate(10.1) == "yellow"
        assert rule.evaluate(20.0) == "yellow"  # == max_yellow is still yellow
        assert rule.evaluate(20.1) == "red"

    def test_min_only_lower_limit(self):
        """Only min thresholds set → too little is bad."""
        rule = make_rule(
            parameter="protein_g",
            min_green=20.0,
            min_yellow=10.0,
            max_green=None,
            max_yellow=None,
        )
        assert rule.evaluate(25.0) == "green"
        assert rule.evaluate(20.0) == "green"  # == min_green is green
        assert rule.evaluate(19.9) == "yellow"
        assert rule.evaluate(10.0) == "yellow"  # == min_yellow is yellow
        assert rule.evaluate(9.9) == "red"
        assert rule.evaluate(0.0) == "red"

    def test_range_both_bounds(self):
        """Both min and max set → value must stay inside the range."""
        rule = make_rule(
            parameter="energy_kcal",
            min_green=400.0,
            min_yellow=200.0,
            max_green=800.0,
            max_yellow=1000.0,
        )
        # Inside green band
        assert rule.evaluate(400.0) == "green"
        assert rule.evaluate(600.0) == "green"
        assert rule.evaluate(800.0) == "green"
        # Below lower bound
        assert rule.evaluate(399.9) == "yellow"
        assert rule.evaluate(199.9) == "red"
        # Above upper bound
        assert rule.evaluate(800.1) == "yellow"
        assert rule.evaluate(1000.1) == "red"

    def test_no_thresholds_is_always_green(self):
        """A rule with no thresholds set never flags anything."""
        rule = make_rule(
            min_green=None, min_yellow=None, max_green=None, max_yellow=None
        )
        assert rule.evaluate(0.0) == "green"
        assert rule.evaluate(99999.0) == "green"

    def test_lower_bound_takes_precedence_when_both_violated(self):
        """A value below the lower red bound is red regardless of the upper bound."""
        rule = make_rule(
            parameter="energy_kcal",
            min_green=400.0,
            min_yellow=200.0,
            max_green=800.0,
            max_yellow=1000.0,
        )
        assert rule.evaluate(100.0) == "red"


@pytest.mark.django_db
class TestRuleThresholdValidation:
    """Rule.clean() must reject thresholds that are not in ascending order."""

    def test_valid_range_is_accepted(self):
        rule = Rule(
            name="ok",
            parameter="energy_kcal",
            scope="meal",
            rule_type="nutrition",
            min_yellow=200.0,
            min_green=400.0,
            max_green=800.0,
            max_yellow=1000.0,
        )
        rule.clean()  # should not raise

    def test_partial_min_only_is_accepted(self):
        rule = Rule(
            name="ok",
            parameter="protein_g",
            scope="meal",
            rule_type="nutrition",
            min_yellow=10.0,
            min_green=20.0,
        )
        rule.clean()  # should not raise

    def test_unordered_thresholds_rejected(self):
        rule = Rule(
            name="bad",
            parameter="energy_kcal",
            scope="meal",
            rule_type="nutrition",
            min_yellow=500.0,  # > min_green → invalid
            min_green=400.0,
            max_green=800.0,
            max_yellow=1000.0,
        )
        with pytest.raises(ValidationError):
            rule.clean()

    def test_max_green_above_max_yellow_rejected(self):
        rule = Rule(
            name="bad",
            parameter="sugar_g",
            scope="meal",
            rule_type="nutrition",
            max_green=900.0,  # > max_yellow → invalid
            max_yellow=800.0,
        )
        with pytest.raises(ValidationError):
            rule.clean()
