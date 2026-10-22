"""Regression tests for the WP-02 quantity integrity review findings.

Each test reproduces a confirmed bug: portion/standard-measure MealItems counted
as 0 g, forks dropping direct ingredients and steps, shopping lists from recipes
losing direct-gram items, step ingredients showing the wrong unit, the ingredient
review applying a rank-2 match to the rank-1 portion and the PDF formatting
portion items differently from the UI.
"""

import json
from contextlib import ExitStack
from unittest.mock import patch

import pytest

from planner.models import MealItem, MealTypeChoices
from planner.tests import make_meal, make_meal_plan
from recipe.models import RecipeItem, RecipeItemExchangeGroup, RecipeStep, RecipeStepIngredient
from recipe.tests import make_recipe
from shopping.tests.trip_helpers import recipe_body
from supply.tests import make_ingredient, make_measuring_unit, make_portion

# ---------------------------------------------------------------------------
# Nutrition aggregation: portion and standard-measure MealItems
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_aggregate_meal_values_counts_portion_meal_item_weight():
    from recipe.services.nutrition_aggregation import _aggregate_meal_values

    meal = make_meal(meal_plan=make_meal_plan(), meal_type=MealTypeChoices.DINNER)
    toast = make_ingredient(name="Toastbrot Regression", energy_kcal=260)
    slice_portion = make_portion(toast, name="Scheibe", quantity=1.0, weight_g=30.0, rank=1, weight_status="confirmed")
    MealItem.objects.create(meal=meal, ingredient=toast, quantity=2, portion=slice_portion)

    values = _aggregate_meal_values(meal)

    assert values["weight_g"] == pytest.approx(60.0)
    assert values["energy_kcal"] == pytest.approx(156.0)


@pytest.mark.django_db
def test_aggregate_meal_values_counts_standard_measure_meal_item_weight():
    from recipe.services.nutrition_aggregation import _aggregate_meal_values
    from supply.services.quantity_units import standard_measure_grams

    meal = make_meal(meal_plan=make_meal_plan(), meal_type=MealTypeChoices.LUNCH)
    oil = make_ingredient(name="Olivenöl Regression", energy_kcal=884, physical_density=0.92)
    MealItem.objects.create(meal=meal, ingredient=oil, quantity=1, standard_measure_key="el")

    values = _aggregate_meal_values(meal)

    grams, _approx = standard_measure_grams(oil, "el")
    assert grams > 0
    assert values["weight_g"] == pytest.approx(grams)
    assert values["energy_kcal"] == pytest.approx(884 * grams / 100)


# ---------------------------------------------------------------------------
# Recipe fork: direct ingredient and preparation steps
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_fork_keeps_direct_gram_ingredient(auth_client):
    recipe = make_recipe(title="Fork Direktgramm")
    rice = make_ingredient(name="Reis Fork")
    RecipeItem.objects.create(recipe=recipe, ingredient=rice, portion=None, quantity=250)

    resp = auth_client.post(f"/api/recipes/{recipe.id}/fork/", data=json.dumps({}), content_type="application/json")

    assert resp.status_code == 200, resp.content[:500]
    items = list(
        RecipeItem.objects.filter(recipe_id=resp.json()["id"]).values("ingredient_id", "portion_id", "quantity")
    )
    assert items == [{"ingredient_id": rice.id, "portion_id": None, "quantity": 250}]


