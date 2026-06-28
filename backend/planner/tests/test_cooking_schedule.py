"""Tests für die Kochplan-Berechnung."""

import datetime

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from content.choices import ExecutionTimeChoices, PreparationTimeChoices
from planner.models import MealTypeChoices
from planner.services.cooking_schedule_service import (
    EXECUTION_TIME_MINUTES,
    PREPARATION_TIME_MINUTES,
    build_cooking_schedule,
    compute_recipe_lead_minutes,
    parse_recipe_steps,
)
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe

User = get_user_model()


# ---------------------------------------------------------------------------
# Unit-Tests: Bucket-Mapping & Berechnung
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestBucketMapping:
    def test_execution_time_buckets(self):
        assert EXECUTION_TIME_MINUTES[ExecutionTimeChoices.LESS_30] == 30
        assert EXECUTION_TIME_MINUTES[ExecutionTimeChoices.BETWEEN_30_60] == 60
        assert EXECUTION_TIME_MINUTES[ExecutionTimeChoices.BETWEEN_60_90] == 90
        assert EXECUTION_TIME_MINUTES[ExecutionTimeChoices.MORE_90] == 120

    def test_preparation_time_buckets(self):
        assert PREPARATION_TIME_MINUTES[PreparationTimeChoices.NONE] == 0
        assert PREPARATION_TIME_MINUTES[PreparationTimeChoices.LESS_15] == 15
        assert PREPARATION_TIME_MINUTES[PreparationTimeChoices.BETWEEN_15_30] == 30
        assert PREPARATION_TIME_MINUTES[PreparationTimeChoices.BETWEEN_30_60] == 60
        assert PREPARATION_TIME_MINUTES[PreparationTimeChoices.MORE_60] == 90

    def test_lead_minutes_sum(self):
        """prep=15_30 (30min) + execution=30_60 (60min) = 90min."""
        recipe = make_recipe(
            preparation_time=PreparationTimeChoices.BETWEEN_15_30,
            execution_time=ExecutionTimeChoices.BETWEEN_30_60,
        )
        assert compute_recipe_lead_minutes(recipe) == 90

    def test_lead_minutes_no_prep(self):
        """prep=none (0min) + execution=less_30 (30min) = 30min."""
        recipe = make_recipe(
            preparation_time=PreparationTimeChoices.NONE,
            execution_time=ExecutionTimeChoices.LESS_30,
        )
        assert compute_recipe_lead_minutes(recipe) == 30

    def test_lead_minutes_max(self):
        """prep=more_60 (90min) + execution=more_90 (120min) = 210min."""
        recipe = make_recipe(
            preparation_time=PreparationTimeChoices.MORE_60,
            execution_time=ExecutionTimeChoices.MORE_90,
        )
        assert compute_recipe_lead_minutes(recipe) == 210


# ---------------------------------------------------------------------------
# Unit-Tests: Rückwärtsberechnung der Startzeit
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestStartTimeCalculation:
    def test_start_time_18_00_minus_90_min(self):
        """Servierzeit 18:00 − 90min = 16:30."""
        plan = make_meal_plan(norm_portions=4)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 18, 0))
        meal = make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.DINNER,
            start_datetime=serving,
        )
        recipe = make_recipe(
            preparation_time=PreparationTimeChoices.BETWEEN_15_30,  # 30min
            execution_time=ExecutionTimeChoices.BETWEEN_30_60,  # 60min
        )
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        assert len(result.days) == 1
        item = result.days[0].items[0]
        assert item.lead_minutes == 90
        expected_start = serving - datetime.timedelta(minutes=90)
        assert item.start_time == expected_start
        assert item.serving_time == serving


