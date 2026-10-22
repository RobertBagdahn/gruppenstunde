"""Homepage tiles count what the visitor can actually see in the lists."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from shopping.models import ShoppingList

User = get_user_model()


@pytest.mark.django_db
class TestDashboardCounts:
    def test_shopping_lists_count_only_own_lists(self, client: Client):
        user = baker.make(User)
        other = baker.make(User)
        baker.make(ShoppingList, owner=user)
        baker.make(ShoppingList, owner=other)

        assert client.get("/api/food/dashboard/").json()["shopping_list_count"] == 0

        client.force_login(user)
        assert client.get("/api/food/dashboard/").json()["shopping_list_count"] == 1


@pytest.mark.django_db
class TestDashboardActiveAndOpenCounts:
    def test_open_lists_need_an_unchecked_item(self, client: Client):
        from shopping.tests import make_shopping_list, make_shopping_list_item

        user = baker.make(User)
        client.force_login(user)
        open_list = make_shopping_list(owner=user)
        make_shopping_list_item(shopping_list=open_list, is_checked=False)
        done_list = make_shopping_list(owner=user)
        make_shopping_list_item(shopping_list=done_list, is_checked=True)
        make_shopping_list(owner=user)  # empty list: nothing open

        body = client.get("/api/food/dashboard/").json()
        assert body["shopping_list_count"] == 3
        assert body["open_shopping_list_count"] == 1

    def test_anonymous_has_no_open_lists(self, client: Client):
        assert client.get("/api/food/dashboard/").json()["open_shopping_list_count"] == 0

    def test_active_plans_exclude_ended_ones(self, client: Client):
        import datetime as dt

        from django.utils import timezone

        from planner.tests import make_meal_plan

        user = baker.make(User)
        client.force_login(user)
        make_meal_plan(created_by=user, end_datetime=timezone.now() + dt.timedelta(days=3))
        make_meal_plan(created_by=user, end_datetime=timezone.now() - dt.timedelta(days=3))
        make_meal_plan(created_by=user, end_datetime=None)

        body = client.get("/api/food/dashboard/").json()
        assert body["meal_plan_count"] == 3
        assert body["active_meal_plan_count"] == 2
