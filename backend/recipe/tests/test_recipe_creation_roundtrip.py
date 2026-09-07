"""Regression tests for recipe creation and persistence round trips."""

import json
from unittest.mock import MagicMock, patch

import pytest

from recipe.models import RecipeItem, RecipeStep
from recipe.services.import_service import ImportedIngredient, ImportedRecipe
from recipe.services.ingredient_matcher import MatchResult
from recipe.services.recipe_ai_suggest_service import RecipeAiCreateSchema, RecipeItemSuggestion, ai_create_recipe
from recipe.services.url_import_service import GeminiRecipeExtraction, import_recipe_from_url
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
def test_url_import_uses_structured_ingredients_when_gemini_returns_none(auth_client):
    ingredient = make_ingredient(name="Weizenmehl")
    unit = make_measuring_unit(name="Gramm", unit="g")
    portion = make_portion(ingredient=ingredient, measuring_unit=unit, name="Gramm", quantity=1, weight_g=1)
    parsed = ImportedRecipe(
        title="Pfannkuchen",
        servings=4,
        ingredients=[ImportedIngredient(name="Weizenmehl", quantity="500", unit="g")],
        steps=["Teig verrühren."],
        source_url="https://www.chefkoch.de/rezepte/test",
    )
    gemini_result = GeminiRecipeExtraction(
        title="",
        description="",
        servings=4,
        ingredients=[],
        steps=[],
    )

    with (
        patch("recipe.services.import_service.import_from_url", return_value=parsed),
        patch("recipe.services.url_import_service._call_gemini_for_metadata", return_value=gemini_result),
        patch(
            "recipe.services.ingredient_matcher.IngredientMatcher.match",
            return_value=MatchResult(
                ingredient_id=ingredient.id,
                name=ingredient.name,
                confidence=1.0,
                note="",
            ),
        ),
    ):
        result = import_recipe_from_url(parsed.source_url, auth_client._user)

    assert result.title == "Pfannkuchen"
    assert result.servings == 4
    assert result.steps == ["Teig verrühren."]
    assert len(result.recipe_items) == 1
    assert result.recipe_items[0].ingredient_id == ingredient.id
    assert result.recipe_items[0].measuring_unit_id is not None
    assert result.recipe_items[0].measuring_unit_name == "Gramm"
    assert result.recipe_items[0].quantity == 500


@pytest.mark.django_db
def test_repeated_identical_recipe_item_create_does_not_duplicate(auth_client):
    recipe = make_recipe(owner=auth_client._user, status="draft", portions=1)
    ingredient = make_ingredient(name="Tomaten")
    portion = make_portion(ingredient=ingredient, name="Gramm", quantity=1, weight_g=1)
    payload = {
        "portion_id": portion.id,
        "quantity": 250,
        "sort_order": 0,
        "note": "",
        "is_optional": False,
        "idempotency_key": "save-1-item-1",
    }

    first = auth_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    second = auth_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/",
        data=json.dumps(payload),
        content_type="application/json",
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    assert first.json()["idempotency_key"] == "save-1-item-1"
    assert RecipeItem.objects.filter(recipe=recipe).count() == 1


@pytest.mark.django_db
def test_reused_idempotency_key_with_different_payload_returns_409(auth_client):
    recipe = make_recipe(owner=auth_client._user, status="draft", portions=1)
    ingredient = make_ingredient(name="Tomaten")
    portion = make_portion(ingredient=ingredient, name="Gramm", quantity=1, weight_g=1)
    base_payload = {
        "portion_id": portion.id,
        "quantity": 250,
        "sort_order": 0,
        "note": "",
        "is_optional": False,
        "idempotency_key": "reused-key-1",
    }

    first = auth_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/",
        data=json.dumps(base_payload),
        content_type="application/json",
    )
    assert first.status_code == 200

    conflicting = auth_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/",
        data=json.dumps({**base_payload, "quantity": 999}),
        content_type="application/json",
    )
    assert conflicting.status_code == 409
    assert "Idempotency-Key" in conflicting.json().get("detail", "")
    item = RecipeItem.objects.get(recipe=recipe)
    assert item.quantity == 250


