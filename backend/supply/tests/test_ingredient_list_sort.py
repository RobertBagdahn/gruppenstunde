"""Ingredient list page: sort and "Meine Zutaten" are applied by the server."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from supply.models import Ingredient
from supply.tests import make_ingredient

User = get_user_model()


def _names(client: Client, query: str) -> list[str]:
    response = client.get(f"/api/ingredients/?{query}&page_size=50")
    assert response.status_code == 200, response.content
    return [item["name"] for item in response.json()["items"]]


@pytest.fixture
def signed_in(client: Client):
    user = baker.make(User, is_staff=True)
    client.force_login(user)
    return user


@pytest.mark.django_db
class TestIngredientListSort:
    def test_name_sort_ascending_and_descending_ignore_case(self, client: Client, signed_in):
        for name in ["zucker", "Apfel", "butter"]:
            make_ingredient(name=name, status="verified")

        assert _names(client, "sort=name_asc") == ["Apfel", "butter", "zucker"]
        assert _names(client, "sort=name_desc") == ["zucker", "butter", "Apfel"]

    def test_newest_and_oldest_follow_creation_order(self, client: Client, signed_in):
        first = make_ingredient(name="Erste", status="verified")
        second = make_ingredient(name="Zweite", status="verified")
        assert first.id < second.id

        assert _names(client, "sort=newest")[:2] == ["Zweite", "Erste"]
        assert _names(client, "sort=oldest")[:2] == ["Erste", "Zweite"]

    def test_legacy_ordering_parameter_still_works(self, client: Client, signed_in):
        make_ingredient(name="Teuer", status="verified", price_per_kg=10)
        make_ingredient(name="Billig", status="verified", price_per_kg=1)

        assert _names(client, "ordering=price_asc")[:2] == ["Billig", "Teuer"]

    def test_mine_lists_only_own_ingredients(self, client: Client, signed_in):
        other = baker.make(User)
        make_ingredient(name="Meins", status="verified", owner=signed_in)
        make_ingredient(name="Fremd", status="verified", owner=other)
        make_ingredient(name="System", status="verified")

        assert _names(client, "origin=mine") == ["Meins"]
        assert Ingredient.objects.count() == 3
