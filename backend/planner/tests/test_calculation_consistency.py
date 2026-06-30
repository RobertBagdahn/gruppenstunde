"""
Consistency tests for food calculations.

These tests use the SAME data setup and verify that nutrition, cost,
and shopping quantities are consistent across:
  - nutrition_summary API endpoint
  - cost_summary API endpoint
  - shopping list service
  - MealItem energy/cost resolvers (MealOut/MealItemOut)

All four areas must agree on the same ingredient weights, scaled by
the same effective_portions and reserve_factor.
"""

import datetime as dt
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import Meal, MealItem, MealItemOverride, MealTypeChoices
from planner.schemas.meal_plan import MealOut
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe, make_recipe_item
from supply.models import MeasuringUnit, Portion
from supply.services.shopping_service import generate_shopping_list
from supply.tests import make_ingredient, make_portion

User = get_user_model()


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNutritionAndShoppingConsistency:
    """
    Core consistency: nutrition_summary, shopping_list, and MealOut
    must all produce the same ingredient weights and scale identically.

    Setup:
      - 1 ingredient: energy_kcal=200/100g, protein_g=10/100g, price_per_kg=5.00
      - 1 recipe: 1 RecipeItem, quantity=2, portion.weight_g=100g → 200g per serving
      - recipe.portions=1 (normalised)
      - MealPlan: norm_portions=10, reserve_factor=1.1 → scaling_factor=11
      - 1 Meal: no override
      - 1 MealItem: recipe, factor=1.0

    Expected per-recipe-serving:
      weight_g = 2 × 100 = 200g (for 1 serving of the recipe)

    Expected TOTAL over effective_portions (10):
      weight_g_total   = 200 × 1.0 × (10/1) = 2000g
      energy_kcal_total = (200/100) × 2000  = 4000 kcal  ← nutrition_summary.energy_kcal
      protein_g_total   = (10/100) × 2000   = 200g        ← nutrition_summary.protein_g

    Expected PER PERSON:
      per_portion_energy_kcal = 4000 / 10 = 400 kcal

    Expected shopping quantity (with reserve):
      weight_g_shopping = 200 × 1.0 × 11 = 2200g  (scaling = 10 × 1.1)
    """

    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

        self.ingredient = make_ingredient(
            name="Haferflocken",
            energy_kcal=200.0,
            protein_g=10.0,
            fat_g=5.0,
            carbohydrate_g=30.0,
            sugar_g=2.0,
            fibre_g=4.0,
            salt_g=0.01,
            price_per_kg=5.0,
        )
        self.portion = make_portion(ingredient=self.ingredient, weight_g=100.0)
        self.recipe = make_recipe(portions=1)
        self.recipe_item = make_recipe_item(recipe=self.recipe, portion=self.portion, quantity=2.0)

        self.plan = make_meal_plan(
            created_by=self.user,
            norm_portions=10,
            reserve_factor=1.1,
        )
        today = dt.date.today()
        self.meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(12, 0))),
            end_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(13, 0))),
        )
        self.meal_item = make_meal_item(meal=self.meal, recipe=self.recipe, factor=1.0)

    def test_nutrition_summary_energy_kcal(self):
        """nutrition_summary.energy_kcal == ingredient contribution × effective_portions."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert response.status_code == 200
        data = response.json()
        # 200g × (200kcal/100g) × 10 portions = 4000 kcal
        assert data["energy_kcal"] == pytest.approx(4000.0, rel=0.01)

    def test_nutrition_summary_per_portion(self):
        """per_portion_energy_kcal == energy_kcal / effective_portions."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert response.status_code == 200
        data = response.json()
        assert data["per_portion_energy_kcal"] == pytest.approx(400.0, rel=0.01)

    def test_nutrition_summary_protein(self):
        """protein_g is also aggregated correctly."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert response.status_code == 200
        data = response.json()
        # 200g × (10g/100g) × 10 portions = 200g
        assert data["protein_g"] == pytest.approx(200.0, rel=0.01)

    def test_shopping_list_weight_includes_reserve(self):
        """Shopping list weight = nutrition weight × reserve_factor."""
        items = generate_shopping_list(self.plan)
        assert len(items) == 1
        item = items[0]
        assert item.ingredient_name == "Haferflocken"
        # scaling = 10 × 1.1 = 11; weight = 2 × 100 × 1.0 × 11 = 2200g
        assert item.total_quantity_g == pytest.approx(2200.0, rel=0.01)

    def test_shopping_to_nutrition_ratio_equals_reserve_factor(self):
        """shopping_weight / nutrition_weight_per_person == reserve_factor × effective_portions."""
        nutrition_resp = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        data = nutrition_resp.json()
        per_person_weight_g = data["energy_kcal"] / (200.0 / 100.0)  # reverse: kcal → grams
        total_nutrition_weight = per_person_weight_g  # already total (not per person)

        items = generate_shopping_list(self.plan)
        shopping_weight = items[0].total_quantity_g

        # shopping / (nutrition_total / norm_portions) should equal reserve_factor
        reserve = shopping_weight / (total_nutrition_weight / self.plan.norm_portions) / self.plan.norm_portions
        # Simplified: shopping_weight = nutrition_weight × reserve_factor
        assert shopping_weight / total_nutrition_weight == pytest.approx(self.plan.reserve_factor, rel=0.01)

    def test_meal_out_total_energy_matches_nutrition_summary(self):
        """MealOut.total_energy_kcal must equal nutrition_summary.energy_kcal (single meal plan)."""
        meal = Meal.objects.prefetch_related("items__recipe").get(id=self.meal.id)
        meal_total = MealOut.resolve_total_energy_kcal(meal)
        # nutrition_summary aggregates all meals; for a single meal this should match
        nutrition_resp = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert meal_total == pytest.approx(nutrition_resp.json()["energy_kcal"], rel=0.01)

    def test_cost_summary_total_cost(self):
        """cost_summary total_cost = price_per_kg / 1000 × weight_g_per_serving × effective_portions."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/costs/")
        assert response.status_code == 200
        data = response.json()
        # 5.00/kg × 200g × (10/1) = 5.00/1000 × 200 × 10 = 10.00€
        assert float(data["total_cost"]) == pytest.approx(10.0, rel=0.01)

    def test_cost_summary_recipe_cost_per_person(self):
        """recipe.cost_per_person = total_cost / effective_portions (weighted)."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/costs/")
        assert response.status_code == 200
        data = response.json()
        assert len(data["recipes"]) == 1
        # 10€ total / 10 persons = 1.00€/person
        assert float(data["recipes"][0]["cost_per_person"]) == pytest.approx(1.0, rel=0.01)


@pytest.mark.django_db
class TestDirectIngredientNutritionConsistency:
    """
    Direct ingredient (no recipe) — nutrition_summary must include it.

    This is the Breakfast Wizard case: MealItems with ingredient, not recipe.

    Setup:
      - ingredient: energy_kcal=265/100g (Brot)
      - MealItem: ingredient, quantity=0.5, measuring_unit=Scheibe (portion weight_g=50g)
      - effective_portions=10, factor=1.0

    Expected:
      weight_g_per_person = 0.5 × 50 = 25g
      energy_total = (265/100) × 25 × 10 = 662.5 kcal
      per_portion = 662.5 / 10 = 66.25 kcal/person
    """

    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

        self.ingredient = make_ingredient(
            name="Bauernbrot",
            energy_kcal=265.0,
            protein_g=8.0,
            fat_g=1.5,
            carbohydrate_g=50.0,
            sugar_g=1.0,
            fibre_g=5.0,
            salt_g=0.8,
            price_per_kg=4.0,
        )
        self.scheibe_unit, _ = MeasuringUnit.objects.get_or_create(
            name="Scheibe", defaults={"quantity": 1.0, "unit": "st"}
        )
        Portion.objects.create(
            ingredient=self.ingredient,
            measuring_unit=self.scheibe_unit,
            name="Scheibe",
            quantity=1,
            weight_g=50.0,
            rank=1,
        )

        self.plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        today = dt.date.today()
        self.meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.BREAKFAST,
            start_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(8, 0))),
            end_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(9, 0))),
        )
        baker.make(
            MealItem,
            meal=self.meal,
            recipe=None,
            ingredient=self.ingredient,
            quantity=Decimal("0.5"),
            measuring_unit=self.scheibe_unit,
            factor=1.0,
        )

    def test_nutrition_summary_includes_direct_ingredient(self):
        """nutrition_summary.energy_kcal is non-zero for Ingredient-MealItems."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert response.status_code == 200
        data = response.json()
        # Must be > 0; previously this was 0 (bug)
        assert data["energy_kcal"] > 0

    def test_nutrition_summary_direct_ingredient_exact_value(self):
        """Direct ingredient: energy_kcal = 265/100 × 25g × 10 persons = 662.5."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert response.status_code == 200
        data = response.json()
        assert data["energy_kcal"] == pytest.approx(662.5, rel=0.01)

    def test_nutrition_summary_per_portion_direct_ingredient(self):
        """per_portion_energy_kcal = 662.5 / 10 = 66.25."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert response.status_code == 200
        data = response.json()
        assert data["per_portion_energy_kcal"] == pytest.approx(66.25, rel=0.01)

    def test_shopping_list_direct_ingredient_weight(self):
        """Shopping list includes direct ingredient with scaling (reserve=1.0 here)."""
        items = generate_shopping_list(self.plan)
        ing_items = [i for i in items if i.ingredient_name == "Bauernbrot"]
        assert len(ing_items) == 1
        # weight_g = 0.5 × 50 × 1.0 × 10 = 250g
        assert ing_items[0].total_quantity_g == pytest.approx(250.0, rel=0.01)

    def test_nutrition_and_shopping_weight_consistent(self):
        """nutrition weight per person × norm_portions = shopping weight (reserve=1.0)."""
        nutrition_resp = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        nutrition_data = nutrition_resp.json()

        # per_portion_energy_kcal → derive weight_g from that
        per_person_kcal = nutrition_data["per_portion_energy_kcal"]
        per_person_weight = per_person_kcal / (265.0 / 100.0)  # = 25g

        items = generate_shopping_list(self.plan)
        shopping_weight = items[0].total_quantity_g  # 250g

        # shopping_weight == per_person_weight × norm_portions × reserve_factor
        expected = per_person_weight * self.plan.norm_portions * self.plan.reserve_factor
        assert shopping_weight == pytest.approx(expected, rel=0.01)


