"""Tests for Shopping schema resolvers."""

import pytest

from shopping.models import ShoppingList, ShoppingListItem, SourceType
from shopping.schemas import ShoppingListItemOut
from supply.tests import make_ingredient, make_portion

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def user(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(username="alice", email="alice@example.com", password="test123")


@pytest.fixture
def shopping_list(user):
    return ShoppingList.objects.create(
        name="Test List",
        owner=user,
        source_type=SourceType.MANUAL,
    )


# ---------------------------------------------------------------------------
# resolve_start_unit / resolve_portion_options / resolve_package_options
#
# The API returns structured data (a unit option with grams per unit), not a formatted
# string; the frontend divides the stored grams and formats (switchable-quantity-units).
# ---------------------------------------------------------------------------


def _start(item):
    return ShoppingListItemOut.resolve_start_unit(item)


@pytest.mark.django_db
class TestResolveStartUnit:
    """Test the ShoppingListItemOut.resolve_start_unit resolver."""

    def test_no_ingredient_returns_none(self, shopping_list):
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list, name="Custom Item", quantity_g=250, unit="g"
        )
        assert _start(item) is None

    def test_liquid_without_portion_starts_in_milliliters(self, shopping_list):
        oil = make_ingredient(name="Olivenöl", physical_viscosity="liquid", physical_density=0.92)
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list, name=oil.name, quantity_g=1000, unit="ml", ingredient=oil
        )

        result = _start(item)

        assert result["kind"] == "milliliters"
        assert result["grams_per_unit"] == pytest.approx(0.92)

    def test_single_named_portion_is_the_start_unit(self, shopping_list):
        ingredient = make_ingredient(name="Bauernbrot", energy_kcal=265)
        portion = make_portion(
            ingredient=ingredient, name="Scheibe", quantity=1, weight_g=50, weight_status="confirmed", rank=1
        )
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list, name="Bauernbrot", quantity_g=150, unit="g", ingredient=ingredient
        )

        result = _start(item)

        assert (result["kind"], result["key"], result["label"], result["grams_per_unit"]) == (
            "portion",
            f"portion:{portion.pk}",
            "Scheibe",
            50,
        )

    def test_ingredient_without_named_portions_starts_in_grams(self, shopping_list):
        ingredient = make_ingredient(name="No Portions")
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list, name="No Portions", quantity_g=500, unit="g", ingredient=ingredient
        )

        result = _start(item)

        assert (result["kind"], result["grams_per_unit"]) == ("grams", 1.0)

    def test_portion_priority_ranking_respected(self, shopping_list):
        ingredient = make_ingredient(name="Test")
        make_portion(ingredient=ingredient, name="B", weight_g=100, rank=2)
        make_portion(ingredient=ingredient, name="A", weight_g=100, rank=1)
        make_portion(ingredient=ingredient, name="C", weight_g=100, rank=3)
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list, name="Test", quantity_g=200, unit="g", ingredient=ingredient
        )

        assert _start(item)["label"] == "A"

    def test_default_portion_wins_for_large_quantities(self, shopping_list):
        """Large amounts use the standard portion, not the largest one (spec shopping-list-piece-equivalents)."""
        ingredient = make_ingredient(name="Speisezwiebel")
        make_portion(
            ingredient=ingredient,
            name="mittelgroße Zwiebel",
            quantity=1,
            weight_g=80,
            weight_status="confirmed",
            rank=1,
        )
        make_portion(ingredient=ingredient, name="1 Portion", quantity=1, weight_g=120, rank=3)
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list, name="Speisezwiebel", quantity_g=3560, unit="g", ingredient=ingredient
        )

        result = _start(item)

        assert (result["label"], result["grams_per_unit"]) == ("mittelgroße Zwiebel", 80)
        options = ShoppingListItemOut.resolve_portion_options(item)
        assert {option["name"] for option in options} >= {"mittelgroße Zwiebel", "1 Portion"}


