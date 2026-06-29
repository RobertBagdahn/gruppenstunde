"""
API integration tests for meal-item PATCH and wizard-items endpoints.
"""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inspi.settings.local")
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import django
django.setup()

from django.test import TestCase, Client
from django.urls import reverse
from model_bakery import baker
import json

from planner.models import MealPlan, Meal, MealItem
from planner.schemas.meal_plan import MealItemOut, MealItemUpdateIn
from supply.models import Ingredient, MeasuringUnit, Portion


class TestMealItemPatchEndpoint(TestCase):
    def setUp(self):
        self.user = baker.make("auth.User")
        self.plan = MealPlan.objects.create(
            name="Test Plan",
            norm_portions=10,
            created_by=self.user,
            owner=self.user,
        )
        self.meal = Meal.objects.create(
            meal_plan=self.plan,
            meal_type="breakfast",
            day_part_factor=0.25,
        )
        self.gram_unit = MeasuringUnit.objects.create(name="g")
        self.scheibe_unit = MeasuringUnit.objects.create(name="Scheibe")
        self.bauernbrot = baker.make(
            Ingredient,
            name="Bauernbrot",
            energy_kcal=265.0,
            price_per_kg=5.0,
            standard_recipe_weight_g=50.0,
            is_standalone_food=True,
        )
        Portion.objects.create(
            ingredient=self.bauernbrot,
            measuring_unit=self.scheibe_unit,
            name="Scheibe",
            quantity=1,
            weight_g=50.0,
        )
        self.item = MealItem.objects.create(
            meal=self.meal,
            ingredient=self.bauernbrot,
            quantity=0.14,
            measuring_unit=self.scheibe_unit,
            factor=1.0,
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_patch_factor_updates_factor(self):
        """PATCH /meal-items/ with factor should update factor"""
        item_id = self.item.id
        plan_id = self.plan.id
        response = self.client.patch(
            f"/api/meal-plans/{plan_id}/meal-items/{item_id}/",
            data=json.dumps({"factor": 2.0}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.item.refresh_from_db()
        self.assertEqual(self.item.factor, 2.0)

    def test_patch_quantity_updates_quantity(self):
        """PATCH /meal-items/ with quantity should update quantity"""
        item_id = self.item.id
        plan_id = self.plan.id
        response = self.client.patch(
            f"/api/meal-plans/{plan_id}/meal-items/{item_id}/",
            data=json.dumps({"quantity": 0.5}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.item.refresh_from_db()
        self.assertEqual(float(self.item.quantity), 0.5)

    def test_patch_quantity_changes_energy(self):
        """PATCH quantity should reflect in energy_kcal response"""
        item_id = self.item.id
        plan_id = self.plan.id
        response = self.client.patch(
            f"/api/meal-plans/{plan_id}/meal-items/{item_id}/",
            data=json.dumps({"quantity": 0.5}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # energy_kcal should be in the response and > 0
        self.assertIsNotNone(data.get("energy_kcal"))
        # With quantity=0.5, portion_weight=50, effPortions=10:
        # energy = (265/100) * (50*0.5) * 1.0 * 10 = 662.5
        self.assertAlmostEqual(float(data["energy_kcal"]), 662.5, places=0)

    def test_patch_both_factor_and_quantity(self):
        """PATCH with both factor and quantity should work"""
        item_id = self.item.id
        plan_id = self.plan.id
        response = self.client.patch(
            f"/api/meal-plans/{plan_id}/meal-items/{item_id}/",
            data=json.dumps({"factor": 1.5, "quantity": 1.0}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.item.refresh_from_db()
        self.assertEqual(self.item.factor, 1.5)
        self.assertEqual(float(self.item.quantity), 1.0)

    def test_response_contains_quantity_g(self):
        """MealItem response should contain quantity_g"""
        plan_id = self.plan.id
        response = self.client.get(f"/api/meal-plans/{plan_id}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for meal in data.get("meals", []):
            for item in meal.get("items", []):
                if item["id"] == self.item.id:
                    self.assertIn("quantity_g", item)
                    # With quantity=0.14, portion=50 (per-person)
                    # → 50 * 0.14 * 1.0 = 7
                    self.assertAlmostEqual(item["quantity_g"], 7.0, places=1)
                    return
        # Item should be found
        self.fail("Item not found in response")

    def test_wizard_items_creates_portion_if_missing(self):
        """POST /wizard-items/ should auto-create missing Portion for ingredient"""
        # Create an ingredient without a Scheibe Portion
        toast = baker.make(
            Ingredient,
            name="Toastbrot (test)",
            energy_kcal=260.0,
            standard_recipe_weight_g=30.0,
            is_standalone_food=True,
        )
        # Verify no Scheibe portion exists
        self.assertFalse(
            Portion.objects.filter(
                ingredient=toast, measuring_unit=self.scheibe_unit
            ).exists()
        )
        # POST to wizard-items
        plan_id = self.plan.id
        meal_id = self.meal.id
        response = self.client.post(
            f"/api/meal-plans/{plan_id}/meals/{meal_id}/wizard-items/",
            data=json.dumps({
                "items": [{
                    "ingredient_id": toast.id,
                    "quantity": 0.14,
                    "measuring_unit_id": self.scheibe_unit.id,
                    "factor": 1.0,
                }]
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        # Portion should have been auto-created
        self.assertTrue(
            Portion.objects.filter(
                ingredient=toast, measuring_unit=self.scheibe_unit
            ).exists()
        )
    def test_wizard_items_returns_quantity_g(self):
        """POST /wizard-items/ response should include quantity_g"""
        plan_id = self.plan.id
        meal_id = self.meal.id
        response = self.client.post(
            f"/api/meal-plans/{plan_id}/meals/{meal_id}/wizard-items/",
            data=json.dumps({
                "items": [{
                    "ingredient_id": self.bauernbrot.id,
                    "quantity": 0.14,
                    "measuring_unit_id": self.scheibe_unit.id,
                    "factor": 1.0,
                }]
            }),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for item in data.get("items", []):
            self.assertIn("quantity_g", item)
