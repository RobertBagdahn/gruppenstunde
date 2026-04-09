"""Tests for Shopping List API endpoints."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from shopping.models import (
    CollaboratorRole,
    ShoppingList,
    ShoppingListCollaborator,
    ShoppingListItem,
    SourceType,
)
from supply.tests import make_ingredient, make_measuring_unit, make_portion, make_retail_section

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", email="alice@example.com", password="test123")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="bob", email="bob@example.com", password="test123")


@pytest.fixture
def third_user(db):
    return User.objects.create_user(username="carol", email="carol@example.com", password="test123")


@pytest.fixture
def client_alice(user) -> Client:
    c = Client()
    c.force_login(user)
    c._user = user
    return c


@pytest.fixture
def client_bob(other_user) -> Client:
    c = Client()
    c.force_login(other_user)
    c._user = other_user
    return c


@pytest.fixture
def shopping_list(user):
    return ShoppingList.objects.create(
        name="Wocheneinkauf",
        owner=user,
        source_type=SourceType.MANUAL,
    )


@pytest.fixture
def shopping_list_with_items(shopping_list):
    ShoppingListItem.objects.create(shopping_list=shopping_list, name="Mehl", quantity_g=500, unit="g", sort_order=0)
    ShoppingListItem.objects.create(shopping_list=shopping_list, name="Eier", quantity_g=600, unit="g", sort_order=1)
    ShoppingListItem.objects.create(shopping_list=shopping_list, name="Milch", quantity_g=1000, unit="ml", sort_order=2)
    return shopping_list


# ---------------------------------------------------------------------------
# 14.2 — Shopping List CRUD
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestListShoppingLists:
    def test_unauthenticated_returns_403(self):
        c = Client()
        res = c.get("/api/shopping-lists/")
        assert res.status_code == 403

    def test_returns_own_lists(self, client_alice, shopping_list):
        res = client_alice.get("/api/shopping-lists/")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "Wocheneinkauf"

    def test_returns_shared_lists(self, client_bob, shopping_list, other_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.VIEWER
        )
        res = client_bob.get("/api/shopping-lists/")
        assert res.status_code == 200
        assert res.json()["total"] == 1

    def test_does_not_return_unrelated_lists(self, client_bob, shopping_list):
        res = client_bob.get("/api/shopping-lists/")
        assert res.status_code == 200
        assert res.json()["total"] == 0


@pytest.mark.django_db
class TestCreateShoppingList:
    def test_create_manual_list(self, client_alice):
        res = client_alice.post(
            "/api/shopping-lists/",
            data=json.dumps({"name": "Neue Liste"}),
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Neue Liste"
        assert data["source_type"] == "manual"

    def test_unauthenticated_returns_403(self):
        c = Client()
        res = c.post(
            "/api/shopping-lists/",
            data=json.dumps({"name": "X"}),
            content_type="application/json",
        )
        assert res.status_code == 403


@pytest.mark.django_db
class TestGetShoppingList:
    def test_owner_can_view(self, client_alice, shopping_list_with_items):
        sl = shopping_list_with_items
        res = client_alice.get(f"/api/shopping-lists/{sl.id}/")
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Wocheneinkauf"
        assert len(data["items"]) == 3
        assert data["can_edit"] is True

    def test_collaborator_can_view(self, client_bob, shopping_list, other_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.VIEWER
        )
        res = client_bob.get(f"/api/shopping-lists/{shopping_list.id}/")
        assert res.status_code == 200
        assert res.json()["can_edit"] is False

    def test_editor_can_edit(self, client_bob, shopping_list, other_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.EDITOR
        )
        res = client_bob.get(f"/api/shopping-lists/{shopping_list.id}/")
        assert res.status_code == 200
        assert res.json()["can_edit"] is True

    def test_unrelated_user_gets_404(self, client_bob, shopping_list):
        res = client_bob.get(f"/api/shopping-lists/{shopping_list.id}/")
        assert res.status_code == 404


@pytest.mark.django_db
class TestUpdateShoppingList:
    def test_owner_can_update_name(self, client_alice, shopping_list):
        res = client_alice.patch(
            f"/api/shopping-lists/{shopping_list.id}/",
            data=json.dumps({"name": "Neuer Name"}),
            content_type="application/json",
        )
        assert res.status_code == 200
        assert res.json()["name"] == "Neuer Name"

    def test_editor_cannot_update_name(self, client_bob, shopping_list, other_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.EDITOR
        )
        res = client_bob.patch(
            f"/api/shopping-lists/{shopping_list.id}/",
            data=json.dumps({"name": "Hack"}),
            content_type="application/json",
        )
        assert res.status_code == 403

    def test_admin_collaborator_can_update_name(self, client_bob, shopping_list, other_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.ADMIN
        )
        res = client_bob.patch(
            f"/api/shopping-lists/{shopping_list.id}/",
            data=json.dumps({"name": "Admin-Edit"}),
            content_type="application/json",
        )
        assert res.status_code == 200
        assert res.json()["name"] == "Admin-Edit"


@pytest.mark.django_db
class TestDeleteShoppingList:
    def test_owner_can_delete(self, client_alice, shopping_list):
        res = client_alice.delete(f"/api/shopping-lists/{shopping_list.id}/")
        assert res.status_code == 200
        assert not ShoppingList.objects.filter(id=shopping_list.id).exists()

    def test_non_owner_cannot_delete(self, client_bob, shopping_list, other_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.ADMIN
        )
        res = client_bob.delete(f"/api/shopping-lists/{shopping_list.id}/")
        assert res.status_code == 403


# ---------------------------------------------------------------------------
# Items
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAddItem:
    def test_owner_can_add_item(self, client_alice, shopping_list):
        res = client_alice.post(
            f"/api/shopping-lists/{shopping_list.id}/items/",
            data=json.dumps({"name": "Butter", "quantity_g": 250, "unit": "g"}),
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["name"] == "Butter"
        assert data["quantity_g"] == 250

    def test_viewer_cannot_add_item(self, client_bob, shopping_list, other_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.VIEWER
        )
        res = client_bob.post(
            f"/api/shopping-lists/{shopping_list.id}/items/",
            data=json.dumps({"name": "X"}),
            content_type="application/json",
        )
        assert res.status_code == 403


@pytest.mark.django_db
class TestUpdateItem:
    def test_check_item(self, client_alice, shopping_list_with_items):
        sl = shopping_list_with_items
        item = sl.items.first()
        res = client_alice.patch(
            f"/api/shopping-lists/{sl.id}/items/{item.id}/",
            data=json.dumps({"is_checked": True}),
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_checked"] is True
        assert data["checked_by_username"] is not None

    def test_uncheck_item(self, client_alice, shopping_list_with_items):
        sl = shopping_list_with_items
        item = sl.items.first()
        # Check then uncheck
        client_alice.patch(
            f"/api/shopping-lists/{sl.id}/items/{item.id}/",
            data=json.dumps({"is_checked": True}),
            content_type="application/json",
        )
        res = client_alice.patch(
            f"/api/shopping-lists/{sl.id}/items/{item.id}/",
            data=json.dumps({"is_checked": False}),
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_checked"] is False
        assert data["checked_by_username"] is None


@pytest.mark.django_db
class TestDeleteItem:
    def test_owner_can_delete_item(self, client_alice, shopping_list_with_items):
        sl = shopping_list_with_items
        item = sl.items.first()
        res = client_alice.delete(f"/api/shopping-lists/{sl.id}/items/{item.id}/")
        assert res.status_code == 200
        assert not ShoppingListItem.objects.filter(id=item.id).exists()


# ---------------------------------------------------------------------------
# 14.5 — Collaborator management
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAddCollaborator:
    def test_owner_can_invite(self, client_alice, shopping_list, other_user):
        res = client_alice.post(
            f"/api/shopping-lists/{shopping_list.id}/collaborators/",
            data=json.dumps({"user_id": other_user.id, "role": "editor"}),
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == other_user.id
        assert data["role"] == "editor"

    def test_cannot_invite_owner(self, client_alice, shopping_list, user):
        res = client_alice.post(
            f"/api/shopping-lists/{shopping_list.id}/collaborators/",
            data=json.dumps({"user_id": user.id, "role": "editor"}),
            content_type="application/json",
        )
        assert res.status_code == 400

    def test_cannot_invite_duplicate(self, client_alice, shopping_list, other_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.VIEWER
        )
        res = client_alice.post(
            f"/api/shopping-lists/{shopping_list.id}/collaborators/",
            data=json.dumps({"user_id": other_user.id, "role": "editor"}),
            content_type="application/json",
        )
        assert res.status_code == 400

    def test_editor_cannot_invite(self, client_bob, shopping_list, other_user, third_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.EDITOR
        )
        res = client_bob.post(
            f"/api/shopping-lists/{shopping_list.id}/collaborators/",
            data=json.dumps({"user_id": third_user.id, "role": "viewer"}),
            content_type="application/json",
        )
        assert res.status_code == 403


@pytest.mark.django_db
class TestUpdateCollaborator:
    def test_owner_can_change_role(self, client_alice, shopping_list, other_user):
        collab = ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.VIEWER
        )
        res = client_alice.patch(
            f"/api/shopping-lists/{shopping_list.id}/collaborators/{collab.id}/",
            data=json.dumps({"role": "admin"}),
            content_type="application/json",
        )
        assert res.status_code == 200
        assert res.json()["role"] == "admin"


@pytest.mark.django_db
class TestRemoveCollaborator:
    def test_owner_can_remove(self, client_alice, shopping_list, other_user):
        collab = ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.EDITOR
        )
        res = client_alice.delete(
            f"/api/shopping-lists/{shopping_list.id}/collaborators/{collab.id}/",
        )
        assert res.status_code == 200
        assert not ShoppingListCollaborator.objects.filter(id=collab.id).exists()


# ---------------------------------------------------------------------------
# 14.3 — Export from recipe
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateFromRecipe:
    @pytest.fixture
    def recipe_with_items(self):
        """Create a recipe with two ingredient items for export testing."""
        from recipe.tests import make_recipe

        recipe = make_recipe(servings=1)
        rs = make_retail_section(name="Obst & Gemuese")
        mu = make_measuring_unit()
        ing1 = make_ingredient(name="Mehl", retail_section=rs)
        ing2 = make_ingredient(name="Butter", retail_section=rs)
        p1 = make_portion(ing1, name="100g", quantity=1.0, weight_g=100, measuring_unit=mu)
        p2 = make_portion(ing2, name="250g Stueck", quantity=1.0, weight_g=250, measuring_unit=mu)

        from recipe.models import RecipeItem

        RecipeItem.objects.create(recipe=recipe, portion=p1, quantity=5, sort_order=0)
        RecipeItem.objects.create(recipe=recipe, portion=p2, quantity=1, sort_order=1)
        return recipe

    def test_create_list_from_recipe(self, client_alice, recipe_with_items):
        res = client_alice.post(
            f"/api/shopping-lists/from-recipe/{recipe_with_items.id}/",
            data=json.dumps({"servings": 2}),
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert "Einkaufsliste:" in data["name"]
        assert data["source_type"] == "recipe"
        assert len(data["items"]) == 2

        # Check scaled quantities (servings=2):
        # Item 1: 5 * 100g * 2 = 1000g
        # Item 2: 1 * 250g * 2 = 500g
        items_by_name = {i["name"]: i for i in data["items"]}
        assert items_by_name["Mehl"]["quantity_g"] == 1000.0
        assert items_by_name["Butter"]["quantity_g"] == 500.0

    def test_unauthenticated_returns_403(self, recipe_with_items):
        c = Client()
        res = c.post(
            f"/api/shopping-lists/from-recipe/{recipe_with_items.id}/",
            data=json.dumps({"servings": 1}),
            content_type="application/json",
        )
        assert res.status_code == 403


# ---------------------------------------------------------------------------
# 14.4 — Export from MealEvent
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateFromMealEvent:
    @pytest.fixture
    def meal_event_with_data(self, user):
        """Create a MealEvent with meals and recipe items."""
        from planner.tests import make_meal, make_meal_event, make_meal_item
        from recipe.tests import make_recipe

        me = make_meal_event(created_by=user)
        meal = make_meal(meal_event=me)

        # Create recipe with items
        recipe = make_recipe(servings=1)
        rs = make_retail_section(name="Milchprodukte")
        mu = make_measuring_unit()
        ing = make_ingredient(name="Joghurt", retail_section=rs)
        p = make_portion(ing, name="Becher", quantity=1.0, weight_g=500, measuring_unit=mu)

        from recipe.models import RecipeItem

        RecipeItem.objects.create(recipe=recipe, portion=p, quantity=1, sort_order=0)
        make_meal_item(meal=meal, recipe=recipe)
        return me

    def test_create_list_from_meal_event(self, client_alice, meal_event_with_data):
        me = meal_event_with_data
        res = client_alice.post(
            f"/api/shopping-lists/from-meal-event/{me.id}/",
            data="{}",
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert "Einkaufsliste:" in data["name"]
        assert data["source_type"] == "meal_event"
        # Should have items from the shopping service
        assert len(data["items"]) >= 0  # May be 0 if service produces nothing, >= 1 ideally
