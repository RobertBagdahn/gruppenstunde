"""Tests for AI quantity estimation response conversion."""

import pytest

from recipe.services.ai_ingredients_service import (
    AiQuantityEstimate,
    AiQuantityEstimatesOutput,
    RecipeQuantityEstimationService,
)
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
class TestRecipeQuantityEstimationService:
    def test_build_response_uses_default_editable_portion(self):
        recipe = make_recipe(title="Frühstück", portions=1)
        ingredient = make_ingredient(name="Haferflocken")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        default_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="Gramm",
            quantity=1.0,
            weight_g=1.0,
            rank=1,
        )
        package_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="800g Haferflocken",
            quantity=800.0,
            weight_g=800.0,
            rank=2,
        )
        item = make_recipe_item(recipe=recipe, portion=package_portion, quantity=1.0)
        ai_output = AiQuantityEstimatesOutput(
            items=[
                AiQuantityEstimate(
                    item_id=item.id,
                    estimated_grams_per_person=400.0,
                )
            ]
        )

        result = RecipeQuantityEstimationService()._build_response(ai_output, [item], servings=1)

        assert result == [
            {
                "item_id": item.id,
                "ingredient_name": "Haferflocken",
                "quantity_per_portion": 400.0,
                "portion_id": default_portion.id,
                "unit": "Gramm",
                "grams_total": 400.0,
            }
        ]
        assert default_portion.weight_g == 1.0

    def test_build_response_labels_composite_default_portion_by_its_own_name(self):
        """Regression test: if the rank=1 default portion is itself a composite
        portion (quantity != 1, e.g. "1 Portion Nudeln" = 125g), the response
        MUST label the unit with the portion's own name, not the underlying
        measuring_unit name ("Gramm"). Using "Gramm" is misleading: the
        quantity_per_portion value is a *count* of that portion, not grams —
        this is the same bug class documented for recipe #434.
        """
        recipe = make_recipe(title="Pasta", portions=1)
        ingredient = make_ingredient(name="Nudeln")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        composite_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="1 Portion Nudeln",
            quantity=125.0,
            weight_g=125.0,
            rank=1,
        )
        item = make_recipe_item(recipe=recipe, portion=composite_portion, quantity=1.0)
        ai_output = AiQuantityEstimatesOutput(
            items=[
                AiQuantityEstimate(
                    item_id=item.id,
                    estimated_grams_per_person=125.0,
                )
            ]
        )

        result = RecipeQuantityEstimationService()._build_response(ai_output, [item], servings=1)

        assert result == [
            {
                "item_id": item.id,
                "ingredient_name": "Nudeln",
                "quantity_per_portion": 1.0,
                "portion_id": composite_portion.id,
                "unit": "1 Portion Nudeln",
                "grams_total": 125.0,
            }
        ]
        # Explicitly guard against the recipe #434 regression: label must never
        # be "Gramm" when the underlying portion is a composite conversion factor.
        assert result[0]["unit"] != "Gramm"
        # Even though the label is the portion name, the UI can still always show
        # the gram equivalent alongside it.
        assert result[0]["grams_total"] == 125.0

    def test_build_response_uses_live_rank1_not_stored_portion(self):
        """Regression test (recipe #59 "Linsensuppe" — Olivenöl case): if the
        RecipeItem is stored on a non-rank=1 portion, the response MUST target
        the ingredient's active rank=1 portion, and MUST include that portion's
        id, not the stored one."""
        recipe = make_recipe(title="Linsensuppe", portions=1)
        ingredient = make_ingredient(name="Olivenöl nativ extra")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        rank1_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(name="Esslöffel", quantity=1.0, unit="stk"),
            name="Portion",
            quantity=1.0,
            weight_g=10.0,
            rank=1,
        )
        stored_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="100g Olivenöl",
            quantity=1.0,
            weight_g=100.0,
            rank=2,
        )
        item = make_recipe_item(recipe=recipe, portion=stored_portion, quantity=0.488)
        ai_output = AiQuantityEstimatesOutput(
            items=[AiQuantityEstimate(item_id=item.id, estimated_grams_per_person=10.0)],
        )

        result = RecipeQuantityEstimationService()._build_response(ai_output, [item], servings=1)

        assert result[0]["portion_id"] == rank1_portion.id
        assert result[0]["portion_id"] != stored_portion.id
        assert result[0]["quantity_per_portion"] == 1.0
        assert result[0]["grams_total"] == 10.0

    def test_build_response_ignores_softdeleted_stored_portion(self):
        """Regression test (recipe #59 "Linsensuppe" — Jodsalz case): if the
        RecipeItem's stored portion has been soft-deleted, the response MUST
        NOT use it — it must resolve to the ingredient's active rank=1 portion."""
        recipe = make_recipe(title="Linsensuppe", portions=1)
        ingredient = make_ingredient(name="Jodsalz")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        rank1_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(name="Prise", quantity=1.0, unit="stk"),
            name="Prise",
            quantity=1.0,
            weight_g=0.3,
            rank=1,
        )
        deleted_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="100g Salz",
            quantity=1.0,
            weight_g=100.0,
            rank=2,
        )
        deleted_portion.soft_delete()
        item = make_recipe_item(recipe=recipe, portion=deleted_portion, quantity=0.073)
        ai_output = AiQuantityEstimatesOutput(
            items=[AiQuantityEstimate(item_id=item.id, estimated_grams_per_person=3.0)],
        )

        result = RecipeQuantityEstimationService()._build_response(ai_output, [item], servings=1)

        assert result[0]["portion_id"] == rank1_portion.id
        assert result[0]["quantity_per_portion"] == pytest.approx(10.0, abs=0.01)
        assert result[0]["grams_total"] == pytest.approx(3.0, abs=0.1)

    def test_build_response_skips_item_without_any_active_rank1_portion(self):
        """If ALL portions of an ingredient are soft-deleted (no valid rank=1
        target), the item MUST be skipped rather than falling back to a
        deleted portion."""
        recipe = make_recipe(title="Randfall", portions=1)
        ingredient = make_ingredient(name="Randzutat")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        only_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="100g Randzutat",
            quantity=1.0,
            weight_g=100.0,
            rank=1,
        )
        item = make_recipe_item(recipe=recipe, portion=only_portion, quantity=1.0)
        only_portion.soft_delete()

        ai_output = AiQuantityEstimatesOutput(
            items=[AiQuantityEstimate(item_id=item.id, estimated_grams_per_person=50.0)],
        )

        result = RecipeQuantityEstimationService()._build_response(ai_output, [item], servings=1)
        assert result == []

    def test_build_response_item_already_on_rank1_is_unaffected(self):
        recipe = make_recipe(title="Linsensuppe", portions=1)
        ingredient = make_ingredient(name="Linsen (rot)")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        rank1_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="100g Linsen (rot)",
            quantity=1.0,
            weight_g=100.0,
            rank=1,
        )
        item = make_recipe_item(recipe=recipe, portion=rank1_portion, quantity=7.31)
        ai_output = AiQuantityEstimatesOutput(
            items=[AiQuantityEstimate(item_id=item.id, estimated_grams_per_person=80.0)],
        )

        result = RecipeQuantityEstimationService()._build_response(ai_output, [item], servings=1)

        assert result[0]["portion_id"] == rank1_portion.id == item.portion_id
        assert result[0]["quantity_per_portion"] == 0.8
        assert result[0]["grams_total"] == 80.0

    def test_build_response_clamps_tiny_quantity_away_from_zero(self):
        """RecipeItem.quantity has a DB check constraint (> 0). A tiny AI
        estimate against a large target portion weight_g could otherwise round
        to exactly 0.00 at 2 decimals and violate that constraint on save
        (observed live during a production repair rollout)."""
        recipe = make_recipe(title="Randfall", portions=1)
        ingredient = make_ingredient(name="Spurenzutat")
        gram_unit = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        rank1_portion = make_portion(
            ingredient=ingredient,
            measuring_unit=gram_unit,
            name="1 kg Spurenzutat",
            quantity=1.0,
            weight_g=1000.0,
            rank=1,
        )
        item = make_recipe_item(recipe=recipe, portion=rank1_portion, quantity=0.0001)
        ai_output = AiQuantityEstimatesOutput(
            items=[AiQuantityEstimate(item_id=item.id, estimated_grams_per_person=0.001)],
        )

        result = RecipeQuantityEstimationService()._build_response(ai_output, [item], servings=1)

        assert result[0]["quantity_per_portion"] > 0
        assert result[0]["quantity_per_portion"] == 0.01
