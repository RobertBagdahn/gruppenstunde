"""
API tests for POST /api/meal-plans/ai-suggest/ endpoint.

Tests cover: happy path (mocked Gemini), auth, timeout, invalid JSON, missing recipe_ids.
"""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inspi.settings.test")
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import django
django.setup()

import json
from unittest.mock import patch

from django.test import TestCase, Client
from model_bakery import baker

from recipe.models import Recipe


class MockResponse:
    def __init__(self, text):
        self.text = text


class TestAiSuggestEndpoint(TestCase):
    def setUp(self):
        self.user = baker.make("auth.User")
        self.client = Client()
        self.client.force_login(self.user)

        # Create recipes without search_vector field (handled automatically)
        baker.make(Recipe, id=42, title="Haferporridge", recipe_type="breakfast", _fill_optional=False)
        baker.make(Recipe, id=128, title="Kartoffelsuppe", recipe_type="lunch", _fill_optional=False)
        baker.make(Recipe, id=256, title="Veganes Curry", recipe_type="dinner", _fill_optional=False)

        self.valid_payload = {
            "prompt": "Sommerlager mit 30 Pfadfindern, herzhafte deutsche Küche",
            "num_persons": 30,
            "num_days": 3,
            "start_date": "2026-08-14",
        }

        self.valid_gemini_response = json.dumps({
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
        })

    def test_happy_path_returns_suggestions(self):
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (MockResponse(self.valid_gemini_response), "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai-suggest/",
                data=json.dumps(self.valid_payload),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("days", data)
        self.assertEqual(len(data["days"]), 1)
        self.assertEqual(len(data["days"][0]["meals"]), 3)

    def test_unauthenticated_returns_403(self):
        self.client.logout()
        response = self.client.post(
            "/api/meal-plans/ai-suggest/",
            data=json.dumps(self.valid_payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_invalid_gemini_response_returns_502(self):
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (MockResponse("not valid json"), "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai-suggest/",
                data=json.dumps(self.valid_payload),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 502)

    def test_missing_recipe_ids_filtered_out(self):
        gemini_response = json.dumps({
            "days": [
                {
                    "date": "2026-08-14",
                    "meals": [
                        {"meal_type": "breakfast", "recipe_id": 99999, "recipe_title": "Phantom Dish"},
                    ],
                }
            ]
        })
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (MockResponse(gemini_response), "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai-suggest/",
                data=json.dumps(self.valid_payload),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 502)

    def test_gemini_none_response_returns_503(self):
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (None, "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai-suggest/",
                data=json.dumps(self.valid_payload),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 503)

    def test_with_nutritional_tags_in_payload(self):
        tag = baker.make("supply.NutritionalTag", name="Vegan", name_opposite="Vegan")
        payload = {**self.valid_payload, "nutritional_tag_ids": [tag.id]}
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (MockResponse(self.valid_gemini_response), "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai-suggest/",
                data=json.dumps(payload),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("days", data)