# ---------------------------------------------------------------------------
# Unit-Tests: Gruppierung & Sortierung
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGroupingAndSorting:
    def test_groups_by_day(self):
        """Rezepte von zwei verschiedenen Tagen landen in zwei Gruppen."""
        plan = make_meal_plan(norm_portions=5)
        day1 = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        day2 = timezone.make_aware(datetime.datetime(2026, 8, 2, 12, 0))

        meal1 = make_meal(meal_plan=plan, start_datetime=day1)
        meal2 = make_meal(meal_plan=plan, start_datetime=day2)
        recipe1 = make_recipe(execution_time=ExecutionTimeChoices.LESS_30, preparation_time=PreparationTimeChoices.NONE)
        recipe2 = make_recipe(execution_time=ExecutionTimeChoices.LESS_30, preparation_time=PreparationTimeChoices.NONE)
        make_meal_item(meal=meal1, recipe=recipe1)
        make_meal_item(meal=meal2, recipe=recipe2)

        result = build_cooking_schedule(plan)
        assert len(result.days) == 2
        assert result.days[0].date == datetime.date(2026, 8, 1)
        assert result.days[1].date == datetime.date(2026, 8, 2)

    def test_sorts_by_start_time_within_day(self):
        """Rezepte innerhalb eines Tages aufsteigend nach Startzeit."""
        plan = make_meal_plan(norm_portions=5)
        # Frühstück 08:00, Abendessen 18:00
        breakfast = timezone.make_aware(datetime.datetime(2026, 8, 1, 8, 0))
        dinner = timezone.make_aware(datetime.datetime(2026, 8, 1, 18, 0))
        meal_b = make_meal(meal_plan=plan, start_datetime=breakfast, meal_type=MealTypeChoices.BREAKFAST)
        meal_d = make_meal(meal_plan=plan, start_datetime=dinner, meal_type=MealTypeChoices.DINNER)
        # Beide Rezepte: 30min Vorlauf
        recipe_b = make_recipe(
            execution_time=ExecutionTimeChoices.LESS_30,
            preparation_time=PreparationTimeChoices.NONE,
        )
        recipe_d = make_recipe(
            execution_time=ExecutionTimeChoices.LESS_30,
            preparation_time=PreparationTimeChoices.NONE,
        )
        make_meal_item(meal=meal_b, recipe=recipe_b)
        make_meal_item(meal=meal_d, recipe=recipe_d)

        result = build_cooking_schedule(plan)
        assert len(result.days) == 1
        items = result.days[0].items
        assert len(items) == 2
        assert items[0].start_time < items[1].start_time

    def test_secondary_sort_by_name_on_equal_start_time(self):
        """Bei gleicher Startzeit: Sekundärsortierung nach Rezeptname."""
        plan = make_meal_plan(norm_portions=5)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        recipe_z = make_recipe(
            title="Zucchini-Pfanne",
            execution_time=ExecutionTimeChoices.LESS_30,
            preparation_time=PreparationTimeChoices.NONE,
        )
        recipe_a = make_recipe(
            title="Apfelkompott",
            execution_time=ExecutionTimeChoices.LESS_30,
            preparation_time=PreparationTimeChoices.NONE,
        )
        make_meal_item(meal=meal, recipe=recipe_z)
        make_meal_item(meal=meal, recipe=recipe_a)

        result = build_cooking_schedule(plan)
        items = result.days[0].items
        assert items[0].recipe_title == "Apfelkompott"
        assert items[1].recipe_title == "Zucchini-Pfanne"


# ---------------------------------------------------------------------------
# Unit-Tests: Ausschlüsse
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExclusions:
    def test_excludes_external_meals(self):
        """Externe Mahlzeiten erscheinen nicht im Kochplan."""
        plan = make_meal_plan()
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving, is_external=True)
        recipe = make_recipe()
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        assert len(result.days) == 0
        assert result.excluded_meal_count == 1

    def test_excludes_meals_without_start_datetime(self):
        """Mahlzeiten ohne Servierzeit erscheinen nicht im Kochplan."""
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan, start_datetime=None, end_datetime=None)
        recipe = make_recipe()
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        assert len(result.days) == 0
        assert result.excluded_meal_count == 1

    def test_excludes_meal_items_without_recipe(self):
        """MealItems ohne Rezept (z.B. Zutaten-Items) erscheinen nicht im Kochplan."""
        plan = make_meal_plan()
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        # MealItem ohne Rezept (ingredient-only)
        ingredient = baker.make("supply.Ingredient", name="Salz")
        baker.make("planner.MealItem", meal=meal, recipe=None, ingredient=ingredient, factor=1.0)

        result = build_cooking_schedule(plan)
        assert len(result.days) == 0


