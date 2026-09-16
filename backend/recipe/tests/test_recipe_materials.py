"""Tests for recipe material endpoints and AI material flows."""

import json
from unittest.mock import patch

import pytest
from django.contrib.contenttypes.models import ContentType

from content.choices import ContentStatus
from recipe.models import Recipe
from recipe.services.ai_materials_service import MatchedMaterialResult
from supply.models import ContentMaterialItem, Material


@pytest.fixture
def toothpick_material(db):
    return Material.objects.create(name="Zahnstocher", material_category="kitchen")


@pytest.fixture
def foil_material(db):
    return Material.objects.create(name="Alufolie", material_category="kitchen")


@pytest.fixture
def paper_material(db):
    return Material.objects.create(name="Backpapier", material_category="kitchen")


@pytest.fixture
def owner_recipe(db, auth_client):
    user = auth_client._user
    recipe = Recipe.objects.create(title="Tomate-Mozzarella-Spieße", status=ContentStatus.DRAFT, created_by=user)
    recipe.authors.add(user)
    return recipe


@pytest.fixture
def public_foreign_recipe(db, django_user_model):
    other = django_user_model.objects.create_user(username="foreign", password="pw")
    return Recipe.objects.create(
        title="Öffentliches Rezept",
        status=ContentStatus.APPROVED,
        created_by=other,
        owner=other,
        visibility="public",
    )


def _create_material_item(recipe: Recipe, material: Material, quantity: str = "", sort_order: int = 0):
    ct = ContentType.objects.get_for_model(Recipe)
    return ContentMaterialItem.objects.create(
        content_type=ct,
        object_id=recipe.id,
        material=material,
        quantity=quantity,
        sort_order=sort_order,
    )


