"""Tests for the per-recipe AI rerank of open review rows."""

from unittest.mock import patch

import pytest
from django.contrib.auth.models import AnonymousUser

from recipe.services.ingredient_matcher import MatchCandidate, MatchResult
from recipe.services.ingredient_rerank import rerank_open_rows


def _open_match() -> MatchResult:
    return MatchResult(
        needs_review=True,
        name="weiß Balsamico",
        matched_via="index",
        candidates=[
            MatchCandidate(id=11, name="Weißer Balsamicoessig", confidence=0.69),
            MatchCandidate(id=12, name="Balsamicocreme", confidence=0.49),
        ],
    )


def _response(payload: str):
    return type("Response", (), {"text": payload})()


@pytest.fixture
def user(django_user_model):
    return django_user_model.objects.create_user(username="cook", password="x")


@pytest.mark.django_db
def test_choice_becomes_a_suggestion(user):
    match = _open_match()
    payload = '{"choices": [{"index": 0, "ingredient_id": 11, "reason": "Gleiche Zutat"}]}'
    with patch("core.services.gemini.gemini_call", return_value=(_response(payload), None)) as mocked:
        rerank_open_rows([("4 EL Balsamico weiß", match)], user)

    assert mocked.call_count == 1
    assert (match.ingredient_id, match.name, match.matched_via) == (11, "Weißer Balsamicoessig", "ai")
    assert match.needs_review is True
    assert "Gleiche Zutat" in match.reason


@pytest.mark.django_db
def test_ids_outside_the_candidates_are_ignored(user):
    match = _open_match()
    payload = '{"choices": [{"index": 0, "ingredient_id": 999, "reason": ""}]}'
    with patch("core.services.gemini.gemini_call", return_value=(_response(payload), None)):
        rerank_open_rows([("4 EL Balsamico weiß", match)], user)

    assert match.ingredient_id is None


@pytest.mark.django_db
def test_matched_rows_are_not_sent(user):
    matched = MatchResult(ingredient_id=5, name="Salz", candidates=[MatchCandidate(id=5, name="Salz", confidence=1)])
    with patch("core.services.gemini.gemini_call") as mocked:
        rerank_open_rows([("1 Prise Salz", matched)], user)

    mocked.assert_not_called()


def test_anonymous_previews_skip_the_ai_call():
    match = _open_match()
    with patch("core.services.gemini.gemini_call") as mocked:
        rerank_open_rows([("4 EL Balsamico weiß", match)], AnonymousUser())

    mocked.assert_not_called()
    assert match.ingredient_id is None


@pytest.mark.django_db
def test_unavailable_gemini_leaves_rows_open(user):
    match = _open_match()
    with patch("core.services.gemini.gemini_call", return_value=(None, None)):
        rerank_open_rows([("4 EL Balsamico weiß", match)], user)

    assert match.ingredient_id is None
