import pytest
from pydantic import ValidationError

from supply.schemas.ingredients import (
    IngredientDetailOut,
    PortionOut,
    StandardMeasureOut,
    VisibilityIn,
)


def test_ingredient_visibility_contract_is_restricted():
    with pytest.raises(ValidationError):
        VisibilityIn(visibility="public")


def test_ingredient_detail_contains_server_permission_fields():
    assert IngredientDetailOut.model_fields["can_edit"].default is False
    assert IngredientDetailOut.model_fields["can_delete"].default is False
    assert "shared_groups" in IngredientDetailOut.model_fields


def test_standard_measure_out_contract_fields():
    """Kept in sync 1:1 with StandardMeasureSchema in frontend-food."""
    measure = StandardMeasureOut(key="el", name="1 EL", grams=12.0)
    assert measure.model_dump() == {
        "key": "el",
        "name": "1 EL",
        "grams": 12.0,
        "unit_name": "g",
        "is_approx": True,
    }
    assert set(["key", "name", "grams", "unit_name", "is_approx"]) <= set(StandardMeasureOut.model_fields)


def test_portion_out_piece_like_resolution():
    """Piece-like classification is backend-authoritative and stable.

    Kept in sync with frontend counting semantics — a piece-like portion is
    entered as a count (1 Stück), never as its gram amount."
    """
    from types import SimpleNamespace

    assert PortionOut.resolve_is_piece_like(SimpleNamespace(name="kleine (50g)")) is True
    assert PortionOut.resolve_is_piece_like(SimpleNamespace(name="Stück")) is True
    assert PortionOut.resolve_is_piece_like(SimpleNamespace(name="100g Zucker")) is False
    assert PortionOut.resolve_is_piece_like(SimpleNamespace(name="1 TL Salz")) is False