# ---------------------------------------------------------------------------
# Unit-Tests: Portionen
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPortions:
    def test_uses_override_portions_when_set(self):
        """override_portions überschreibt norm_portions."""
        plan = make_meal_plan(norm_portions=10)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving, override_portions=4)
        recipe = make_recipe()
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        assert result.days[0].items[0].portions == 4

    def test_uses_norm_portions_as_fallback(self):
        """Wenn kein override_portions, wird norm_portions des Plans genutzt."""
        plan = make_meal_plan(norm_portions=12)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving, override_portions=None)
        recipe = make_recipe()
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        assert result.days[0].items[0].portions == 12


# ---------------------------------------------------------------------------
# API-Tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCookingScheduleAPI:
    def test_happy_path(self):
        """Authentifizierter Besitzer kann den Kochplan abrufen."""
        client = Client()
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user, norm_portions=5)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        recipe = make_recipe(
            execution_time=ExecutionTimeChoices.LESS_30,
            preparation_time=PreparationTimeChoices.NONE,
        )
        make_meal_item(meal=meal, recipe=recipe)

        response = client.get(f"/api/meal-plans/{plan.id}/cooking-schedule/")
        assert response.status_code == 200
        data = response.json()
        assert "days" in data
        assert "excluded_meal_count" in data
        assert len(data["days"]) == 1
        assert len(data["days"][0]["items"]) == 1
        item = data["days"][0]["items"][0]
        assert item["recipe_slug"] == recipe.slug
        assert item["lead_minutes"] == 30
        assert item["portions"] == 5

    def test_unauthenticated_returns_403(self):
        """Nicht-authentifizierte Anfragen werden mit 403 abgelehnt."""
        client = Client()
        plan = make_meal_plan()
        response = client.get(f"/api/meal-plans/{plan.id}/cooking-schedule/")
        assert response.status_code == 403

    def test_no_access_returns_404(self):
        """Nutzer ohne Zugriff erhalten 404 (kein Leak von Plan-IDs)."""
        client = Client()
        owner = baker.make(User)
        other = baker.make(User)
        client.force_login(other)
        plan = make_meal_plan(created_by=owner)

        response = client.get(f"/api/meal-plans/{plan.id}/cooking-schedule/")
        assert response.status_code == 404

    def test_nonexistent_plan_returns_404(self):
        """Nicht vorhandene Plan-ID liefert 404."""
        client = Client()
        user = baker.make(User)
        client.force_login(user)
        response = client.get("/api/meal-plans/99999/cooking-schedule/")
        assert response.status_code == 404

    def test_api_returns_new_fields(self):
        """Der API-Response enthält die neuen Felder."""
        client = Client()
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user, norm_portions=5)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving, override_portions=4, note="Bitte pünktlich kochen")
        recipe = make_recipe(
            execution_time=ExecutionTimeChoices.LESS_30,
            preparation_time=PreparationTimeChoices.NONE,
            cached_energy_total_kcal=2000.0,
            cached_price_total=15.0,
        )
        make_meal_item(meal=meal, recipe=recipe)

        response = client.get(f"/api/meal-plans/{plan.id}/cooking-schedule/")
        assert response.status_code == 200
        data = response.json()

        # Response header fields
        assert "total_cost_eur" in data
        assert "total_cost_with_reserve" in data
        assert "total_energy_kcal" in data
        assert "norm_portions" in data
        assert data["norm_portions"] == 5

        # Day-level fields
        day = data["days"][0]
        assert "day_start_time" in day
        assert "day_end_time" in day
        assert "day_duration_minutes" in day
        assert "portions" in day
        assert day["portions"] == 5

        # Item-level fields
        item = day["items"][0]
        assert "steps_parsed" in item
        assert "nutritional_tags" in item
        assert "total_cost_eur" in item
        assert "total_energy_kcal" in item
        assert "total_protein_g" in item
        assert "total_fat_g" in item
        assert "total_carbohydrate_g" in item
        assert "meal_note" in item
        assert item["meal_note"] == "Bitte pünktlich kochen"

        # Ingredient-level fields
        if item["ingredients"]:
            ing = item["ingredients"][0]
            assert "nutritional_tags" in ing