@pytest.mark.django_db
def test_fork_copies_steps_with_remapped_step_ingredients(auth_client):
    recipe = make_recipe(title="Fork Schritte")
    egg = make_ingredient(name="Ei Fork")
    piece = make_portion(egg, name="Stück", quantity=1.0, weight_g=60.0, rank=1, weight_status="confirmed")
    egg_item = RecipeItem.objects.create(recipe=recipe, portion=piece, quantity=2)
    rice = make_ingredient(name="Reis Fork Schritte")
    rice_item = RecipeItem.objects.create(recipe=recipe, ingredient=rice, portion=None, quantity=200)
    first = RecipeStep.objects.create(
        recipe=recipe, sort_order=0, instruction=f"{{{rice_item.id}}} kochen", duration_minutes=15, section="Kochen"
    )
    second = RecipeStep.objects.create(recipe=recipe, sort_order=1, instruction="Eier unterheben")
    RecipeStepIngredient.objects.create(step=first, recipe_item=rice_item, quantity_modifier=1.0)
    RecipeStepIngredient.objects.create(
        step=second, recipe_item=egg_item, quantity_modifier=0.5, preparation="verquirlt", sort_order=1
    )

    resp = auth_client.post(f"/api/recipes/{recipe.id}/fork/", data=json.dumps({}), content_type="application/json")

    assert resp.status_code == 200, resp.content[:500]
    fork_id = resp.json()["id"]
    fork_items = {
        item.ingredient_id or item.portion.ingredient_id: item for item in RecipeItem.objects.filter(recipe_id=fork_id)
    }
    fork_rice = fork_items[rice.id]
    fork_egg = fork_items[egg.id]
    steps = list(RecipeStep.objects.filter(recipe_id=fork_id).order_by("sort_order"))
    assert [(s.sort_order, s.duration_minutes, s.section) for s in steps] == [(0, 15, "Kochen"), (1, None, "")]
    assert steps[0].instruction == f"{{{fork_rice.id}}} kochen"
    assert [(si.recipe_item_id, si.quantity_modifier) for si in steps[0].step_ingredients.all()] == [
        (fork_rice.id, 1.0)
    ]
    assert [
        (si.recipe_item_id, si.quantity_modifier, si.preparation, si.sort_order)
        for si in steps[1].step_ingredients.all()
    ] == [(fork_egg.id, 0.5, "verquirlt", 1)]
    # The original keeps its own steps and links.
    assert RecipeStepIngredient.objects.filter(step__recipe=recipe).count() == 2
    assert resp.json()["steps"][1]["step_ingredients"][0]["ingredient_name"] == "Ei Fork"


# ---------------------------------------------------------------------------
# Shopping list from a recipe: direct-gram items and inactive alternatives
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_shopping_list_from_recipe_includes_direct_gram_ingredient(auth_client):
    recipe = make_recipe(title="Einkauf Direktgramm", portions=1)
    noodles = make_ingredient(name="Nudeln Einkauf")
    RecipeItem.objects.create(recipe=recipe, ingredient=noodles, portion=None, quantity=125)

    resp = auth_client.post(
        f"/api/shopping-lists/from-recipe/{recipe.id}/",
        data=recipe_body(auth_client._user, portions=4),
        content_type="application/json",
    )

    assert resp.status_code == 200, resp.content[:500]
    items = resp.json()["items"]
    assert [(i["name"], i["ingredient_id"], i["quantity_g"], i["unit"]) for i in items] == [
        ("Nudeln Einkauf", noodles.id, 500.0, "g")
    ]


@pytest.mark.django_db
def test_shopping_list_from_recipe_skips_inactive_direct_gram_alternative(auth_client):
    recipe = make_recipe(title="Einkauf Alternativen", portions=1)
    group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name="Getreide")
    oats = make_ingredient(name="Hafer Einkauf")
    millet = make_ingredient(name="Hirse Einkauf")
    RecipeItem.objects.create(recipe=recipe, ingredient=oats, quantity=50, exchange_group=group, exchange_position=0)
    RecipeItem.objects.create(recipe=recipe, ingredient=millet, quantity=50, exchange_group=group, exchange_position=1)

    resp = auth_client.post(
        f"/api/shopping-lists/from-recipe/{recipe.id}/",
        data=recipe_body(auth_client._user, portions=2),
        content_type="application/json",
    )

    assert resp.status_code == 200, resp.content[:500]
    assert [(i["name"], i["quantity_g"]) for i in resp.json()["items"]] == [("Hafer Einkauf", 100.0)]


