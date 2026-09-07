import pytest
from pydantic import ValidationError

from supply.schemas.ingredients import IngredientDetailOut, VisibilityIn


def test_ingredient_visibility_contract_is_restricted():
    with pytest.raises(ValidationError):
        VisibilityIn(visibility="public")


def test_ingredient_detail_contains_server_permission_fields():
    assert IngredientDetailOut.model_fields["can_edit"].default is False
    assert IngredientDetailOut.model_fields["can_delete"].default is False
    assert "shared_groups" in IngredientDetailOut.model_fields
