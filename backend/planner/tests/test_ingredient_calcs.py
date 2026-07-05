"""
Comprehensive test of the breakfast-wizard-mealplan-transfer changes.
Uses model_bakery for test data creation.
"""

import datetime as dt
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inspi.settings.local")
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import django

django.setup()

from django.test import TestCase
from django.utils import timezone
from model_bakery import baker

from planner.models import Meal, MealItem, MealPlan
from planner.schemas.meal_plan import MealItemOut, MealItemUpdateIn
from planner.services.meal_item_helpers import (
    resolve_ingredient_cost_eur,
    resolve_ingredient_energy_kcal,
)
from supply.models import Ingredient, MeasuringUnit, Portion


class TestIngredientCalcs(TestCase):
    def setUp(self):
        self.user = baker.make("auth.User")
        self.plan = MealPlan.objects.create(
            name="Test Plan",
            norm_portions=10,
            created_by=self.user,
            owner=self.user,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
        )
        self.meal = Meal.objects.create(
            meal_plan=self.plan,
            meal_type="breakfast",
            day_part_factor=0.25,
        )

        # Create measuring units
        self.gram_unit = MeasuringUnit.objects.create(name="g")
        self.ml_unit = MeasuringUnit.objects.create(name="ml")
        self.scheibe_unit = MeasuringUnit.objects.create(name="Scheibe")
        self.portion_unit = MeasuringUnit.objects.create(name="Portion")

        # Create ingredients
        self.bauernbrot = baker.make(
            Ingredient,
            name="Bauernbrot",
            energy_kcal=265.0,
            price_per_kg=5.0,
            standard_recipe_weight_g=50.0,
            is_standalone_food=True,
        )
        self.nutella = baker.make(
            Ingredient,
            name="Nutella",
            energy_kcal=540.0,
            price_per_kg=12.0,
            is_standalone_food=True,
        )

        # Create portions
        self.brot_scheibe = Portion.objects.create(
            ingredient=self.bauernbrot,
            measuring_unit=self.scheibe_unit,
            name="Scheibe",
            quantity=1,
            weight_g=50.0,
        )
        self.nutella_normal = Portion.objects.create(
            ingredient=self.nutella,
            measuring_unit=self.portion_unit,
            name="Belag normal",
            quantity=1,
            weight_g=20.0,
        )

    def test_ingredient_energy_with_effective_portions(self):
        """resolve_ingredient_energy_kcal should multiply by effective_portions"""
        item = MealItem.objects.create(
            meal=self.meal,
            ingredient=self.bauernbrot,
            quantity=0.5,
            measuring_unit=self.scheibe_unit,
            factor=1.0,
        )
        # weight_g = portion.weight_g * quantity = 50 * 0.5 = 25g
        # energy = (265/100) * 25 * 1.0 * 10 = 662.5
        energy = resolve_ingredient_energy_kcal(item, effective_portions=10)
        self.assertIsNotNone(energy)
        self.assertAlmostEqual(energy, 662.5, places=1)
        # Without effective_portions (default=1.0): 66.25
        energy_default = resolve_ingredient_energy_kcal(item)
        self.assertAlmostEqual(energy_default, 66.25, places=1)

    def test_ingredient_cost_with_effective_portions(self):
        """resolve_ingredient_cost_eur should multiply by effective_portions"""
        item = MealItem.objects.create(
            meal=self.meal,
            ingredient=self.nutella,
            quantity=0.5,
            measuring_unit=self.portion_unit,
            factor=1.0,
        )
        cost = resolve_ingredient_cost_eur(item, effective_portions=10)
        self.assertIsNotNone(cost)
        # price_per_kg * weight_g * factor * effPortions / 1000
        # = 12 * (20*0.5) * 1.0 * 10 / 1000 = 1.20
        self.assertAlmostEqual(float(cost), 1.20, places=2)

    def test_meal_item_energy_kcal_resolver(self):
        """MealItemOut.resolve_energy_kcal for ingredient items passes effective_portions"""
        item = MealItem.objects.create(
            meal=self.meal,
            ingredient=self.bauernbrot,
            quantity=0.5,
            measuring_unit=self.scheibe_unit,
            factor=1.0,
        )
        resolved = MealItemOut.resolve_energy_kcal(item)
        self.assertIsNotNone(resolved)
        self.assertAlmostEqual(resolved, 662.5, places=1)

    def test_meal_item_cost_eur_resolver(self):
        """MealItemOut.resolve_cost_eur now returns cost for ingredient items (bugfix)"""
        item = MealItem.objects.create(
            meal=self.meal,
            ingredient=self.bauernbrot,
            quantity=0.14,
            measuring_unit=self.scheibe_unit,
            factor=1.0,
        )
        resolved = MealItemOut.resolve_cost_eur(item)
        self.assertIsNotNone(resolved)  # Bugfix: was always None for ingredient items
        self.assertGreater(float(resolved), 0)

    def test_meal_item_quantity_g_resolver(self):
        """MealItemOut.resolve_quantity_g returns correct grams for ingredient items"""
        item = MealItem.objects.create(
            meal=self.meal,
            ingredient=self.bauernbrot,
            quantity=0.5,
            measuring_unit=self.scheibe_unit,
            factor=1.0,
        )
        qty_g = MealItemOut.resolve_quantity_g(item)
        self.assertIsNotNone(qty_g)
        self.assertAlmostEqual(qty_g, 25.0, places=1)  # 50 * 0.5 = 25g per person

    def test_quantity_g_fallback_gram_unit(self):
        """When measuring_unit is 'g', quantity_g = quantity (per-person grams)"""
        item = MealItem.objects.create(
            meal=self.meal,
            ingredient=self.bauernbrot,
            quantity=180,
            measuring_unit=self.gram_unit,
            factor=1.0,
        )
        qty_g = MealItemOut.resolve_quantity_g(item)
        self.assertEqual(qty_g, 180.0)  # 180g per person (quantity)

    def test_quantity_g_fallback_no_portion(self):
        """When measuring_unit is unknown, quantity_g falls back to default portion"""
        unknown_unit = MeasuringUnit.objects.create(name="Unbekannt")
        item = MealItem.objects.create(
            meal=self.meal,
            ingredient=self.bauernbrot,
            quantity=5,
            measuring_unit=unknown_unit,
            factor=1.0,
        )
        qty_g = MealItemOut.resolve_quantity_g(item)
        self.assertIsNotNone(qty_g)
        self.assertGreater(qty_g, 0)

    def test_meal_item_update_in_accepts_quantity(self):
        """MealItemUpdateIn should accept quantity field"""
        schema = MealItemUpdateIn(quantity=0.5)
        self.assertEqual(schema.quantity, 0.5)
        schema = MealItemUpdateIn(factor=1.5)
        self.assertEqual(schema.factor, 1.5)
        schema = MealItemUpdateIn(quantity=0.3, factor=1.0)
        self.assertEqual(schema.quantity, 0.3)
        self.assertEqual(schema.factor, 1.0)

    def test_meal_out_total_energy_with_ingredients(self):
        """MealOut.resolve_total_energy_kcal should sum ingredient energies with effective_portions"""
        MealItem.objects.create(
            meal=self.meal,
            ingredient=self.bauernbrot,
            quantity=0.5,
            measuring_unit=self.scheibe_unit,
            factor=1.0,
        )
        from planner.schemas.meal_plan import MealOut

        total = MealOut.resolve_total_energy_kcal(self.meal)
        self.assertGreater(total, 0)
        self.assertAlmostEqual(total, 662.5, places=1)

    def test_meal_out_total_cost_with_ingredients(self):
        """MealOut.resolve_total_cost_eur should sum ingredient costs with effective_portions"""
        MealItem.objects.create(
            meal=self.meal,
            ingredient=self.nutella,
            quantity=0.5,
            measuring_unit=self.portion_unit,
            factor=1.0,
        )
        from planner.schemas.meal_plan import MealOut

        total = MealOut.resolve_total_cost_eur(self.meal)
        self.assertGreater(float(total), 0)
        # 12 * (20*0.5) * 1.0 * 10 / 1000 = 1.20
        self.assertAlmostEqual(float(total), 1.20, places=2)

    def test_quantity_g_recipe_item(self):
        """MealItemOut.resolve_quantity_g for recipe items returns None (no recipe energy)"""
        recipe = baker.make("recipe.Recipe", title="Test Recipe", portions=4)
        item = MealItem.objects.create(
            meal=self.meal,
            recipe=recipe,
            factor=1.0,
        )
        qty_g = MealItemOut.resolve_quantity_g(item)
        # No cached energy, should fall back to reasonable value or None
        self.assertIsNone(qty_g)
