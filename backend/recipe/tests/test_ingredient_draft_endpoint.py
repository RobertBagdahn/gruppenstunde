"""'Zutat anlegen' draft for an open review row: nothing is saved, duplicates are offered."""

import json
from unittest.mock import patch

import pytest
from django.test import Client

from recipe.services.ingredient_review_service import new_ingredient_draft
from supply.models import Ingredient
from supply.tests import make_ingredient

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("gemini_unavailable")]

URL = "/api/recipes/ingredient-review/new-ingredient-draft/"


@pytest.fixture
def cook(django_user_model):
    return django_user_model.objects.create_user(username="cook", password="x")


def test_anonymous_request_is_rejected():
    response = Client().post(URL, data=json.dumps({"source_text": "Ingwer"}), content_type="application/json")

    assert response.status_code == 401


def test_draft_uses_the_normalized_name_and_converts_the_amount(cook):
    with patch("recipe.services.ingredient_review_service._temporary_draft") as draft_mock:
        from recipe.schemas.ingredient_review import ReviewPortionOut, TemporaryIngredientDraftOut

        draft_mock.return_value = TemporaryIngredientDraftOut(
            name="Ingwer",
            portions=[
                ReviewPortionOut(name="Stück", quantity=1, weight_g=10, measuring_unit_name="Stück", is_new=True)
            ],
        )
        result = new_ingredient_draft("Frischer Ingwer: ca. 60–80 g", None, "", cook)

    draft_mock.assert_called_once()
    assert draft_mock.call_args.args[0] == "Ingwer"
    assert result.draft.quantity == pytest.approx(7)
    assert result.is_enriched is True


def test_missing_enrichment_still_returns_a_draft(cook):
    with patch("recipe.services.ingredient_review_service._temporary_draft") as draft_mock:
        from recipe.schemas.ingredient_review import TemporaryIngredientDraftOut

        draft_mock.return_value = TemporaryIngredientDraftOut(name="Ingwer")
        result = new_ingredient_draft("Ingwer", 2, "EL", cook)

    assert result.is_enriched is False
    assert result.draft.portions[0].name == "g"
    assert result.draft.quantity == pytest.approx(30)


def test_existing_similar_ingredient_is_offered_as_duplicate(cook):
    ginger = make_ingredient(name="Ingwer", usage_count=9)
    with patch("recipe.services.ingredient_review_service._temporary_draft") as draft_mock:
        from recipe.schemas.ingredient_review import TemporaryIngredientDraftOut

        draft_mock.return_value = TemporaryIngredientDraftOut(name="Ingwer")
        result = new_ingredient_draft("Frischer Ingwer", None, "", cook)

    assert [duplicate.id for duplicate in result.duplicates] == [ginger.id]


def test_nothing_is_persisted(cook):
    before = Ingredient.objects.count()
    with patch("recipe.services.ingredient_review_service._temporary_draft") as draft_mock:
        from recipe.schemas.ingredient_review import TemporaryIngredientDraftOut

        draft_mock.return_value = TemporaryIngredientDraftOut(name="Neuling")
        new_ingredient_draft("Neuling", None, "", cook)

    assert Ingredient.objects.count() == before
