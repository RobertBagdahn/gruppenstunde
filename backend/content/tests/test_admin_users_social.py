"""Admin user list/detail expose linked providers and AI usage (staff only)."""

from decimal import Decimal

import pytest
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from django.test import Client

from content.models import AiInteraction

User = get_user_model()


@pytest.fixture
def staff_client(db) -> Client:
    staff = User.objects.create_user(username="staff@x.de", email="staff@x.de", is_staff=True)
    client = Client()
    client.force_login(staff)
    return client


@pytest.fixture
def member(db) -> object:
    user = User.objects.create_user(username="m@x.de", email="m@x.de")
    SocialAccount._default_manager.create(user=user, provider="google", uid="g-1")
    AiInteraction._default_manager.create(
        context="recipe_suggest_all", prompt="x", model="m", user=user, tier="user", cost_eur=Decimal("0.12")
    )
    return user


@pytest.mark.django_db
class TestAdminUsers:
    def test_detail_contains_providers_and_ai_usage(self, staff_client: Client, member: object) -> None:
        body = staff_client.get(f"/api/admin/users/{member.pk}/").json()
        assert body["providers"] == ["google"]
        assert body["ai_used_today_eur"] == 0.12
        assert body["ai_daily_limit_eur"] == 0.3

    def test_list_filters_by_provider(self, staff_client: Client, member: object) -> None:
        body = staff_client.get("/api/admin/users/?provider=google&page=1&page_size=20").json()
        assert [item["email"] for item in body["items"]] == ["m@x.de"]
        assert body["items"][0]["providers"] == ["google"]

    def test_non_staff_gets_staff_required(self, member: object) -> None:
        client = Client()
        client.force_login(member)
        response = client.get(f"/api/admin/users/{member.pk}/")
        assert response.status_code == 403
        assert response.json()["code"] == "staff_required"
