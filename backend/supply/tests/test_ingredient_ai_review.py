"""Tests for the batch AI review application policy (no Gemini calls)."""

from decimal import Decimal
from unittest.mock import patch

import pytest

from supply.services.ingredient_ai_review_service import (
    ReviewedIngredient,
    apply_review,
    build_review_prompt,
    review_ingredients,
)


def make_review(ingredient_id: int, **overrides) -> ReviewedIngredient:
    data = {
        "id": ingredient_id,
        "verdict": "corrected",
        "retail_section": "Joghurt, Quark & Desserts",
        "physical_viscosity": "solid",
        "energy_kcal": 85.0,
        "protein_g": 8.8,
        "fat_g": 0.2,
        "fat_sat_g": 0.1,
        "carbohydrate_g": 11.5,
        "sugar_g": 8.7,
        "fibre_g": 0.0,
        "salt_g": 0.1,
        "price_per_kg": 3.5,
        "description": "Cremiges isländisches Milchprodukt mit Vanille, ideal zum Frühstück oder als Dessert.",
        "confidence": 0.9,
        "reason": "Fehlende Werte ergänzt",
    }
    data.update(overrides)
    return ReviewedIngredient(**data)


@pytest.fixture
def sections(db):
    from supply.models import RetailSection

    return {
        name: RetailSection.objects.create(name=name, rank=rank)
        for rank, name in enumerate(["Joghurt, Quark & Desserts", "Milch & Pflanzendrinks", "Obst"], start=1)
    }


@pytest.mark.django_db
def test_fills_unknown_and_suspicious_fields_but_keeps_plausible_ones(sections):
    from supply.models import Ingredient

    ing = Ingredient.objects.create(
        name="Skyr Vanille",
        energy_kcal=None,
        protein_g=9.5,
        fat_g=None,
        fat_sat_g=0.1,
        carbohydrate_g=None,
        sugar_g=8.7,
        fibre_g=0.0,
        salt_g=0.1,
        retail_section=sections["Milch & Pflanzendrinks"],
    )
    outcome = apply_review(ing, make_review(ing.id, protein_g=8.8), sections=sections)

    assert ing.energy_kcal == 85.0
    assert ing.fat_g == 0.2
    assert ing.carbohydrate_g == 11.5
    assert ing.protein_g == 9.5  # plausible value is not overwritten
    assert ing.retail_section.name == "Joghurt, Quark & Desserts"
    assert ing.retail_section_source == "ai"
    assert ing.price_per_kg == Decimal("3.5")
    assert "energy_kcal" in outcome.applied


@pytest.mark.django_db
def test_manual_section_and_not_an_ingredient_are_respected(sections):
    from supply.models import Ingredient

    ing = Ingredient.objects.create(
        name="E2E Zutat 123", retail_section=sections["Obst"], retail_section_source="manual", energy_kcal=None
    )
    apply_review(ing, make_review(ing.id, verdict="not_an_ingredient"), sections=sections)
    assert ing.retail_section.name == "Obst"
    assert ing.energy_kcal is None
    assert ing.ai_review_verdict == "not_an_ingredient"


@pytest.mark.django_db
def test_rename_is_only_a_suggestion(sections):
    from supply.models import Ingredient

    ing = Ingredient.objects.create(name="Golden Toast Buttertoast 500g", energy_kcal=None)
    apply_review(ing, make_review(ing.id, verdict="rename", suggested_name="Buttertoast"), sections=sections)
    assert ing.name == "Golden Toast Buttertoast 500g"
    assert ing.ai_review_notes["suggested_name"] == "Buttertoast"


@pytest.mark.django_db
def test_constraints_are_enforced_after_apply(sections):
    from supply.models import Ingredient

    ing = Ingredient.objects.create(name="Joghurt", energy_kcal=None, carbohydrate_g=None, sugar_g=None)
    apply_review(ing, make_review(ing.id, carbohydrate_g=4.0, sugar_g=6.0), sections=sections)
    assert ing.sugar_g <= ing.carbohydrate_g


@pytest.mark.django_db
def test_review_ingredients_persists_and_ignores_unknown_ids(sections):
    from supply.models import Ingredient

    ing = Ingredient.objects.create(name="Skyr", energy_kcal=None)
    reviews = {ing.id: make_review(ing.id)}
    with patch("supply.services.ingredient_ai_review_service.request_batch_review", return_value=reviews):
        outcomes = review_ingredients([ing], bypass_limits=True)
    ing.refresh_from_db()
    assert len(outcomes) == 1
    assert ing.ai_reviewed_at is not None
    assert ing.energy_kcal == 85.0


@pytest.mark.django_db
def test_prompt_contains_rules_values_and_catalog():
    from supply.models import Ingredient

    ing = Ingredient.objects.create(name="Orangensaft", energy_kcal=0, protein_g=0, fat_g=0, carbohydrate_g=0)
    prompt = build_review_prompt([ing])
    assert f"id={ing.id}" in prompt
    assert "sugar_g <= carbohydrate_g" in prompt
    assert "Säfte & Smoothies" in prompt
    assert "Alle Nährwerte 0" in prompt


@pytest.mark.django_db
def test_rename_without_new_name_counts_as_corrected(sections):
    from supply.models import Ingredient

    ing = Ingredient.objects.create(name="Ajvar mild", energy_kcal=None)
    apply_review(ing, make_review(ing.id, verdict="rename", suggested_name="Ajvar mild"), sections=sections)
    assert ing.ai_review_verdict == "corrected"
