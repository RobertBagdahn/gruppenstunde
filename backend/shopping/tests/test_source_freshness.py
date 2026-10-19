"""Plan-based shopping lists are snapshots with a freshness status (openspec `shopping-list-source-freshness`)."""

import datetime as dt
import json

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from planner.models import Meal, MealItem, MealPlan, MealPlanCollaborator, MealTypeChoices
from planner.services.plan_touch import touch_meal_plan
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe, make_recipe_item
from shopping.models import ShoppingList
from shopping.tests.trip_helpers import create_legacy_plan_list
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()


def _user(name: str):
    return User.objects.create_user(username=name, email=f"{name}@example.com", password="x")


@pytest.fixture
def owner():
    return _user("owner")


@pytest.fixture
def client(owner):
    c = Client()
    c.force_login(owner)
    return c


@pytest.fixture
def plan_with_list(owner, client):
    plan = make_meal_plan(created_by=owner, norm_portions=10)
    meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH)
    unit = make_measuring_unit(name="Gramm")
    flour = make_ingredient(name="Mehl Freshness")
    portion = make_portion(
        ingredient=flour,
        name="Packung",
        quantity=1,
        weight_g=500,
        rank=1,
        measuring_unit=unit,
        weight_status="confirmed",
    )
    recipe = make_recipe(title="Brot Freshness")
    make_recipe_item(recipe=recipe, portion=portion, quantity=1)
    item = make_meal_item(meal=meal, recipe=recipe)
    created = client.get(f"/api/shopping-lists/{create_legacy_plan_list(owner, plan).id}/")
    assert created.status_code == 200, created.content
    return {
        "plan": plan,
        "meal": meal,
        "item": item,
        "recipe": recipe,
        "list_id": created.json()["id"],
        "created": created.json(),
    }


def _status(client: Client, list_id: int) -> dict:
    return client.get(f"/api/shopping-lists/{list_id}/").json()


@pytest.mark.django_db
class TestStatus:
    def test_new_list_is_current(self, plan_with_list):
        assert plan_with_list["created"]["source_status"] == "current"

    def test_item_change_makes_list_changed_and_keeps_snapshot(self, client, plan_with_list):
        before = _status(client, plan_with_list["list_id"])
        checked = ShoppingList.objects.get(id=plan_with_list["list_id"]).items.first()
        checked.is_checked = True
        checked.save()

        plan_with_list["item"].factor = 2
        plan_with_list["item"].save()
        after = _status(client, plan_with_list["list_id"])

        assert after["source_status"] == "changed"
        assert after["source_updated_at"] is not None
        assert [(row["id"], row["quantity_g"]) for row in after["items"]] == [
            (row["id"], row["quantity_g"]) for row in before["items"]
        ]
        checked.refresh_from_db()
        assert checked.is_checked is True

    def test_deleted_plan(self, client, plan_with_list):
        MealPlan.objects.filter(id=plan_with_list["plan"].id).delete()

        body = _status(client, plan_with_list["list_id"])

        assert body["source_status"] == "deleted"
        assert body["source_updated_at"] is None

    def test_manual_list_has_no_status(self, client):
        created = client.post(
            "/api/shopping-lists/", data=json.dumps({"name": "Manuell"}), content_type="application/json"
        )
        assert created.status_code == 200, created.content
        assert _status(client, created.json()["id"])["source_status"] is None

    def test_no_status_without_plan_access(self, client, plan_with_list):
        stranger = _user("stranger")
        shopping_list = ShoppingList.objects.get(id=plan_with_list["list_id"])
        from shopping.models import CollaboratorRole, ShoppingListCollaborator

        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=stranger, role=CollaboratorRole.VIEWER
        )
        other = Client()
        other.force_login(stranger)

        body = _status(other, plan_with_list["list_id"])

        assert body["source_status"] is None
        assert body["source_updated_at"] is None

    def test_collaborator_with_plan_access_sees_status(self, client, plan_with_list):
        reader = _user("reader")
        shopping_list = ShoppingList.objects.get(id=plan_with_list["list_id"])
        from planner.models import MealPlanCollaboratorRole
        from shopping.models import CollaboratorRole, ShoppingListCollaborator

        ShoppingListCollaborator.objects.create(shopping_list=shopping_list, user=reader, role=CollaboratorRole.VIEWER)
        MealPlanCollaborator.objects.create(
            meal_plan=plan_with_list["plan"], user=reader, role=MealPlanCollaboratorRole.VIEWER
        )
        other = Client()
        other.force_login(reader)

        assert _status(other, plan_with_list["list_id"])["source_status"] == "current"

    def test_requires_login(self, plan_with_list):
        assert Client().get(f"/api/shopping-lists/{plan_with_list['list_id']}/").status_code == 401


