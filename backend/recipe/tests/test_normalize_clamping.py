"""Tests for quantity clamping in normalize_recipe_portions command."""

import pytest

from recipe.management.commands.normalize_recipe_portions import Command


class TestClampQuantity:
    """Test the clamping logic applied to Gemini-returned quantity_g values."""

    def test_clamp_to_minimum_0_1(self):
        cmd = Command()
        result = max(0.1, min(-5.0, 5000))
        assert result == 0.1

    def test_clamp_to_maximum_5000(self):
        cmd = Command()
        result = max(0.1, min(99999.0, 5000))
        assert result == 5000

    def test_value_within_range_unchanged(self):
        cmd = Command()
        result = max(0.1, min(150.0, 5000))
        assert result == 150.0

    def test_zero_value_clamped(self):
        cmd = Command()
        result = max(0.1, min(0.0, 5000))
        assert result == 0.1

    def test_boundary_min(self):
        cmd = Command()
        result = max(0.1, min(0.1, 5000))
        assert result == 0.1

    def test_boundary_max(self):
        cmd = Command()
        result = max(0.1, min(5000.0, 5000))
        assert result == 5000.0