@pytest.mark.django_db
class TestMealItemOverrideConsistency:
    """
    MealItemOverride effects must be consistent across:
      - nutrition_summary (excluded → 0 contribution)
      - cost_summary (excluded → lower cost)
      - shopping_list (excluded → not purchased)
      - quantity_override → proportionally less in all three
    """

    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

        self.ingredient = make_ingredient(
            name="Eier",
            energy_kcal=150.0,
            protein_g=12.0,
            fat_g=10.0,
            carbohydrate_g=1.0,
            sugar_g=0.5,
            fibre_g=0.0,
            salt_g=0.4,
            price_per_kg=6.0,
        )
        self.portion = make_portion(ingredient=self.ingredient, weight_g=60.0)  # 1 Ei = 60g

        self.recipe = make_recipe(portions=1)
        self.recipe_item = make_recipe_item(recipe=self.recipe, portion=self.portion, quantity=4.0)

        self.plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        today = dt.date.today()
        self.meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(12, 0))),
            end_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(13, 0))),
        )
        self.meal_item = make_meal_item(meal=self.meal, recipe=self.recipe, factor=1.0)

    def _get_nutrition(self):
        r = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert r.status_code == 200
        return r.json()

    def _get_costs(self):
        r = self.client.get(f"/api/meal-plans/{self.plan.id}/costs/")
        assert r.status_code == 200
        return r.json()

    def _get_shopping(self):
        return generate_shopping_list(self.plan)

    def test_baseline_without_overrides(self):
        """Without overrides: 4 Eier × 60g × 10 persons = 2400g total."""
        data = self._get_nutrition()
        # weight = 4 × 60 = 240g per serving; energy = 150/100 × 240 × 10 = 3600 kcal
        assert data["energy_kcal"] == pytest.approx(3600.0, rel=0.01)

        shopping = self._get_shopping()
        assert shopping[0].total_quantity_g == pytest.approx(2400.0, rel=0.01)

    def test_excluded_override_removes_from_nutrition(self):
        """excluded=True removes the item from nutrition_summary."""
        MealItemOverride.objects.create(
            meal_item=self.meal_item,
            recipe_item=self.recipe_item,
            excluded=True,
        )
        data = self._get_nutrition()
        assert data["energy_kcal"] == pytest.approx(0.0, abs=0.01)

    def test_excluded_override_removes_from_shopping(self):
        """excluded=True removes the ingredient from the shopping list."""
        MealItemOverride.objects.create(
            meal_item=self.meal_item,
            recipe_item=self.recipe_item,
            excluded=True,
        )
        shopping = self._get_shopping()
        assert len(shopping) == 0

    def test_excluded_override_removes_from_cost(self):
        """excluded=True sets cost to 0 in cost_summary."""
        MealItemOverride.objects.create(
            meal_item=self.meal_item,
            recipe_item=self.recipe_item,
            excluded=True,
        )
        data = self._get_costs()
        assert float(data["total_cost"]) == pytest.approx(0.0, abs=0.01)

    def test_quantity_override_halves_nutrition(self):
        """quantity_override=2 halves energy vs baseline (4 → 2 Eier)."""
        MealItemOverride.objects.create(
            meal_item=self.meal_item,
            recipe_item=self.recipe_item,
            quantity_override=Decimal("2"),
        )
        data = self._get_nutrition()
        # 2 Eier × 60g = 120g; energy = 150/100 × 120 × 10 = 1800 kcal
        assert data["energy_kcal"] == pytest.approx(1800.0, rel=0.01)

    def test_quantity_override_halves_shopping(self):
        """quantity_override=2 halves shopping weight vs baseline."""
        MealItemOverride.objects.create(
            meal_item=self.meal_item,
            recipe_item=self.recipe_item,
            quantity_override=Decimal("2"),
        )
        shopping = self._get_shopping()
        assert len(shopping) == 1
        # 2 × 60 × 10 = 1200g (half of 2400)
        assert shopping[0].total_quantity_g == pytest.approx(1200.0, rel=0.01)

    def test_quantity_override_consistent_nutrition_and_shopping(self):
        """After quantity_override, nutrition and shopping weights are still proportional."""
        MealItemOverride.objects.create(
            meal_item=self.meal_item,
            recipe_item=self.recipe_item,
            quantity_override=Decimal("2"),
        )
        nutrition = self._get_nutrition()
        shopping = self._get_shopping()

        # Derive weight from nutrition energy: E = (kcal/100g) × weight_g_per_person × persons
        per_person_weight = nutrition["per_portion_energy_kcal"] / (150.0 / 100.0)  # 120g per person
        expected_shopping = per_person_weight * self.plan.norm_portions * self.plan.reserve_factor  # 1200g
        assert shopping[0].total_quantity_g == pytest.approx(expected_shopping, rel=0.01)


