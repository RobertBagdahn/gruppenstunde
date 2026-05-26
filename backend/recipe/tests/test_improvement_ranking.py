"""Tests for improvement_ranking_service — unified improvement ranking."""

import pytest

from recipe.choices import HintLevelChoices, HintMinMaxChoices, HintParameterChoices
from recipe.services.improvement_ranking_service import (
    ALL_GOOD_MESSAGE,
    TOP_N,
    compute_improvement_ranking,
)
from recipe.tests import make_recipe, make_recipe_hint, make_recipe_item
from supply.models import Ingredient, MeasuringUnit, Portion

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def measuring_unit(db):
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


@pytest.fixture
def sugar_ingredient(db):
    return Ingredient.objects.create(
        name="Zucker",
        slug="zucker",
        status="approved",
        energy_kj=1700.0,
        protein_g=0.0,
        fat_g=0.0,
        fat_sat_g=0.0,
        carbohydrate_g=100.0,
        sugar_g=100.0,
        fibre_g=0.0,
        salt_g=0.0,
    )


@pytest.fixture
def salt_ingredient(db):
    return Ingredient.objects.create(
        name="Salz",
        slug="salz",
        status="approved",
        energy_kj=0.0,
        protein_g=0.0,
        fat_g=0.0,
        fat_sat_g=0.0,
        carbohydrate_g=0.0,
        sugar_g=0.0,
        fibre_g=0.0,
        salt_g=100.0,
    )


@pytest.fixture
def flour_ingredient(db):
    return Ingredient.objects.create(
        name="Mehl",
        slug="mehl",
        status="approved",
        energy_kj=1418.0,
        protein_g=10.3,
        fat_g=1.0,
        fat_sat_g=0.2,
        carbohydrate_g=71.0,
        sugar_g=0.5,
        fibre_g=2.8,
        salt_g=0.01,
    )


@pytest.fixture
def portion_sugar(sugar_ingredient, measuring_unit):
    return Portion.objects.create(
        ingredient=sugar_ingredient,
        measuring_unit=measuring_unit,
        name="Gramm Zucker",
        quantity=1.0,
        weight_g=1.0,
    )


@pytest.fixture
def portion_salt(salt_ingredient, measuring_unit):
    return Portion.objects.create(
        ingredient=salt_ingredient,
        measuring_unit=measuring_unit,
        name="Gramm Salz",
        quantity=1.0,
        weight_g=1.0,
    )


@pytest.fixture
def portion_flour(flour_ingredient, measuring_unit):
    return Portion.objects.create(
        ingredient=flour_ingredient,
        measuring_unit=measuring_unit,
        name="Gramm Mehl",
        quantity=1.0,
        weight_g=1.0,
    )


@pytest.fixture
def poor_recipe(portion_sugar, portion_salt, portion_flour):
    """Recipe with high sugar and salt — Nutri-Score D/E."""
    recipe = make_recipe(
        cached_energy_kj=1500.0,
        cached_sugar_g=50.0,
        cached_fat_g=5.0,
        cached_salt_g=3.0,
        cached_fibre_g=1.0,
        cached_protein_g=5.0,
        cached_nutri_class=4,
    )
    make_recipe_item(recipe=recipe, portion=portion_sugar, quantity=200.0)
    make_recipe_item(recipe=recipe, portion=portion_salt, quantity=10.0)
    make_recipe_item(recipe=recipe, portion=portion_flour, quantity=300.0)
    return recipe


# ===========================================================================
# Tests
# ===========================================================================