@pytest.mark.django_db
def test_failed_keyed_create_can_be_retried_with_same_key(auth_client):
    recipe = make_recipe(owner=auth_client._user, status="draft", portions=1)
    ingredient = make_ingredient(name="Tomaten")
    portion = make_portion(ingredient=ingredient, name="Gramm", quantity=1, weight_g=1)
    key = "retry-key-after-fail"

    failed = auth_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/",
        data=json.dumps(
            {
                "portion_id": 999999,
                "quantity": 250,
                "sort_order": 0,
                "note": "",
                "is_optional": False,
                "idempotency_key": key,
            }
        ),
        content_type="application/json",
    )
    assert failed.status_code in {400, 404, 500}
    assert RecipeItem.objects.filter(recipe=recipe).count() == 0

    success = auth_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/",
        data=json.dumps(
            {
                "portion_id": portion.id,
                "quantity": 250,
                "sort_order": 0,
                "note": "",
                "is_optional": False,
                "idempotency_key": key,
            }
        ),
        content_type="application/json",
    )
    assert success.status_code == 200
    assert RecipeItem.objects.filter(recipe=recipe).count() == 1


@pytest.mark.django_db
def test_request_id_allows_two_identical_legitimate_items_with_different_keys(auth_client):
    recipe = make_recipe(owner=auth_client._user, status="draft", portions=1)
    ingredient = make_ingredient(name="Zucker")
    portion = make_portion(ingredient=ingredient, name="Gramm", quantity=1, weight_g=1)
    payload = {
        "portion_id": portion.id,
        "quantity": 10,
        "sort_order": 0,
        "note": "",
        "is_optional": False,
    }

    first = auth_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/",
        data=json.dumps({**payload, "client_request_id": "save-a"}),
        content_type="application/json",
    )
    second = auth_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/",
        data=json.dumps({**payload, "client_request_id": "save-b"}),
        content_type="application/json",
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["id"] != second.json()["id"]
    assert RecipeItem.objects.filter(recipe=recipe).count() == 2


@pytest.mark.django_db
def test_recipe_item_replacement_is_atomic_and_does_not_accumulate_rows(auth_client):
    recipe = make_recipe(owner=auth_client._user, status="draft", portions=1)
    first_ingredient = make_ingredient(name="Tomaten")
    second_ingredient = make_ingredient(name="Zwiebeln")
    first_portion = make_portion(ingredient=first_ingredient, name="Gramm", quantity=1, weight_g=1)
    second_portion = make_portion(ingredient=second_ingredient, name="Gramm", quantity=1, weight_g=1)
    make_recipe_item(recipe=recipe, portion=first_portion, quantity=100, sort_order=0)

    payload = {
        "recipe_items": [
            {"portion_id": first_portion.id, "quantity": 200, "sort_order": 0, "note": "", "is_optional": False},
            {"portion_id": second_portion.id, "quantity": 50, "sort_order": 1, "note": "", "is_optional": False},
        ]
    }
    first = auth_client.patch(
        f"/api/recipes/{recipe.id}/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    second = auth_client.patch(
        f"/api/recipes/{recipe.id}/",
        data=json.dumps(payload),
        content_type="application/json",
    )

    assert first.status_code == 200
    assert second.status_code == 200
    items = list(RecipeItem.objects.filter(recipe=recipe).order_by("sort_order"))
    assert [(item.portion_id, item.quantity) for item in items] == [
        (first_portion.id, 200),
        (second_portion.id, 50),
    ]

    failed = auth_client.patch(
        f"/api/recipes/{recipe.id}/",
        data=json.dumps(
            {
                "recipe_items": [
                    {
                        "portion_id": first_portion.id,
                        "quantity": 999,
                        "sort_order": 0,
                        "note": "",
                        "is_optional": False,
                    },
                    {"portion_id": 999999, "quantity": 1, "sort_order": 1, "note": "", "is_optional": False},
                ]
            }
        ),
        content_type="application/json",
    )

    assert failed.status_code in {400, 404, 500}
    items = list(RecipeItem.objects.filter(recipe=recipe).order_by("sort_order"))
    assert [(item.portion_id, item.quantity) for item in items] == [
        (first_portion.id, 200),
        (second_portion.id, 50),
    ]


