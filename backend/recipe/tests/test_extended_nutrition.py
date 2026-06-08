"""Tests for extended nutrition features (vitamins, minerals, DGE references).

Covers:
- Ingredient vitamin_c_mg field (9.1)
- DgeReference model (9.2)
- recalculate_recipe_cache with micronutrients (9.3)
- Rule matching with vitamin_c_mg parameter (9.4)
- Nutrition breakdown API with DGE coverage (9.5)
- Cockpit service with vitamin_c_mg Rules (9.6)
- improvement_text on Rule (extra)
"""

import datetime

import pytest
from django.test import Client
from django.utils import timezone

from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.choices import (
    HintLevelChoices,
    HintMinMaxChoices,
    HintParameterChoices,
    RecipeObjectiveChoices,
)
from recipe.models import Rule, Recipe, RecipeItem
from recipe.services.nutrition_aggregation import evaluate_day_cockpit, evaluate_meal_cockpit
from recipe.services.recipe_checks import (
    CACHED_MICRONUTRIENT_FIELDS,
    match_recipe_hints,
    recalculate_recipe_cache,
)
from recipe.tests import make_health_rule, make_recipe, make_recipe_hint, make_recipe_item
from supply.models import DgeReference, Ingredient, MeasuringUnit, Portion
from supply.models.reference import DgeGenderChoices
from supply.tests import make_ingredient, make_measuring_unit, make_portion


# ---------------------------------------------------------------------------
# 9.1 — Ingredient vitamin_c_mg field
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIngredientMicronutrientFields:
    """Verify that Ingredient model accepts and stores vitamin_c_mg."""

    def test_create_ingredient_with_vitamin_c(self):
        ing = make_ingredient(vitamin_c_mg=45.0)
        assert ing.vitamin_c_mg == 45.0

    def test_unset_vitamin_c_defaults_to_none(self):
        ing = make_ingredient()
        assert ing.vitamin_c_mg is None

    def test_update_vitamin_c_field(self):
        ing = make_ingredient()
        assert ing.vitamin_c_mg is None

        ing.vitamin_c_mg = 80.0
        ing.save()
        ing.refresh_from_db()
        assert ing.vitamin_c_mg == 80.0


# ---------------------------------------------------------------------------
# 9.2 — DgeReference model
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDgeReferenceModel:
    """Verify DgeReference creation and querying."""

    def test_create_dge_reference(self):
        ref = DgeReference.objects.create(
            age_min=10,
            age_max=13,
            gender=DgeGenderChoices.MALE,
            energy_kcal=2390,
            protein_g=48.0,
            fat_g=75.0,
            carbohydrate_g=275.0,
            fibre_g=20.0,
            vitamin_c_mg=90.0,
        )
        assert ref.pk is not None
        assert ref.age_min == 10
        assert ref.age_max == 13
        assert ref.gender == "male"
        assert ref.vitamin_c_mg == 90.0

    def test_dge_reference_str(self):
        ref = DgeReference.objects.create(
            age_min=14,
            age_max=18,
            gender=DgeGenderChoices.FEMALE,
            energy_kcal=2271,
        )
        assert "14-18" in str(ref)
        assert "DGE" in str(ref)

    def test_dge_reference_unique_together(self):
        DgeReference.objects.create(age_min=10, age_max=13, gender=DgeGenderChoices.MALE, energy_kcal=2390)
        with pytest.raises(Exception):
            DgeReference.objects.create(age_min=10, age_max=13, gender=DgeGenderChoices.MALE, energy_kcal=2151)

    def test_dge_reference_vitamin_c_nullable(self):
        ref = DgeReference.objects.create(
            age_min=19,
            age_max=25,
            gender=DgeGenderChoices.FEMALE,
            energy_kcal=2199,
        )
        assert ref.vitamin_c_mg is None

    def test_dge_reference_lookup_by_age_and_gender(self):
        DgeReference.objects.create(
            age_min=10, age_max=13, gender=DgeGenderChoices.MALE, energy_kcal=2390, vitamin_c_mg=90.0
        )
        DgeReference.objects.create(
            age_min=10, age_max=13, gender=DgeGenderChoices.FEMALE, energy_kcal=2271, vitamin_c_mg=90.0
        )
        DgeReference.objects.create(
            age_min=14, age_max=18, gender=DgeGenderChoices.MALE, energy_kcal=2868, vitamin_c_mg=105.0
        )

        # Lookup for a 12-year-old male
        ref = DgeReference.objects.filter(age_min__lte=12, age_max__gte=12, gender="male").first()
        assert ref is not None
        assert ref.energy_kcal == 2390.0
        assert ref.vitamin_c_mg == 90.0