@pytest.mark.django_db
class TestImprovementRanking:
    def test_all_good_when_nutri_a_and_no_hints(self):
        """Nutri-Score A + zero matched hints → all_good=True, items empty."""
        recipe = make_recipe(
            cached_energy_kj=200.0,
            cached_protein_g=15.0,
            cached_fat_g=2.0,
            cached_sugar_g=1.0,
            cached_fibre_g=8.0,
            cached_salt_g=0.1,
            cached_nutri_class=1,
        )
        result = compute_improvement_ranking(recipe)
        assert result["all_good"] is True
        assert result["items"] == []
        assert result["message"] == ALL_GOOD_MESSAGE

    def test_nutri_score_only_source(self, poor_recipe):
        """Poor recipe without any RecipeHints → items all have source=nutri_score."""
        result = compute_improvement_ranking(poor_recipe)
        assert result["all_good"] is False
        assert len(result["items"]) >= 1
        for item in result["items"]:
            assert item["source"] == "nutri_score"

    def test_merged_source_when_hint_matches_nutri_candidate(self, poor_recipe):
        """A RecipeHint matching a parameter the Nutri-Score also flags → source=merged."""
        make_recipe_hint(
            name="Zu viel Zucker",
            parameter=HintParameterChoices.SUGAR_G,
            max_value=5.0,
            min_max=HintMinMaxChoices.MAX,
            hint_level=HintLevelChoices.WARNING,
            improvement_text="Zucker reduzieren.",
        )
        result = compute_improvement_ranking(poor_recipe)
        sugar_items = [i for i in result["items"] if i["parameter"] == "sugar_g"]
        assert sugar_items, "expected a merged sugar_g item"
        assert sugar_items[0]["source"] == "merged"

    def test_hint_only_source_for_parameter_not_in_nutri(self, poor_recipe):
        """A RecipeHint on a non-Nutri parameter (e.g. weight_g) → source=recipe_hint."""
        make_recipe_hint(
            name="Zu schwer",
            parameter=HintParameterChoices.WEIGHT_G,
            max_value=100.0,
            min_max=HintMinMaxChoices.MAX,
            improvement_text="Portionen kleiner machen.",
        )
        result = compute_improvement_ranking(poor_recipe)
        weight_items = [i for i in result["items"] if i["parameter"] == "weight_g"]
        assert weight_items, "expected a recipe_hint weight_g item"
        assert weight_items[0]["source"] == "recipe_hint"

    def test_respects_top_n_limit(self, poor_recipe):
        """Even with many candidates, at most TOP_N items are returned."""
        # Add several competing hints
        for param, max_val in [
            (HintParameterChoices.SUGAR_G, 5.0),
            (HintParameterChoices.SALT_G, 0.5),
            (HintParameterChoices.FAT_SAT_G, 0.5),
            (HintParameterChoices.WEIGHT_G, 10.0),
        ]:
            make_recipe_hint(
                name=f"Limit {param}",
                parameter=param,
                max_value=max_val,
                min_max=HintMinMaxChoices.MAX,
            )
        result = compute_improvement_ranking(poor_recipe)
        assert len(result["items"]) <= TOP_N

    def test_threshold_from_recipe_hint_overrides_nutri(self, poor_recipe):
        """When a RecipeHint defines a threshold, it wins over Nutri-fallback."""
        make_recipe_hint(
            name="Salz-Limit",
            parameter=HintParameterChoices.SALT_G,
            max_value=0.8,
            min_max=HintMinMaxChoices.MAX,
            improvement_text="Weniger salzen.",
        )
        result = compute_improvement_ranking(poor_recipe)
        salt_items = [i for i in result["items"] if i["parameter"] == "salt_g"]
        assert salt_items
        assert salt_items[0]["threshold_value"] == 0.8

    def test_item_has_required_fields(self, poor_recipe):
        """Each ranked item must expose the schema-relevant fields."""
        result = compute_improvement_ranking(poor_recipe)
        required = {
            "parameter",
            "parameter_label",
            "current_value",
            "threshold_value",
            "delta",
            "unit",
            "direction",
            "impact_score",
            "suggested_ingredients",
            "source",
            "recommendation_text",
        }
        for item in result["items"]:
            assert required.issubset(item.keys()), f"missing {required - item.keys()}"
            assert 0.0 <= item["impact_score"] <= 100.0

    def test_items_sorted_by_impact_score_desc(self, poor_recipe):
        """Ranking must return items sorted by impact_score descending."""
        result = compute_improvement_ranking(poor_recipe)
        scores = [i["impact_score"] for i in result["items"]]
        assert scores == sorted(scores, reverse=True)
