"""Tests for the review preview service — candidates, quantities, drafts."""

from contextlib import ExitStack
from unittest.mock import patch

import pytest

from recipe.schemas.ingredient_review import RecipeImportSourceIn
from recipe.services.import_service import ImportedIngredient, ImportedRecipe
from recipe.services.ingredient_review_service import preview_recipe_ingredients
from recipe.services.url_import_service import GeminiIngredientMatch, GeminiRecipeExtraction
from supply.tests import make_ingredient, make_portion

# Gemini fallbacks (parser, enrichment, embeddings) are incidental here; keep them offline.
pytestmark = pytest.mark.usefixtures("gemini_unavailable")

EXTRACT_TARGET = "recipe.services.url_import_service.extract_smart_recipe_input"
METADATA_TARGET = "recipe.services.ingredient_review_service._metadata_for_source"
ENRICH_TARGET = "recipe.services.ingredient_enrichment.enrich_ingredient"


def _extraction(ingredients: list[GeminiIngredientMatch]) -> GeminiRecipeExtraction:
    return GeminiRecipeExtraction(
        title="Gruselbowle",
        description="",
        summary="",
        servings=8,
        recipe_type="warm_meal",
        difficulty="easy",
        steps=["Alles mischen."],
        ingredients=ingredients,
    )


def _parsed_recipe(ingredients: list[ImportedIngredient]) -> ImportedRecipe:
    return ImportedRecipe(
        title="Gruselbowle",
        servings=8,
        ingredients=ingredients,
        steps=["Alles mischen."],
    )


def _preview(extraction, parsed_ingredients, user):
    with ExitStack() as stack:
        stack.enter_context(
            patch(
                EXTRACT_TARGET,
                return_value=("text", _parsed_recipe(parsed_ingredients), extraction),
            )
        )
        return preview_recipe_ingredients([RecipeImportSourceIn(type="text", value="Rezepttext")], user)


@pytest.mark.django_db
class TestReviewCandidatesAndQuantities:
    def test_confident_match_row_carries_candidates_with_slug(self, django_user_model):
        user = django_user_model.objects.create_user(username="r1", password="x")
        ing = make_ingredient(name="Orangensaft")
        make_portion(ing, name="Portion", quantity=1.0, weight_g=200.0, rank=1)

        extraction = _extraction([GeminiIngredientMatch(original_name="Orangensaft", quantity=1, unit="Liter")])
        result = _preview(
            extraction, [ImportedIngredient(name="1 Liter Orangensaft", quantity="1", unit="Liter")], user
        )

        row = result.rows[0]
        assert row.selected_ingredient_id == ing.id
        assert row.candidates
        assert all(c.slug for c in row.candidates)
        assert row.suggested_quantity == 5.0
        assert row.quantity == 5.0

    def test_grey_zone_row_suggests_quantity_via_top_candidate(self, django_user_model):
        user = django_user_model.objects.create_user(username="r2", password="x")
        # "Ananas" is the top candidate, no exact match for "Ananas in Dosenstücken"
        ing = make_ingredient(name="Ananas", usage_count=50)
        make_portion(ing, name="Portion", quantity=1.0, weight_g=150.0, rank=1)
        other = make_ingredient(name="Ananasstücke (Dose)", usage_count=5)
        make_portion(other, name="Portion", quantity=1.0, weight_g=150.0, rank=1)

        extraction = _extraction(
            [GeminiIngredientMatch(original_name="1 Dose Ananas in Dosenstücken", quantity=1, unit="Dose")]
        )
        mock_response = type("R", (), {"text": '{"grams_per_unit": 350.0}'})()
        with patch("core.services.gemini.gemini_call", return_value=(mock_response, None)):
            result = _preview(
                extraction,
                [ImportedIngredient(name="1 Dose Ananas in Dosenstücken", quantity="1", unit="Dose")],
                user,
            )

        row = result.rows[0]
        assert row.selected_ingredient_id is None
        assert row.status == "unresolved"
        assert row.suggested_ingredient_name
        assert len(row.candidates) >= 1
        # Quantity suggestion converted against the top candidate (350 g ÷ 150 g)
        assert row.suggested_quantity == 2.33

    def test_new_ingredient_draft_is_complete_with_quantity(self, django_user_model):
        from recipe.schemas.enrichment import GeminiNewIngredient

        user = django_user_model.objects.create_user(username="r3", password="x")
        enrichment = GeminiNewIngredient(
            name="Crushed Ice",
            aliases=["Eiswürfel"],
            energy_kcal=0,
            protein_g=0,
            fat_g=0,
            carbohydrate_g=0,
            sugar_g=0,
            fibre_g=0,
            salt_g=0,
            child_score=8,
            scout_score=5,
            environmental_score=5,
            nova_score=1,
            nutri_score=0,
            nutri_class=1,
            physical_density=0.92,
            physical_viscosity="solid",
            portion_name="Handvoll",
            portion_weight_g=50,
        )
        extraction = _extraction([GeminiIngredientMatch(original_name="Crushed Ice", quantity=2, unit="Handvoll")])

        with patch(ENRICH_TARGET, return_value=enrichment):
            result = _preview(
                extraction,
                [ImportedIngredient(name="2 Handvoll Crushed Ice", quantity="2", unit="Handvoll")],
                user,
            )

        row = result.rows[0]
        assert row.selected_ingredient_id is None
        assert row.new_ingredient_draft is not None
        draft = row.new_ingredient_draft
        assert draft.name == "Crushed Ice"
        assert draft.values["energy_kcal"] == 0
        assert draft.portions[0].name == "Handvoll"
        assert draft.portions[0].weight_g == 50
        assert draft.quantity == 2

    def test_new_ingredient_without_quantity_defaults_to_one(self, django_user_model):
        user = django_user_model.objects.create_user(username="r4", password="x")
        extraction = _extraction([GeminiIngredientMatch(original_name="Lebensmittelfarbe", quantity=0, unit="")])

        with patch(ENRICH_TARGET, return_value=None):
            result = _preview(
                extraction,
                [ImportedIngredient(name="Lebensmittelfarbe")],
                user,
            )

        row = result.rows[0]
        assert row.new_ingredient_draft is not None
        assert row.new_ingredient_draft.quantity == 1


