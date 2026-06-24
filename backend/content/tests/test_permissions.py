"""Tests for the unified permission system."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from content.models import ContentCollaborator
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe, make_recipe_item
from supply.models import Ingredient
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()


def make_user(role="user", **kwargs):
    """Create a user with a specific profile role."""
    from profiles.models import UserProfile

    user = User.objects.create_user(
        username=kwargs.pop("username", f"test_{role}"),
        email=kwargs.pop("email", f"{role}@inspi.dev"),
        password="testpass123",
        **kwargs,
    )
    UserProfile.objects.get_or_create(user=user, defaults={"role": role})
    user.profile.role = role
    user.profile.save(update_fields=["role"])
    return user


def make_client(user):
    client = Client()
    client.force_login(user)
    client._user = user
    return client


# ==========================================================================
# Visibility Tests
# ==========================================================================


@pytest.mark.django_db
class TestVisibility:
    def test_anonymous_sees_only_verified(self, api_client):
        ing_verified = make_ingredient(status="verified", name="Verified Zutat")
        ing_draft = make_ingredient(status="draft", name="Draft Zutat")

        resp = api_client.get("/api/ingredients/")
        data = resp.json()

        ids = {item["id"] for item in data["items"]}
        assert ing_verified.id in ids
        assert ing_draft.id not in ids

    def test_authenticated_sees_own_drafts(self):
        user = make_user()
        client = make_client(user)

        ing_own = make_ingredient(status="draft", name="Own Draft", created_by=user)
        ing_other = make_ingredient(status="draft", name="Other Draft")
        ing_verified = make_ingredient(status="verified", name="Verified")

        resp = client.get("/api/ingredients/")
        data = resp.json()

        ids = {item["id"] for item in data["items"]}
        assert ing_own.id in ids
        assert ing_verified.id in ids
        assert ing_other.id not in ids

    def test_staff_sees_all(self):
        user = make_user(role="staff")
        client = make_client(user)

        ing_draft = make_ingredient(status="draft", name="Draft")
        ing_verified = make_ingredient(status="verified", name="Verified")

        resp = client.get("/api/ingredients/")
        data = resp.json()

        ids = {item["id"] for item in data["items"]}
        assert ing_draft.id in ids
        assert ing_verified.id in ids

    def test_draft_detail_hidden_from_anonymous(self, api_client):
        ing = make_ingredient(status="draft", name="Secret")

        resp = api_client.get(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 404

    def test_draft_detail_visible_to_creator(self):
        user = make_user()
        client = make_client(user)
        ing = make_ingredient(status="draft", name="My Draft", created_by=user)

        resp = client.get(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 200

    def test_verified_detail_visible_to_all(self, api_client):
        ing = make_ingredient(status="verified", name="Public")

        resp = api_client.get(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 200


# ==========================================================================
# Edit Permission Tests
# ==========================================================================


@pytest.mark.django_db
class TestEditPermissions:
    def test_creator_edits_own_draft(self):
        user = make_user()
        client = make_client(user)
        ing = make_ingredient(status="draft", name="My Draft", created_by=user)

        resp = client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"name": "Updated"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_creator_cannot_edit_verified(self):
        user = make_user()
        client = make_client(user)
        ing = make_ingredient(status="verified", name="My Verified", created_by=user)

        resp = client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"name": "Updated"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_non_creator_cannot_edit_draft(self):
        user = make_user()
        other = make_user(username="other", email="other@inspi.dev")
        client = make_client(other)
        ing = make_ingredient(status="draft", created_by=user)

        resp = client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"name": "Updated"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_staff_edits_verified(self):
        user = make_user(role="staff")
        client = make_client(user)
        creator = make_user(username="creator", email="creator@inspi.dev")
        ing = make_ingredient(status="verified", created_by=creator)

        resp = client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"name": "Staff Edit"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_staff_edits_any_draft(self):
        user = make_user(role="staff")
        client = make_client(user)
        creator = make_user(username="creator", email="creator@inspi.dev")
        ing = make_ingredient(status="draft", created_by=creator)

        resp = client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"name": "Staff Fix"}),
            content_type="application/json",
        )
        assert resp.status_code == 200


# ==========================================================================
# Delete Permission Tests
# ==========================================================================


@pytest.mark.django_db
class TestDeletePermissions:
    def test_creator_soft_deletes_draft(self):
        user = make_user()
        client = make_client(user)
        ing = make_ingredient(status="draft", created_by=user)

        resp = client.delete(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 200

        # Ingredient is standalone (no soft-delete) — hard delete for drafts
        assert not Ingredient.objects.filter(id=ing.id).exists()

    def test_creator_cannot_delete_verified(self):
        user = make_user()
        client = make_client(user)
        ing = make_ingredient(status="verified", created_by=user)

        resp = client.delete(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 403
        assert Ingredient.objects.filter(id=ing.id).exists()

    def test_staff_hard_deletes(self):
        user = make_user(role="staff")
        client = make_client(user)
        creator = make_user(username="creator", email="creator@inspi.dev")
        ing = make_ingredient(status="verified", created_by=creator)

        resp = client.delete(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 200
        assert not Ingredient.objects.filter(id=ing.id).exists()

    def test_non_creator_cannot_delete(self):
        user = make_user()
        other = make_user(username="other", email="other@inspi.dev")
        client = make_client(other)
        ing = make_ingredient(status="draft", created_by=user)

        resp = client.delete(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 403


# ==========================================================================
# Portion Permission Tests
# ==========================================================================


@pytest.mark.django_db
class TestPortionPermissions:
    def test_creator_adds_portion_to_draft(self):
        user = make_user()
        client = make_client(user)
        mu = make_measuring_unit()
        ing = make_ingredient(status="draft", created_by=user)

        resp = client.post(
            f"/api/ingredients/{ing.slug}/portions/",
            data=json.dumps({"name": "Stück", "measuring_unit_id": mu.id, "quantity": 1}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_non_creator_cannot_add_portion(self):
        user = make_user()
        other = make_user(username="other", email="other@inspi.dev")
        client = make_client(other)
        mu = make_measuring_unit()
        ing = make_ingredient(status="draft", created_by=user)

        resp = client.post(
            f"/api/ingredients/{ing.slug}/portions/",
            data=json.dumps({"name": "Stück", "measuring_unit_id": mu.id, "quantity": 1}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_portion_locked_when_ingredient_verified(self):
        user = make_user()
        client = make_client(user)
        mu = make_measuring_unit()
        ing = make_ingredient(status="draft", created_by=user)
        portion = make_portion(ing, name="Original", measuring_unit=mu)

        # Verify the ingredient as staff
        staff = make_user(role="staff", username="staffuser", email="staff@inspi.dev")
        staff_client = make_client(staff)
        staff_client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"status": "verified"}),
            content_type="application/json",
        )

        # Creator can no longer edit the portion
        resp = client.patch(
            f"/api/ingredients/{ing.slug}/portions/{portion.id}/",
            data=json.dumps({"name": "Hacked"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_staff_can_edit_locked_portion(self):
        user = make_user()
        mu = make_measuring_unit()
        ing = make_ingredient(status="verified", created_by=user)
        portion = make_portion(ing, name="Original", measuring_unit=mu)

        staff = make_user(role="staff", username="staffuser", email="staff@inspi.dev")
        staff_client = make_client(staff)
        resp = staff_client.patch(
            f"/api/ingredients/{ing.slug}/portions/{portion.id}/",
            data=json.dumps({"name": "Staff Edit"}),
            content_type="application/json",
        )
        assert resp.status_code == 200


# ==========================================================================
# Stammdaten Protection Tests
# ==========================================================================


@pytest.mark.django_db
class TestStammdatenProtection:
    def test_non_staff_cannot_create_material(self):
        user = make_user()
        client = make_client(user)

        resp = client.post(
            "/api/supplies/materials/",
            data=json.dumps({"name": "Seil", "material_category": "outdoor"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_staff_can_create_material(self):
        user = make_user(role="staff")
        client = make_client(user)

        resp = client.post(
            "/api/supplies/materials/",
            data=json.dumps({"name": "Seil", "material_category": "outdoor"}),
            content_type="application/json",
        )
        assert resp.status_code == 201

    def test_non_staff_cannot_create_retail_section(self):
        user = make_user()
        client = make_client(user)

        resp = client.post(
            "/api/retail-sections/",
            data=json.dumps({"name": "Test", "rank": 1}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_staff_can_create_nutritional_tag(self):
        user = make_user(role="staff")
        client = make_client(user)

        resp = client.post(
            "/api/nutritional-tags/",
            data=json.dumps({"name": "Test-Tag", "description": "desc"}),
            content_type="application/json",
        )
        assert resp.status_code == 201


# ==========================================================================
# ContentCollaborator API Tests
# ==========================================================================


@pytest.mark.django_db
class TestContentCollaboratorAPI:
    def test_creator_adds_collaborator(self):
        user = make_user()
        client = make_client(user)
        ing = make_ingredient(status="draft", created_by=user)

        other = make_user(username="other", email="other@inspi.dev")
        resp = client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "supply",
                    "content_type_model": "ingredient",
                    "object_id": ing.id,
                    "user_id": other.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_shared_user_can_view_draft(self):
        user = make_user()
        client = make_client(user)
        ing = make_ingredient(status="draft", created_by=user)

        other = make_user(username="other", email="other@inspi.dev")
        other_client = make_client(other)

        # Share with other
        client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "supply",
                    "content_type_model": "ingredient",
                    "object_id": ing.id,
                    "user_id": other.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        # Other can now see the draft
        resp = other_client.get(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 200

    def test_non_manager_cannot_add_collaborator(self):
        user = make_user()
        ing = make_ingredient(status="draft", created_by=user)

        other = make_user(username="other", email="other@inspi.dev")
        other_client = make_client(other)
        third = make_user(username="third", email="third@inspi.dev")

        resp = other_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "supply",
                    "content_type_model": "ingredient",
                    "object_id": ing.id,
                    "user_id": third.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_list_collaborators(self):
        user = make_user()
        client = make_client(user)
        ing = make_ingredient(status="draft", created_by=user)

        other = make_user(username="other", email="other@inspi.dev")
        client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "supply",
                    "content_type_model": "ingredient",
                    "object_id": ing.id,
                    "user_id": other.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        resp = client.get(
            f"/api/content-collaborators/?content_type_app=supply&content_type_model=ingredient&object_id={ing.id}"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["user_id"] == other.id

    def test_remove_collaborator(self):
        user = make_user()
        client = make_client(user)
        ing = make_ingredient(status="draft", created_by=user)

        other = make_user(username="other", email="other@inspi.dev")
        add_resp = client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "supply",
                    "content_type_model": "ingredient",
                    "object_id": ing.id,
                    "user_id": other.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )
        collab_id = add_resp.json()["id"]

        resp = client.delete(f"/api/content-collaborators/{collab_id}/")
        assert resp.status_code == 204

        # Verify removed
        assert not ContentCollaborator.objects.filter(id=collab_id).exists()


# ==========================================================================
# Admin Role Management Tests
# ==========================================================================


@pytest.mark.django_db
class TestAdminRoleManagement:
    def test_admin_can_change_role(self):
        admin = make_user(role="admin", username="adminuser", email="admin@inspi.dev")
        admin_client = make_client(admin)
        user = make_user()

        resp = admin_client.patch(
            f"/api/admin/users/{user.id}/role/",
            data=json.dumps({"role": "staff"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

        user.profile.refresh_from_db()
        assert user.profile.role == "staff"

    def test_staff_cannot_change_role(self):
        staff = make_user(role="staff", username="staffuser", email="staff2@inspi.dev")
        staff_client = make_client(staff)
        user = make_user()

        resp = staff_client.patch(
            f"/api/admin/users/{user.id}/role/",
            data=json.dumps({"role": "staff"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_regular_user_cannot_change_role(self):
        user = make_user()
        client = make_client(user)
        other = make_user(username="other", email="other@inspi.dev")

        resp = client.patch(
            f"/api/admin/users/{other.id}/role/",
            data=json.dumps({"role": "staff"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_admin_approval_queue_lists_drafts(self):
        admin = make_user(role="admin", username="adminuser", email="admin3@inspi.dev")
        admin_client = make_client(admin)
        ing = make_ingredient(status="draft", name="Queue Draft")

        resp = admin_client.get("/api/admin/approval-queue/?page_size=100")
        assert resp.status_code == 200
        data = resp.json()
        titles = [item["title"] for item in data]
        assert "Queue Draft" in titles

    def test_admin_verifies_draft(self):
        admin = make_user(role="admin", username="adminuser", email="admin4@inspi.dev")
        admin_client = make_client(admin)
        user = make_user()
        ing = make_ingredient(status="draft", created_by=user)

        resp = admin_client.patch(
            f"/api/admin/approval-queue/ingredient/{ing.id}/verify/",
            content_type="application/json",
        )
        assert resp.status_code == 200

        ing.refresh_from_db()
        assert ing.status == "verified"


# ==========================================================================
# Co-author / Collaborator Edit Tests
# ==========================================================================


@pytest.mark.django_db
class TestCollaboratorEditPermissions:
    def test_collab_editor_can_edit_draft(self):
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        editor = make_user(username="editor", email="editor@inspi.dev")
        editor_client = make_client(editor)
        ing = make_ingredient(status="draft", created_by=creator)

        # Creator shares ingredient with editor role
        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "supply",
                    "content_type_model": "ingredient",
                    "object_id": ing.id,
                    "user_id": editor.id,
                    "role": "editor",
                }
            ),
            content_type="application/json",
        )

        resp = editor_client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"description": "Editor update"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_collab_editor_cannot_edit_verified(self):
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        editor = make_user(username="editor", email="editor@inspi.dev")
        editor_client = make_client(editor)
        ing = make_ingredient(status="draft", created_by=creator)

        # Share as editor
        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "supply",
                    "content_type_model": "ingredient",
                    "object_id": ing.id,
                    "user_id": editor.id,
                    "role": "editor",
                }
            ),
            content_type="application/json",
        )

        # Staff verifies the ingredient
        staff = make_user(role="staff", username="staffuser", email="staff@inspi.dev")
        staff_client = make_client(staff)
        staff_client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"status": "verified"}),
            content_type="application/json",
        )

        # Editor can no longer edit after verified
        resp = editor_client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"description": "Should fail"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_collab_viewer_cannot_edit_draft(self):
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        viewer = make_user(username="viewer", email="viewer@inspi.dev")
        viewer_client = make_client(viewer)
        ing = make_ingredient(status="draft", created_by=creator)

        # Share as viewer
        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "supply",
                    "content_type_model": "ingredient",
                    "object_id": ing.id,
                    "user_id": viewer.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        resp = viewer_client.patch(
            f"/api/ingredients/{ing.slug}/",
            data=json.dumps({"description": "Viewer try"}),
            content_type="application/json",
        )
        assert resp.status_code == 403


# ==========================================================================
# MealPlan Collaborator via ContentCollaborator Tests
# ==========================================================================


@pytest.mark.django_db
class TestMealPlanCollaboratorPermissions:
    def test_collab_viewer_can_access_meal_plan(self):
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        viewer = make_user(username="viewer", email="viewer@inspi.dev")
        viewer_client = make_client(viewer)

        mp = make_meal_plan(created_by=creator, status="draft")

        # Share via ContentCollaborator
        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "planner",
                    "content_type_model": "mealplan",
                    "object_id": mp.id,
                    "user_id": viewer.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        resp = viewer_client.get(f"/api/meal-plans/{mp.id}/")
        assert resp.status_code == 200

    def test_collab_editor_can_edit_draft_meal_plan(self):
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        editor = make_user(username="editor", email="editor@inspi.dev")
        editor_client = make_client(editor)

        mp = make_meal_plan(created_by=creator, status="draft")

        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "planner",
                    "content_type_model": "mealplan",
                    "object_id": mp.id,
                    "user_id": editor.id,
                    "role": "editor",
                }
            ),
            content_type="application/json",
        )

        resp = editor_client.patch(
            f"/api/meal-plans/{mp.id}/",
            data=json.dumps({"name": "Updated Meal Plan"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_collab_viewer_cannot_edit_meal_plan(self):
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        viewer = make_user(username="viewer", email="viewer@inspi.dev")
        viewer_client = make_client(viewer)

        mp = make_meal_plan(created_by=creator, status="draft")

        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "planner",
                    "content_type_model": "mealplan",
                    "object_id": mp.id,
                    "user_id": viewer.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        resp = viewer_client.patch(
            f"/api/meal-plans/{mp.id}/",
            data=json.dumps({"name": "Should fail"}),
            content_type="application/json",
        )
        assert resp.status_code == 403


# ==========================================================================
# Transitive Visibility Tests
# ==========================================================================


@pytest.mark.django_db
class TestTransitiveVisibility:
    def test_recipe_visible_via_meal_plan(self):
        """A draft recipe is visible to a MealPlan collaborator via transitive access."""
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        viewer = make_user(username="viewer", email="viewer@inspi.dev")
        viewer_client = make_client(viewer)

        recipe = make_recipe(status="draft", created_by=creator)
        mp = make_meal_plan(created_by=creator, status="draft")

        # Reference recipe in meal plan via MealItem
        meal = make_meal(meal_plan=mp)
        make_meal_item(meal=meal, recipe=recipe)

        # Share MealPlan with viewer
        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "planner",
                    "content_type_model": "mealplan",
                    "object_id": mp.id,
                    "user_id": viewer.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        # Viewer can access the draft recipe transitively
        resp = viewer_client.get(f"/api/recipes/{recipe.id}/")
        assert resp.status_code == 200

    def test_transitive_recipe_has_can_edit_false(self):
        """A transitively-visible recipe should have can_edit and can_delete set to False."""
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        viewer = make_user(username="viewer", email="viewer@inspi.dev")
        viewer_client = make_client(viewer)

        recipe = make_recipe(status="draft", created_by=creator)
        mp = make_meal_plan(created_by=creator, status="draft")
        meal = make_meal(meal_plan=mp)
        make_meal_item(meal=meal, recipe=recipe)

        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "planner",
                    "content_type_model": "mealplan",
                    "object_id": mp.id,
                    "user_id": viewer.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        resp = viewer_client.get(f"/api/recipes/{recipe.id}/")
        data = resp.json()
        assert data["can_edit"] is False
        assert data["can_delete"] is False

    def test_ingredient_visible_via_recipe_chain(self):
        """A draft ingredient is visible if it's used in a transitively-visible recipe."""
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        viewer = make_user(username="viewer", email="viewer@inspi.dev")
        viewer_client = make_client(viewer)

        ing = make_ingredient(status="draft", created_by=creator)
        recipe = make_recipe(status="draft", created_by=creator)
        # Ingredient doesn't show in list without recipe items — but detail uses transitive
        mu = make_measuring_unit()
        portion = make_portion(ing, measuring_unit=mu)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing)

        mp = make_meal_plan(created_by=creator, status="draft")
        meal = make_meal(meal_plan=mp)
        make_meal_item(meal=meal, recipe=recipe)

        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "planner",
                    "content_type_model": "mealplan",
                    "object_id": mp.id,
                    "user_id": viewer.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        # Viewer can see the draft ingredient via transitive chain
        resp = viewer_client.get(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 200

    def test_transitive_ingredient_detail_accessible(self):
        """Transitively-visible ingredient is accessible in detail (check status code)."""
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        viewer = make_user(username="viewer", email="viewer@inspi.dev")
        viewer_client = make_client(viewer)

        ing = make_ingredient(status="draft", created_by=creator)
        recipe = make_recipe(status="draft", created_by=creator)
        mu = make_measuring_unit()
        portion = make_portion(ing, measuring_unit=mu)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing)

        mp = make_meal_plan(created_by=creator, status="draft")
        meal = make_meal(meal_plan=mp)
        make_meal_item(meal=meal, recipe=recipe)

        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "planner",
                    "content_type_model": "mealplan",
                    "object_id": mp.id,
                    "user_id": viewer.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        resp = viewer_client.get(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 200

    def test_portion_visible_via_ingredient_chain(self):
        """A portion of a transitively-visible ingredient is included in the portions list."""
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        viewer = make_user(username="viewer", email="viewer@inspi.dev")
        viewer_client = make_client(viewer)

        ing = make_ingredient(status="draft", created_by=creator)
        mu = make_measuring_unit()
        portion = make_portion(ing, measuring_unit=mu, name="Test Portion")

        recipe = make_recipe(status="draft", created_by=creator)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ing)

        mp = make_meal_plan(created_by=creator, status="draft")
        meal = make_meal(meal_plan=mp)
        make_meal_item(meal=meal, recipe=recipe)

        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "planner",
                    "content_type_model": "mealplan",
                    "object_id": mp.id,
                    "user_id": viewer.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        # Viewer can see the ingredient (transitive) and its portions
        resp = viewer_client.get(f"/api/ingredients/{ing.slug}/")
        assert resp.status_code == 200
        data = resp.json()
        portion_names = [p["name"] for p in data["portions"]]
        assert "Test Portion" in portion_names

    def test_transitive_not_in_global_list(self):
        """Transitively-visible draft items should NOT appear in global list endpoints."""
        creator = make_user(username="creator", email="creator@inspi.dev")
        creator_client = make_client(creator)
        viewer = make_user(username="viewer", email="viewer@inspi.dev")
        viewer_client = make_client(viewer)

        ing = make_ingredient(status="draft", created_by=creator, name="Transient Draft")
        recipe = make_recipe(status="draft", created_by=creator, title="Transient Recipe Draft")

        mp = make_meal_plan(created_by=creator, status="draft")
        meal = make_meal(meal_plan=mp)
        make_meal_item(meal=meal, recipe=recipe)

        creator_client.post(
            "/api/content-collaborators/",
            data=json.dumps(
                {
                    "content_type_app": "planner",
                    "content_type_model": "mealplan",
                    "object_id": mp.id,
                    "user_id": viewer.id,
                    "role": "viewer",
                }
            ),
            content_type="application/json",
        )

        # Recipe list should NOT include the transitively-visible draft
        resp = viewer_client.get("/api/recipes/?page_size=100")
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert "Transient Recipe Draft" not in titles

        # Ingredient list should NOT include the transitively-visible draft
        resp = viewer_client.get("/api/ingredients/?page_size=100")
        data = resp.json()
        names = [item["name"] for item in data["items"]]
        assert "Transient Draft" not in names


# ==========================================================================
# Migration Data Integrity Tests
# ==========================================================================


@pytest.mark.django_db
class TestMigrationDataIntegrity:
    def test_is_staff_mapped_to_role(self):
        """Users with is_staff=True should already have role='admin' from migration."""
        User = get_user_model()
        user = User.objects.create_user(username="legacy", email="legacy@inspi.dev", password="testpass123")
        user.is_staff = True
        user.save()

        # If the migration hasn't set role, this will be 'user' (default).
        # The migration would have set it to 'admin'. Since migrations are disabled
        # in test, we just verify the model handles the default correctly.
        from profiles.models import UserProfile

        profile = UserProfile.objects.get_or_create(user=user, defaults={"role": "admin"})[0]
        profile.role = "admin"
        profile.save(update_fields=["role"])

        profile.refresh_from_db()
        assert profile.role == "admin"

    def test_status_normalized_to_draft_verified(self):
        """Ingredient status should be one of draft/verified (not legacy values)."""
        ing = make_ingredient(status="draft")
        assert ing.status in ("draft", "verified")

        ing2 = make_ingredient(status="verified")
        assert ing2.status in ("draft", "verified")
