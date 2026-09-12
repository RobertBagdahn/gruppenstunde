"""
API tests for POST /api/meal-plans/ai/suggest/ endpoint.

Tests cover: happy path (mocked Gemini), auth, timeout, invalid JSON,
candidate injection in prompt, 100% complete auto-fill fallbacks,
child-friendly prioritization, and meal-type plausibility.
"""

import json
import os
from unittest.mock import patch

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inspi.settings.test")
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

import django

django.setup()

from django.test import Client, TestCase
from django.utils import timezone
from model_bakery import baker

from content.choices import ContentStatus
from planner.models import Meal, MealItem, MealPlan
from recipe.models import Recipe


class MockResponse:
    def __init__(self, text):
        self.text = text


class TestAiSuggestEndpoint(TestCase):
    def setUp(self):
        self.user = baker.make("auth.User")
        self.client = Client()
        self.client.force_login(self.user)

        # Create approved recipes
        self.recipe_bf = baker.make(
            Recipe,
            id=42,
            title="Haferporridge",
            recipe_type="breakfast",
            status=ContentStatus.APPROVED,
            _fill_optional=False,
        )
        self.recipe_lunch = baker.make(
            Recipe,
            id=128,
            title="Kartoffelsuppe",
            recipe_type="warm_meal",
            status=ContentStatus.APPROVED,
            _fill_optional=False,
        )
        self.recipe_dinner = baker.make(
            Recipe,
            id=256,
            title="Veganes Curry",
            recipe_type="warm_meal",
            status=ContentStatus.APPROVED,
            _fill_optional=False,
        )

        self.valid_payload = {
            "prompt": "Sommerlager mit 30 Pfadfindern, herzhafte deutsche Küche",
            "num_persons": 30,
            "num_days": 2,
            "start_date": "2026-08-14",
        }

        self.valid_gemini_response = json.dumps(
            {
                "days": [
                    {
                        "date": "2026-08-14",
                        "meals": [
                            {"meal_type": "breakfast", "candidate_id": 42, "title": "Haferporridge"},
                            {"meal_type": "lunch", "candidate_id": 128, "title": "Kartoffelsuppe"},
                            {"meal_type": "dinner", "candidate_id": 256, "title": "Veganes Curry"},
                        ],
                    },
                    {
                        "date": "2026-08-15",
                        "meals": [
                            {"meal_type": "breakfast", "candidate_id": 42, "title": "Haferporridge"},
                            {"meal_type": "lunch", "candidate_id": 128, "title": "Kartoffelsuppe"},
                            {"meal_type": "dinner", "candidate_id": 256, "title": "Veganes Curry"},
                        ],
                    },
                ]
            }
        )

    def test_happy_path_returns_suggestions(self):
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (MockResponse(self.valid_gemini_response), "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai/suggest/",
                data=json.dumps(self.valid_payload),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("days", data)
        self.assertEqual(len(data["days"]), 2)
        # All 3 required meals present per day
        for day in data["days"]:
            meal_types = [m["meal_type"] for m in day["meals"]]
            self.assertIn("breakfast", meal_types)
            self.assertIn("lunch", meal_types)
            self.assertIn("dinner", meal_types)

    def test_unauthenticated_returns_403(self):
        self.client.logout()
        response = self.client.post(
            "/api/meal-plans/ai/suggest/",
            data=json.dumps(self.valid_payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_invalid_gemini_response_returns_502(self):
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (MockResponse("not valid json"), "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai/suggest/",
                data=json.dumps(self.valid_payload),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 502)

    def test_gemini_none_response_returns_503(self):
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (None, "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai/suggest/",
                data=json.dumps(self.valid_payload),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 503)

    def test_candidates_injected_into_prompt(self):
        """Verifies that approved recipes and breakfast options are passed directly to Gemini."""
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (MockResponse(self.valid_gemini_response), "interaction-uuid")
            self.client.post(
                "/api/meal-plans/ai/suggest/",
                data=json.dumps(self.valid_payload),
                content_type="application/json",
            )
            self.assertTrue(mock_gemini.called)
            prompt_sent = mock_gemini.call_args[1]["contents"]
            # Candidates must appear in the prompt
            self.assertIn("Haferporridge", prompt_sent)
            self.assertIn("Kartoffelsuppe", prompt_sent)
            self.assertIn("Veganes Curry", prompt_sent)
            self.assertIn("VERFÜGBARE FRÜHSTÜCKS-OPTIONEN", prompt_sent)
            self.assertIn("VERFÜGBARE WARME GERICHTE", prompt_sent)

    def test_missing_slots_autofilled_to_100_percent_completeness(self):
        """If Gemini returns partial or missing slots, the engine auto-fills every day completely."""
        incomplete_gemini_response = json.dumps(
            {
                "days": [
                    {
                        "date": "2026-08-14",
                        "meals": [
                            # Only breakfast provided, lunch and dinner missing!
                            {"meal_type": "breakfast", "candidate_id": 42, "title": "Haferporridge"},
                        ],
                    }
                    # Day 2 completely omitted!
                ]
            }
        )
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (MockResponse(incomplete_gemini_response), "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai/suggest/",
                data=json.dumps(self.valid_payload),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["days"]), 2)
        for day in data["days"]:
            meal_types = [m["meal_type"] for m in day["meals"]]
            self.assertIn("breakfast", meal_types)
            self.assertIn("lunch", meal_types)
            self.assertIn("dinner", meal_types)

    def test_invalid_or_missing_recipe_ids_autofilled(self):
        """Hallucinated IDs that do not exist are replaced with valid fallback candidates."""
        gemini_response = json.dumps(
            {
                "days": [
                    {
                        "date": "2026-08-14",
                        "meals": [
                            {"meal_type": "breakfast", "candidate_id": 99999, "title": "Phantom Breakfast"},
                            {"meal_type": "lunch", "candidate_id": 88888, "title": "Phantom Lunch"},
                            {"meal_type": "dinner", "candidate_id": 77777, "title": "Phantom Dinner"},
                        ],
                    }
                ]
            }
        )
        with patch("planner.services.meal_plan_ai_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (MockResponse(gemini_response), "interaction-uuid")
            response = self.client.post(
                "/api/meal-plans/ai/suggest/",
                data=json.dumps({**self.valid_payload, "num_days": 1}),
                content_type="application/json",
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["days"]), 1)
        day_meals = data["days"][0]["meals"]
        self.assertEqual(len(day_meals), 3)
        # Phantom IDs replaced by valid existing IDs
        for meal in day_meals:
            self.assertNotEqual(meal.get("recipe_id"), 99999)
            self.assertNotEqual(meal.get("recipe_id"), 88888)
            self.assertNotEqual(meal.get("recipe_id"), 77777)

    def test_child_friendly_candidate_prioritization(self):
        """Prompts indicating children boost child-friendly classics."""
        baker.make(
            Recipe,
            id=500,
            title="Spaghetti Bolognese für Kinder",
            recipe_type="warm_meal",
            status=ContentStatus.APPROVED,
            usage_count=50,
            like_score=30,
            _fill_optional=False,
        )
        baker.make(
            Recipe,
            id=501,
            title="Trüffelrisotto mit Wildkräutern",
            recipe_type="warm_meal",
            status=ContentStatus.APPROVED,
            usage_count=1,
            like_score=1,
            _fill_optional=False,
        )

        from planner.services.meal_plan_ai_service import MealPlanAiService

        service = MealPlanAiService()
        candidates = service._get_recipe_candidates(prompt="Essen für Kinder und Wölflinge")
        warm_titles = [r["title"] for r in candidates["warm_meals"]]
        self.assertIn("Spaghetti Bolognese für Kinder", warm_titles)
        # Highly scored child favorite should rank ahead of niche dish
        spaghetti_idx = warm_titles.index("Spaghetti Bolognese für Kinder")
        if "Trüffelrisotto mit Wildkräutern" in warm_titles:
            truffle_idx = warm_titles.index("Trüffelrisotto mit Wildkräutern")
            self.assertLess(spaghetti_idx, truffle_idx)

    def test_breakfast_sourced_from_existing_multi_item_meal(self):
        """Breakfast can be sourced from multi-item meals in the database."""
        plan = baker.make(MealPlan, name="Vorlagenplan", is_template=True)
        meal = baker.make(Meal, meal_plan=plan, meal_type="breakfast", start_datetime=timezone.now())
        baker.make(
            MealItem,
            meal=meal,
            recipe=self.recipe_bf,
            quantity=None,
            ingredient=None,
            _fill_optional=False,
        )

        from planner.services.meal_plan_ai_service import MealPlanAiService

        service = MealPlanAiService()
        candidates = service._get_breakfast_candidates()
        self.assertTrue(len(candidates) > 0)
        matched = any(c.get("source_meal_id") == meal.id for c in candidates)
        self.assertTrue(matched)