@pytest.mark.django_db
class TestRecipeMaterialCrud:
    def test_unauthenticated_create_returns_403(self, api_client, owner_recipe, toothpick_material):
        resp = api_client.post(
            f"/api/recipes/{owner_recipe.id}/materials/",
            data=json.dumps({"material_id": toothpick_material.id, "quantity": "30 Stück"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_unauthenticated_update_returns_403(self, api_client, owner_recipe, toothpick_material):
        item = _create_material_item(owner_recipe, toothpick_material)
        resp = api_client.patch(
            f"/api/recipes/{owner_recipe.id}/materials/{item.id}/",
            data=json.dumps({"quantity": "10 Stück"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_non_editor_cannot_create(self, auth_client, django_user_model, public_foreign_recipe, toothpick_material):
        django_user_model.objects.create_user(username="viewer", password="pw")
        resp = auth_client.post(
            f"/api/recipes/{public_foreign_recipe.id}/materials/",
            data=json.dumps({"material_id": toothpick_material.id, "quantity": "1"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_owner_can_create_and_list(self, auth_client, owner_recipe, toothpick_material):
        resp = auth_client.post(
            f"/api/recipes/{owner_recipe.id}/materials/",
            data=json.dumps({"material_id": toothpick_material.id, "quantity": "30 Stück"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["material_id"] == toothpick_material.id
        assert data["material_name"] == "Zahnstocher"
        assert data["quantity"] == "30 Stück"
        assert data["sort_order"] == 1

        resp = auth_client.get(f"/api/recipes/{owner_recipe.id}/materials/")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["id"] == data["id"]

    def test_create_duplicate_merges_quantity(self, auth_client, owner_recipe, toothpick_material):
        first = auth_client.post(
            f"/api/recipes/{owner_recipe.id}/materials/",
            data=json.dumps({"material_id": toothpick_material.id, "quantity": "30 Stück"}),
            content_type="application/json",
        )
        assert first.status_code == 201

        second = auth_client.post(
            f"/api/recipes/{owner_recipe.id}/materials/",
            data=json.dumps({"material_id": toothpick_material.id, "quantity": "50 Stück"}),
            content_type="application/json",
        )
        assert second.status_code == 200
        assert second.json()["id"] == first.json()["id"]
        assert second.json()["quantity"] == "50 Stück"
        assert ContentMaterialItem.objects.filter(object_id=owner_recipe.id).count() == 1

    def test_create_unknown_material_returns_404(self, auth_client, owner_recipe):
        resp = auth_client.post(
            f"/api/recipes/{owner_recipe.id}/materials/",
            data=json.dumps({"material_id": 999999, "quantity": "1"}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_update_quantity_and_sort_order(self, auth_client, owner_recipe, toothpick_material):
        item = _create_material_item(owner_recipe, toothpick_material, quantity="30 Stück", sort_order=0)
        resp = auth_client.patch(
            f"/api/recipes/{owner_recipe.id}/materials/{item.id}/",
            data=json.dumps({"quantity": "1 Rolle", "sort_order": 5}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["quantity"] == "1 Rolle"
        assert resp.json()["sort_order"] == 5

    def test_update_item_of_other_recipe_returns_404(self, auth_client, owner_recipe, toothpick_material):
        other = Recipe.objects.create(title="Anderes Rezept", status=ContentStatus.DRAFT, created_by=auth_client._user)
        foreign_item = _create_material_item(other, toothpick_material)
        resp = auth_client.patch(
            f"/api/recipes/{owner_recipe.id}/materials/{foreign_item.id}/",
            data=json.dumps({"quantity": "1"}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_delete_material(self, auth_client, owner_recipe, toothpick_material):
        item = _create_material_item(owner_recipe, toothpick_material)
        resp = auth_client.delete(f"/api/recipes/{owner_recipe.id}/materials/{item.id}/")
        assert resp.status_code == 204
        assert not ContentMaterialItem.objects.filter(id=item.id).exists()

    def test_reorder_materials(self, auth_client, owner_recipe, toothpick_material, foil_material, paper_material):
        first = _create_material_item(owner_recipe, toothpick_material, sort_order=0)
        second = _create_material_item(owner_recipe, foil_material, sort_order=1)
        third = _create_material_item(owner_recipe, paper_material, sort_order=2)

        resp = auth_client.post(
            f"/api/recipes/{owner_recipe.id}/materials/reorder/",
            data=json.dumps({"item_ids": [third.id, first.id, second.id]}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert [item["id"] for item in data] == [third.id, first.id, second.id]
        assert [item["sort_order"] for item in data] == [0, 1, 2]

    def test_reorder_with_unknown_ids_returns_400(self, auth_client, owner_recipe, toothpick_material):
        item = _create_material_item(owner_recipe, toothpick_material)
        resp = auth_client.post(
            f"/api/recipes/{owner_recipe.id}/materials/reorder/",
            data=json.dumps({"item_ids": [item.id, 999999]}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_non_editor_cannot_reorder(self, auth_client, public_foreign_recipe):
        resp = auth_client.post(
            f"/api/recipes/{public_foreign_recipe.id}/materials/reorder/",
            data=json.dumps({"item_ids": []}),
            content_type="application/json",
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestRecipeMaterialInDetail:
    def test_detail_includes_materials(self, auth_client, owner_recipe, toothpick_material):
        _create_material_item(owner_recipe, toothpick_material, quantity="30 Stück", sort_order=0)
        resp = auth_client.get(f"/api/recipes/{owner_recipe.id}/")
        assert resp.status_code == 200
        materials = resp.json()["materials"]
        assert len(materials) == 1
        assert materials[0]["material_name"] == "Zahnstocher"
        assert materials[0]["quantity"] == "30 Stück"

    def test_detail_includes_legacy_admin_item(self, auth_client, owner_recipe, toothpick_material):
        _create_material_item(owner_recipe, toothpick_material, quantity="", sort_order=0)
        resp = auth_client.get(f"/api/recipes/{owner_recipe.id}/")
        assert resp.status_code == 200
        assert resp.json()["materials"][0]["quantity"] == ""


@pytest.mark.django_db
class TestAiMaterialFlows:
    def test_suggest_unauthenticated_returns_403(self, api_client, owner_recipe):
        resp = api_client.post(f"/api/recipes/{owner_recipe.id}/ai-suggest-materials/")
        assert resp.status_code == 403

    def test_suggest_returns_contract(self, auth_client, owner_recipe):
        results = [
            MatchedMaterialResult(
                material_id=1,
                suggested_name="Zahnstocher",
                quantity="30 Stück",
                matched_name="Zahnstocher",
                is_new=False,
            ),
            MatchedMaterialResult(
                material_id=None,
                suggested_name="Spießhalter",
                quantity="1 Stück",
                matched_name=None,
                is_new=True,
            ),
        ]
        with patch(
            "recipe.services.ai_materials_service.RecipeAiMaterialsService.get_full_suggestions",
            return_value=(results, "interaction-1"),
        ):
            resp = auth_client.post(f"/api/recipes/{owner_recipe.id}/ai-suggest-materials/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ai_interaction_id"] == "interaction-1"
        assert data["items"][0]["material_id"] == 1
        assert data["items"][0]["matched_name"] == "Zahnstocher"
        assert data["items"][0]["is_new"] is False
        assert data["items"][1]["material_id"] is None
        assert data["items"][1]["is_new"] is True

    def test_suggest_service_failure_returns_503(self, auth_client, owner_recipe):
        with patch(
            "recipe.services.ai_materials_service.RecipeAiMaterialsService.get_full_suggestions",
            return_value=(None, None),
        ):
            resp = auth_client.post(f"/api/recipes/{owner_recipe.id}/ai-suggest-materials/")
        assert resp.status_code == 503

    def test_apply_creates_links_atomically(self, auth_client, owner_recipe, toothpick_material, foil_material):
        resp = auth_client.post(
            f"/api/recipes/{owner_recipe.id}/ai-apply-materials/",
            data=json.dumps(
                [
                    {"material_id": toothpick_material.id, "quantity": "30 Stück"},
                    {"material_id": foil_material.id, "quantity": "1 Rolle"},
                ]
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert [item["material_id"] for item in data] == [toothpick_material.id, foil_material.id]
        assert [item["sort_order"] for item in data] == [1, 2]

    def test_apply_skips_already_linked(self, auth_client, owner_recipe, toothpick_material):
        _create_material_item(owner_recipe, toothpick_material, quantity="30 Stück")
        resp = auth_client.post(
            f"/api/recipes/{owner_recipe.id}/ai-apply-materials/",
            data=json.dumps([{"material_id": toothpick_material.id, "quantity": "99 Stück"}]),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json() == []
        assert ContentMaterialItem.objects.filter(object_id=owner_recipe.id).count() == 1

    def test_apply_rejects_unmatched_and_unknown_ids(self, auth_client, owner_recipe):
        resp = auth_client.post(
            f"/api/recipes/{owner_recipe.id}/ai-apply-materials/",
            data=json.dumps([{"material_id": 999999, "quantity": "1 Stück"}]),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json() == []
        assert ContentMaterialItem.objects.filter(object_id=owner_recipe.id).count() == 0

    def test_apply_unauthenticated_returns_403(self, api_client, owner_recipe, toothpick_material):
        resp = api_client.post(
            f"/api/recipes/{owner_recipe.id}/ai-apply-materials/",
            data=json.dumps([{"material_id": toothpick_material.id}]),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_apply_non_editor_returns_403(self, auth_client, public_foreign_recipe, toothpick_material):
        resp = auth_client.post(
            f"/api/recipes/{public_foreign_recipe.id}/ai-apply-materials/",
            data=json.dumps([{"material_id": toothpick_material.id}]),
            content_type="application/json",
        )
        assert resp.status_code == 403
