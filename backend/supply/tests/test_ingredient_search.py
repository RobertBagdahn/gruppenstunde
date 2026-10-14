"""Shared ingredient search: substring + alias + umlaut matching and ranking in every caller."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from supply.models import IngredientAlias
from supply.services.ingredient_search import name_rank, query_variants
from supply.tests import make_ingredient

User = get_user_model()


def _client():
    user = User.objects.create_user(username="searcher", password="x")
    client = Client()
    client.force_login(user)
    return client, user


class TestRankingHelpers:
    def test_rank_order(self):
        assert name_rank("Zwiebel", [], "Zwiebel") == 0
        assert name_rank("Zwiebelmett", [], "Zwiebel") == 1
        assert name_rank("Rote Zwiebel", [], "Zwiebel") == 2
        assert name_rank("Speisezwiebel", [], "Zwiebel") == 3

    def test_alias_counts_for_rank(self):
        assert name_rank("Lauchzwiebel", ["Frühlingszwiebel"], "Frühlingszwiebel") == 0

    def test_umlaut_variants(self):
        assert "fruehling" in query_variants("Frühling")
        assert "früh" in query_variants("frueh")


@pytest.mark.django_db
class TestSharedSearch:
    def test_omnibar_finds_speisezwiebel_for_zwiebel_ranked_after_exact(self):
        client, _ = _client()
        exact = make_ingredient(name="Zwiebel", is_standalone_food=False)
        speise = make_ingredient(name="Speisezwiebel", is_standalone_food=False)

        response = client.get("/api/meal-plans/recipes/search/", {"q": "Zwiebel"})

        assert response.status_code == 200
        ids = [item["id"] for item in response.json()["ingredients"]]
        assert ids[:2] == [exact.id, speise.id]

    def test_omnibar_matches_alias(self):
        client, _ = _client()
        ingredient = make_ingredient(name="Lauchzwiebel", is_standalone_food=False)
        IngredientAlias.objects.create(ingredient=ingredient, name="Frühlingszwiebel")

        response = client.get("/api/meal-plans/recipes/search/", {"q": "Fruehlingszwiebel"})

        assert ingredient.id in [item["id"] for item in response.json()["ingredients"]]

    def test_omnibar_shows_own_drafts_but_not_foreign_drafts(self):
        client, user = _client()
        other = User.objects.create_user(username="other", password="x")
        mine = make_ingredient(name="Dinkelbrötchen", status="draft", owner=user, is_standalone_food=True)
        foreign = make_ingredient(name="Dinkelbrot fremd", status="draft", owner=other, is_standalone_food=True)

        response = client.get("/api/meal-plans/recipes/search/", {"q": "Dinkel"})

        by_id = {item["id"]: item for item in response.json()["ingredients"]}
        assert mine.id in by_id
        assert by_id[mine.id]["status"] == "draft"
        assert foreign.id not in by_id

    def test_ingredient_list_matches_umlaut_variant(self):
        client, _ = _client()
        ingredient = make_ingredient(name="Käse gerieben")

        response = client.get("/api/ingredients/", {"name": "kaese"})

        assert response.status_code == 200
        assert ingredient.id in [item["id"] for item in response.json()["items"]]
