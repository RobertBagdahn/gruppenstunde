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
