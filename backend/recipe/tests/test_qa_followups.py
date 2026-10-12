"""Regression tests for the food-qa-followups change."""

import json

import pytest

from recipe.models import Recipe


def _create(client, **payload):
    return client.post("/api/recipes/", data=json.dumps(payload), content_type="application/json")


@pytest.mark.django_db
class TestRecipeTitleAndSlug:
    def test_whitespace_title_is_rejected(self, auth_client):
        resp = _create(auth_client, title="   ", recipe_type="warm_meal")
        assert resp.status_code == 422
        assert Recipe.all_objects.count() == 0

    def test_title_is_trimmed(self, auth_client):
        resp = _create(auth_client, title="  Linsensuppe ", recipe_type="warm_meal")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Linsensuppe"

    def test_slug_transliterates_sharp_s(self, auth_client):
        resp = _create(auth_client, title="Tomatensoße", recipe_type="warm_meal")
        assert resp.status_code == 200
        assert resp.json()["slug"] == "tomatensosse"