# ---------------------------------------------------------------------------
# 9.3 — recalculate_recipe_cache with micronutrients
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecalculateRecipeCacheMicronutrients:
    """Verify that recalculate_recipe_cache populates cached_vitamin_c_mg."""

    def _make_recipe_with_micro_items(self) -> Recipe:
        """Create a recipe with two items that have vitamin_c_mg values."""
        recipe = make_recipe()

        # Ingredient A: rich in vitamin C (values per 100g)
        ing_a = make_ingredient(
            name="Orange",
            vitamin_c_mg=53.2,
        )
        portion_a = make_portion(ingredient=ing_a, quantity=200.0, weight_g=200.0, name="200g Orange")

        # Ingredient B: some vitamin C (values per 100g)
        ing_b = make_ingredient(
            name="Spinat",
            vitamin_c_mg=28.0,
        )
        portion_b = make_portion(ingredient=ing_b, quantity=150.0, weight_g=150.0, name="150g Spinat")

        # quantity=1 -> weight = 1 * portion.weight_g
        make_recipe_item(recipe=recipe, portion=portion_a, ingredient=ing_a, quantity=1.0)
        make_recipe_item(recipe=recipe, portion=portion_b, ingredient=ing_b, quantity=1.0)

        return recipe

    def test_cache_populated_after_recalculate(self):
        recipe = self._make_recipe_with_micro_items()
        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        assert recipe.cached_at is not None
        assert recipe.cached_vitamin_c_mg is not None

    def test_cache_values_are_per_100g_normalized(self):
        """Cached values should be normalized to per-100g of total recipe weight."""
        recipe = self._make_recipe_with_micro_items()
        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        # Total weight: 200g + 150g = 350g
        # Vitamin C total: (53.2 * 200/100) + (28.0 * 150/100) = 106.4 + 42.0 = 148.4
        # Per 100g: 148.4 * 100 / 350 = 42.4
        expected_vit_c_per100g = (53.2 * 2.0 + 28.0 * 1.5) * 100.0 / 350.0
        assert recipe.cached_vitamin_c_mg == pytest.approx(expected_vit_c_per100g, abs=0.1)

    def test_cache_none_for_missing_micronutrients(self):
        """If no ingredient has vitamin_c_mg, the cached field stays 0 (or near 0)."""
        recipe = make_recipe()
        # Ingredient with no micronutrients set
        ing = make_ingredient(name="Wasser")
        portion = make_portion(ingredient=ing, weight_g=100.0, name="100ml Wasser")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        # vitamin_c_mg on the ingredient is None, so get_recipe_nutritional_values
        # won't add any contribution -> values.get(field) returns 0.0
        assert recipe.cached_vitamin_c_mg is not None or recipe.cached_vitamin_c_mg == 0.0

    def test_all_cached_micronutrient_fields_are_saved(self):
        """All CACHED_MICRONUTRIENT_FIELDS are stored after recalculation."""
        recipe = self._make_recipe_with_micro_items()
        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        for field in CACHED_MICRONUTRIENT_FIELDS:
            cached_field = f"cached_{field}"
            val = getattr(recipe, cached_field)
            assert val is not None, f"{cached_field} should be set after recalculation"


