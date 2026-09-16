"""Tests for piece-portion handling in the URL/text import draft builder.

Covers the `fix-food-piece-portion-mapping` spec scenarios:
- unknown piece inputs never fall back to grams or an implicit 1 g weight
- AI weight proposals are returned with confirmation-required status
- existing trusted piece portions are selected without a new confirmation
- conflicting AI estimates expose the existing portion as a choice
"""

import pytest
from model_bakery import baker

from recipe.services.url_import_service import _build_recipe_items_v2
from supply.models import Portion
from supply.tests import make_ingredient, make_measuring_unit


def _matched_item(ingredient, *, unit="Stück", note="", quantity=2, estimated=45):
    return [
        {
            "ingredient_id": ingredient.id,
            "ingredient_name": ingredient.name,
            "quantity": quantity,
            "unit": unit,
            "note": note,
            "is_new_ingredient": False,
            "estimated_portion_weight_g": estimated,
        }
    ]


@pytest.mark.django_db
class TestPiecePortionImportDraft:
    def test_known_trusted_piece_portion_is_selected(self):
        ingredient = make_ingredient(name="Brötchen")
        existing = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="mittleres Brötchen",
            quantity=1.0,
            weight_g=62.5,
            weight_status="confirmed",
            rank=2,
        )
        results = _build_recipe_items_v2(
            _matched_item(ingredient, note="mittel", estimated=62.5),
            [],
        )
        assert len(results) == 1
        item = results[0]
        assert item.portion_id == existing.id
        assert item.confirmation_required is False
        assert item.needs_unit_clarification is False
        assert item.weight_proposal_g is None

    def test_unknown_piece_returns_proposal_without_fabricated_grams(self):
        ingredient = make_ingredient(name="Wassermelone")
        results = _build_recipe_items_v2(
            _matched_item(ingredient, quantity=1, estimated=2500),
            [],
        )
        item = results[0]
        assert item.portion_id is None
        assert item.needs_unit_clarification is True
        assert item.confirmation_required is True
        assert item.weight_status == "ai_proposed"
        assert item.weight_proposal_g == 2500
        assert item.suggested_portion_name
        # No portion row was fabricated during the preview
        assert not Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True).exclude(name="g").exists()

    def test_unknown_piece_without_estimate_requires_clarification(self):
        ingredient = make_ingredient(name="Zwiebel")
        results = _build_recipe_items_v2(
            _matched_item(ingredient, estimated=0),
            [],
        )
        item = results[0]
        assert item.portion_id is None
        assert item.confirmation_required is True
        assert item.weight_status == "unknown"
        assert item.weight_proposal_g is None

    def test_conflicting_estimate_offers_existing_portion_as_choice(self):
        ingredient = make_ingredient(name="Brötchen")
        existing = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="Brötchen",
            quantity=1.0,
            weight_g=62.5,
            weight_status="confirmed",
            rank=1,
        )
        results = _build_recipe_items_v2(
            _matched_item(ingredient, note="klein", estimated=45),
            [],
        )
        item = results[0]
        assert item.portion_id is None
        assert item.confirmation_required is True
        assert item.weight_proposal_g == 45
        assert item.weight_status == "ai_proposed"
        assert any(p["id"] == existing.id for p in item.available_portions)
        existing.refresh_from_db()
        assert existing.weight_g == 62.5

    def test_untrusted_legacy_piece_portion_requires_confirmation(self):
        ingredient = make_ingredient(name="Zwiebel")
        legacy = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="Stück",
            quantity=1.0,
            weight_g=1.0,
            weight_status=None,
            rank=1,
        )
        results = _build_recipe_items_v2(
            _matched_item(ingredient, estimated=80),
            [],
        )
        item = results[0]
        assert item.portion_id is None
        assert item.confirmation_required is True
        assert any(p["id"] == legacy.id for p in item.available_portions)
        legacy.refresh_from_db()
        assert legacy.weight_g == 1.0

    def test_metric_unit_item_resolves_normally(self):
        ingredient = make_ingredient(name="Zucker")
        gram = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
        portion = Portion.objects.filter(ingredient=ingredient, name="g", deleted_at__isnull=True).first()
        assert portion is not None
        results = _build_recipe_items_v2(
            _matched_item(ingredient, unit="g", quantity=200, estimated=1),
            [],
        )
        item = results[0]
        assert item.portion_id == portion.id
        assert item.confirmation_required is False