@pytest.mark.django_db
class TestReviewMissingQuantityAndGrouping:
    def test_matched_row_without_quantity_is_unresolved_with_reason(self, django_user_model):
        user = django_user_model.objects.create_user(username="r-missing", password="x")
        ing = make_ingredient(name="Zimt")
        make_portion(ing, name="1 TL Zimt", quantity=1.0, weight_g=5.0, rank=1)

        extraction = _extraction([GeminiIngredientMatch(original_name="Zimt", quantity=0, unit="")])
        result = _preview(extraction, [ImportedIngredient(name="Zimt", quantity="", unit="")], user)

        row = result.rows[0]
        assert row.selected_ingredient_id == ing.id
        assert row.quantity is None
        assert row.status == "unresolved"
        assert row.reason == "Menge fehlt – bitte Menge und Portion festlegen."

    def test_same_ingredient_twice_in_one_source_stays_two_rows(self, django_user_model):
        user = django_user_model.objects.create_user(username="r-twice", password="x")
        ing = make_ingredient(name="Mehl")
        make_portion(ing, name="100g Mehl", quantity=1.0, weight_g=100.0, rank=1)

        extraction = _extraction(
            [
                GeminiIngredientMatch(original_name="Mehl", quantity=250, unit="g"),
                GeminiIngredientMatch(original_name="Mehl", quantity=50, unit="g"),
            ]
        )
        result = _preview(
            extraction,
            [
                ImportedIngredient(name="250 g Mehl", quantity="250", unit="g"),
                ImportedIngredient(name="50 g Mehl", quantity="50", unit="g"),
            ],
            user,
        )

        assert len(result.rows) == 2
        assert sorted(row.quantity for row in result.rows) == [0.5, 2.5]
        assert all(not row.conflicts for row in result.rows)

    def test_portion_name_is_plain_portion_name(self, django_user_model):
        user = django_user_model.objects.create_user(username="r-name", password="x")
        ing = make_ingredient(name="Weizenmehl Type 405")
        make_portion(ing, name="Tasse Mehl", quantity=1.0, weight_g=100.0, rank=1)

        extraction = _extraction([GeminiIngredientMatch(original_name="Weizenmehl Type 405", quantity=200, unit="g")])
        result = _preview(
            extraction, [ImportedIngredient(name="200 g Weizenmehl Type 405", quantity="200", unit="g")], user
        )

        assert result.rows[0].selected_portion.name == "Tasse Mehl"


@pytest.mark.django_db
class TestReviewKeepsRecipeAmounts:
    """Production test of 2026-10-03: "2 EL Olivenöl" became 1,84 EL and "1 Zwiebel" 1,25 Zwiebeln."""

    def test_tablespoons_and_onion_keep_their_amounts(self, django_user_model):
        user = django_user_model.objects.create_user(username="r-amounts", password="x")
        oil = make_ingredient(name="Olivenöl", physical_density=0.92)
        make_portion(oil, name="Esslöffel", quantity=1.0, weight_g=15.0, rank=1)
        onion = make_ingredient(name="Zwiebel")
        make_portion(onion, name="mittelgroße Zwiebel", quantity=1.0, weight_g=80.0, rank=1, weight_status="confirmed")

        extraction = _extraction(
            [
                GeminiIngredientMatch(original_name="Olivenöl", quantity=2, unit="EL"),
                GeminiIngredientMatch(original_name="Zwiebel", quantity=1, unit="Stück"),
            ]
        )
        result = _preview(
            extraction,
            [
                ImportedIngredient(name="2 EL Olivenöl", quantity="2", unit="EL"),
                ImportedIngredient(name="1 Zwiebel", quantity="1", unit="Stück"),
            ],
            user,
        )

        by_ingredient = {row.selected_ingredient_id: row for row in result.rows}
        assert by_ingredient[oil.id].quantity == 2
        assert by_ingredient[onion.id].quantity == 1