@pytest.mark.django_db
class TestOverridePortionsConsistency:
    """
    override_portions on a Meal must affect nutrition, cost, and shopping consistently.

    When a meal has override_portions=20 and norm_portions=10:
      - nutrition_summary: total uses 20 persons, per_portion divides by 20
      - cost_summary: recipe.cost_per_person divides by 20 (not 10)
      - shopping_list: uses 20 × reserve_factor as scaling for that meal
    """

    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

        self.ingredient = make_ingredient(
            name="Nudeln",
            energy_kcal=350.0,
            protein_g=12.0,
            fat_g=1.5,
            carbohydrate_g=70.0,
            sugar_g=3.0,
            fibre_g=3.0,
            salt_g=0.01,
            price_per_kg=2.0,
        )
        self.portion = make_portion(ingredient=self.ingredient, weight_g=100.0)
        self.recipe = make_recipe(portions=1)
        self.recipe_item = make_recipe_item(recipe=self.recipe, portion=self.portion, quantity=1.0)

        self.plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.0)
        today = dt.date.today()
        self.meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.DINNER,
            override_portions=20,
            start_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(18, 0))),
            end_datetime=timezone.make_aware(dt.datetime.combine(today, dt.time(19, 0))),
        )
        self.meal_item = make_meal_item(meal=self.meal, recipe=self.recipe, factor=1.0)

    def test_nutrition_total_uses_override_portions(self):
        """energy_kcal uses effective_portions=20, not norm_portions=10."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert response.status_code == 200
        data = response.json()
        # 100g × (350/100) × 20 = 7000 kcal
        assert data["energy_kcal"] == pytest.approx(7000.0, rel=0.01)

    def test_nutrition_per_portion_uses_override_portions(self):
        """per_portion_energy_kcal = total / effective_portions = 7000 / 20 = 350."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert response.status_code == 200
        data = response.json()
        assert data["per_portion_energy_kcal"] == pytest.approx(350.0, rel=0.01)

    def test_cost_recipe_cost_per_person_uses_override_portions(self):
        """recipe.cost_per_person = total_recipe_cost / override_portions."""
        response = self.client.get(f"/api/meal-plans/{self.plan.id}/costs/")
        assert response.status_code == 200
        data = response.json()
        # total_cost: 2.00/kg × 100g × 20 = 4.00€
        # cost_per_person: 4.00 / 20 = 0.20€
        assert len(data["recipes"]) == 1
        assert float(data["recipes"][0]["cost_per_person"]) == pytest.approx(0.2, rel=0.01)

    def test_shopping_uses_override_portions_scaling(self):
        """Shopping list uses override_portions × reserve_factor for that meal."""
        items = generate_shopping_list(self.plan)
        assert len(items) == 1
        # meal_scaling = override_portions × reserve_factor = 20 × 1.0 = 20
        # weight = 1 × 100 × 1.0 × 20 = 2000g
        assert items[0].total_quantity_g == pytest.approx(2000.0, rel=0.01)


