"""Tests for Cooking Schedule PDF export service and API endpoint."""

import pytest

from planner.services.cooking_schedule_pdf import _resolve_recipe_steps_for_pdf, generate_cooking_schedule_pdf
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import RecipeStep
from recipe.tests import make_recipe, make_recipe_item
from supply.models import NutritionalTag


class TestCookingSchedulePdfService:
    @pytest.mark.django_db
    def test_generates_cooking_schedule_pdf(self):
        plan = make_meal_plan()
        recipe = make_recipe(title="Testessen")
        make_recipe_item(recipe=recipe, quantity=300)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        pdf = generate_cooking_schedule_pdf(plan)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 0

    @pytest.mark.django_db
    def test_cooking_schedule_with_multiple_days(self):
        plan = make_meal_plan()
        recipe = make_recipe()
        make_recipe_item(recipe=recipe)
        import datetime

        from django.utils import timezone

        meal1 = make_meal(meal_plan=plan)
        make_meal_item(meal=meal1, recipe=recipe)
        meal2 = make_meal(
            meal_plan=plan,
            start_datetime=timezone.make_aware(
                datetime.datetime.combine(datetime.date.today() + datetime.timedelta(days=1), datetime.time(12, 0))
            ),
        )
        make_meal_item(meal=meal2, recipe=recipe)
        pdf = generate_cooking_schedule_pdf(plan)
        assert isinstance(pdf, bytes)

    @pytest.mark.django_db
    def test_cooking_schedule_with_allergens(self):
        plan = make_meal_plan()
        tag = NutritionalTag.objects.create(name="Gluten", is_dangerous=True)
        recipe = make_recipe(title="Brotgericht")
        ri = make_recipe_item(recipe=recipe, quantity=200)
        ri.portion.ingredient.nutritional_tags.add(tag)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        pdf = generate_cooking_schedule_pdf(plan)
        assert isinstance(pdf, bytes)

    @pytest.mark.django_db
    def test_cooking_schedule_no_meals(self):
        plan = make_meal_plan()
        pdf = generate_cooking_schedule_pdf(plan)
        assert isinstance(pdf, bytes)

    @pytest.mark.django_db
    def test_cooking_schedule_with_costs(self):
        plan = make_meal_plan()
        recipe = make_recipe(cached_price_total=12.50)
        make_recipe_item(recipe=recipe, quantity=300)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        pdf = generate_cooking_schedule_pdf(plan)
        assert isinstance(pdf, bytes)

    @pytest.mark.django_db
    def test_cooking_schedule_with_direct_ingredient(self):
        import datetime

        from django.utils import timezone

        from planner.models import MealItem
        from supply.tests import make_ingredient, make_measuring_unit

        plan = make_meal_plan(norm_portions=4)
        ing = make_ingredient(name="Haferflocken", energy_kcal=350.0)
        unit = make_measuring_unit(name="g")
        meal = make_meal(
            meal_plan=plan,
            start_datetime=timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0)),
        )
        MealItem.objects.create(
            meal=meal,
            recipe=None,
            ingredient=ing,
            quantity=200,
            measuring_unit=unit,
            factor=1.0,
        )
        pdf = generate_cooking_schedule_pdf(plan)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 0


class TestCookingScheduleRecipeSteps:
    @pytest.mark.django_db
    def test_prefers_structured_steps_scaled(self):
        recipe = make_recipe(portions=1, description="1. Alte Anleitung")
        make_recipe_item(recipe=recipe, quantity=100)
        RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Nimm {Testzutat}", duration_minutes=5)
        steps = _resolve_recipe_steps_for_pdf(recipe, scale=4.0)
        assert len(steps) == 1
        assert steps[0]["instruction"] == "Nimm 400g Testzutat"
        assert steps[0]["duration_minutes"] == 5

    @pytest.mark.django_db
    def test_falls_back_to_markdown(self):
        recipe = make_recipe(portions=1, description="1. Mehl sieben\n2. Backen")
        make_recipe_item(recipe=recipe, quantity=100)
        steps = _resolve_recipe_steps_for_pdf(recipe, scale=1.0)
        assert [s["instruction"] for s in steps] == ["Mehl sieben", "Backen"]

    @pytest.mark.django_db
    def test_cooking_schedule_pdf_with_structured_steps(self):
        plan = make_meal_plan()
        recipe = make_recipe(title="Testessen")
        make_recipe_item(recipe=recipe, quantity=300)
        RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Nimm {Testzutat}")
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        pdf = generate_cooking_schedule_pdf(plan)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 0


class TestCookingSchedulePdfAPI:
    @pytest.mark.django_db
    def test_export_cooking_schedule_requires_auth(self, api_client):
        resp = api_client.get("/api/meal-plans/999/cooking-schedule/export/pdf/")
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_export_cooking_schedule_not_found(self, auth_client):
        resp = auth_client.get("/api/meal-plans/999/cooking-schedule/export/pdf/")
        assert resp.status_code == 404

    @pytest.mark.django_db
    def test_export_cooking_schedule_success(self, auth_client):
        user = auth_client._user
        plan = make_meal_plan(created_by=user)
        recipe = make_recipe()
        make_recipe_item(recipe=recipe)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        resp = auth_client.get(f"/api/meal-plans/{plan.id}/cooking-schedule/export/pdf/")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"

    @pytest.mark.django_db
    def test_export_cooking_schedule_empty_plan(self, auth_client):
        user = auth_client._user
        plan = make_meal_plan(created_by=user)
        resp = auth_client.get(f"/api/meal-plans/{plan.id}/cooking-schedule/export/pdf/")
        assert resp.status_code == 200

    @pytest.mark.django_db
    def test_export_cooking_schedule_invalid_page_format(self, auth_client):
        user = auth_client._user
        plan = make_meal_plan(created_by=user)
        resp = auth_client.get(f"/api/meal-plans/{plan.id}/cooking-schedule/export/pdf/?page_format=A3")
        assert resp.status_code == 422