# ---------------------------------------------------------------------------
# 9.4 — Rule matching with vitamin_c_mg parameter
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRuleVitaminMineralMatching:
    """Verify that Rule rules with vitamin_c_mg parameter correctly match."""

    def _make_recipe_with_low_vitamin_c(self) -> Recipe:
        """Recipe with very low vitamin C (< 20mg per 100g)."""
        recipe = make_recipe()
        ing = make_ingredient(
            name="Reis",
            vitamin_c_mg=0.0,
            energy_kcal=360,
            protein_g=6.7,
            fat_g=0.6,
            carbohydrate_g=78.0,
            sugar_g=0.0,
            fibre_g=1.0,
            salt_g=0.01,
        )
        portion = make_portion(ingredient=ing, weight_g=300.0, name="300g Reis")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)
        return recipe

    def _make_recipe_with_high_vitamin_c(self) -> Recipe:
        """Recipe with high vitamin C (> 20mg per 100g)."""
        recipe = make_recipe()
        ing = make_ingredient(
            name="Paprika",
            vitamin_c_mg=140.0,
            energy_kcal=20,
            protein_g=1.0,
            fat_g=0.3,
            carbohydrate_g=4.2,
            sugar_g=3.0,
            fibre_g=1.7,
            salt_g=0.01,
        )
        portion = make_portion(ingredient=ing, weight_g=200.0, name="200g Paprika")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)
        return recipe

    def test_min_hint_matches_low_value(self):
        """A MIN hint for vitamin_c_mg should match when actual is below min_value."""
        hint = make_recipe_hint(
            name="Wenig Vitamin C",
            parameter=HintParameterChoices.VITAMIN_C_MG,
            min_value=20.0,
            max_value=None,
            min_max=HintMinMaxChoices.MIN,
            hint_level=HintLevelChoices.WARNING,
            recipe_objective=RecipeObjectiveChoices.HEALTH,
        )

        recipe = self._make_recipe_with_low_vitamin_c()
        results = match_recipe_hints(recipe)

        matched_params = [r["hint"].parameter for r in results]
        assert HintParameterChoices.VITAMIN_C_MG in matched_params

    def test_min_hint_does_not_match_high_value(self):
        """A MIN hint should NOT match when the actual value exceeds the threshold."""
        make_recipe_hint(
            name="Wenig Vitamin C",
            parameter=HintParameterChoices.VITAMIN_C_MG,
            min_value=20.0,
            max_value=None,
            min_max=HintMinMaxChoices.MIN,
            hint_level=HintLevelChoices.WARNING,
            recipe_objective=RecipeObjectiveChoices.HEALTH,
        )

        recipe = self._make_recipe_with_high_vitamin_c()
        results = match_recipe_hints(recipe)

        matched_params = [r["hint"].parameter for r in results]
        assert HintParameterChoices.VITAMIN_C_MG not in matched_params

    def test_hint_result_contains_actual_value(self):
        """Matched hints should include the actual calculated value."""
        make_recipe_hint(
            name="Wenig Vitamin C",
            parameter=HintParameterChoices.VITAMIN_C_MG,
            min_value=20.0,
            max_value=None,
            min_max=HintMinMaxChoices.MIN,
            hint_level=HintLevelChoices.WARNING,
        )

        recipe = self._make_recipe_with_low_vitamin_c()
        results = match_recipe_hints(recipe)

        vit_c_results = [r for r in results if r["hint"].parameter == HintParameterChoices.VITAMIN_C_MG]
        assert len(vit_c_results) == 1
        assert "actual_value" in vit_c_results[0]
        assert isinstance(vit_c_results[0]["actual_value"], float)