# ---------------------------------------------------------------------------
# Task 5.1: Direct ingredient weight consistency across all three areas
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDirectIngredientWeightConsistency:
    """
    Direktzutaten (ingredient-MealItems) müssen in allen drei Bereichen
    (nutrition_summary, cost_summary, shopping_service) dasselbe
    Basisgewicht verwenden, skaliert mit dem jeweils korrekten Faktor.

    Setup:
      - ingredient: energy_kcal=200/100g, price_per_kg=4.00, density=1.0
      - MealPlan: norm_portions=10, reserve_factor=1.1
      - Mahlzeit: kein override_portions → effective_portions=10
      - MealItem: ingredient, quantity=150 (g-Einheit), factor=1.0

    Erwartetes Basisgewicht:
      weight_g_base = 150g  (g-Einheit → quantity direkt)

    nutrition_summary (effective_portions, ohne Reserve):
      contribution = (200/100) × 150 × 1.0 × 10 = 3000 kcal total

    cost_summary (effective_portions, ohne Reserve):
      weight = 150 × 1.0 × 10 = 1500g
      price  = 4.00/1000 × 1500 = 6.00 EUR

    shopping (scaling_factor = norm_portions × reserve_factor):
      total_quantity_g = 150 × 1.0 × 11 = 1650g
    """

    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

        self.mu_g = baker.make(MeasuringUnit, name="g", unit="g", quantity=1.0)
        self.ingredient = make_ingredient(
            name="Olivenöl",
            energy_kcal=200.0,
            protein_g=0.0,
            fat_g=22.0,
            carbohydrate_g=0.0,
            sugar_g=0.0,
            fibre_g=0.0,
            salt_g=0.0,
            price_per_kg=4.0,
            physical_density=1.0,
        )
        self.plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.1)
        import datetime as _dt

        today = _dt.date.today()
        self.meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(_dt.datetime.combine(today, _dt.time(12, 0))),
        )
        # Direktzutat: 150g pro Person
        baker.make(
            MealItem,
            meal=self.meal,
            ingredient=self.ingredient,
            recipe=None,
            quantity=150,
            measuring_unit=self.mu_g,
            factor=1.0,
        )

    def test_nutrition_summary_direct_ingredient_g_unit(self):
        """nutrition_summary: 150g × (200/100) × factor=1 × portions=10 = 3000 kcal."""
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["energy_kcal"] == pytest.approx(3000.0, rel=0.01)

    def test_nutrition_summary_per_portion(self):
        """per_portion_energy_kcal = 3000 / 10 = 300."""
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["per_portion_energy_kcal"] == pytest.approx(300.0, rel=0.01)

    def test_cost_summary_direct_ingredient_g_unit(self):
        """cost_summary: weight=150×1.0×10=1500g, price=4.00/1000×1500=6.00 EUR."""
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/costs/")
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["total_cost"]) == pytest.approx(6.0, rel=0.01)

    def test_shopping_direct_ingredient_g_unit(self):
        """shopping: total_quantity_g = 150 × 1.0 × (10×1.1) = 1650g."""
        items = generate_shopping_list(self.plan)
        assert len(items) == 1
        assert items[0].total_quantity_g == pytest.approx(1650.0, rel=0.01)

    def test_direct_ingredient_portion_unit(self):
        """Direktzutat mit Portionseinheit (Scheibe=35g): shopping = 2×35×1.0×11=770g."""
        mu_scheibe = baker.make(MeasuringUnit, name="Scheibe", unit="g", quantity=1.0)
        ing2 = make_ingredient(name="Brot", energy_kcal=250.0, price_per_kg=3.0)
        make_portion(ingredient=ing2, weight_g=35.0, measuring_unit=mu_scheibe)
        plan2 = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.1)
        import datetime as _dt

        today = _dt.date.today()
        meal2 = make_meal(
            meal_plan=plan2,
            start_datetime=timezone.make_aware(_dt.datetime.combine(today, _dt.time(12, 0))),
        )
        baker.make(
            MealItem,
            meal=meal2,
            ingredient=ing2,
            recipe=None,
            quantity=2,
            measuring_unit=mu_scheibe,
            factor=1.0,
        )
        items = generate_shopping_list(plan2)
        assert len(items) == 1
        assert items[0].total_quantity_g == pytest.approx(770.0, rel=0.01)

    def test_nutrition_and_cost_weight_consistent(self):
        """nutrition und cost verwenden dasselbe Basisgewicht für Direktzutaten."""
        resp_n = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        resp_c = self.client.get(f"/api/meal-plans/{self.plan.id}/costs/")
        assert resp_n.status_code == 200
        assert resp_c.status_code == 200
        dn = resp_n.json()
        dc = resp_c.json()
        # nutrition: 3000 kcal total, cost: 6 EUR
        # Implizit: beide verwenden weight_g=1500g (150×10)
        assert dn["energy_kcal"] == pytest.approx(3000.0, rel=0.01)
        assert float(dc["total_cost"]) == pytest.approx(6.0, rel=0.01)