# ---------------------------------------------------------------------------
# Step ingredients: unit and name of portion and direct-gram items
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_step_ingredient_out_uses_portion_name_and_direct_gram_ingredient():
    from recipe.schemas.steps import RecipeStepIngredientOut

    recipe = make_recipe(title="Schritt-Zutaten")
    gram = make_measuring_unit(name="Gramm", unit="g", quantity=1.0)
    soy = make_ingredient(name="Sojagranulat Schritt")
    portion = make_portion(soy, name="Portion", quantity=1.0, weight_g=50.0, rank=1, measuring_unit=gram)
    portion_item = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=0.35)
    rice = make_ingredient(name="Reis Schritt")
    direct_item = RecipeItem.objects.create(recipe=recipe, ingredient=rice, portion=None, quantity=200)
    step = RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Kochen")
    portion_link = RecipeStepIngredient.objects.create(step=step, recipe_item=portion_item)
    direct_link = RecipeStepIngredient.objects.create(step=step, recipe_item=direct_item, quantity_modifier=0.5)

    portion_out = RecipeStepIngredientOut.from_orm(portion_link).model_dump()
    direct_out = RecipeStepIngredientOut.from_orm(direct_link).model_dump()

    assert portion_out["ingredient_name"] == "Sojagranulat Schritt"
    assert portion_out["portion_name"] == "Portion"
    assert portion_out["unit_short"] == "Portion"
    assert portion_out["quantity"] == pytest.approx(0.35)
    assert portion_out["weight_g"] == pytest.approx(17.5)
    assert direct_out["ingredient_name"] == "Reis Schritt"
    assert direct_out["ingredient_id"] == rice.id
    assert direct_out["portion_name"] is None
    assert direct_out["unit_short"] == "g"
    assert direct_out["quantity"] == pytest.approx(100.0)
    assert direct_out["weight_g"] == pytest.approx(100.0)
    assert direct_out["ingredient_viscosity"] == rice.physical_viscosity


@pytest.mark.django_db
def test_step_ingredient_schema_exposes_beverage_viscosity_and_density():
    """The step chips need the ingredient list's ml rule: viscosity "beverage" with a density."""
    from recipe.schemas.steps import RecipeStepIngredientOut

    recipe = make_recipe(title="Schritt-Getränk")
    milk = make_ingredient(name="Milch Schritt", physical_viscosity="beverage", physical_density=1.03)
    item = RecipeItem.objects.create(recipe=recipe, ingredient=milk, portion=None, quantity=206)
    step = RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Aufkochen")
    link = RecipeStepIngredient.objects.create(step=step, recipe_item=item)

    out = RecipeStepIngredientOut.from_orm(link).model_dump()

    assert (out["ingredient_viscosity"], out["ingredient_density"]) == ("beverage", pytest.approx(1.03))


@pytest.mark.django_db
def test_recipe_detail_steps_resolve_direct_gram_ingredient(api_client):
    recipe = make_recipe(title="Schritt-Detail")
    rice = make_ingredient(name="Reis Detail")
    direct_item = RecipeItem.objects.create(recipe=recipe, ingredient=rice, portion=None, quantity=80)
    step = RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Reis kochen")
    RecipeStepIngredient.objects.create(step=step, recipe_item=direct_item)

    resp = api_client.get(f"/api/recipes/{recipe.id}/")

    assert resp.status_code == 200, resp.content[:500]
    step_ingredient = resp.json()["steps"][0]["step_ingredients"][0]
    assert (step_ingredient["ingredient_name"], step_ingredient["unit_short"], step_ingredient["quantity"]) == (
        "Reis Detail",
        "g",
        80.0,
    )