@pytest.mark.django_db
class TestResolvePortionOptions:
    """Test the ShoppingListItemOut.resolve_portion_options resolver."""

    def test_untrusted_weight_portion_is_excluded(self, shopping_list):
        """An unconfirmed piece-like weight (e.g. AI-proposed, never trusted per
        resolve_trusted_weight) is filtered out of the options."""
        ingredient = make_ingredient(name="Test Ingredient")
        make_portion(ingredient=ingredient, name="Valid", quantity=1, weight_g=100, rank=1)
        make_portion(
            ingredient=ingredient,
            name="Stück",
            quantity=1,
            weight_g=150,
            weight_status="ai_proposed",
            rank=2,
        )

        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            name="Test Ingredient",
            quantity_g=200,
            unit="g",
            ingredient=ingredient,
        )
        names = [o["name"] for o in ShoppingListItemOut.resolve_portion_options(item)]
        assert "Valid" in names
        assert "Stück" not in names

    def test_below_threshold_portion_not_shown(self, shopping_list):
        """A portion whose count would be < 0.5 is excluded from the options
        (the always-present base "g" unit still qualifies, since 50/1 >> 0.5)."""
        ingredient = make_ingredient(name="Großformat")
        make_portion(ingredient=ingredient, name="Portion", quantity=1, weight_g=1000, rank=1)

        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            name="Großformat",
            quantity_g=50,  # 0.05 of the 1000g portion — below the 0.5 threshold
            unit="g",
            ingredient=ingredient,
        )
        names = [o["name"] for o in ShoppingListItemOut.resolve_portion_options(item)]
        assert "Portion" not in names


@pytest.mark.django_db
class TestResolvePackagesAndLiquids:
    """Persistent shopping-list items: package need and ml display for liquids."""

    def _item(self, shopping_list, ingredient, quantity_g: float, unit: str = "g") -> ShoppingListItem:
        return ShoppingListItem.objects.create(
            shopping_list=shopping_list, name=ingredient.name, quantity_g=quantity_g, unit=unit, ingredient=ingredient
        )

    def test_package_need_with_tolerance(self, shopping_list):
        from supply.models import Package

        ing = make_ingredient(name="Spaghetti")
        Package.objects.create(ingredient=ing, name="Packung", weight_g=500, rank=1)
        item = self._item(shopping_list, ing, 1020)
        assert ShoppingListItemOut.resolve_package_options(item) == [
            {"count": 2, "package_name": "Packung", "weight_g": 500, "volume_ml": None}
        ]
        assert ShoppingListItemOut.resolve_package_surplus_g(item) == -20.0

    def test_liquid_package_size_in_ml(self, shopping_list):
        from supply.models import Package

        milk = make_ingredient(name="Kuhmilch", physical_viscosity="beverage", physical_density=1.0)
        Package.objects.create(ingredient=milk, name="1-kg-Flasche", weight_g=1000, rank=1)
        item = self._item(shopping_list, milk, 2600)
        assert ShoppingListItemOut.resolve_package_options(item)[0]["volume_ml"] == 1000

    def test_retail_section_falls_back_to_ingredient(self, shopping_list):
        from supply.models import RetailSection

        section = RetailSection.objects.create(name="Gewürze & Trockenkräuter", rank=1)
        ing = make_ingredient(name="Pfeffer")
        ing.retail_section = section
        ing.save()
        item = self._item(shopping_list, ing, 10)
        assert ShoppingListItemOut.resolve_retail_section_name(item) == "Gewürze & Trockenkräuter"
        assert ShoppingListItemOut.resolve_retail_section_id(item) == section.id

    def test_package_surplus(self, shopping_list):
        from supply.models import Package

        ing = make_ingredient(name="Butter")
        Package.objects.create(ingredient=ing, name="Stück", weight_g=250, rank=1)
        item = self._item(shopping_list, ing, 700)
        assert ShoppingListItemOut.resolve_package_options(item)[0]["count"] == 3
        assert ShoppingListItemOut.resolve_package_surplus_g(item) == 50.0

    def test_without_package(self, shopping_list):
        ing = make_ingredient(name="Salz")
        item = self._item(shopping_list, ing, 3)
        assert ShoppingListItemOut.resolve_package_options(item) == []
        assert ShoppingListItemOut.resolve_package_surplus_g(item) is None

    def test_milk_in_ml(self, shopping_list):
        milk = make_ingredient(name="Milch", physical_viscosity="beverage", physical_density=1.03)
        out = ShoppingListItemOut.from_orm(self._item(shopping_list, milk, 9400))
        assert (out.quantity, out.unit, out.quantity_g) == (9126, "ml", 9400)

    def test_solid_stays_in_grams(self, shopping_list):
        flour = make_ingredient(name="Mehl")
        out = ShoppingListItemOut.from_orm(self._item(shopping_list, flour, 1500))
        assert (out.quantity, out.unit) == (1500, "g")