# ---------------------------------------------------------------------------
# Task 5.2: Rezepte mit portions=0 werden in allen 3 Bereichen geskippt
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPortionsZeroSkip:
    """
    Rezepte mit portions=0 oder portions=None dürfen keinen Beitrag
    zu Nährwerten, Kosten oder Einkaufsmengen leisten.
    """

    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

        self.ingredient = make_ingredient(name="Pasta", energy_kcal=350.0, price_per_kg=2.0)
        self.portion = make_portion(ingredient=self.ingredient, weight_g=100.0)

        # Rezept mit portions=0 (Datenfehler)
        self.recipe_zero = make_recipe(portions=0)
        make_recipe_item(recipe=self.recipe_zero, portion=self.portion, quantity=2.0)

        self.plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.1)
        import datetime as _dt

        today = _dt.date.today()
        self.meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(_dt.datetime.combine(today, _dt.time(12, 0))),
        )
        make_meal_item(meal=self.meal, recipe=self.recipe_zero, factor=1.0)

    def test_nutrition_summary_skips_recipe_with_portions_zero(self):
        """Rezept portions=0 → energy_kcal = 0."""
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["energy_kcal"] == pytest.approx(0.0, abs=0.1)

    def test_cost_summary_skips_recipe_with_portions_zero(self):
        """Rezept portions=0 → total_cost = 0."""
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/costs/")
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["total_cost"]) == pytest.approx(0.0, abs=0.01)

    def test_shopping_skips_recipe_with_portions_zero(self):
        """Rezept portions=0 → keine Zutaten in Einkaufsliste."""
        items = generate_shopping_list(self.plan)
        assert len(items) == 0

    def test_valid_recipe_not_affected(self):
        """Rezept mit portions=1 wird normal berechnet (Kontrolltest)."""
        recipe_ok = make_recipe(portions=1)
        make_recipe_item(recipe=recipe_ok, portion=self.portion, quantity=1.0)
        make_meal_item(meal=self.meal, recipe=recipe_ok, factor=1.0)

        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert resp.status_code == 200
        data = resp.json()
        # 100g × (350/100) × 10 = 3500 kcal
        assert data["energy_kcal"] == pytest.approx(3500.0, rel=0.01)


