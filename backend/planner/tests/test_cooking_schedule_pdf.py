"""Tests for Cooking Schedule PDF export service and API endpoint."""

import pytest

from planner.services.cooking_schedule_pdf import generate_cooking_schedule_pdf
from planner.tests import make_meal, make_meal_item, make_meal_plan
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
            start_datetime=timezone.make_aware(datetime.datetime.combine(datetime.date.today() + datetime.timedelta(days=1), datetime.time(12, 0))),
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
