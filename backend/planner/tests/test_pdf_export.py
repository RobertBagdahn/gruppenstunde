"""Tests for MealPlan PDF export service and API endpoint."""

import pytest
from django.test import Client

from planner.models import MealItemOverride, MealPlanGroupMember
from planner.services.pdf_export import (
    _aggregate_shopping_list,
    _build_allergen_matrix,
    _build_group_member_context,
    _build_meal_context,
    _build_nutrition_table,
    _collect_ingredient_overrides,
    generate_meal_plan_pdf,
)
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe, make_recipe_item
from supply.models import NutritionalTag


class TestMealContext:
    @pytest.mark.django_db
    def test_single_day_single_meal(self):
        plan = make_meal_plan()
        recipe = make_recipe(title="Testgericht")
        make_recipe_item(recipe=recipe, quantity=200)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        days = _build_meal_context(plan)
        assert len(days) == 1
        assert len(days[0]["meals"]) == 1
        assert days[0]["meals"][0]["meal_type_label"] == "Mittagessen"

    @pytest.mark.django_db
    def test_multiple_days(self):
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
        days = _build_meal_context(plan)
        assert len(days) == 2

    @pytest.mark.django_db
    def test_exchange_split_detection(self):
        plan = make_meal_plan()
        recipe1 = make_recipe(title="Parmesan Nudeln")
        recipe2 = make_recipe(title="Cashew Nudeln")
        make_recipe_item(recipe=recipe1, quantity=200)
        make_recipe_item(recipe=recipe2, quantity=200)
        import uuid

        variant_id = uuid.uuid4()
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe1, variant_group_id=variant_id)
        make_meal_item(meal=meal, recipe=recipe2, variant_group_id=variant_id)
        days = _build_meal_context(plan)
        meals = days[0]["meals"]
        assert len(meals) == 1
        assert len(meals[0]["sub_meals"]) == 2

    @pytest.mark.django_db
    def test_empty_plan(self):
        plan = make_meal_plan()
        days = _build_meal_context(plan)
        assert days == []


class TestGroupMemberContext:
    @pytest.mark.django_db
    def test_members_with_tags(self):
        plan = make_meal_plan()
        tag = NutritionalTag.objects.create(name="Nüsse", is_dangerous=True)
        member = MealPlanGroupMember.objects.create(
            meal_plan=plan, name="Anna", age=12, gender="female"
        )
        member.nutritional_tags.add(tag)
        members = _build_group_member_context(plan)
        assert len(members) == 1
        assert members[0]["name"] == "Anna"
        assert "Nüsse" in members[0]["tags"]

    @pytest.mark.django_db
    def test_no_members(self):
        plan = make_meal_plan()
        members = _build_group_member_context(plan)
        assert members == []

    @pytest.mark.django_db
    def test_member_with_date_ranges(self):
        plan = make_meal_plan()
        MealPlanGroupMember.objects.create(
            meal_plan=plan,
            name="Berta",
            age=14,
            gender="female",
            date_ranges=[{"start": "12.07.", "end": "14.07."}],
        )
        members = _build_group_member_context(plan)
        assert "12.07.–14.07." in members[0]["date_range_label"]


class TestShoppingListAggregation:
    @pytest.mark.django_db
    def test_aggregates_ingredients(self):
        plan = make_meal_plan()
        recipe = make_recipe(title="Testgericht")
        make_recipe_item(recipe=recipe, quantity=500)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        days = _build_meal_context(plan)
        sl = _aggregate_shopping_list(days)
        assert sl["total_count"] > 0

    @pytest.mark.django_db
    def test_empty_shopping_list(self):
        sl = _aggregate_shopping_list([])
        assert sl["total_count"] == 0


class TestAllergenMatrix:
    @pytest.mark.django_db
    def test_no_allergens(self):
        plan = make_meal_plan()
        recipe = make_recipe()
        make_recipe_item(recipe=recipe)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        days = _build_meal_context(plan)
        matrix = _build_allergen_matrix(days)
        assert matrix is not None
        assert matrix["has_allergens"] is False

    @pytest.mark.django_db
    def test_empty_days(self):
        matrix = _build_allergen_matrix([])
        assert matrix is None


class TestNutritionTable:
    @pytest.mark.django_db
    def test_nutrition_table_structure(self):
        plan = make_meal_plan()
        recipe = make_recipe()
        make_recipe_item(recipe=recipe)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        days = _build_meal_context(plan)
        nutrition = _build_nutrition_table(days, [])
        assert len(nutrition) == 1
        assert "energy_soll" in nutrition[0]["nutrition"]


class TestIngredientOverrides:
    @pytest.mark.django_db
    def test_collects_excluded_ingredients(self):
        plan = make_meal_plan()
        recipe = make_recipe()
        ri = make_recipe_item(recipe=recipe)
        meal = make_meal(meal_plan=plan)
        item = make_meal_item(meal=meal, recipe=recipe)
        MealItemOverride.objects.create(meal_item=item, recipe_item=ri, excluded=True)
        overrides = _collect_ingredient_overrides(plan)
        assert item.id in overrides
        assert str(ri.id) in overrides[item.id]["excluded_items"]


class TestMealPlanPdfGeneration:
    @pytest.mark.django_db
    def test_generates_pdf_bytes(self):
        plan = make_meal_plan()
        recipe = make_recipe()
        make_recipe_item(recipe=recipe)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        pdf = generate_meal_plan_pdf(plan)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 0

    @pytest.mark.django_db
    def test_generates_pdf_with_all_options(self):
        plan = make_meal_plan()
        recipe = make_recipe()
        make_recipe_item(recipe=recipe)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        pdf = generate_meal_plan_pdf(
            plan,
            include_notes=True,
            exclude_shopping_list=True,
            exclude_nutrition=True,
            exclude_allergens=True,
            compact_mode=True,
            page_format="letter",
        )
        assert isinstance(pdf, bytes)
        assert len(pdf) > 0


class TestMealPlanPdfAPI:
    @pytest.mark.django_db
    def test_export_pdf_requires_auth(self, api_client):
        resp = api_client.get("/api/meal-plans/999/export/pdf/")
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_export_pdf_not_found(self, auth_client):
        resp = auth_client.get("/api/meal-plans/999/export/pdf/")
        assert resp.status_code == 404

    @pytest.mark.django_db
    def test_export_pdf_with_params(self, auth_client):
        user = auth_client._user
        plan = make_meal_plan(created_by=user)
        recipe = make_recipe()
        make_recipe_item(recipe=recipe)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe)
        resp = auth_client.get(
            f"/api/meal-plans/{plan.id}/export/pdf/?include_notes=true&exclude_shopping_list=false&page_format=A4"
        )
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"

    @pytest.mark.django_db
    def test_export_pdf_invalid_page_format(self, auth_client):
        user = auth_client._user
        plan = make_meal_plan(created_by=user)
        resp = auth_client.get(f"/api/meal-plans/{plan.id}/export/pdf/?page_format=A3")
        assert resp.status_code == 422
