"""Tests that AI ingredient creation forwards the is_background flag."""

from unittest.mock import patch

import pytest
from ninja.errors import HttpError

from supply.services.ingredient_ai_suggest_service import ai_create_ingredient


@pytest.mark.django_db
def test_ai_create_ingredient_forwards_is_background():
    with patch(
        "supply.services.ingredient_ai_suggest_service.gemini_call",
        return_value=(None, "interaction-id"),
    ) as mock_call:
        with pytest.raises(HttpError):
            ai_create_ingredient("Testzutat", bypass_limits=True, is_background=True)

    kwargs = mock_call.call_args.kwargs
    assert kwargs["is_background"] is True
    assert kwargs["bypass_limits"] is True
