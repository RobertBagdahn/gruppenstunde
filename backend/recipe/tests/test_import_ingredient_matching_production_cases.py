"""Regression cases from the production test of 2026-10-03 (Chefkoch import)."""

from contextlib import ExitStack
from unittest.mock import patch

import pytest

from recipe.schemas.ingredient_review import RecipeImportSourceIn
from recipe.services.import_service import ImportedIngredient, ImportedRecipe
from recipe.services.ingredient_matcher import IngredientMatcher
from recipe.services.ingredient_review_service import preview_recipe_ingredients
from recipe.services.url_import_service import GeminiIngredientMatch, GeminiRecipeExtraction
from supply.tests import make_ingredient, make_portion

pytestmark = pytest.mark.usefixtures("gemini_unavailable")


@pytest.fixture
def catalog():
    salt = make_ingredient(name="Salz", status="verified", usage_count=100)
    eggs = make_ingredient(name="Eier (Größe M)", status="verified", usage_count=50)
    water = make_ingredient(name="Mineralwasser", status="verified", usage_count=20)
    return {"salz": salt, "eier": eggs, "wasser": water}


@pytest.mark.django_db
class TestProductionCases:
    def test_prise_salz_matches_salz(self, catalog):
        result = IngredientMatcher.match("Prise(n) Salz")

        assert result.ingredient_id == catalog["salz"].id
        assert result.matched_via in {"jaccard", "normalized"}

    def test_grosse_eier_match_eier_groesse_m(self, catalog):
        result = IngredientMatcher.match("große Ei(er), Größe L")

        assert result.ingredient_id == catalog["eier"].id
        assert "Größe L" in result.note
        assert "groß" in result.note.lower()

    def test_mineralwasser_mit_kohlensaeure_is_a_head_suggestion(self, catalog):
        result = IngredientMatcher.match("Mineralwasser mit Kohlensäure")

        assert result.ingredient_id == catalog["wasser"].id
        assert result.matched_via == "head"
        assert "mit Kohlensäure" in result.note

    def test_kokosmilch_is_not_cut_to_milch(self, catalog):
        make_ingredient(name="Milch", status="verified")

        result = IngredientMatcher.match("Kokosmilch")

        assert result.ingredient_id is None

    def test_grey_zone_hint_does_not_claim_high_similarity(self):
        hint = IngredientMatcher._similarity_hint(0.44)

        assert "ausreichend" not in hint
        assert "bitte prüfen" in hint
        assert "ausreichend" in IngredientMatcher._similarity_hint(0.8)


def _extraction(names: list[str]) -> GeminiRecipeExtraction:
    return GeminiRecipeExtraction(
        title="Pfannkuchen",
        description="",
        summary="",
        servings=4,
        recipe_type="warm_meal",
        difficulty="easy",
        steps=["Verrühren."],
        ingredients=[GeminiIngredientMatch(original_name=name, quantity=1, unit="") for name in names],
    )


@pytest.mark.django_db
def test_review_rows_have_no_new_ingredient_draft_when_a_verified_match_exists(catalog, django_user_model):
    user = django_user_model.objects.create_user(username="chefkoch-user", password="x")
    for ingredient in catalog.values():
        make_portion(ingredient, name="Portion", quantity=1.0, weight_g=50.0, rank=1)
    names = ["große Ei(er), Größe L", "Prise(n) Salz", "Mineralwasser mit Kohlensäure"]
    parsed = ImportedRecipe(
        title="Pfannkuchen",
        servings=4,
        ingredients=[ImportedIngredient(name=name, quantity="1", unit="") for name in names],
        steps=["Verrühren."],
    )

    with ExitStack() as stack:
        stack.enter_context(
            patch(
                "recipe.services.url_import_service.extract_smart_recipe_input",
                return_value=("text", parsed, _extraction(names)),
            )
        )
        result = preview_recipe_ingredients([RecipeImportSourceIn(type="text", value="Rezepttext")], user)

    by_source = {row.source_text: row for row in result.rows}
    assert by_source["große Ei(er), Größe L"].selected_ingredient_id == catalog["eier"].id
    assert by_source["Prise(n) Salz"].selected_ingredient_id == catalog["salz"].id
    assert by_source["Mineralwasser mit Kohlensäure"].selected_ingredient_id == catalog["wasser"].id
    assert all(row.new_ingredient_draft is None for row in result.rows)
