"""Tests to validate that all idea app factories produce valid model instances."""

import pytest

from idea.tests import (
    make_comment,
    make_emotion,
    make_idea,
    make_idea_of_the_week,
    make_idea_view,
    make_ingredient,
    make_ingredient_alias,
    make_material_item,
    make_material_name,
    make_measuring_unit,
    make_nutritional_tag,
    make_portion,
    make_price,
    make_retail_section,
    make_scout_level,
    make_search_log,
    make_tag,
    make_tag_suggestion,
    make_user_preferences,
)


@pytest.mark.django_db
class TestIdeaFactories:
    def test_make_tag(self):
        tag = make_tag(name="Outdoor")
        assert tag.pk is not None
        assert tag.name == "Outdoor"
        assert tag.slug

    def test_make_tag_with_parent(self):
        parent = make_tag(name="Spiele")
        child = make_tag(name="Geländespiel", parent=parent)
        assert child.parent == parent

    def test_make_scout_level(self):
        level = make_scout_level(name="Wölflinge", sorting=1)
        assert level.pk is not None
        assert level.name == "Wölflinge"

    def test_make_tag_suggestion(self):
        suggestion = make_tag_suggestion()
        assert suggestion.pk is not None
        assert suggestion.is_processed is False

    def test_make_idea(self):
        idea = make_idea()
        assert idea.pk is not None
        assert idea.status == "published"
        assert idea.slug

    def test_make_idea_draft(self):
        idea = make_idea(status="draft")
        assert idea.status == "draft"

    def test_make_comment(self):
        comment = make_comment()
        assert comment.pk is not None
        assert comment.idea is not None
        assert comment.status == "approved"

    def test_make_comment_nested(self):
        idea = make_idea()
        parent_comment = make_comment(idea=idea)
        reply = make_comment(idea=idea, parent=parent_comment)
        assert reply.parent == parent_comment

    def test_make_emotion(self):
        emotion = make_emotion()
        assert emotion.pk is not None
        assert emotion.emotion_type == "happy"

    def test_make_idea_of_the_week(self):
        iotw = make_idea_of_the_week()
        assert iotw.pk is not None
        assert iotw.idea is not None

    def test_make_idea_view(self):
        view = make_idea_view()
        assert view.pk is not None
        assert view.ip_hash
        assert len(view.ip_hash) == 64  # SHA-256

    def test_make_search_log(self):
        log = make_search_log()
        assert log.pk is not None
        assert log.query == "Pfadfinder Spiel"

    def test_make_measuring_unit(self):
        unit = make_measuring_unit()
        assert unit.pk is not None
        assert unit.name == "Gramm"

    def test_make_material_name(self):
        mat = make_material_name()
        assert mat.pk is not None
        assert mat.slug  # auto-generated

    def test_make_material_item(self):
        item = make_material_item()
        assert item.pk is not None
        assert item.idea is not None

    def test_make_nutritional_tag(self):
        tag = make_nutritional_tag()
        assert tag.pk is not None
        assert tag.name == "Fleisch"

    def test_make_retail_section(self):
        section = make_retail_section()
        assert section.pk is not None
        assert section.name == "Obst & Gemüse"

    def test_make_ingredient(self):
        ingredient = make_ingredient()
        assert ingredient.pk is not None
        assert ingredient.slug
        assert ingredient.energy_kj == 322.0

    def test_make_ingredient_alias(self):
        alias = make_ingredient_alias()
        assert alias.pk is not None
        assert alias.name == "Erdapfel"
        assert alias.ingredient is not None

    def test_make_portion(self):
        portion = make_portion()
        assert portion.pk is not None
        assert portion.weight_g == 150.0
        assert portion.ingredient is not None

    def test_make_price(self):
        from decimal import Decimal

        price = make_price()
        assert price.pk is not None
        assert price.price_eur == Decimal("1.99")
        assert price.portion is not None

    def test_make_user_preferences(self):
        prefs = make_user_preferences()
        assert prefs.pk is not None
        assert prefs.user is not None
