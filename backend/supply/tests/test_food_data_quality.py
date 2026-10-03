"""Tests for the food data quality fixes (fix_food_data_quality)."""

from decimal import Decimal

import pytest
from django.core.management import call_command

from supply.models import Ingredient
from supply.services.food_data_quality import (
    fill_missing_prices,
    fix_free_water_prices,
    fix_nutrition,
    merge_duplicate_groups,
)
from supply.services.nutrition_plausibility import (
    detect_nutrition_issues,
    net_carbs_if_total,
    propose_deterministic_repair,
)
from supply.services.price_service import is_free_ingredient
from supply.tests import make_ingredient


def _codes(values: dict[str, float | None], name: str = "Zimt, Pulver") -> set[str]:
    return {issue.code for issue in detect_nutrition_issues(values, name=name)}


CINNAMON = {
    "energy_kcal": 242.0,
    "protein_g": 3.99,
    "fat_g": 1.24,
    "fat_sat_g": 0.3,
    "carbohydrate_g": 80.59,
    "sugar_g": 2.17,
    "fibre_g": 53.1,
    "salt_g": 0.0,
    "sodium_mg": 10.0,
}


class TestNetCarbs:
    def test_total_carbs_with_fibre_become_net_carbs(self):
        assert {"macro_sum_gt_100", "energy_mismatch"} <= _codes(CINNAMON)
        changes = propose_deterministic_repair(CINNAMON, name="Zimt, Pulver")
        assert changes["carbohydrate_g"] == 27.5
        assert _codes({**CINNAMON, **changes}) == set()

    def test_plausible_fibre_profile_is_untouched(self):
        oats = {**CINNAMON, "energy_kcal": 372.0, "protein_g": 13.0, "fat_g": 7.0, "carbohydrate_g": 59.0}
        oats |= {"fibre_g": 10.0, "sugar_g": 1.0}
        assert "carbohydrate_g" not in propose_deterministic_repair(oats, name="Haferflocken")

    def test_macro_sum_above_100_is_fixed_when_energy_fits_net_value(self):
        sesame = {**CINNAMON, "energy_kcal": 573.0, "protein_g": 17.7, "fat_g": 49.7, "carbohydrate_g": 23.5}
        sesame |= {"sugar_g": 0.3, "fibre_g": 11.2}
        assert net_carbs_if_total(sesame, "Sesam") == 12.3

    def test_net_carbs_not_used_when_sugar_exceeds_net_value(self):
        values = {**CINNAMON, "sugar_g": 40.0}
        assert propose_deterministic_repair(values, name="Zimt, Pulver").get("carbohydrate_g") != 27.5


class TestFreeWater:
    def test_free_ingredient_names(self):
        assert is_free_ingredient("Heißes Wasser")
        assert is_free_ingredient(" nudelkochwasser ")
        assert not is_free_ingredient("Mineralwasser")

    @pytest.mark.django_db
    def test_prices_cleared_only_for_free_water(self):
        water = make_ingredient(name="Nudelkochwasser", price_per_kg=Decimal("0.01"))
        mineral = make_ingredient(name="Mineralwasser", price_per_kg=Decimal("0.50"))

        assert fix_free_water_prices(apply=False).changed == 1
        water.refresh_from_db()
        assert water.price_per_kg is not None

        fix_free_water_prices(apply=True)
        water.refresh_from_db()
        mineral.refresh_from_db()
        assert water.price_per_kg is None
        assert mineral.price_per_kg == Decimal("0.50")
        assert fix_free_water_prices(apply=True).changed == 0


@pytest.mark.django_db
class TestDuplicatesAndPrices:
    def test_dried_basil_duplicates_are_merged_into_target(self):
        target = make_ingredient(name="Basilikum, getrocknet")
        source = make_ingredient(name="Basilikum, trocken")
        other = make_ingredient(name="Getrockneter Basilikum")

        assert merge_duplicate_groups(apply=False).changed == 2
        source.refresh_from_db()
        assert not source.is_deleted

        merge_duplicate_groups(apply=True)
        source.refresh_from_db()
        other.refresh_from_db()
        target.refresh_from_db()
        assert source.is_deleted and other.is_deleted
        assert not target.is_deleted
        assert merge_duplicate_groups(apply=True).changed == 0

    def test_missing_price_is_filled_but_existing_price_is_kept(self):
        lentils = make_ingredient(name="Berglinsen (getrocknet)", price_per_kg=None)
        priced = make_ingredient(name="Berglinsen", price_per_kg=Decimal("6.50"))

        fill_missing_prices(apply=True)
        lentils.refresh_from_db()
        priced.refresh_from_db()
        assert lentils.price_per_kg == Decimal("4.00")
        assert priced.price_per_kg == Decimal("6.50")


@pytest.mark.django_db
class TestNutritionStep:
    def test_vanilla_gets_reference_values(self):
        vanilla = make_ingredient(name="Gemahlene Vanille", energy_kcal=109.0, protein_g=2.0, fibre_g=20.0)

        fix_nutrition(apply=True)
        vanilla.refresh_from_db()
        assert vanilla.energy_kcal == 288.0
        assert vanilla.fibre_g == 0.0

    def test_total_carbs_of_fibre_rich_food_become_net(self):
        sesame = make_ingredient(
            name="Sesam", energy_kcal=573.0, protein_g=17.7, fat_g=49.7, carbohydrate_g=23.5, sugar_g=0.3, fibre_g=11.2
        )

        fix_nutrition(apply=True)
        sesame.refresh_from_db()
        assert sesame.carbohydrate_g == 12.3

    def test_dry_run_changes_nothing(self):
        vanilla = make_ingredient(name="Gemahlene Vanille", energy_kcal=109.0)

        result = fix_nutrition(apply=False)
        vanilla.refresh_from_db()
        assert result.changed == 1
        assert vanilla.energy_kcal == 109.0

    def test_command_runs_all_steps(self, capsys):
        make_ingredient(name="Heißes Wasser", price_per_kg=Decimal("0.01"))

        call_command("fix_food_data_quality", "--apply")
        out = capsys.readouterr().out
        assert "ANGEWENDET" in out
        assert Ingredient.objects.get(name="Heißes Wasser").price_per_kg is None
