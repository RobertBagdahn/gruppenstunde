"""Start unit of a shopping item: common natural source unit, else the standard portion, else g/ml."""

import pytest

from supply.services.shopping_service import start_unit_for
from supply.tests import make_ingredient, make_portion


def _portions(ingredient):
    return list(ingredient.portions.filter(deleted_at__isnull=True).order_by("rank", "name"))


@pytest.mark.django_db
class TestStartUnitFor:
    def test_common_portion_unit_wins_over_the_standard_portion(self):
        roll = make_ingredient(name="Brötchen Start")
        standard = make_portion(roll, name="Portion", quantity=1, weight_g=120, rank=1, weight_status="confirmed")
        piece = make_portion(roll, name="Stück", quantity=1, weight_g=60, rank=2, weight_status="confirmed")

        unit = start_unit_for(roll, _portions(roll), {f"portion:{piece.pk}"}, standard.name, "g")

        assert (unit["key"], unit["label"], unit["grams_per_unit"]) == (f"portion:{piece.pk}", "Stück", 60)

    def test_common_standard_measure_is_kept(self):
        oil = make_ingredient(name="Öl Start", physical_density=0.92)

        unit = start_unit_for(oil, _portions(oil), {"standard:el"}, None, "ml")

        assert unit["kind"] == "standard"
        assert unit["label"] == "EL"
        assert unit["grams_per_unit"] > 0

    def test_mixed_units_fall_back_to_the_standard_portion(self):
        roll = make_ingredient(name="Brötchen Mix")
        piece = make_portion(roll, name="Stück", quantity=1, weight_g=60, rank=1, weight_status="confirmed")

        unit = start_unit_for(roll, _portions(roll), {f"portion:{piece.pk}", "standard:el"}, "Stück", "g")

        assert unit["key"] == f"portion:{piece.pk}"

    def test_metric_entries_do_not_decide_the_unit(self):
        onion = make_ingredient(name="Zwiebel Start")
        piece = make_portion(onion, name="Zwiebel", quantity=1, weight_g=80, rank=1, weight_status="confirmed")

        unit = start_unit_for(onion, _portions(onion), {"grams"}, "Zwiebel", "g")

        assert unit["key"] == f"portion:{piece.pk}"

    def test_without_natural_units_it_is_grams_or_milliliters(self):
        flour = make_ingredient(name="Mehl Start")
        milk = make_ingredient(name="Milch Start", physical_density=1.03)

        assert start_unit_for(flour, _portions(flour), {"grams"}, None, "g")["kind"] == "grams"
        assert start_unit_for(milk, _portions(milk), {"milliliters"}, None, "ml")["kind"] == "milliliters"

    def test_unit_without_trusted_weight_is_not_offered(self):
        item = make_ingredient(name="Unbestätigt Start")
        unconfirmed = make_portion(item, name="Stück", quantity=1, weight_g=150, rank=2, weight_status="ai_proposed")

        unit = start_unit_for(item, _portions(item), {f"portion:{unconfirmed.pk}"}, None, "g")

        assert unit["kind"] == "grams"
