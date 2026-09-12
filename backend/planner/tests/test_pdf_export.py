"""Tests for MealPlan PDF export service and API endpoint."""

import pytest

from planner.models import MealItemOverride, MealPlanGroupMember
from planner.services.pdf_export import (
    _aggregate_shopping_list,
    _build_allergen_matrix,
    _build_group_member_context,
    _build_item_data,
    _build_meal_context,
    _build_nutrition_table,
    _collect_ingredient_overrides,
    _compute_meal_timing,
    _get_allergen_css_class,
    _get_recipe_steps,
    generate_meal_plan_pdf,
)
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import RecipeStep
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
            start_datetime=timezone.make_aware(
                datetime.datetime.combine(datetime.date.today() + datetime.timedelta(days=1), datetime.time(12, 0))
            ),
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
        member = MealPlanGroupMember.objects.create(meal_plan=plan, name="Anna", age=12, gender="female")
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
        sl = _aggregate_shopping_list(plan)
        assert sl["total_count"] > 0

    @pytest.mark.django_db
    def test_empty_shopping_list(self):
        plan = make_meal_plan()
        sl = _aggregate_shopping_list(plan)
        assert sl["total_count"] == 0

    @pytest.mark.django_db
    def test_direct_ingredient_scaled_in_item_data(self):
        """Direct ingredient quantities are scaled by portions * reserve_factor * item.factor."""
        from planner.models import MealItem
        from supply.tests import make_ingredient, make_measuring_unit

        plan = make_meal_plan(norm_portions=4, reserve_factor=1.5)
        ing = make_ingredient(name="Haferflocken")
        unit = make_measuring_unit(name="g")
        meal = make_meal(meal_plan=plan)
        item = MealItem.objects.create(
            meal=meal,
            recipe=None,
            ingredient=ing,
            quantity=100,
            measuring_unit=unit,
            factor=2.0,
        )
        data = _build_item_data(item, portions=4, reserve_factor=1.5, overrides={})
        # 100 g * 2.0 * 4 * 1.5 = 1200 g
        assert "1.200" in data["ingredients"][0] or "1200" in data["ingredients"][0]
        assert data["ingredients"][0].endswith("g")


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


class TestMealPlanEnhancedFeatures:
    @pytest.mark.django_db
    def test_recipe_steps_from_models(self):
        recipe = make_recipe(title="Pfannkuchen")
        RecipeStep.objects.create(
            recipe=recipe, sort_order=0, instruction="Eier und Milch verquirlen.", duration_minutes=5
        )
        RecipeStep.objects.create(
            recipe=recipe, sort_order=1, instruction="Mehl unterrühren und backen.", duration_minutes=15
        )
        steps = _get_recipe_steps(recipe)
        assert len(steps) == 2
        assert steps[0]["number"] == 1
        assert "Eier und Milch" in steps[0]["instruction"]
        assert steps[0]["duration_minutes"] == 5
        assert steps[1]["number"] == 2
        assert steps[1]["duration_minutes"] == 15

    @pytest.mark.django_db
    def test_recipe_steps_from_markdown_description(self):
        recipe = make_recipe(
            title="Suppe",
            description="## Zubereitung\n1. Gemüse putzen und würfeln. (10 Min.)\n2. In Brühe 20 Minuten kochen.",
        )
        steps = _get_recipe_steps(recipe)
        assert len(steps) == 2
        assert steps[0]["number"] == 1
        assert "Gemüse putzen" in steps[0]["instruction"]
        assert steps[0]["duration_minutes"] == 10
        assert steps[1]["number"] == 2

    @pytest.mark.django_db
    def test_allergen_css_class_mapping(self):
        assert _get_allergen_css_class("Glutenhaltiges Getreide") == "gluten"
        assert _get_allergen_css_class("Milch/Laktose") == "lactose"
        assert _get_allergen_css_class("Erdnüsse") == "nuts"
        assert _get_allergen_css_class("Unbekannt") == "default"

    @pytest.mark.django_db
    def test_meal_timing_calculation(self):
        import datetime

        from django.utils import timezone

        plan = make_meal_plan()
        meal_time = timezone.make_aware(datetime.datetime(2026, 7, 15, 12, 30))
        meal = make_meal(meal_plan=plan, start_datetime=meal_time)
        timing = _compute_meal_timing(meal, lead_minutes=45)
        assert timing["eating_time"] == "12:30"
        assert "12:30 Uhr" in timing["eating_time_full"]
        assert timing["cook_start_time"] == "11:45"
        assert "11:45 Uhr" in timing["cook_start_time_full"]
        assert timing["lead_display"] == "45 Min."

    @pytest.mark.django_db
    def test_pdf_contains_schedule_table_and_meal_sheets(self):
        import datetime

        from django.utils import timezone

        plan = make_meal_plan(name="Sommerlager 2026", norm_portions=20, reserve_factor=1.1)
        recipe = make_recipe(title="Spaghetti Bolognese")
        RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Nudeln kochen.")
        make_recipe_item(recipe=recipe, quantity=200)

        dt = timezone.make_aware(datetime.datetime(2026, 7, 15, 12, 30))
        meal = make_meal(meal_plan=plan, start_datetime=dt, meal_type="lunch")
        make_meal_item(meal=meal, recipe=recipe)

        days = _build_meal_context(plan)
        assert len(days) == 1
        meal_ctx = days[0]["meals"][0]
        assert meal_ctx["eating_time"] == "12:30 Uhr"
        assert len(meal_ctx["items"][0]["steps"]) == 1

        pdf_bytes = generate_meal_plan_pdf(plan)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0


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
