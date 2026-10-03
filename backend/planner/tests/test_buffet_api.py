"""Tests for the buffet endpoint (planner/api/buffet.py)."""

import json

import pytest
from django.contrib.auth import get_user_model

from planner.models import MealItem, MealPlanCollaborator, MealTypeChoices
from planner.tests import make_buffet_template, make_meal, make_meal_plan
from supply.tests import make_ingredient

User = get_user_model()


@pytest.fixture
def gram_unit(db):
    from supply.models import MeasuringUnit

    unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"unit": "g", "quantity": 1.0})
    return unit


def _post_buffet(client, plan_id, meal_id, body):
    return client.post(
        f"/api/meal-plans/{plan_id}/meals/{meal_id}/buffet/",
        data=json.dumps(body),
        content_type="application/json",
    )


@pytest.mark.django_db
class TestBuffetEndpoint:
    def test_dry_run_does_not_persist(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = make_ingredient(name="Brot")
        ingredient.tags.add(bread_tag)

        resp = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": ingredient.id}],
                "dry_run": True,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["saved"] is False
        assert MealItem.objects.filter(meal=meal).count() == 0

    def test_save_replaces_only_buffet_items(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = make_ingredient(name="Brot")
        ingredient.tags.add(bread_tag)

        from recipe.tests import make_recipe

        manual_recipe = make_recipe(title="Obstsalat")
        MealItem.objects.create(meal=meal, recipe=manual_recipe, factor=1.0)

        resp = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": ingredient.id}],
                "dry_run": False,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["saved"] is True
        assert MealItem.objects.filter(meal=meal, recipe=manual_recipe).exists()
        assert MealItem.objects.filter(meal=meal, ingredient=ingredient, buffet_role="buffet-bread").exists()

    def test_selection_without_role_tag_is_accepted(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        ingredient = make_ingredient(name="Ohne Rolle")

        resp = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": ingredient.id}],
                "dry_run": True,
            },
        )
        assert resp.status_code == 200
        assert resp.json()["saved"] is False
        assert resp.json()["items"][0]["name"] == "Ohne Rolle"

    def test_system_draft_ingredient_allowed(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = make_ingredient(name="System-Entwurf", owner=None, status="draft")
        ingredient.tags.add(bread_tag)

        resp = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": ingredient.id}],
                "dry_run": False,
            },
        )
        assert resp.status_code == 200
        assert MealItem.objects.filter(meal=meal, ingredient=ingredient).exists()

    def test_foreign_private_ingredient_returns_404(self, auth_client, gram_unit):
        other_user = User.objects.create_user(username="other", password="x")
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = make_ingredient(name="Privat", owner=other_user, visibility="private")
        ingredient.tags.add(bread_tag)

        resp = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": ingredient.id}],
                "dry_run": True,
            },
        )
        assert resp.status_code == 404
        assert MealItem.objects.filter(meal=meal).count() == 0

    def test_get_state_restores_saved_item_shares(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        baguette = make_ingredient(name="Baguette Anteil")
        baguette.tags.add(bread_tag)
        toast = make_ingredient(name="Toast Anteil")
        toast.tags.add(bread_tag)

        save_response = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [
                    {"role_slug": "buffet-bread", "ingredient_id": baguette.id, "share_percent": 70},
                    {"role_slug": "buffet-bread", "ingredient_id": toast.id, "share_percent": 30},
                ],
            },
        )
        assert save_response.status_code == 200, save_response.content

        state_response = auth_client.get(f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/buffet/")
        assert state_response.status_code == 200
        shares = {
            selection["ingredient_id"]: selection["share_percent"] for selection in state_response.json()["selections"]
        }
        assert shares == {baguette.id: 70, toast.id: 30}

    def test_breakfast_profile_items_are_not_counted_or_kept_as_manual(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, meal_type=MealTypeChoices.BREAKFAST, override_portions=4)
        meal.breakfast_profile = "muesli"
        meal.save(update_fields=["breakfast_profile"])
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        assistant_ingredient = make_ingredient(name="Frühstücks-Müsli")
        assistant_ingredient.tags.add(bread_tag)
        manual_ingredient = make_ingredient(name="Manuelle Notiz")
        manual_ingredient.tags.add(bread_tag)
        MealItem.objects.create(
            meal=meal,
            ingredient=assistant_ingredient,
            quantity=80,
            measuring_unit=gram_unit,
            factor=1.0,
            is_breakfast_assistant=True,
        )
        manual_item = MealItem.objects.create(
            meal=meal,
            ingredient=manual_ingredient,
            quantity=25,
            measuring_unit=gram_unit,
            factor=1.0,
        )

        state_response = auth_client.get(f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/buffet/")
        assert state_response.status_code == 200
        assert state_response.json()["manual_item_count"] == 1

        save_response = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": assistant_ingredient.id}],
                "manual_items_policy": "preserve",
            },
        )
        assert save_response.status_code == 200, save_response.content
        meal.refresh_from_db()
        assert meal.breakfast_profile == ""
        assert MealItem.objects.filter(id=manual_item.id).exists()
        assert MealItem.objects.get(id=manual_item.id).is_breakfast_assistant is False
        assert MealItem.objects.filter(meal=meal, ingredient=assistant_ingredient, buffet_role="buffet-bread").exists()
        assert MealItem.objects.filter(meal=meal).count() == 2

    def test_anonymous_returns_403(self, api_client, gram_unit):
        meal_plan = make_meal_plan()
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})

        resp = _post_buffet(
            api_client, meal_plan.id, meal.id, {"template_id": template.id, "selections": [], "dry_run": True}
        )
        assert resp.status_code == 401
        assert MealItem.objects.filter(meal=meal).count() == 0

    def test_viewer_role_returns_403(self, auth_client, gram_unit):
        owner = User.objects.create_user(username="owner", password="x")
        meal_plan = make_meal_plan(created_by=owner)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        MealPlanCollaborator.objects.create(meal_plan=meal_plan, user=auth_client._user, role="viewer")
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})

        resp = _post_buffet(
            auth_client, meal_plan.id, meal.id, {"template_id": template.id, "selections": [], "dry_run": True}
        )
        assert resp.status_code == 403

    def test_no_role_on_plan_returns_404(self, auth_client, gram_unit):
        owner = User.objects.create_user(username="owner2", password="x")
        meal_plan = make_meal_plan(created_by=owner)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})

        resp = _post_buffet(
            auth_client, meal_plan.id, meal.id, {"template_id": template.id, "selections": [], "dry_run": True}
        )
        assert resp.status_code == 404

    def test_get_state_returns_saved_selection(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        ingredient = make_ingredient(name="Brot")
        ingredient.tags.add(bread_tag)
        _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": ingredient.id}],
                "dry_run": False,
            },
        )

        resp = auth_client.get(f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/buffet/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["template_id"] == template.id
        assert data["selections"] == [
            {
                "role_slug": "buffet-bread",
                "share_percent": 100.0,
                "ingredient_id": ingredient.id,
                "recipe_id": None,
                "kind": "ingredient",
                "name": "Brot",
                "energy_kcal_per_100g": ingredient.energy_kcal,
                "price_per_kg": None,
                "weight_per_serving_g": None,
            }
        ]
