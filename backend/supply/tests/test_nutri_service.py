"""Tests for Nutri-Score calculation service."""

import pytest

from supply.models import Ingredient
from supply.services.nutri_service import calculate_nutri_score, get_nutri_score_details


@pytest.mark.django_db
class TestNutriScoreService:
    def test_solid_food_energy_kj_conversion(self):
        """Verify energy_kcal is converted to kJ before Nutri-Score threshold lookup."""
        # 500 kcal = 2092 kJ -> falls into > 2010 kJ bucket (6 negative points)
        ing = Ingredient.objects.create(
            name="Test Schokolade",
            energy_kcal=500.0,
            sugar_g=50.0,
            fat_sat_g=15.0,
            sodium_mg=50.0,
            fibre_g=2.0,
            protein_g=5.0,
            physical_viscosity="solid",
        )
        details = get_nutri_score_details(ing)
        # 2092 kJ > 2010 kJ -> energy_points == 6
        assert details["details"]["energy_points"] == 6

    def test_beverage_energy_kj_conversion(self):
        """Verify beverage energy is converted to kJ before threshold lookup."""
        # 30 kcal = 125.5 kJ -> falls into > 120 kJ bucket (5 negative points)
        ing = Ingredient.objects.create(
            name="Test Softdrink",
            energy_kcal=30.0,
            sugar_g=7.5,
            fat_sat_g=0.0,
            sodium_mg=0.0,
            fibre_g=0.0,
            protein_g=0.0,
            physical_viscosity="beverage",
        )
        details = get_nutri_score_details(ing)
        assert details["details"]["energy_points"] == 5

    def test_sodium_derived_from_salt_when_none(self):
        """Verify sodium_mg is derived from salt_g (400mg per 1g salt) if sodium is None."""
        ing = Ingredient.objects.create(
            name="Test Salzgebäck",
            energy_kcal=100.0,
            sugar_g=0.0,
            fat_sat_g=1.0,
            salt_g=1.5,  # 1.5g salt -> 600mg sodium -> > 540mg (6 negative points)
            sodium_mg=None,
            fibre_g=1.0,
            protein_g=2.0,
            physical_viscosity="solid",
        )
        details = get_nutri_score_details(ing)
        assert details["details"]["sodium_points"] == 6

    def test_water_receives_nutri_class_b(self):
        """Water/zero beverage receives class B (class 2) as default beverage minimum."""
        water = Ingredient.objects.create(
            name="Wasser",
            energy_kcal=0.0,
            sugar_g=0.0,
            fat_sat_g=0.0,
            sodium_mg=0.0,
            fibre_g=0.0,
            protein_g=0.0,
            physical_viscosity="beverage",
        )
        total, nutri_class = calculate_nutri_score(water)
        assert nutri_class == 2