# ---------------------------------------------------------------------------
# Task 5.3: Kein N+1 in nutrition_summary bei Direktzutaten
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNutritionSummaryNoNPlusOne:
    """
    Mit 5 Direktzutaten darf die Anzahl der DB-Queries nicht
    proportional zur Zutatenanzahl steigen (kein N+1).
    """

    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

        self.mu_g = baker.make(MeasuringUnit, name="g", unit="g", quantity=1.0)
        self.plan = make_meal_plan(created_by=self.user, norm_portions=5, reserve_factor=1.0)
        import datetime as _dt

        today = _dt.date.today()
        self.meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(_dt.datetime.combine(today, _dt.time(12, 0))),
        )
        # 5 verschiedene Direktzutaten
        for i in range(5):
            ing = make_ingredient(name=f"Zutat {i}", energy_kcal=100.0)
            baker.make(
                MealItem,
                meal=self.meal,
                ingredient=ing,
                recipe=None,
                quantity=50,
                measuring_unit=self.mu_g,
                factor=1.0,
            )

    def test_query_count_constant_with_multiple_direct_ingredients(self):
        """Queryanzahl bei 5 Direktzutaten soll unter einem Schwellwert bleiben."""
        from django.db import connection, reset_queries
        from django.test.utils import override_settings

        with override_settings(DEBUG=True):
            reset_queries()
            resp = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
            query_count = len(connection.queries)

        assert resp.status_code == 200
        # Mit Prefetch: maximal ~10 Queries für 5 Zutaten (kein N+1)
        # Ohne Prefetch: ~5×2 extra Queries = ~15+ total
        assert query_count < 15, f"Zu viele DB-Queries ({query_count}): Prefetch für ingredient__portions fehlt?"


