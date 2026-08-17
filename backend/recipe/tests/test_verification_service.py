"""Regression tests for recipe verification readiness."""

import pytest
from model_bakery import baker

from recipe.models import Recipe
from recipe.services.verification_service import verify_recipe


@pytest.mark.django_db
def test_confirm_does_not_approve_recipe_with_missing_required_fields():
    reviewer = baker.make("auth.User", is_staff=True)
    recipe = baker.make(Recipe, status="draft", description="")

    result = verify_recipe(recipe, reviewer=reviewer, confirm=True)

    recipe.refresh_from_db()
    assert result.can_verify is False
    assert recipe.status == "draft"
