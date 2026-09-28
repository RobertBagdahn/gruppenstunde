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
# resolve_piece_equivalent / resolve_portion_options / resolve_package_options
#
# The API returns structured data (count + portion_name), not a formatted
# string; the frontend formats it (quantity-display-formatting spec).
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestResolvePieceEquivalent:
    """Test the ShoppingListItemOut.resolve_piece_equivalent resolver."""

    def test_no_ingredient_returns_none(self, shopping_list):
        """When no ingredient is attached, there is no piece equivalent."""
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            name="Custom Item",
            quantity_g=250,
            unit="g",
        )
        assert ShoppingListItemOut.resolve_piece_equivalent(item) is None

    def test_non_gram_unit_returns_none(self, shopping_list):
        """When unit is not 'g', piece equivalents (computed from gram weights) don't apply."""
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            name="Milk",
            quantity_g=1000,
            unit="ml",
        )
        assert ShoppingListItemOut.resolve_piece_equivalent(item) is None

    def test_single_named_portion_preferred(self, shopping_list):
        """Ingredient with a named portion returns {count, portion_name}."""
        ingredient = make_ingredient(name="Bauernbrot", energy_kcal=265)
        make_portion(
            ingredient=ingredient,
            name="Scheibe",
            quantity=1,
            weight_g=50,
            weight_status="confirmed",
            rank=1,
        )
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            name="Bauernbrot",
            quantity_g=150,  # 3 slices × 50g
            unit="g",
            ingredient=ingredient,
        )
        result = ShoppingListItemOut.resolve_piece_equivalent(item)
        assert result == {"count": 3, "portion_name": "Scheibe"}

    def test_empty_quantity_returns_none(self, shopping_list):
        """Quantity of 0 returns no piece equivalent."""
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            name="Empty Item",
            quantity_g=0,
            unit="g",
        )
        assert ShoppingListItemOut.resolve_piece_equivalent(item) is None

    def test_ingredient_without_named_portions_falls_back_to_base_gram_unit(self, shopping_list):
        """Every ingredient has an auto-created base "g" portion (weight_g=1,
        see supply.signals.ensure_ingredient_gram_portion); with no other
        portion defined, that's what the piece equivalent resolves to."""
        ingredient = make_ingredient(name="No Portions")
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            name="No Portions",
            quantity_g=500,
            unit="g",
            ingredient=ingredient,
        )
        assert ShoppingListItemOut.resolve_piece_equivalent(item) == {"count": 500, "portion_name": "g"}

    def test_rounding_to_one_decimal_place(self, shopping_list):
        """Fractional counts are rounded to 1 decimal (frontend formats the comma)."""
        ingredient = make_ingredient(name="Bread")
        make_portion(
            ingredient=ingredient,
            name="Scheibe",
            quantity=1,
            weight_g=50,
            weight_status="confirmed",
            rank=1,
        )
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            name="Bread",
            quantity_g=85,  # 1.7 slices
            unit="g",
            ingredient=ingredient,
        )
        result = ShoppingListItemOut.resolve_piece_equivalent(item)
        assert result == {"count": 1.7, "portion_name": "Scheibe"}

    def test_portion_priority_ranking_respected(self, shopping_list):
        """The primary portion (rank 1) is preferred as the piece equivalent."""
        ingredient = make_ingredient(name="Test")
        make_portion(ingredient=ingredient, name="B", weight_g=100, rank=2)
        make_portion(ingredient=ingredient, name="A", weight_g=100, rank=1)
        make_portion(ingredient=ingredient, name="C", weight_g=100, rank=3)

        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            name="Test",
            quantity_g=200,
            unit="g",
            ingredient=ingredient,
        )
        result = ShoppingListItemOut.resolve_piece_equivalent(item)
        assert result["portion_name"] == "A"


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
            {"count": 2, "package_name": "Packung", "weight_g": 500}
        ]
        assert ShoppingListItemOut.resolve_package_surplus_g(item) == -20.0

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
