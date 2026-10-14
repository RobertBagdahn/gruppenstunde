# Pyright does not model Django ORM descriptors in tests; backend checks use the django-stubs mypy plugin.
# pyright: reportAttributeAccessIssue=false
"""Tests for the buffet endpoint (planner/api/buffet.py)."""

import json

import pytest
from django.contrib.auth import get_user_model

from planner.models import MealItem, MealPlanCollaborator, MealTypeChoices
from planner.tests import make_buffet_template, make_meal, make_meal_plan
from supply.models import Portion
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
        Portion.objects.create(
            ingredient=ingredient,
            name="Stück",
            measuring_unit=gram_unit,
            quantity=1,
            weight_g=55,
            rank=2,
            weight_status="confirmed",
            weight_source="manual",
        )
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
                "piece_weight_g": 55.0,
            }
        ]


@pytest.mark.django_db
class TestBuffetEndpointSharesAndPolicy:
    def test_share_sum_other_than_100_returns_422(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        baguette = make_ingredient(name="Baguette Summe")
        toast = make_ingredient(name="Toast Summe")

        resp = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [
                    {"role_slug": "buffet-bread", "ingredient_id": baguette.id, "share_percent": 60},
                    {"role_slug": "buffet-bread", "ingredient_id": toast.id, "share_percent": 30},
                ],
                "dry_run": False,
            },
        )

        assert resp.status_code == 422
        assert "100 %" in resp.json()["detail"]
        assert MealItem.objects.filter(meal=meal).count() == 0

    def test_get_state_normalizes_legacy_items_without_shares(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True), "buffet-sweet": (20, "g", True)})
        meal.buffet_template = template
        meal.save(update_fields=["buffet_template"])
        baguette = make_ingredient(name="Altes Baguette")
        toast = make_ingredient(name="Alter Toast")
        jam = make_ingredient(name="Alte Marmelade")
        honey = make_ingredient(name="Alter Honig")
        for ingredient, role, share in (
            (baguette, "buffet-bread", None),
            (toast, "buffet-bread", None),
            (jam, "buffet-sweet", 70),
            (honey, "buffet-sweet", None),
        ):
            MealItem.objects.create(
                meal=meal,
                ingredient=ingredient,
                quantity=50,
                measuring_unit=gram_unit,
                factor=1.0,
                buffet_role=role,
                buffet_share_percent=share,
            )

        resp = auth_client.get(f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/buffet/")

        assert resp.status_code == 200
        shares = {selection["ingredient_id"]: selection["share_percent"] for selection in resp.json()["selections"]}
        assert shares == {baguette.id: 50, toast.id: 50, jam.id: 70, honey.id: 30}

    def test_replace_policy_removes_manual_items_and_is_restored(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread = make_ingredient(name="Brot Ersetzen")
        manual_ingredient = make_ingredient(name="Manueller Apfel")
        manual_item = MealItem.objects.create(
            meal=meal, ingredient=manual_ingredient, quantity=100, measuring_unit=gram_unit, factor=1.0
        )

        preview = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": bread.id}],
                "manual_items_policy": "replace",
                "dry_run": True,
            },
        )
        assert preview.status_code == 200
        assert "manual_items_replace" in [warning["code"] for warning in preview.json()["warnings"]]
        assert MealItem.objects.filter(id=manual_item.id).exists()

        resp = _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": bread.id}],
                "manual_items_policy": "replace",
                "dry_run": False,
            },
        )

        assert resp.status_code == 200, resp.content
        assert not MealItem.objects.filter(id=manual_item.id).exists()
        assert list(MealItem.objects.filter(meal=meal).values_list("ingredient_id", "buffet_role")) == [
            (bread.id, "buffet-bread")
        ]
        state = auth_client.get(f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/buffet/").json()
        assert state["manual_items_policy"] == "replace"
        assert state["manual_item_count"] == 0

    def test_get_state_restores_preserve_policy_and_none_before_first_save(self, auth_client, gram_unit):
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread = make_ingredient(name="Brot Erhalten")
        state_url = f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/buffet/"

        assert auth_client.get(state_url).json()["manual_items_policy"] is None

        _post_buffet(
            auth_client,
            meal_plan.id,
            meal.id,
            {
                "template_id": template.id,
                "selections": [{"role_slug": "buffet-bread", "ingredient_id": bread.id}],
                "manual_items_policy": "preserve",
            },
        )

        assert auth_client.get(state_url).json()["manual_items_policy"] == "preserve"

    def test_get_state_omits_invisible_item_with_warning(self, auth_client, gram_unit):
        other_user = User.objects.create_user(username="hidden-owner", password="x")
        meal_plan = make_meal_plan(created_by=auth_client._user)
        meal = make_meal(meal_plan=meal_plan, override_portions=4)
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        meal.buffet_template = template
        meal.save(update_fields=["buffet_template"])
        visible = make_ingredient(name="Sichtbares Brot")
        hidden = make_ingredient(name="Verstecktes Brot", owner=other_user, visibility="private")
        for ingredient in (visible, hidden):
            MealItem.objects.create(
                meal=meal,
                ingredient=ingredient,
                quantity=50,
                measuring_unit=gram_unit,
                factor=1.0,
                buffet_role="buffet-bread",
                buffet_share_percent=50,
            )

        resp = auth_client.get(f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/buffet/")

        assert resp.status_code == 200
        data = resp.json()
        assert data["template_id"] == template.id
        assert [(s["ingredient_id"], s["share_percent"]) for s in data["selections"]] == [(visible.id, 100.0)]
        assert [warning["code"] for warning in data["warnings"]] == ["hidden_saved_items"]
        assert "nicht mehr sichtbar" in data["warnings"][0]["message"]
        assert "Verstecktes Brot" not in json.dumps(data)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("meal_type", "role_slug", "unit"),
    [
        (MealTypeChoices.BREAKFAST, "buffet-bread", "g"),
        (MealTypeChoices.LUNCH, "buffet-main", "g"),
        (MealTypeChoices.DINNER, "buffet-salad", "g"),
        (MealTypeChoices.SNACK, "buffet-sweet-snack", "g"),
        (MealTypeChoices.DRINKS, "buffet-drink", "ml"),
    ],
)
def test_integrated_flow_for_every_meal_type(auth_client, gram_unit, meal_type, role_slug, unit):
    """Free search -> preview (no write) -> save -> reopen the state, for each meal type."""
    meal_plan = make_meal_plan(created_by=auth_client._user)
    meal = make_meal(meal_plan=meal_plan, meal_type=meal_type, override_portions=4)
    template = make_buffet_template(
        slug=f"flow-{meal_type}",
        roles={role_slug: (100, unit, True)},
        meal_types=[str(meal_type)],
    )
    role_tag = template.roles.get(role__slug=role_slug).role
    ingredient = make_ingredient(name=f"Flow Zutat {meal_type}", is_standalone_food=True)
    ingredient.tags.add(role_tag)

    found = auth_client.get(
        "/api/supply/buffet-catalog/search/",
        {"q": "Flow Zutat", "role": role_slug, "meal_type": str(meal_type)},
    )
    assert found.status_code == 200, found.content
    assert ingredient.id in [row["id"] for row in found.json()]

    body = {
        "template_id": template.id,
        "selections": [{"role_slug": role_slug, "ingredient_id": ingredient.id}],
    }
    preview = _post_buffet(auth_client, meal_plan.id, meal.id, {**body, "dry_run": True})
    assert preview.status_code == 200, preview.content
    assert preview.json()["saved"] is False
    assert MealItem.objects.filter(meal=meal).count() == 0

    saved = _post_buffet(auth_client, meal_plan.id, meal.id, {**body, "dry_run": False})
    assert saved.status_code == 200, saved.content
    assert saved.json()["saved"] is True
    assert MealItem.objects.filter(meal=meal, ingredient=ingredient, buffet_role=role_slug).exists()

    reopened = auth_client.get(f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/buffet/")
    assert reopened.status_code == 200
    assert reopened.json()["template_id"] == template.id
    assert [row["ingredient_id"] for row in reopened.json()["selections"]] == [ingredient.id]


@pytest.mark.django_db
def test_role_amount_in_a_natural_unit_roundtrips_through_the_api(auth_client, gram_unit):
    meal_plan = make_meal_plan(created_by=auth_client._user)
    meal = make_meal(meal_plan=meal_plan, override_portions=4)
    template = make_buffet_template(slug="unit-flow", roles={"buffet-bread": (100, "g", True)})
    bread_tag = template.roles.get(role__slug="buffet-bread").role
    roll = make_ingredient(name="Brötchen Einheit")
    roll.tags.add(bread_tag)
    Portion.objects.create(
        ingredient=roll,
        name="Stück",
        measuring_unit=gram_unit,
        quantity=1,
        weight_g=60,
        rank=1,
        weight_status="confirmed",
        weight_source="manual",
    )
    body = {
        "template_id": template.id,
        "selections": [{"role_slug": "buffet-bread", "ingredient_id": roll.id}],
        "role_amounts": {"buffet-bread": 2},
        "role_units": {"buffet-bread": "portion:stück"},
    }

    preview = _post_buffet(auth_client, meal_plan.id, meal.id, {**body, "dry_run": True}).json()
    assert preview["role_amounts"]["buffet-bread"]["amount_g"] == 120
    assert preview["items"][0]["unit_label"] == "Stück"
    assert [option["label"] for option in preview["role_unit_options"]["buffet-bread"]][:1] == ["Stück"]

    assert _post_buffet(auth_client, meal_plan.id, meal.id, {**body, "dry_run": False}).status_code == 200
    state = auth_client.get(f"/api/meal-plans/{meal_plan.id}/meals/{meal.id}/buffet/").json()
    assert state["role_amounts"] == {"buffet-bread": 2.0}
    assert state["role_units"] == {"buffet-bread": "portion:stück"}