@pytest.mark.django_db
class TestTouchedPaths:
    def _updated_at(self, plan) -> dt.datetime:
        return MealPlan.objects.get(id=plan.id).updated_at

    def _age(self, plan):
        MealPlan.objects.filter(id=plan.id).update(updated_at=timezone.now() - dt.timedelta(days=1))
        return self._updated_at(plan)

    def test_item_create_update_delete(self, plan_with_list):
        plan, meal = plan_with_list["plan"], plan_with_list["meal"]
        baseline = self._age(plan)
        extra = make_meal_item(meal=meal, recipe=make_recipe(title="Zweites Rezept"))
        created_at = self._updated_at(plan)
        assert created_at > baseline

        baseline = self._age(plan)
        extra.factor = 3
        extra.save()
        assert self._updated_at(plan) > baseline

        baseline = self._age(plan)
        extra.delete()
        assert self._updated_at(plan) > baseline

    def test_meal_create_and_delete(self, plan_with_list):
        plan = plan_with_list["plan"]
        baseline = self._age(plan)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER)
        assert self._updated_at(plan) > baseline

        baseline = self._age(plan)
        meal.delete()
        assert self._updated_at(plan) > baseline

    def test_queryset_delete_and_bulk_paths(self, plan_with_list):
        plan, meal = plan_with_list["plan"], plan_with_list["meal"]
        baseline = self._age(plan)
        MealItem.objects.filter(meal=meal).delete()
        assert self._updated_at(plan) > baseline

    def test_bulk_wizard_endpoint(self, client, plan_with_list):
        plan = plan_with_list["plan"]
        start = timezone.now().replace(hour=8, minute=0, second=0, microsecond=0)
        meal = make_meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.BREAKFAST,
            start_datetime=start,
            end_datetime=start + dt.timedelta(hours=1),
        )
        baseline = self._age(plan)
        ingredient = make_ingredient(name="Wizard Zutat")
        unit = make_measuring_unit(name="Gramm")
        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/wizard-items/bulk/",
            data=json.dumps(
                {
                    "meal_ids": [meal.id],
                    "items": [{"ingredient_id": ingredient.id, "quantity": 50, "measuring_unit_id": unit.id}],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content
        assert self._updated_at(plan) > baseline

    def test_ref_meal_link_all(self, client, plan_with_list):
        plan = plan_with_list["plan"]
        Meal.objects.create(
            meal_plan=plan,
            meal_type=MealTypeChoices.LUNCH,
            day_part_factor=0.3,
            is_reference=True,
            start_datetime=None,
            end_datetime=None,
        )
        baseline = self._age(plan)
        resp = client.post(f"/api/meal-plans/{plan.id}/meals/link-all?meal_type=lunch")
        assert resp.status_code == 200, resp.content
        assert self._updated_at(plan) > baseline

    def test_touch_ignores_unknown_plan(self):
        touch_meal_plan(None)
        touch_meal_plan(999_999)


@pytest.mark.django_db
class TestListEndpoint:
    def test_list_has_status_and_filters(self, client, owner, plan_with_list):
        other_plan = make_meal_plan(created_by=owner)
        other = {"id": create_legacy_plan_list(owner, other_plan).id}
        client.post("/api/shopping-lists/", data=json.dumps({"name": "Manuell"}), content_type="application/json")
        plan_with_list["item"].factor = 5
        plan_with_list["item"].save()

        everything = client.get("/api/shopping-lists/").json()["items"]
        by_id = {row["id"]: row for row in everything}
        assert by_id[plan_with_list["list_id"]]["source_status"] == "changed"
        assert by_id[other["id"]]["source_status"] == "current"
        assert [row["source_status"] for row in everything if row["source_type"] == "manual"] == [None]

        filtered = client.get(
            f"/api/shopping-lists/?source_type=meal_event&source_id={plan_with_list['plan'].id}"
        ).json()["items"]
        assert [row["id"] for row in filtered] == [plan_with_list["list_id"]]

    def test_list_status_needs_no_query_per_list(self, client, owner):
        def build(count: int) -> None:
            for index in range(count):
                plan = make_meal_plan(created_by=owner, name=f"Plan {count}-{index}")
                create_legacy_plan_list(owner, plan)

        build(1)
        with CaptureQueriesContext(connection) as small:
            assert client.get("/api/shopping-lists/").status_code == 200
        build(5)
        with CaptureQueriesContext(connection) as large:
            assert client.get("/api/shopping-lists/").status_code == 200

        # Items/collaborator lookups of the existing view may grow with the page; the status itself adds
        # a fixed number of queries. Compare only the queries that touch plans.
        plan_queries = lambda ctx: [q for q in ctx.captured_queries if "planner_mealplan" in q["sql"]]
        assert len(plan_queries(large)) == len(plan_queries(small))
