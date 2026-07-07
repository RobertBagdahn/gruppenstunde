import json

from django.test import Client, TestCase
from model_bakery import baker

from planner.models import MealItem, MealPlan
from recipe.models import Recipe


class TestAiApplyEndpoint(TestCase):
    def setUp(self):
        self.user = baker.make("auth.User")
        self.other_user = baker.make("auth.User")
        self.client = Client()
        self.client.force_login(self.user)

        self.recipe1 = baker.make(Recipe, id=42, title="Haferporridge", recipe_type="breakfast", _fill_optional=False)
        self.recipe2 = baker.make(Recipe, id=128, title="Kartoffelsuppe", recipe_type="lunch", _fill_optional=False)
        self.recipe3 = baker.make(Recipe, id=256, title="Veganes Curry", recipe_type="dinner", _fill_optional=False)

        self.plan = MealPlan.objects.create(
            name="Testplan",
            slug="testplan",
            norm_portions=10,
            created_by=self.user,
            start_datetime="2026-08-14T08:00:00+00:00",
            end_datetime="2026-08-16T20:00:00+00:00",
        )

        self.valid_payload = {
            "days": [
                {
                    "date": "2026-08-14",
                    "meals": [
                        {"meal_type": "breakfast", "recipe_id": 42, "recipe_title": "Haferporridge"},
                        {"meal_type": "lunch", "recipe_id": 128, "recipe_title": "Kartoffelsuppe"},
                        {"meal_type": "dinner", "recipe_id": 256, "recipe_title": "Veganes Curry"},
                    ],
                }
            ]
        }

    def test_happy_path_creates_meal_items(self):
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/apply-ai/",
            data=json.dumps(self.valid_payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["applied"], 3)
        self.assertEqual(data["skipped"], 0)

        items = MealItem.objects.filter(meal__meal_plan=self.plan)
        self.assertEqual(items.count(), 3)

    def test_skipped_recipe_id_does_not_exist(self):
        payload = {
            "days": [
                {
                    "date": "2026-08-14",
                    "meals": [
                        {"meal_type": "breakfast", "recipe_id": 42, "recipe_title": "Haferporridge"},
                        {"meal_type": "lunch", "recipe_id": 99999, "recipe_title": "Phantom Dish"},
                    ],
                }
            ]
        }
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/apply-ai/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["applied"], 1)
        self.assertEqual(data["skipped"], 1)
        self.assertEqual(data["skipped_items"][0]["recipe_id"], 99999)
        self.assertEqual(data["skipped_items"][0]["reason"], "Rezept nicht gefunden")

    def test_skipped_invalid_meal_type(self):
        payload = {
            "days": [
                {
                    "date": "2026-08-14",
                    "meals": [
                        {"meal_type": "breakfast", "recipe_id": 42, "recipe_title": "Haferporridge"},
                        {"meal_type": "brunch", "recipe_id": 128, "recipe_title": "Brunch Dish"},
                    ],
                }
            ]
        }
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/apply-ai/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["applied"], 1)
        self.assertEqual(data["skipped"], 1)
        self.assertEqual(data["skipped_items"][0]["meal_type"], "brunch")

    def test_plan_not_found_returns_404(self):
        response = self.client.post(
            "/api/meal-plans/99999/apply-ai/",
            data=json.dumps(self.valid_payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_unauthenticated_returns_403(self):
        self.client.logout()
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/apply-ai/",
            data=json.dumps(self.valid_payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthorized_user_returns_403(self):
        self.client.force_login(self.other_user)
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/apply-ai/",
            data=json.dumps(self.valid_payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)
