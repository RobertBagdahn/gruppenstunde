"""Tests for scale-to-target and copy meal item endpoints, plus drinks and external meal behavior."""

import datetime as dt
import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import Meal, MealItem, MealPlan, MealTypeChoices
from planner.schemas.meal_plan import MealOut
from planner.tests import make_meal, make_meal_item, make_meal_plan
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

    def test_drinks_exclusion_from_total_energy(self):
        """Drinks items should NOT count towards calories, but count towards costs."""
        # Create a drinks meal
        meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.DRINKS, day_part_factor=0.0)
        
        # Create a recipe with known energy and price
        recipe = make_recipe(servings=10)
        ingredient = make_ingredient(
            energy_kj=500.0,  # 500 kJ per 100g
            price_per_kg=10.0,  # 10 EUR per kg = 0.01 EUR per g
            protein_g=0.0, fat_g=0.0, carbohydrate_g=0.0, sugar_g=0.0, fibre_g=0.0, salt_g=0.0
        )
        portion = make_portion(ingredient=ingredient, weight_g=200.0) # 200g portion
        # Recipe has 1 portion
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=1.0)
        
        # Force cache recalculation
        from recipe.services.recipe_checks import recalculate_recipe_cache
        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()
        
        # Add to drinks meal with factor 1.0
        item = make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        # Resolve total energy should be 0 because it's drinks
        assert MealOut.resolve_total_energy_kj(meal) == 0.0
        # Resolve total cost should still compute normally (recipe price = 2.00 EUR, scaled by plan.norm_portions / recipe.servings (10 / 10 = 1.0) * factor (1.0) = 2.00 EUR)
        assert MealOut.resolve_total_cost_eur(meal) == pytest.approx(2.0)

        # Check via API nutrition-summary
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert response.status_code == 200
        # Total energy in summary must be 0
        assert response.json()["energy_kj"] == 0.0

    def test_scale_to_target_success(self):
        """Proportionally scale meal items to target calories."""
        # Breakfast: target = 2335.0 * 0.25 = 583.75 kcal
        # Let's create a breakfast meal with portions = 10, target per portion = 583.75 kcal.
        # Total target energy for 10 portions = 5837.5 kcal = 24424.125 kJ.
        meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.BREAKFAST, day_part_factor=0.25)
        
        # Add recipe with total energy cache of 2000 kJ (with servings=10, factor=1.0, total energy = 2000 kJ / 10 portions = 200 kJ per portion = ~47.8 kcal per portion)
        # Target kcal per portion is 583.75. Current kcal per portion is ~47.8.
        # Scale factor should be 583.75 / 47.8 ≈ 12.2
        recipe = make_recipe(servings=10, cached_energy_total_kj=2000.0)
        item1 = make_meal_item(meal=meal, recipe=recipe, factor=1.0)
        item2 = make_meal_item(meal=meal, recipe=recipe, factor=2.0)

        # Before scaling, make sure it has calories
        current_energy_kj = MealOut.resolve_total_energy_kj(meal)
        assert current_energy_kj > 0

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
        external_meal = make_meal(meal_plan=self.plan, is_external=True, external_energy_kj=1000.0)
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

    def test_copy_meal_item_same_meal(self):
        """Duplicate a meal item in the same meal."""
        meal = make_meal(meal_plan=self.plan)
        recipe = make_recipe()
        item = make_meal_item(meal=meal, recipe=recipe, factor=1.5, display_name="My Pancake")

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meal-items/{item.id}/copy/",
            data={"target_meal_id": None},
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] != item.id
        assert data["factor"] == 1.5
        assert data["display_name"] == "My Pancake"
        assert MealItem.objects.filter(meal=meal).count() == 2

    def test_copy_meal_item_other_meal(self):
        """Copy a meal item to another meal in the same plan."""
        meal1 = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.BREAKFAST)
        meal2 = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.LUNCH)
        recipe = make_recipe()
        item = make_meal_item(meal=meal1, recipe=recipe, factor=1.2, display_name="Special Toast")

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meal-items/{item.id}/copy/",
            data={"target_meal_id": meal2.id},
            content_type="application/json"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] != item.id
        assert data["factor"] == 1.2
        assert data["display_name"] == "Special Toast"
        
        # Verify it is in the target meal
        assert MealItem.objects.filter(meal=meal2).count() == 1
        copied = MealItem.objects.filter(meal=meal2).first()
        assert copied.recipe == recipe

    def test_copy_meal_item_fails_synced_target(self):
        """Copying into a synced meal should fail with 400."""
        meal1 = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.BREAKFAST)
        ref_meal = Meal.objects.create(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            day_part_factor=0.35,
            is_reference=True,
        )
        synced_meal = make_meal(meal_plan=self.plan, is_synced=True, ref_meal=ref_meal)
        recipe = make_recipe()
        item = make_meal_item(meal=meal1, recipe=recipe)

        response = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meal-items/{item.id}/copy/",
            data={"target_meal_id": synced_meal.id},
            content_type="application/json"
        )
        assert response.status_code == 400
        assert "Einträge können nicht in synchronisierte Mahlzeiten kopiert werden" in response.json()["detail"]