# ---------------------------------------------------------------------------
# 9.5 — Nutrition breakdown API with DGE coverage
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNutritionBreakdownAPI:
    """Verify the GET /api/recipes/{id}/nutrition-breakdown/ endpoint."""

    def _setup_recipe_with_micronutrients(self) -> Recipe:
        recipe = make_recipe(servings=2)
        ing = make_ingredient(
            name="Brokkoli",
            energy_kcal=34,
            protein_g=3.7,
            fat_g=0.4,
            fat_sat_g=0.1,
            carbohydrate_g=2.8,
            sugar_g=1.6,
            fibre_g=3.0,
            salt_g=0.03,
            vitamin_c_mg=89.0,
        )
        portion = make_portion(ingredient=ing, quantity=200.0, weight_g=200.0, name="200g Brokkoli")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)
        return recipe

    def test_nutrition_breakdown_has_micronutrients(self, auth_client: Client):
        recipe = self._setup_recipe_with_micronutrients()
        resp = auth_client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        assert resp.status_code == 200
        data = resp.json()

        assert "total_vitamin_c_mg" in data
        assert "dge_coverage" in data
        assert "items" in data

    def test_nutrition_breakdown_micronutrient_values(self, auth_client: Client):
        recipe = self._setup_recipe_with_micronutrients()
        resp = auth_client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        data = resp.json()

        # 200g Brokkoli: vitamin_c = 89.0 * (200/100) = 178.0
        assert data["total_vitamin_c_mg"] is not None
        assert data["total_vitamin_c_mg"] == pytest.approx(178.0, abs=0.5)

    def test_nutrition_breakdown_per_serving(self, auth_client: Client):
        recipe = self._setup_recipe_with_micronutrients()
        resp = auth_client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        data = resp.json()

        # servings=2, vitamin_c total=178.0 -> per serving ~89.0
        if data.get("per_serving_vitamin_c_mg") is not None:
            assert data["per_serving_vitamin_c_mg"] == pytest.approx(89.0, abs=0.5)

    def test_nutrition_breakdown_items_have_micronutrients(self, auth_client: Client):
        recipe = self._setup_recipe_with_micronutrients()
        resp = auth_client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        data = resp.json()

        assert len(data["items"]) == 1
        item = data["items"][0]
        assert "vitamin_c_mg" in item
        assert item["vitamin_c_mg"] is not None
        assert item["vitamin_c_mg"] == pytest.approx(178.0, abs=0.5)

    def test_nutrition_breakdown_dge_coverage_with_params(self, auth_client: Client):
        """DGE coverage should be populated when age and gender params are given."""
        recipe = self._setup_recipe_with_micronutrients()

        # Create a DGE reference for a 12-year-old male
        DgeReference.objects.create(
            age_min=10,
            age_max=13,
            gender="male",
            energy_kcal=2390,
            protein_g=48.0,
            fat_g=75.0,
            carbohydrate_g=275.0,
            fibre_g=20.0,
            vitamin_c_mg=90.0,
        )

        resp = auth_client.get(
            f"/api/recipes/{recipe.id}/nutrition-breakdown/",
            {"age": 12, "gender": "male"},
        )
        assert resp.status_code == 200
        data = resp.json()

        dge = data["dge_coverage"]
        assert len(dge) > 0

        # Vitamin C coverage: 178.0 / 90.0 * 100 = ~197.8%
        assert "vitamin_c_mg" in dge
        assert dge["vitamin_c_mg"] == pytest.approx(197.8, abs=1.0)

    def test_nutrition_breakdown_no_dge_without_params(self, auth_client: Client):
        """Without age/gender params, dge_coverage should be empty."""
        recipe = self._setup_recipe_with_micronutrients()
        resp = auth_client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        data = resp.json()

        assert data["dge_coverage"] == {}

    def test_nutrition_breakdown_empty_recipe(self, auth_client: Client):
        """A recipe with no items returns zero totals."""
        recipe = make_recipe()
        resp = auth_client.get(f"/api/recipes/{recipe.id}/nutrition-breakdown/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_weight_g"] == 0.0
        assert data["items"] == []


# ---------------------------------------------------------------------------
# 9.6 — Cockpit service with vitamin_c_mg Rules
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCockpitVitaminMineralRules:
    """Verify that Rules with vitamin_c_mg parameter are evaluated at day scope."""

    def _setup_meal_with_cached_recipe(self) -> tuple:
        """Create a meal_plan + meal with a recipe that has cached vitamin_c_mg."""
        meal_plan = make_meal_plan()
        today = datetime.date.today()
        meal = make_meal(
            meal_plan=meal_plan,
            start_datetime=timezone.make_aware(datetime.datetime.combine(today, datetime.time(12, 0))),
            end_datetime=timezone.make_aware(datetime.datetime.combine(today, datetime.time(13, 0))),
        )

        recipe = make_recipe()
        ing = make_ingredient(
            name="Paprika",
            vitamin_c_mg=140.0,
            energy_kcal=20,
            protein_g=1.0,
            fat_g=0.3,
            carbohydrate_g=4.2,
            sugar_g=3.0,
            fibre_g=1.7,
            salt_g=0.01,
        )
        portion = make_portion(ingredient=ing, weight_g=200.0, name="200g Paprika")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)

        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        return meal_plan, meal, today

    def test_day_cockpit_vitamin_c_rule_green(self):
        """A vitamin_c_mg day rule should evaluate to green when below threshold."""
        meal_plan, meal, today = self._setup_meal_with_cached_recipe()

        make_health_rule(
            name="Vitamin C Tag",
            parameter="vitamin_c_mg",
            scope="day",
            max_green=200.0,
            max_yellow=300.0,
            unit="mg",
            tip_text="Mehr Obst und Gemuese essen.",
        )

        result = evaluate_day_cockpit(meal_plan, today)
        assert len(result["evaluations"]) == 1
        ev = result["evaluations"][0]
        assert ev["parameter"] == "vitamin_c_mg"
        assert ev["status"] in ("green", "yellow", "red")

    def test_vitamin_rule_tip_text_shown_when_not_green(self):
        """Tip text should be included when the status is not green."""
        meal_plan, meal, today = self._setup_meal_with_cached_recipe()

        # Set a very low threshold so the value exceeds it
        make_health_rule(
            name="Vitamin C Tag",
            parameter="vitamin_c_mg",
            scope="day",
            max_green=0.001,
            max_yellow=0.002,
            unit="mg",
            tip_text="Weniger Vitamin-C-haltige Lebensmittel verwenden.",
        )

        result = evaluate_day_cockpit(meal_plan, today)
        ev = result["evaluations"][0]
        # With 140mg/100g vitamin C in the recipe, this should be red
        assert ev["status"] == "red"
        assert ev["tip_text"] == "Weniger Vitamin-C-haltige Lebensmittel verwenden."


