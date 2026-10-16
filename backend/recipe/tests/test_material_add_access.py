"""Adding a material to a recipe: who may do it and what the API answers."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from recipe.tests import make_recipe
from supply.models import Material


@pytest.fixture
def owner(db):
    return get_user_model().objects.create_user(username="owner", email="owner@example.com", password="x")


@pytest.fixture
def stranger(db):
    return get_user_model().objects.create_user(username="peter", email="peter@example.com", password="x")


def _client(user) -> Client:
    c = Client()
    c.force_login(user)
    return c


@pytest.fixture
def pot(db):
    return Material.objects.create(name="Topf", is_consumable=False)


@pytest.mark.django_db
class TestAddMaterialAccess:
    def test_owner_can_create_catalog_material_and_link_it(self, owner, pot):
        client = _client(owner)
        recipe = make_recipe(created_by=owner)
        created = client.post(
            "/api/supplies/materials/",
            {"name": "Pappteller", "is_consumable": True, "material_category": "kitchen"},
            content_type="application/json",
        )
        assert created.status_code in (200, 201), created.content
        material_id = created.json()["id"]
        linked = client.post(
            f"/api/recipes/{recipe.id}/materials/",
            {"material_id": material_id, "amount": 1, "quantity_mode": "per_portion"},
            content_type="application/json",
        )
        assert linked.status_code == 201, linked.content

    def test_owner_can_link_existing_material(self, owner, pot):
        client = _client(owner)
        recipe = make_recipe(created_by=owner)
        linked = client.post(
            f"/api/recipes/{recipe.id}/materials/",
            {"material_id": pot.id, "amount": 1, "quantity_mode": "total"},
            content_type="application/json",
        )
        assert linked.status_code == 201, linked.content

    def test_stranger_cannot_link_material_to_foreign_recipe(self, owner, stranger, pot):
        recipe = make_recipe(created_by=owner)
        linked = _client(stranger).post(
            f"/api/recipes/{recipe.id}/materials/",
            {"material_id": pot.id, "amount": 1, "quantity_mode": "total"},
            content_type="application/json",
        )
        # Not 201: the link is refused (403 for readable recipes, 404 for hidden ones).
        assert linked.status_code in (403, 404), linked.content

    def test_linking_a_soft_deleted_material_is_refused(self, owner, pot):
        client = _client(owner)
        recipe = make_recipe(created_by=owner)
        pot.soft_delete()
        linked = client.post(
            f"/api/recipes/{recipe.id}/materials/",
            {"material_id": pot.id, "amount": 1, "quantity_mode": "total"},
            content_type="application/json",
        )
        assert linked.status_code == 404, linked.content
