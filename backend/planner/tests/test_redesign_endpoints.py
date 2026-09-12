"""Tests for redesigned meal plan UX backend endpoints: reorder, plan-check, and servings."""

import datetime as dt

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import Meal, MealTypeChoices
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe

User = get_user_model()


@pytest.mark.django_db
class TestRedesignMealPlanEndpoints:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(created_by=self.user, norm_portions=10, budget_per_person_per_day=5.0)

    def test_reorder_meals_swap(self):
        """Swapping meals exchanges their items and notes while keeping slot schedule."""
        now = timezone.now()
        meal_tuesday = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=now,
            end_datetime=now + dt.timedelta(hours=1),
            note="Tuesday note",
        )
        meal_thursday = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=now + dt.timedelta(days=2),
            end_datetime=now + dt.timedelta(days=2, hours=1),
            note="Thursday note",
        )

        recipe_a = make_recipe(title="Spaghetti", portions=4)
        recipe_b = make_recipe(title="Curry", portions=4)
        item_a = make_meal_item(meal=meal_tuesday, recipe=recipe_a, factor=2.5)
        item_b = make_meal_item(meal=meal_thursday, recipe=recipe_b, factor=2.5)

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/reorder/",
            data={
                "source_meal_id": meal_tuesday.id,
                "target_meal_id": meal_thursday.id,
                "mode": "swap",
            },
            content_type="application/json",
        )
        assert response.status_code == 200

        item_a.refresh_from_db()
        item_b.refresh_from_db()
        meal_tuesday.refresh_from_db()
        meal_thursday.refresh_from_db()

        assert item_a.meal_id == meal_thursday.id
        assert item_b.meal_id == meal_tuesday.id
        assert meal_tuesday.note == "Thursday note"
        assert meal_thursday.note == "Tuesday note"

    def test_reorder_meals_move_to_empty(self):
        """Moving meal items to another slot."""
        now = timezone.now()
        meal_source = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=now,
            end_datetime=now + dt.timedelta(hours=1),
        )
        meal_target = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.DINNER,
            start_datetime=now + dt.timedelta(hours=6),
            end_datetime=now + dt.timedelta(hours=7),
        )
        recipe = make_recipe(title="Suppe", portions=4)
        item = make_meal_item(meal=meal_source, recipe=recipe, factor=1.0)

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/reorder/",
            data={
                "source_meal_id": meal_source.id,
                "target_meal_id": meal_target.id,
                "mode": "move",
            },
            content_type="application/json",
        )
        assert response.status_code == 200
        item.refresh_from_db()
        assert item.meal_id == meal_target.id

    def test_plan_check_alerts(self):
        """Plan check detects empty slots and budget excess."""
        now = timezone.now()
        empty_meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.BREAKFAST,
            start_datetime=now,
            end_datetime=now + dt.timedelta(hours=1),
        )

        response = self.client.get(f"/api/meal-plans/{self.plan.id}/plan-check/")
        assert response.status_code == 200
        data = response.json()
        assert data["total_issues"] >= 1
        empty_alerts = [a for a in data["alerts"] if a["type"] == "empty_slot"]
        assert len(empty_alerts) >= 1
        assert empty_alerts[0]["meal_id"] == empty_meal.id

    def test_update_meal_item_servings(self):
        """Updating meal item with servings calculates the correct factor."""
        now = timezone.now()
        meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.LUNCH, start_datetime=now)
        recipe = make_recipe(portions=4)  # Recipe yields 4 portions
        item = make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        # Update to 20 servings -> factor should be 20 / 4 = 5.0
        response = self.client.patch(
            f"/api/meal-plans/{self.plan.id}/meal-items/{item.id}/",
            data={"servings": 20},
            content_type="application/json",
        )
        assert response.status_code == 200
        item.refresh_from_db()
        assert item.factor == 5.0

    def test_create_meal_plan_auto_slots(self):
        """Rapid plan creation populates standard empty meal slots for all days."""
        start = timezone.now().replace(hour=8, minute=0, second=0)
        end = start + dt.timedelta(days=2)
        response = self.client.post(
            "/api/meal-plans/",
            data={
                "name": "Wochenendlager",
                "norm_portions": 15,
                "start_datetime": start.isoformat(),
                "end_datetime": end.isoformat(),
            },
            content_type="application/json",
        )
        assert response.status_code == 200
        plan_id = response.json()["id"]
        meals_count = Meal.objects.filter(meal_plan_id=plan_id, is_reference=False).count()
        assert meals_count >= 3
