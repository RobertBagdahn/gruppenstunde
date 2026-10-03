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
        assert meal.buffet_role_amounts == {"buffet-bread": 150.0}
