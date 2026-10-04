"""Creating an ingredient whose name already exists answers 409 with the existing ingredient."""

import json

import pytest

from supply.models import Ingredient
from supply.tests import make_ingredient


def _post(client, name):
    return client.post("/api/ingredients/", data=json.dumps({"name": name}), content_type="application/json")


@pytest.mark.django_db
class TestDuplicateIngredientCreate:
    def test_same_name_returns_409_with_existing(self, auth_client):
        existing = make_ingredient(name="Salz", status="verified")

        resp = _post(auth_client, "Salz")

        assert resp.status_code == 409
        body = resp.json()
        assert body["code"] == "ingredient_exists"
        assert "Salz" in body["detail"]
        assert body["existing"] == {"id": existing.id, "slug": existing.slug, "name": "Salz"}
        assert Ingredient.objects.filter(name__iexact="Salz").count() == 1

    def test_comparison_ignores_case_and_whitespace(self, auth_client):
        make_ingredient(name="Salz", status="verified")

        assert _post(auth_client, "  salz ").status_code == 409

    def test_different_name_is_created(self, auth_client):
        make_ingredient(name="Salz", status="verified")

        assert _post(auth_client, "Meersalz grob").status_code == 200

    def test_soft_deleted_ingredient_does_not_block(self, auth_client):
        old = make_ingredient(name="Salz", status="verified")
        old.soft_delete()

        assert _post(auth_client, "Salz").status_code == 200

    def test_private_ingredient_of_another_user_does_not_block(self, auth_client, django_user_model):
        other = django_user_model.objects.create_user(username="other", email="o@example.com", password="x")
        make_ingredient(name="Geheimsalz", status="draft", owner=other, created_by=other)

        assert _post(auth_client, "Geheimsalz").status_code == 200