# ---------------------------------------------------------------------------
# Tests: Schritt-Parsing
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestStepParsing:
    def test_heading_based_steps(self):
        """Markdown mit Überschriften wird in Schritte zerlegt."""
        md = "## Schritt 1\nMehl und Eier mischen\n\n## Schritt 2\nIn der Pfanne ausbacken"
        steps = parse_recipe_steps(md)
        assert len(steps) == 2
        assert "Schritt 1" in steps[0].text or "Mehl" in steps[0].text
        assert "Pfanne" in steps[1].text

    def test_numbered_list_steps(self):
        """Nummerierte Liste wird in Schritte zerlegt."""
        md = "1. Mehl, Eier und Milch verrühren\n2. In der Pfanne ausbacken\n3. Mit Honig servieren"
        steps = parse_recipe_steps(md)
        assert len(steps) == 3
        assert "Mehl" in steps[0].text
        assert "Pfanne" in steps[1].text
        assert "Honig" in steps[2].text

    def test_single_block_fallback(self):
        """Ein einzelner Textblock wird als ein Schritt zurückgegeben."""
        md = "Alles in eine Schüssel geben und gut verrühren."
        steps = parse_recipe_steps(md)
        assert len(steps) == 1
        assert steps[0].timer is None

    def test_empty_string_returns_empty(self):
        """Leerer String liefert leere Liste."""
        assert parse_recipe_steps("") == []
        assert parse_recipe_steps(None) == []
        assert parse_recipe_steps("   ") == []

    def test_timer_extraction(self):
        """[Timer: 20min] wird als timer=20 extrahiert."""
        md = "1. [Timer: 20min] Nudeln kochen\n2. Sauce anrühren"
        steps = parse_recipe_steps(md)
        assert len(steps) == 2
        assert steps[0].timer == 20
        assert steps[1].timer is None

    def test_timer_variations(self):
        """Verschiedene Timer-Formate werden erkannt."""
        md = "1. [timer:15] Kurz kochen\n2. [Zeit: 30 Min] Lang garen"
        steps = parse_recipe_steps(md)
        assert steps[0].timer == 15
        assert steps[1].timer == 30


