"""
API integration tests for meal-item PATCH and wizard-items endpoints.
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inspi.settings.local")
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import django

django.setup()

import datetime as dt
import json

from django.test import Client, TestCase
from django.utils import timezone
from model_bakery import baker

from planner.models import Meal, MealItem, MealPlan
from supply.models import Ingredient, MeasuringUnit, Portion


class TestMealItemPatchEndpoint(TestCase):
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

    def test_wizard_items_rejects_unit_without_portion(self):
        """POST /wizard-items/ never creates portions; an undefined unit is a 422."""
        toast = baker.make(
            Ingredient,
            name="Toastbrot (test)",
            energy_kcal=260.0,
            standard_recipe_weight_g=30.0,
            is_standalone_food=True,
        )
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{self.meal.id}/wizard-items/",
            data=json.dumps(
                {
                    "items": [
                        {
                            "ingredient_id": toast.id,
                            "quantity": 0.14,
                            "measuring_unit_id": self.scheibe_unit.id,
                            "factor": 1.0,
                        }
                    ]
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 422)
        self.assertIn("Einheit", response.json()["detail"])
        self.assertIn("ist für Toastbrot (test) nicht definiert", response.json()["detail"])
        self.assertFalse(Portion.objects.filter(ingredient=toast, measuring_unit=self.scheibe_unit).exists())

    def test_wizard_items_returns_quantity_g(self):
        """POST /wizard-items/ response should include quantity_g"""
        plan_id = self.plan.id
        meal_id = self.meal.id
        response = self.client.post(
            f"/api/meal-plans/{plan_id}/meals/{meal_id}/wizard-items/",
            data=json.dumps(
                {
                    "items": [
                        {
                            "ingredient_id": self.bauernbrot.id,
                            "quantity": 0.14,
                            "measuring_unit_id": self.scheibe_unit.id,
                            "factor": 1.0,
                        }
                    ]
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        for item in data.get("items", []):
            self.assertIn("quantity_g", item)


class TestMealPlanListFilters(TestCase):
    def setUp(self):
        self.user = baker.make("auth.User")
        self.client.force_login(self.user)
        now = timezone.now()

        def make(name, start, end, **extra):
            return MealPlan.objects.create(
                name=name, created_by=self.user, owner=self.user, start_datetime=start, end_datetime=end, **extra
            )

        self.past = make("Past", now - dt.timedelta(days=30), now - dt.timedelta(days=28), norm_portions=50)
        self.running = make("Running", now - dt.timedelta(days=1), now + dt.timedelta(days=1), norm_portions=12)
        self.soon = make("Soon", now + dt.timedelta(days=5), now + dt.timedelta(days=8), norm_portions=30)
        self.later = make("Later", now + dt.timedelta(days=60), now + dt.timedelta(days=60, hours=4))
        self.public = make("Public", now + dt.timedelta(days=90), now + dt.timedelta(days=91), visibility="public")

    def names(self, **params):
        response = self.client.get("/api/meal-plans/", params)
        self.assertEqual(response.status_code, 200)
        return [plan["name"] for plan in response.json()]

    def test_date_upcoming_sort(self):
        self.assertEqual(self.names(sort="date_upcoming"), ["Running", "Soon", "Later", "Public", "Past"])

    def test_when_filter(self):
        self.assertEqual(self.names(when="running"), ["Running"])
        self.assertEqual(self.names(when="past"), ["Past"])
        self.assertCountEqual(self.names(when="upcoming"), ["Soon", "Later", "Public"])

    def test_size_filter(self):
        self.assertEqual(self.names(size="large"), ["Past"])
        self.assertEqual(self.names(size="medium", sort="date_upcoming"), ["Soon"])

    def test_duration_filter(self):
        self.assertEqual(self.names(duration="day"), ["Later"])
        self.assertEqual(self.names(duration="week"), ["Soon"])
        self.assertCountEqual(self.names(duration="weekend"), ["Running", "Past", "Public"])

    def test_visibility_filter(self):
        self.assertEqual(self.names(visibility="public"), ["Public"])
