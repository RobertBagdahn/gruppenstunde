"""Tests for simplified price_service."""

from decimal import Decimal

import pytest

from supply.services.price_service import get_portion_price
from supply.tests import make_ingredient


@pytest.mark.django_db
class TestPriceService:
    def test_get_portion_price_basic(self):
        """Should calculate price from price_per_kg and weight_g."""
        ingredient = make_ingredient(price_per_kg=Decimal("2.00"))
        result = get_portion_price(ingredient, 500.0)
        assert result == Decimal("1.00")

    def test_get_portion_price_small_amount(self):
        """Should handle small amounts correctly."""
        ingredient = make_ingredient(price_per_kg=Decimal("5.00"))
        result = get_portion_price(ingredient, 100.0)
        assert result == Decimal("0.50")

    def test_get_portion_price_no_price(self):
        """Should return None if no price_per_kg is set."""
        ingredient = make_ingredient(price_per_kg=None)
        result = get_portion_price(ingredient, 500.0)
        assert result is None

    def test_get_portion_price_zero_weight(self):
        """Should return None for zero weight."""
        ingredient = make_ingredient(price_per_kg=Decimal("2.00"))
        result = get_portion_price(ingredient, 0.0)
        assert result is None

    def test_get_portion_price_negative_weight(self):
        """Should return None for negative weight."""
        ingredient = make_ingredient(price_per_kg=Decimal("2.00"))
        result = get_portion_price(ingredient, -100.0)
        assert result is None