# ---------------------------------------------------------------------------
# Tests: Allergene, Kosten, Nährwerte
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNewFields:
    def test_nutritional_tags_on_recipe(self):
        """NutritionalTags des Rezepts erscheinen im Kochplan."""
        plan = make_meal_plan(norm_portions=4)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        recipe = make_recipe()
        tag = baker.make("supply.NutritionalTag", name="Nüsse", is_dangerous=True)
        recipe.nutritional_tags.add(tag)
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        item = result.days[0].items[0]
        tag_names = [t["name"] for t in item.nutritional_tags]
        assert "Nüsse" in tag_names

    def test_nutritional_tags_on_ingredient(self):
        """NutritionalTags der Zutat erscheinen im Kochplan."""
        plan = make_meal_plan(norm_portions=4)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        recipe = make_recipe(description="Einfaches Rezept")
        tag = baker.make("supply.NutritionalTag", name="Gluten")
        ingredient = baker.make("supply.Ingredient", name="Weizenmehl")
        ingredient.nutritional_tags.add(tag)
        unit = baker.make("supply.MeasuringUnit", name="g", quantity=1.0)
        portion = baker.make("supply.Portion", ingredient=ingredient, measuring_unit=unit, quantity=1.0, weight_g=100.0)
        baker.make("recipe.RecipeItem", recipe=recipe, portion=portion, quantity=2.0)
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        assert len(result.days) > 0
        item = result.days[0].items[0]
        # Rezept hat keine direkten Tags, aber die Zutat hat Gluten
        tag_names = [t["name"] for t in item.nutritional_tags]
        assert "Gluten" in tag_names

    def test_cost_calculation(self):
        """Kosten werden korrekt berechnet."""
        plan = make_meal_plan(norm_portions=4)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        recipe = make_recipe(portions=4, cached_price_total=20.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        result = build_cooking_schedule(plan)
        item = result.days[0].items[0]
        # cached_price_total=20 für 4 Portionen, skalierte auf 4 Portionen mit factor=1.0
        assert item.total_cost_eur == 20.0

    def test_nutrition_calculation(self):
        """Nährwerte werden korrekt berechnet."""
        plan = make_meal_plan(norm_portions=4)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        recipe = make_recipe(portions=4, cached_energy_total_kcal=2400.0, cached_protein_g=80.0, cached_fat_g=40.0, cached_carbohydrate_g=360.0)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        result = build_cooking_schedule(plan)
        item = result.days[0].items[0]
        assert item.total_energy_kcal == 2400.0
        assert item.total_protein_g == 80.0
        assert item.total_fat_g == 40.0
        assert item.total_carbohydrate_g == 360.0

    def test_day_nutritional_tags_aggregation(self):
        """Tages-Allergene werden aus allen Rezepten aggregiert."""
        plan = make_meal_plan(norm_portions=4)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        recipe1 = make_recipe(title="Rezept 1")
        recipe2 = make_recipe(title="Rezept 2")
        tag_nüsse = baker.make("supply.NutritionalTag", name="Nüsse")
        tag_laktose = baker.make("supply.NutritionalTag", name="Laktose")
        recipe1.nutritional_tags.add(tag_nüsse)
        recipe2.nutritional_tags.add(tag_laktose)
        make_meal_item(meal=meal, recipe=recipe1)
        make_meal_item(meal=meal, recipe=recipe2)

        result = build_cooking_schedule(plan)
        day = result.days[0]
        tag_names = [t["name"] for t in day.day_nutritional_tags]
        assert "Nüsse" in tag_names
        assert "Laktose" in tag_names
        assert len(day.day_nutritional_tags) == 2

    def test_day_header_fields(self):
        """Tages-Kopf-Felder werden korrekt gesetzt."""
        plan = make_meal_plan(norm_portions=10)
        serving1 = timezone.make_aware(datetime.datetime(2026, 8, 1, 8, 0))
        serving2 = timezone.make_aware(datetime.datetime(2026, 8, 1, 18, 0))
        meal1 = make_meal(meal_plan=plan, start_datetime=serving1, meal_type=MealTypeChoices.BREAKFAST)
        meal2 = make_meal(meal_plan=plan, start_datetime=serving2, meal_type=MealTypeChoices.DINNER)
        recipe = make_recipe(execution_time=ExecutionTimeChoices.LESS_30, preparation_time=PreparationTimeChoices.NONE)
        make_meal_item(meal=meal1, recipe=recipe)
        make_meal_item(meal=meal2, recipe=recipe)

        result = build_cooking_schedule(plan)
        day = result.days[0]
        assert day.portions == 10
        assert day.day_start_time
        assert day.day_end_time
        assert day.day_duration_minutes > 0
        assert day.total_cost_eur >= 0
        assert day.total_energy_kcal >= 0

    def test_meal_note(self):
        """Meal-Notiz wird ans Item weitergegeben."""
        plan = make_meal_plan(norm_portions=4)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving, note="Achtung: scharf!")
        recipe = make_recipe()
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        assert result.days[0].items[0].meal_note == "Achtung: scharf!"

    def test_empty_description_no_steps(self):
        """Rezept ohne Beschreibung hat leere steps_parsed."""
        plan = make_meal_plan(norm_portions=4)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        recipe = make_recipe(description="")
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        item = result.days[0].items[0]
        assert item.steps_parsed == []

    def test_no_cached_values_default_to_zero(self):
        """Rezept ohne gecachte Werte liefert 0 für Kosten/Nährwerte."""
        plan = make_meal_plan(norm_portions=4)
        serving = timezone.make_aware(datetime.datetime(2026, 8, 1, 12, 0))
        meal = make_meal(meal_plan=plan, start_datetime=serving)
        recipe = make_recipe(
            cached_energy_total_kcal=None,
            cached_price_total=None,
            cached_protein_g=None,
            cached_fat_g=None,
            cached_carbohydrate_g=None,
        )
        make_meal_item(meal=meal, recipe=recipe)

        result = build_cooking_schedule(plan)
        item = result.days[0].items[0]
        assert item.total_cost_eur == 0.0
        assert item.total_energy_kcal == 0.0
        assert item.total_protein_g == 0.0
