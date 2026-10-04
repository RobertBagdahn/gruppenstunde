"""Tests for the IngredientSeason model."""

import pytest

from supply.models import IngredientSeason
from supply.tests import make_ingredient

# =============================================================================
# Tests for IngredientSeason model
# =============================================================================


@pytest.mark.django_db
class TestIngredientSeasonModel:
    def test_create_season_entry(self):
        ing = make_ingredient(name="Tomate")
        season = IngredientSeason.objects.create(
            ingredient=ing,
            month=7,
            is_high_season=True,
        )
        assert season.ingredient == ing
        assert season.month == 7
        assert season.is_high_season is True
        assert str(season) == "Tomate – Monat 7"

    def test_unique_constraint(self):
        ing = make_ingredient(name="Gurke")
        IngredientSeason.objects.create(ingredient=ing, month=7)
        with pytest.raises(Exception):
            IngredientSeason.objects.create(ingredient=ing, month=7)

    def test_multiple_months_allowed(self):
        ing = make_ingredient(name="Erdbeere")
        IngredientSeason.objects.create(ingredient=ing, month=5, is_high_season=True)
        IngredientSeason.objects.create(ingredient=ing, month=6, is_high_season=True)
        assert ing.seasons.count() == 2
