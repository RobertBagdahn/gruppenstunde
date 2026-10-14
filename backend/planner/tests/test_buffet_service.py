"""Tests for compute_buffet / save_buffet (planner/services/buffet_service.py)."""

import pytest

from planner.services.buffet_service import BuffetError, BuffetSelection, compute_buffet, save_buffet
from planner.tests import make_buffet_template, make_meal, make_meal_plan
from recipe.tests import make_recipe
from supply.tests import make_ingredient


@pytest.fixture
def gram_unit(db):
    from supply.models import MeasuringUnit

    unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"unit": "g", "quantity": 1.0})
    return unit


@pytest.fixture
def ml_unit(db):
    from supply.models import MeasuringUnit

    unit, _ = MeasuringUnit.objects.get_or_create(name="Milliliter", defaults={"unit": "ml", "quantity": 1.0})
    return unit


def _tagged_ingredient(role_tag, **kwargs):
    ingredient = make_ingredient(**kwargs)
    ingredient.tags.add(role_tag)
    return ingredient


def _tagged_recipe(role_tag, **kwargs):
    recipe = make_recipe(**kwargs)
    recipe.tags.add(role_tag)
    return recipe


@pytest.mark.django_db
class TestComputeBuffet:
    def test_splits_amount_evenly_across_role_selection(self, gram_unit):
        template = make_buffet_template(roles={"buffet-bread": (120, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        bauernbrot = _tagged_ingredient(bread_tag, name="Bauernbrot")
        broetchen = _tagged_ingredient(bread_tag, name="Brötchen")
        meal_plan = make_meal_plan(norm_portions=10)
        meal = make_meal(meal_plan=meal_plan, override_portions=10)

        result = compute_buffet(
            template,
            [
                BuffetSelection(role_slug="buffet-bread", ingredient=bauernbrot),
                BuffetSelection(role_slug="buffet-bread", ingredient=broetchen),
            ],
            None,
            meal,
        )

        assert len(result.items) == 2
        for item in result.items:
            assert item.amount_per_person == 60
            assert item.unit == "g"
            assert item.total_amount == 60 * 10
            assert item.factor == 1.0

    def test_role_amount_override_takes_priority(self, gram_unit):
        template = make_buffet_template(roles={"buffet-bread": (120, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = _tagged_ingredient(bread_tag, name="Bauernbrot")
        meal = make_meal(override_portions=10)

        result = compute_buffet(
            template,
            [BuffetSelection(role_slug="buffet-bread", ingredient=ingredient)],
            {"buffet-bread": 200},
            meal,
        )

        assert result.items[0].amount_per_person == 200

    def test_ingredient_stored_as_grams_or_milliliters(self, gram_unit, ml_unit):
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True), "buffet-drink": (250, "ml", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        drink_tag = template.roles.get(role__slug="buffet-drink").role
        bread = _tagged_ingredient(bread_tag, name="Brot")
        milk = _tagged_ingredient(drink_tag, name="Milch", physical_density=1.03)
        meal = make_meal(override_portions=1)

        result = compute_buffet(
            template,
            [
                BuffetSelection(role_slug="buffet-bread", ingredient=bread),
                BuffetSelection(role_slug="buffet-drink", ingredient=milk),
            ],
            None,
            meal,
        )
        by_role = {item.role_slug: item for item in result.items}
        assert by_role["buffet-bread"].unit == "g"
        assert by_role["buffet-drink"].unit == "ml"

    def test_recipe_factor_uses_weight_per_serving(self, gram_unit):
        template = make_buffet_template(roles={"buffet-drink": (250, "ml", True)})
        drink_tag = template.roles.get(role__slug="buffet-drink").role
        recipe = _tagged_recipe(drink_tag, title="Kaffee", portions=1)
        recipe.cached_weight_g = 250
        recipe.save(update_fields=["cached_weight_g"])
        meal = make_meal(override_portions=1)

        result = compute_buffet(
            template,
            [BuffetSelection(role_slug="buffet-drink", recipe=recipe)],
            None,
            meal,
        )
        assert result.items[0].factor == pytest.approx(1.0)

    def test_recipe_factor_falls_back_without_weight(self, gram_unit):
        template = make_buffet_template(roles={"buffet-drink": (250, "ml", True)})
        drink_tag = template.roles.get(role__slug="buffet-drink").role
        recipe = _tagged_recipe(drink_tag, title="Kaffee", portions=1)
        recipe.cached_weight_g = None
        recipe.save(update_fields=["cached_weight_g"])
        coffee2 = _tagged_recipe(drink_tag, title="Tee", portions=1)
        coffee2.cached_weight_g = None
        coffee2.save(update_fields=["cached_weight_g"])
        meal = make_meal(override_portions=1)

        result = compute_buffet(
            template,
            [
                BuffetSelection(role_slug="buffet-drink", recipe=recipe),
                BuffetSelection(role_slug="buffet-drink", recipe=coffee2),
            ],
            None,
            meal,
        )
        for item in result.items:
            assert item.factor == pytest.approx(0.5)

    def test_person_count_not_in_quantity(self, gram_unit):
        template = make_buffet_template(roles={"buffet-bread": (80, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = _tagged_ingredient(bread_tag, name="Brot")
        meal10 = make_meal(override_portions=10)
        meal1 = make_meal(meal_plan=meal10.meal_plan, override_portions=1, meal_type="dinner")

        result10 = compute_buffet(
            template, [BuffetSelection(role_slug="buffet-bread", ingredient=ingredient)], None, meal10
        )
        result1 = compute_buffet(
            template, [BuffetSelection(role_slug="buffet-bread", ingredient=ingredient)], None, meal1
        )
        assert result10.items[0].amount_per_person == result1.items[0].amount_per_person == 80
        assert result10.items[0].total_amount == 800
        assert result1.items[0].total_amount == 80

    def test_rejects_role_not_in_template(self, gram_unit):
        template = make_buffet_template(roles={"buffet-bread": (80, "g", True)})
        from planner.tests import make_buffet_roles

        other_tag = make_buffet_roles()["buffet-savory"]
        ingredient = _tagged_ingredient(other_tag, name="Gouda")
        meal = make_meal(override_portions=1)

        with pytest.raises(BuffetError):
            compute_buffet(template, [BuffetSelection(role_slug="buffet-savory", ingredient=ingredient)], None, meal)

    def test_accepts_visible_item_without_role_tag(self, gram_unit):
        template = make_buffet_template(roles={"buffet-bread": (80, "g", True)})
        ingredient = make_ingredient(name="Freie Zutat")
        meal = make_meal(override_portions=1)

        result = compute_buffet(
            template, [BuffetSelection(role_slug="buffet-bread", ingredient=ingredient)], None, meal
        )

        assert result.items[0].name == "Freie Zutat"
        assert result.items[0].amount_per_person == 80
        assert any(warning.code == "missing_price" for warning in result.warnings)

    def test_unknown_nutrition_and_price_make_totals_null_and_warn(self, gram_unit):
        template = make_buffet_template(roles={"buffet-bread": (80, "g", True)})
        ingredient = _tagged_ingredient(
            template.roles.get(role__slug="buffet-bread").role,
            name="Unvollständige Zutat",
            energy_kcal=None,
            price_per_kg=None,
        )
        meal = make_meal(override_portions=2)

        result = compute_buffet(
            template, [BuffetSelection(role_slug="buffet-bread", ingredient=ingredient)], None, meal
        )

        assert result.energy_kcal_per_person is None
        assert result.cost_per_person is None
        assert result.cost_total is None
        assert {warning.code for warning in result.warnings} == {"missing_energy", "missing_price"}

    def test_rejects_duplicate_selection(self, gram_unit):
        template = make_buffet_template(roles={"buffet-bread": (80, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = _tagged_ingredient(bread_tag, name="Brot")
        meal = make_meal(override_portions=1)

        with pytest.raises(BuffetError):
            compute_buffet(
                template,
                [
                    BuffetSelection(role_slug="buffet-bread", ingredient=ingredient),
                    BuffetSelection(role_slug="buffet-bread", ingredient=ingredient),
                ],
                None,
                meal,
            )


@pytest.mark.django_db
class TestSaveBuffet:
    def test_replaces_only_buffet_items(self, gram_unit):
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = _tagged_ingredient(bread_tag, name="Brot")
        other_recipe = make_recipe(title="Obstsalat")
        meal = make_meal(override_portions=1)

        from planner.models import MealItem

        MealItem.objects.create(meal=meal, recipe=other_recipe, factor=1.0)

        save_buffet(meal, template, [BuffetSelection(role_slug="buffet-bread", ingredient=ingredient)], None)

        assert MealItem.objects.filter(meal=meal, recipe=other_recipe).exists()
        assert MealItem.objects.filter(meal=meal, ingredient=ingredient, buffet_role="buffet-bread").exists()

        ingredient2 = _tagged_ingredient(bread_tag, name="Brötchen")
        save_buffet(meal, template, [BuffetSelection(role_slug="buffet-bread", ingredient=ingredient2)], None)

        assert not MealItem.objects.filter(meal=meal, ingredient=ingredient).exists()
        assert MealItem.objects.filter(meal=meal, ingredient=ingredient2).exists()
        assert MealItem.objects.filter(meal=meal, recipe=other_recipe).exists()

    def test_saves_item_shares_and_allows_same_ingredient_in_multiple_roles(self, gram_unit):
        template = make_buffet_template(
            roles={
                "buffet-bread": (100, "g", True),
                "buffet-savory": (40, "g", True),
            }
        )
        ingredient = make_ingredient(name="Mehrfachrolle")
        ingredient.tags.add(template.roles.get(role__slug="buffet-bread").role)
        ingredient.tags.add(template.roles.get(role__slug="buffet-savory").role)
        bread = _tagged_ingredient(
            template.roles.get(role__slug="buffet-bread").role,
            name="Anteil A",
        )
        bread_other = _tagged_ingredient(
            template.roles.get(role__slug="buffet-bread").role,
            name="Anteil B",
        )
        meal = make_meal(override_portions=1)

        save_buffet(
            meal,
            template,
            [
                BuffetSelection(role_slug="buffet-bread", ingredient=ingredient, share_percent=50),
                BuffetSelection(role_slug="buffet-savory", ingredient=ingredient, share_percent=100),
                BuffetSelection(role_slug="buffet-bread", ingredient=bread, share_percent=35),
                BuffetSelection(role_slug="buffet-bread", ingredient=bread_other, share_percent=15),
            ],
            None,
        )

        from planner.models import MealItem

        assert MealItem.objects.filter(meal=meal, ingredient=ingredient).count() == 2
        assert set(MealItem.objects.filter(meal=meal, ingredient=ingredient).values_list("buffet_role", flat=True)) == {
            "buffet-bread",
            "buffet-savory",
        }
        assert (
            MealItem.objects.get(meal=meal, ingredient=ingredient, buffet_role="buffet-bread").buffet_share_percent
            == 50
        )
        assert (
            MealItem.objects.get(meal=meal, ingredient=ingredient, buffet_role="buffet-savory").buffet_share_percent
            == 100
        )
        assert MealItem.objects.get(meal=meal, ingredient=bread).buffet_share_percent == 35
        assert MealItem.objects.get(meal=meal, ingredient=bread_other).buffet_share_percent == 15

    def test_sets_meal_template_and_role_amounts(self, gram_unit):
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = _tagged_ingredient(bread_tag, name="Brot")
        meal = make_meal(override_portions=1)

        save_buffet(
            meal, template, [BuffetSelection(role_slug="buffet-bread", ingredient=ingredient)], {"buffet-bread": 150}
        )
        meal.refresh_from_db()
        assert meal.buffet_template_id == template.id
        assert meal.buffet_role_amounts == {"buffet-bread": {"amount": 150.0, "unit": "grams", "amount_g": 150.0}}


@pytest.mark.django_db
class TestComputeBuffetRecipeFallbackWarning:
    def test_recipe_without_serving_weight_warns_about_fallback(self, gram_unit):
        template = make_buffet_template(roles={"buffet-dish": (200, "g", True)})
        dish_tag = template.roles.get(role__slug="buffet-dish").role
        recipe = _tagged_recipe(dish_tag, title="Nudelsalat", portions=1)
        recipe.cached_weight_g = None
        recipe.save(update_fields=["cached_weight_g"])
        meal = make_meal(override_portions=1)

        result = compute_buffet(template, [BuffetSelection(role_slug="buffet-dish", recipe=recipe)], None, meal)

        fallback = [warning for warning in result.warnings if warning.code == "missing_recipe_weight"]
        assert len(fallback) == 1
        assert (
            fallback[0].message == "Nudelsalat: Portionsgewicht fehlt; es wird eine gleichmäßige Ersatzmenge verwendet."
        )
        assert result.items[0].factor == pytest.approx(1.0)


@pytest.mark.django_db
class TestRoleAmountsInNaturalUnits:
    """`2 Stück pro Person` converts with each item's own weight (openspec `switchable-quantity-units`)."""

    def _setup(self, gram_unit, *, second_has_piece=True):
        from supply.models import Portion

        template = make_buffet_template(roles={"buffet-bread": (150, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        small = _tagged_ingredient(bread_tag, name="Kleines Brötchen")
        large = _tagged_ingredient(bread_tag, name="Großes Brötchen")
        small_piece = Portion.objects.create(
            ingredient=small,
            name="Stück",
            measuring_unit=gram_unit,
            quantity=1,
            weight_g=60,
            rank=1,
            weight_status="confirmed",
            weight_source="manual",
        )
        large_piece = None
        if second_has_piece:
            large_piece = Portion.objects.create(
                ingredient=large,
                name="Stück",
                measuring_unit=gram_unit,
                quantity=1,
                weight_g=80,
                rank=1,
                weight_status="confirmed",
                weight_source="manual",
            )
        meal = make_meal(meal_plan=make_meal_plan(norm_portions=10), override_portions=10)
        selections = [
            BuffetSelection(role_slug="buffet-bread", ingredient=small),
            BuffetSelection(role_slug="buffet-bread", ingredient=large),
        ]
        return template, meal, selections, small_piece, large_piece

    def test_two_pieces_with_different_weights_give_140_grams(self, gram_unit):
        template, meal, selections, *_ = self._setup(gram_unit)

        result = compute_buffet(
            template, selections, {"buffet-bread": 2}, meal, role_units={"buffet-bread": "portion:stück"}
        )

        assert result.role_amounts["buffet-bread"] == {"amount": 2, "unit": "portion:stück", "amount_g": 140.0}
        assert [round(item.amount_per_person, 1) for item in result.items] == [60.0, 80.0]
        assert [item.unit_count for item in result.items] == [1.0, 1.0]
        assert {option["label"] for option in result.role_unit_options["buffet-bread"]} >= {"Stück"}

    def test_saved_items_keep_the_unit_and_restore_the_same_count(self, gram_unit):
        template, meal, selections, small_piece, large_piece = self._setup(gram_unit)

        result = save_buffet(
            meal, template, selections, {"buffet-bread": 1.5}, role_units={"buffet-bread": "portion:stück"}
        )

        items = {item.ingredient.name: item for item in meal.items.exclude(buffet_role="")}
        assert float(items["Kleines Brötchen"].quantity) == 0.75
        assert items["Kleines Brötchen"].portion_id == small_piece.id
        assert items["Großes Brötchen"].portion_id == large_piece.id
        assert meal.buffet_role_amounts["buffet-bread"]["unit"] == "portion:stück"
        # Restoring: the saved gram shares plus the same count give the same grams again.
        shares = [item.share_percent for item in result.items]
        restored = compute_buffet(
            template,
            [
                BuffetSelection(role_slug="buffet-bread", ingredient=selection.ingredient, share_percent=share)
                for selection, share in zip(selections, shares, strict=True)
            ],
            {"buffet-bread": 1.5},
            meal,
            role_units={"buffet-bread": "portion:stück"},
        )
        assert restored.role_amounts["buffet-bread"]["amount_g"] == pytest.approx(
            result.role_amounts["buffet-bread"]["amount_g"], abs=0.02
        )

    def test_falls_back_to_grams_with_a_warning_when_an_item_lacks_the_unit(self, gram_unit):
        template, meal, selections, *_ = self._setup(gram_unit, second_has_piece=False)

        result = compute_buffet(
            template, selections, {"buffet-bread": 2}, meal, role_units={"buffet-bread": "portion:stück"}
        )

        assert any(warning.code == "unit_fallback" for warning in result.warnings)
        assert result.role_amounts["buffet-bread"]["unit"] == "grams"
        assert result.role_amounts["buffet-bread"]["amount_g"] == 150
        assert all(item.unit_count is None for item in result.items)

    def test_legacy_plain_number_is_read_as_grams(self):
        from planner.api.buffet import _saved_role_amounts

        assert _saved_role_amounts({"buffet-bread": 150.0}) == ({"buffet-bread": 150.0}, {})
        assert _saved_role_amounts({"buffet-bread": {"amount": 2, "unit": "portion:stück", "amount_g": 140}}) == (
            {"buffet-bread": 2.0},
            {"buffet-bread": "portion:stück"},
        )