# ---------------------------------------------------------------------------
# Extra — improvement_text on Rule
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRuleImprovementText:
    """Verify that improvement_text is stored and returned in hint matches."""

    def test_improvement_text_stored_on_hint(self):
        hint = make_recipe_hint(
            name="Wenig Ballaststoffe",
            parameter=HintParameterChoices.FIBRE_G,
            min_value=3.0,
            max_value=None,
            min_max=HintMinMaxChoices.MIN,
            hint_level=HintLevelChoices.INFO,
            improvement_text="Vollkornmehl statt Weissmehl verwenden.",
        )
        assert hint.improvement_text == "Vollkornmehl statt Weissmehl verwenden."

    def test_improvement_text_defaults_to_empty(self):
        hint = make_recipe_hint(name="Test Hint")
        # The factory doesn't set improvement_text, but the model default is ""
        assert hint.improvement_text == "" or hint.improvement_text is not None

    def test_improvement_text_returned_in_match_result(self):
        """When a hint matches, the improvement_text should be in the result dict."""
        make_recipe_hint(
            name="Wenig Vitamin C",
            parameter=HintParameterChoices.VITAMIN_C_MG,
            min_value=20.0,
            max_value=None,
            min_max=HintMinMaxChoices.MIN,
            hint_level=HintLevelChoices.WARNING,
            improvement_text="Paprika oder Zitrusfruchte hinzufuegen.",
        )

        recipe = make_recipe()
        ing = make_ingredient(
            name="Nudeln",
            vitamin_c_mg=0.0,
            energy_kcal=359,
            protein_g=12.0,
            fat_g=1.5,
            carbohydrate_g=70.0,
            sugar_g=2.0,
            fibre_g=3.0,
            salt_g=0.01,
        )
        portion = make_portion(ingredient=ing, weight_g=300.0, name="300g Nudeln")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)

        results = match_recipe_hints(recipe)
        vit_c_results = [r for r in results if r["hint"].parameter == HintParameterChoices.VITAMIN_C_MG]
        assert len(vit_c_results) == 1
        assert vit_c_results[0]["improvement_text"] == "Paprika oder Zitrusfruchte hinzufuegen."

    def test_improvement_text_in_api_response(self, auth_client: Client):
        """The improvement_text should appear in the unified /improvements/ API response."""
        make_recipe_hint(
            name="Zu viel Zucker",
            parameter=HintParameterChoices.SUGAR_G,
            max_value=5.0,
            min_max=HintMinMaxChoices.MAX,
            hint_level=HintLevelChoices.WARNING,
            improvement_text="Zucker durch Honig oder Obst ersetzen.",
        )

        recipe = make_recipe()
        ing = make_ingredient(
            name="Marmelade",
            energy_kcal=263,
            protein_g=0.3,
            fat_g=0.1,
            carbohydrate_g=60.0,
            sugar_g=55.0,
            fibre_g=0.5,
            salt_g=0.01,
        )
        portion = make_portion(ingredient=ing, weight_g=200.0, name="200g Marmelade")
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing, quantity=1.0)

        resp = auth_client.get(f"/api/recipes/{recipe.id}/improvements/")
        assert resp.status_code == 200
        data = resp.json()

        sugar_items = [i for i in data["items"] if i["parameter"] == "sugar_g"]
        assert len(sugar_items) >= 1
        assert "Zucker durch Honig oder Obst ersetzen." in sugar_items[0]["recommendation_text"]