# ---------------------------------------------------------------------------
# Ingredient review: a direct portion match selects that portion
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_review_selects_directly_matched_rank2_portion(gemini_unavailable, django_user_model):
    from recipe.schemas.ingredient_review import RecipeImportSourceIn
    from recipe.services.import_service import ImportedIngredient, ImportedRecipe
    from recipe.services.ingredient_review_service import preview_recipe_ingredients
    from recipe.services.url_import_service import GeminiIngredientMatch, GeminiRecipeExtraction

    user = django_user_model.objects.create_user(username="review-rank", password="x")
    gram = make_measuring_unit(name="Gramm", unit="g", quantity=1.0)
    oil = make_ingredient(name="Olivenöl Review", physical_density=0.92)
    make_portion(
        oil, name="Flasche", quantity=1.0, weight_g=500.0, rank=1, weight_status="confirmed", measuring_unit=gram
    )
    spoon = make_portion(
        oil, name="Esslöffel", quantity=1.0, weight_g=13.8, rank=2, weight_status="confirmed", measuring_unit=gram
    )
    extraction = GeminiRecipeExtraction(
        title="Salat",
        description="",
        summary="",
        servings=1,
        recipe_type="warm_meal",
        difficulty="easy",
        steps=["Mischen."],
        ingredients=[GeminiIngredientMatch(original_name="Olivenöl Review", quantity=2, unit="EL")],
    )
    parsed = ImportedRecipe(
        title="Salat",
        servings=1,
        ingredients=[ImportedIngredient(name="2 EL Olivenöl Review", quantity="2", unit="EL")],
        steps=["Mischen."],
    )

    with ExitStack() as stack:
        stack.enter_context(
            patch(
                "recipe.services.url_import_service.extract_smart_recipe_input",
                return_value=("text", parsed, extraction),
            )
        )
        result = preview_recipe_ingredients([RecipeImportSourceIn(type="text", value="Rezepttext")], user)

    row = result.rows[0]
    assert row.selected_ingredient_id == oil.id
    assert row.selected_portion is not None
    assert row.selected_portion.id == spoon.id
    assert row.suggested_portion is not None
    assert row.suggested_portion.id == spoon.id
    assert row.quantity == 2.0
    # 2 × 13,8 g instead of 2 × 500 g.
    assert row.quantity * (row.selected_portion.weight_g or 0) == pytest.approx(27.6)


@pytest.mark.django_db
def test_convert_to_portion_returns_matched_portion():
    from recipe.services.unit_gram_conversion import UnitGramConverter

    oil = make_ingredient(name="Olivenöl Umrechnung", physical_density=0.92)
    bottle = make_portion(oil, name="Flasche", quantity=1.0, weight_g=500.0, rank=1, weight_status="confirmed")
    spoon = make_portion(oil, name="Esslöffel", quantity=1.0, weight_g=13.8, rank=2, weight_status="confirmed")

    by_unit = UnitGramConverter.convert_to_portion(2.0, "EL", oil, allow_ai_estimate=False)
    by_grams = UnitGramConverter.convert_to_portion(1000.0, "g", oil, allow_ai_estimate=False)

    assert by_unit is not None and (by_unit.count, by_unit.portion.id) == (2.0, spoon.id)
    assert by_grams is not None and (by_grams.count, by_grams.portion.id) == (2.0, bottle.id)


# ---------------------------------------------------------------------------
# Meal plan PDF: portion items use the shared amount text
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_pdf_formats_portion_meal_item_with_shared_amount_text():
    from planner.services.pdf_export import _build_item_data
    from supply.services.quantity_units import GramResult, UnitInfo, format_amount

    plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
    toast = make_ingredient(name="Toastbrot PDF")
    slice_portion = make_portion(toast, name="Scheibe", quantity=1.0, weight_g=30.0, rank=1, weight_status="confirmed")
    meal = make_meal(meal_plan=plan)
    item = MealItem.objects.create(meal=meal, ingredient=toast, quantity=2, portion=slice_portion, factor=1.0)

    data = _build_item_data(item, portions=10, reserve_factor=1.0, overrides={})

    total = format_amount(quantity=20, unit=UnitInfo("portion", "Scheibe"), result=GramResult(600.0, False, False))
    per_person = format_amount(quantity=2, unit=UnitInfo("portion", "Scheibe"), result=GramResult(60.0, False, False))
    assert (total, per_person) == ("20 Scheibe (600 g)", "2 Scheibe (60 g)")
    assert data["ingredients"][0] == f"Toastbrot PDF — {total} · à {per_person} p. P."
