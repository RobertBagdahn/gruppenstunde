"""Tests for scale-to-target and copy meal item endpoints, plus drinks and external meal behavior."""
import json

import datetime as dt
import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import Meal, MealItem, MealPlan, MealTypeChoices
from planner.schemas.meal_plan import MealOut
from planner.tests import make_meal, make_meal_item, make_meal_plan
from event.tests import make_event
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion

User = get_user_model()


@pytest.mark.django_db
class TestScaleAndCopyAPI:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(created_by=self.user, norm_portions=10)

    def test_scale_to_target_success(self):
        """Proportionally scale meal items to target calories."""
        # Breakfast: target = 2335.0 * 0.25 = 583.75 kcal
        # Let's create a breakfast meal with portions = 10, target per portion = 583.75 kcal.
        # Total target energy for 10 portions = 5837.5 kcal = 24424.125 kJ.
        meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.BREAKFAST, day_part_factor=0.25)
        
        # Add recipe with total energy cache of 478 kcal (was 2000 kJ, ÷4.184)
        # Target kcal per portion is 583.75. Current kcal per portion is ~47.8.
        # Scale factor should be 583.75 / 47.8 ≈ 12.2
        recipe = make_recipe(portions=10, cached_energy_total_kcal=478.0)
        item1 = make_meal_item(meal=meal, recipe=recipe, factor=1.0)
        item2 = make_meal_item(meal=meal, recipe=recipe, factor=2.0)

        # Before scaling, make sure it has calories
        current_energy_kcal = MealOut.resolve_total_energy_kcal(meal)
        assert current_energy_kcal > 0

        # Perform scale-to-target via API
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{meal.id}/scale-to-target/",
            content_type="application/json"
        )
        assert response.status_code == 200
        
        item1.refresh_from_db()
        item2.refresh_from_db()

        # The factor should be updated and rounded to 1 decimal place
        assert item1.factor > 1.0
        assert item2.factor > 2.0
        assert item1.factor == pytest.approx(round(item1.factor, 1))
        assert item2.factor == pytest.approx(round(item2.factor, 1))

    def test_scale_to_target_failures(self):
        """Synced or external meals, or meals with 0 calories should fail to scale."""
        # 1. External meal
        external_meal = make_meal(meal_plan=self.plan, is_external=True, external_energy_kcal=239)
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{external_meal.id}/scale-to-target/",
            content_type="application/json"
        )
        assert response.status_code == 400
        assert "Externe Mahlzeiten" in response.json()["detail"]

        # 2. Synced meal
        ref_meal = Meal.objects.create(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.BREAKFAST,
            day_part_factor=0.25,
            is_reference=True,
        )
        synced_meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.BREAKFAST,
            is_synced=True,
            ref_meal=ref_meal,
            day_part_factor=0.25,
            start_datetime=timezone.make_aware(dt.datetime.combine(dt.date.today(), dt.time(8, 0))),
            end_datetime=timezone.make_aware(dt.datetime.combine(dt.date.today(), dt.time(9, 0))),
        )
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{synced_meal.id}/scale-to-target/",
            content_type="application/json"
        )
        assert response.status_code == 400
        assert "Synchronisierte Mahlzeiten" in response.json()["detail"]

        # 3. Meal with 0 calories
        empty_meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.DINNER,
            day_part_factor=0.30,
            start_datetime=timezone.make_aware(dt.datetime.combine(dt.date.today(), dt.time(18, 0))),
            end_datetime=timezone.make_aware(dt.datetime.combine(dt.date.today(), dt.time(19, 0))),
        )
        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{empty_meal.id}/scale-to-target/",
            content_type="application/json"
        )
        assert response.status_code == 400
        assert "keine Kalorien" in response.json()["detail"]

    def test_copy_items_from_plan_all_items(self):
        """Copy all items from a source plan's meal into the target meal."""
        source_plan = make_meal_plan(created_by=self.user, norm_portions=10)
        source_meal = make_meal(meal_plan=source_plan, meal_type=MealTypeChoices.BREAKFAST)
        recipe1 = make_recipe()
        recipe2 = make_recipe()
        item1 = make_meal_item(meal=source_meal, recipe=recipe1, factor=1.5, display_name="Pancake")
        item2 = make_meal_item(meal=source_meal, recipe=recipe2, factor=2.0, display_name="Omelette")

        target_meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.BREAKFAST)

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{target_meal.id}/copy-items-from/",
            data=json.dumps({
                "source_plan_id": source_plan.id,
                "source_meal_id": source_meal.id,
            }),
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2

        copied_items = MealItem.objects.filter(meal=target_meal)
        assert copied_items.count() == 2
        titles = {ci.recipe.title for ci in copied_items}
        assert recipe1.title in titles
        assert recipe2.title in titles

    def test_copy_items_from_plan_sets_note(self):
        """Copy items and verify the note is set on the target meal."""
        source_plan = make_meal_plan(created_by=self.user, norm_portions=10, name="Sommerlager 2025")
        source_meal = make_meal(meal_plan=source_plan)
        recipe = make_recipe()
        make_meal_item(meal=source_meal, recipe=recipe)

        target_meal = make_meal(meal_plan=self.plan)

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{target_meal.id}/copy-items-from/",
            data=json.dumps({
                "source_plan_id": source_plan.id,
                "source_meal_id": source_meal.id,
                "note": source_plan.name,
            }),
            content_type="application/json"
        )
        assert response.status_code == 200
        target_meal.refresh_from_db()
        assert target_meal.note == "Importiert aus «Sommerlager 2025»"

    def test_copy_items_from_plan_appends_note(self):
        """Copy items and verify note appends to existing note."""
        source_plan = make_meal_plan(created_by=self.user, norm_portions=10, name="Zeltlager")
        source_meal = make_meal(meal_plan=source_plan)
        recipe = make_recipe()
        make_meal_item(meal=source_meal, recipe=recipe)

        target_meal = make_meal(meal_plan=self.plan, note="Bestehende Notiz")

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{target_meal.id}/copy-items-from/",
            data=json.dumps({
                "source_plan_id": source_plan.id,
                "source_meal_id": source_meal.id,
                "note": source_plan.name,
            }),
            content_type="application/json"
        )
        assert response.status_code == 200
        target_meal.refresh_from_db()
        assert "Importiert aus «Zeltlager»" in target_meal.note
        assert "Bestehende Notiz" in target_meal.note

    def test_copy_items_from_plan_fails_synced_target(self):
        """Copying into a synced meal should fail with 400."""
        source_plan = make_meal_plan(created_by=self.user)
        source_meal = make_meal(meal_plan=source_plan)
        recipe = make_recipe()
        make_meal_item(meal=source_meal, recipe=recipe)

        ref_meal = Meal.objects.create(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            day_part_factor=0.35,
            is_reference=True,
        )
        synced_meal = make_meal(meal_plan=self.plan, is_synced=True, ref_meal=ref_meal)

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{synced_meal.id}/copy-items-from/",
            data=json.dumps({
                "source_plan_id": source_plan.id,
                "source_meal_id": source_meal.id,
            }),
            content_type="application/json"
        )
        assert response.status_code == 400
        assert "synchronisierte Mahlzeiten" in response.json()["detail"]

    def test_copy_items_from_plan_fails_no_access(self):
        """Copying from a plan the user has no access to should fail with 404."""
        other_user = baker.make(User)
        source_plan = make_meal_plan(created_by=other_user)
        source_meal = make_meal(meal_plan=source_plan)
        recipe = make_recipe()
        make_meal_item(meal=source_meal, recipe=recipe)

        target_meal = make_meal(meal_plan=self.plan)

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{target_meal.id}/copy-items-from/",
            data=json.dumps({
                "source_plan_id": source_plan.id,
                "source_meal_id": source_meal.id,
            }),
            content_type="application/json"
        )
        assert response.status_code == 404
        assert "Essensplan nicht gefunden" in response.json()["detail"]

    def test_list_meal_plans_search_by_name(self):
        """Searching meal plans by name should return matching plans."""
        make_meal_plan(created_by=self.user, name="Sommerlager", description="")
        make_meal_plan(created_by=self.user, name="Winterfahrt", description="")

        response = self.client.get("/api/meal-plans/?search=sommer")
        assert response.status_code == 200
        data = response.json()
        names = {p["name"] for p in data}
        assert "Sommerlager" in names
        assert "Winterfahrt" not in names

    def test_list_meal_plans_search_by_event_name(self):
        """Searching by event name should return matching plans."""
        event = make_event(name="Pfingstlager")
        make_meal_plan(created_by=self.user, name="Essen 2025", description="", event=event)
        make_meal_plan(created_by=self.user, name="Anderer Plan", description="")

        response = self.client.get("/api/meal-plans/?search=pfingst")
        assert response.status_code == 200
        data = response.json()
        names = {p["name"] for p in data}
        assert "Essen 2025" in names
        assert "Anderer Plan" not in names

    def test_list_meal_plans_date_from_filter(self):
        """Filtering by date_from should exclude plans ending before that date."""
        make_meal_plan(
            created_by=self.user, name="Früher Plan",
            start_datetime=timezone.make_aware(dt.datetime(2024, 6, 1)),
            end_datetime=timezone.make_aware(dt.datetime(2024, 6, 10)),
        )
        make_meal_plan(
            created_by=self.user, name="Später Plan",
            start_datetime=timezone.make_aware(dt.datetime(2025, 7, 1)),
            end_datetime=timezone.make_aware(dt.datetime(2025, 7, 10)),
        )

        response = self.client.get("/api/meal-plans/?date_from=2025-01-01")
        assert response.status_code == 200
        data = response.json()
        names = {p["name"] for p in data}
        assert "Später Plan" in names
        assert "Früher Plan" not in names

    def test_list_meal_plans_date_to_filter(self):
        """Filtering by date_to should exclude plans starting after that date."""
        make_meal_plan(
            created_by=self.user, name="Früher Plan",
            start_datetime=timezone.make_aware(dt.datetime(2024, 6, 1)),
            end_datetime=timezone.make_aware(dt.datetime(2024, 6, 10)),
        )
        make_meal_plan(
            created_by=self.user, name="Später Plan",
            start_datetime=timezone.make_aware(dt.datetime(2025, 7, 1)),
            end_datetime=timezone.make_aware(dt.datetime(2025, 7, 10)),
        )

        response = self.client.get("/api/meal-plans/?date_to=2024-12-31")
        assert response.status_code == 200
        data = response.json()
        names = {p["name"] for p in data}
        assert "Früher Plan" in names
        assert "Später Plan" not in names