# ---------------------------------------------------------------------------
# Task 5.4: cost_summary Direktzutat-Konsistenz (ml + density)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCostSummaryDirectIngredientConsistency:
    """
    Direktzutaten mit ml-Einheit + density müssen in cost_summary
    dasselbe Gewicht verwenden wie nutrition_summary.
    """

    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)

        self.mu_ml = baker.make(MeasuringUnit, name="ml", unit="ml", quantity=1.0)
        # Olivenöl: physical_density=0.92 g/ml, 200 kcal/100g, 4€/kg
        self.ingredient = make_ingredient(
            name="Olivenöl",
            energy_kcal=200.0,
            protein_g=0.0,
            fat_g=22.0,
            carbohydrate_g=0.0,
            sugar_g=0.0,
            fibre_g=0.0,
            salt_g=0.0,
            price_per_kg=4.0,
            physical_density=0.92,
        )
        self.plan = make_meal_plan(created_by=self.user, norm_portions=10, reserve_factor=1.1)
        import datetime as _dt

        today = _dt.date.today()
        self.meal = make_meal(
            meal_plan=self.plan,
            meal_type=MealTypeChoices.LUNCH,
            start_datetime=timezone.make_aware(_dt.datetime.combine(today, _dt.time(12, 0))),
        )
        # 100ml Olivenöl pro Person
        baker.make(
            MealItem,
            meal=self.meal,
            ingredient=self.ingredient,
            recipe=None,
            quantity=100,
            measuring_unit=self.mu_ml,
            factor=1.0,
        )

    def test_nutrition_uses_density(self):
        """nutrition: weight = 100ml × 0.92 = 92g; energy = (200/100)×92×10 = 1840 kcal."""
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["energy_kcal"] == pytest.approx(1840.0, rel=0.01)

    def test_cost_uses_density(self):
        """cost: weight = 92g × 10 = 920g; price = 4.00/1000 × 920 = 3.68 EUR."""
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/costs/")
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["total_cost"]) == pytest.approx(3.68, rel=0.01)

    def test_nutrition_and_cost_weight_consistent_ml(self):
        """nutrition und cost stimmen bei ml+density überein (gleicher Berechnungspfad)."""
        resp_n = self.client.get(f"/api/meal-plans/{self.plan.id}/nutrition-summary/")
        resp_c = self.client.get(f"/api/meal-plans/{self.plan.id}/costs/")
        assert resp_n.status_code == 200
        assert resp_c.status_code == 200
        dn = resp_n.json()
        dc = resp_c.json()
        # Beide müssen konsistent sein: 1840 kcal entspricht 920g, 3.68 EUR
        assert dn["energy_kcal"] == pytest.approx(1840.0, rel=0.01)
        assert float(dc["total_cost"]) == pytest.approx(3.68, rel=0.01)
