"""Tests to validate that all recipe app factories produce valid model instances."""

import pytest

from recipe.tests import (
    make_health_rule,
    make_recipe,
    make_recipe_comment,
    make_recipe_emotion,
    make_recipe_hint,
    make_recipe_item,
    make_recipe_view,
)


@pytest.mark.django_db
class TestRecipeFactories:
    def test_make_recipe(self):
        recipe = make_recipe()
        assert recipe.pk is not None
        assert recipe.status == "approved"
        assert recipe.slug
        assert recipe.servings == 4

    def test_make_recipe_draft(self):
        recipe = make_recipe(status="draft")
        assert recipe.status == "draft"

    def test_make_recipe_item(self):
        item = make_recipe_item()
        assert item.pk is not None
        assert item.recipe is not None
        assert item.quantity == 500.0

    def test_make_recipe_hint(self):
        hint = make_recipe_hint()
        assert hint.pk is not None
        assert hint.parameter == "salt_g"
        assert hint.hint_level == "warning"

    def test_make_recipe_comment(self):
        comment = make_recipe_comment()
        assert comment.pk is not None
        assert comment.content_type is not None
        assert comment.object_id is not None
        assert comment.status == "approved"

    def test_make_recipe_emotion(self):
        emotion = make_recipe_emotion()
        assert emotion.pk is not None
        assert emotion.emotion_type == "happy"

    def test_make_recipe_view(self):
        view = make_recipe_view()
        assert view.pk is not None
        assert view.ip_hash
        assert len(view.ip_hash) == 64

    def test_make_health_rule(self):
        rule = make_health_rule()
        assert rule.pk is not None
        assert rule.parameter == "sugar_g"
        assert rule.scope == "meal"
        assert rule.threshold_green == 10.0
        assert rule.threshold_yellow == 20.0
        assert rule.is_active is True