@pytest.mark.django_db
def test_step_batch_round_trip_and_invalid_reference_is_atomic(auth_client):
    recipe = make_recipe(owner=auth_client._user, status="draft", portions=1)
    ingredient = make_ingredient(name="Mehl")
    portion = make_portion(ingredient=ingredient, name="Gramm", quantity=1, weight_g=1)
    item = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=100, sort_order=0)

    valid_payload = {
        "recipe_slug": recipe.slug,
        "steps": [
            {
                "sort_order": 0,
                "instruction": "Manuell angepasster Schritt.",
                "duration_minutes": None,
                "section": "",
                "step_ingredients": [
                    {
                        "recipe_item_id": item.id,
                        "quantity_modifier": 1,
                        "preparation": "",
                        "sort_order": 0,
                    }
                ],
            }
        ],
    }
    response = auth_client.put(
        f"/api/recipes/{recipe.slug}/steps/batch",
        data=json.dumps(valid_payload),
        content_type="application/json",
    )
    assert response.status_code == 200
    assert list(RecipeStep.objects.filter(recipe=recipe).values_list("instruction", flat=True)) == [
        "Manuell angepasster Schritt."
    ]

    invalid_payload = {
        **valid_payload,
        "steps": [
            {
                **valid_payload["steps"][0],
                "instruction": "Soll nicht gespeichert werden.",
                "step_ingredients": [
                    {
                        **valid_payload["steps"][0]["step_ingredients"][0],
                        "recipe_item_id": 999999,
                    }
                ],
            }
        ],
    }
    failed = auth_client.put(
        f"/api/recipes/{recipe.slug}/steps/batch",
        data=json.dumps(invalid_payload),
        content_type="application/json",
    )

    assert failed.status_code == 400
    assert list(RecipeStep.objects.filter(recipe=recipe).values_list("instruction", flat=True)) == [
        "Manuell angepasster Schritt."
    ]


@pytest.mark.django_db
def test_ai_created_draft_retains_items_and_is_owned_by_user(auth_client):
    data = RecipeAiCreateSchema(
        title="KI-Pfanne",
        description="Eine schnelle Pfanne.",
        difficulty="easy",
        duration_minutes=20,
        portions=4,
        recipe_type="warm_meal",
        items=[RecipeItemSuggestion(ingredient_name="Kartoffeln", quantity=400, unit="g")],
    )
    response = MagicMock()
    response.text = data.model_dump_json()
    ingredient = make_ingredient(name="Kartoffeln")
    portion = make_portion(ingredient=ingredient, name="Gramm", quantity=1, weight_g=1)

    with (
        patch("recipe.services.recipe_ai_suggest_service.gemini_call", return_value=(response, "interaction")),
        patch(
            "recipe.services.ingredient_matcher.IngredientMatcher.match",
            return_value=MatchResult(ingredient_id=ingredient.id, name=ingredient.name, confidence=1.0),
        ),
        patch("recipe.services.recipe_ai_suggest_service._match_measuring_unit", return_value=portion.measuring_unit),
        patch("recipe.services.recipe_ai_suggest_service._resolve_or_create_portion", return_value=portion),
    ):
        recipe = ai_create_recipe("Kartoffelpfanne", auth_client._user)

    assert recipe.owner_id == auth_client._user.id
    assert recipe.status == "draft"
    assert recipe.recipe_items.count() == 1
    assert recipe.recipe_items.first().quantity == 100
    assert recipe.input_servings == 4


@pytest.mark.django_db
def test_url_created_draft_retains_source_metadata_items_and_steps(auth_client):
    ingredient = make_ingredient(name="Mehl")
    portion = make_portion(ingredient=ingredient, name="Gramm", quantity=1, weight_g=1)
    recipe_response = auth_client.post(
        "/api/recipes/",
        data=json.dumps(
            {
                "title": "Importierter Draft",
                "description": "Importbeschreibung",
                "recipe_type": "warm_meal",
                "source_url": "https://www.chefkoch.de/rezepte/test",
                "recipe_items": [
                    {
                        "portion_id": portion.id,
                        "quantity": 125,
                        "sort_order": 0,
                        "note": "",
                        "is_optional": False,
                    }
                ],
            }
        ),
        content_type="application/json",
    )
    assert recipe_response.status_code == 200
    recipe_data = recipe_response.json()

    step_response = auth_client.put(
        f"/api/recipes/{recipe_data['slug']}/steps/batch",
        data=json.dumps(
            {
                "recipe_slug": recipe_data["slug"],
                "steps": [
                    {
                        "sort_order": 0,
                        "instruction": "Importierten Schritt manuell angepasst.",
                        "duration_minutes": None,
                        "section": "",
                        "step_ingredients": [],
                    }
                ],
            }
        ),
        content_type="application/json",
    )
    detail_response = auth_client.get(f"/api/recipes/{recipe_data['id']}/")

    assert step_response.status_code == 200
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["source_url"] == "https://www.chefkoch.de/rezepte/test"
    assert detail["description"] == "Importbeschreibung"
    assert detail["recipe_items"][0]["quantity"] == 125
    assert detail["steps"][0]["instruction"] == "Importierten Schritt manuell angepasst."
