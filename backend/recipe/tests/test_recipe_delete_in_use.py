"""Deleting a recipe that is used in a meal plan is blocked; usage endpoint lists plans."""

import pytest

from planner.models import MealPlanVisibility
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import Recipe
from recipe.tests import make_recipe


def _own_recipe(user) -> Recipe:
    recipe = make_recipe(created_by=user)
    recipe.authors.add(user)
    return recipe


@pytest.mark.django_db
class TestDeleteRecipeInUse:
    def test_delete_blocked_when_used_in_plan(self, admin_client):
        user = admin_client._user
        recipe = _own_recipe(user)
        plan = make_meal_plan(created_by=user)
        make_meal_item(meal=make_meal(meal_plan=plan), recipe=recipe)

        resp = admin_client.delete(f"/api/recipes/{recipe.id}/")

        assert resp.status_code == 409
        assert "einem Essensplan" in resp.json()["detail"]
        recipe.refresh_from_db()
        assert recipe.deleted_at is None

    def test_message_names_plan_count(self, admin_client):
        user = admin_client._user
        recipe = _own_recipe(user)
        for _ in range(2):
            plan = make_meal_plan(created_by=user)
            make_meal_item(meal=make_meal(meal_plan=plan), recipe=recipe)

        resp = admin_client.delete(f"/api/recipes/{recipe.id}/")

        assert resp.status_code == 409
        assert "2 Essensplänen" in resp.json()["detail"]

    def test_delete_succeeds_when_unused(self, admin_client):
        recipe = _own_recipe(admin_client._user)

        resp = admin_client.delete(f"/api/recipes/{recipe.id}/")

        assert resp.status_code == 200
        assert Recipe.all_objects.get(id=recipe.id).is_deleted


@pytest.mark.django_db
class TestRecipeUsageEndpoint:
    def test_lists_visible_plans(self, admin_client):
        user = admin_client._user
        recipe = _own_recipe(user)
        plan = make_meal_plan(created_by=user, name="Mein Lager")
        make_meal_item(meal=make_meal(meal_plan=plan), recipe=recipe)

        resp = admin_client.get(f"/api/recipes/{recipe.id}/usage/")

        assert resp.status_code == 200
        assert resp.json() == {"plan_count": 1, "plans": [{"id": plan.id, "name": "Mein Lager"}]}

    def test_hides_private_plan_of_other_user_but_counts_it(self, auth_client, django_user_model):
        user = auth_client._user
        other = django_user_model.objects.create_user(username="other-owner", email="o@example.com", password="x")
        recipe = _own_recipe(user)
        own_plan = make_meal_plan(created_by=user, name="Eigener Plan")
        foreign = make_meal_plan(created_by=other, name="Fremder Plan", visibility=MealPlanVisibility.PRIVATE)
        foreign.owner = other
        foreign.save(update_fields=["owner"])
        make_meal_item(meal=make_meal(meal_plan=own_plan), recipe=recipe)
        make_meal_item(meal=make_meal(meal_plan=foreign), recipe=recipe)

        resp = auth_client.get(f"/api/recipes/{recipe.id}/usage/")

        assert resp.status_code == 200
        body = resp.json()
        assert body["plan_count"] == 2
        assert [plan["name"] for plan in body["plans"]] == ["Eigener Plan"]

    def test_unused_recipe(self, auth_client):
        recipe = _own_recipe(auth_client._user)

        resp = auth_client.get(f"/api/recipes/{recipe.id}/usage/")

        assert resp.json() == {"plan_count": 0, "plans": []}

    def test_requires_login(self, api_client):
        recipe = make_recipe()

        assert api_client.get(f"/api/recipes/{recipe.id}/usage/").status_code == 401
