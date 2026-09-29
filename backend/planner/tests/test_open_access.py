"""Anonymous read access to public meal plans (open-access)."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from planner.models import MealPlan, MealPlanVisibility

User = get_user_model()


@pytest.fixture
def owner(db) -> object:
    return User.objects.create_user(username="owner@x.de", email="owner@x.de")


@pytest.fixture
def public_plan(owner: object) -> MealPlan:
    return MealPlan._default_manager.create(
        name="Sommerlager", created_by=owner, visibility=MealPlanVisibility.PUBLIC, start_datetime=timezone.now()
    )


@pytest.fixture
def private_plan(owner: object) -> MealPlan:
    return MealPlan._default_manager.create(
        name="Privat", created_by=owner, visibility=MealPlanVisibility.PRIVATE, start_datetime=timezone.now()
    )


@pytest.mark.django_db
class TestAnonymousMealPlanRead:
    def test_public_plan_detail(self, api_client: Client, public_plan: MealPlan) -> None:
        response = api_client.get(f"/api/meal-plans/{public_plan.pk}/")
        assert response.status_code == 200
        body = response.json()
        assert body["can_edit"] is False
        assert body["can_delete"] is False

    def test_private_plan_is_404(self, api_client: Client, private_plan: MealPlan) -> None:
        assert api_client.get(f"/api/meal-plans/{private_plan.pk}/").status_code == 404

    def test_public_plan_summaries(self, api_client: Client, public_plan: MealPlan) -> None:
        for suffix in ("costs/", "plan-check/", "nutrition-summary/"):
            response = api_client.get(f"/api/meal-plans/{public_plan.pk}/{suffix}")
            assert response.status_code == 200, (suffix, response.content)

    def test_list_only_public(self, api_client: Client, public_plan: MealPlan, private_plan: MealPlan) -> None:
        names = {plan["name"] for plan in api_client.get("/api/meal-plans/").json()}
        assert "Sommerlager" in names
        assert "Privat" not in names

    def test_list_mine_is_empty_for_anonymous(self, api_client: Client, public_plan: MealPlan) -> None:
        assert api_client.get("/api/meal-plans/?origin=mine").json() == []

    def test_anonymous_write_is_401(self, api_client: Client, public_plan: MealPlan) -> None:
        response = api_client.patch(
            f"/api/meal-plans/{public_plan.pk}/", data={"name": "X"}, content_type="application/json"
        )
        assert response.status_code == 401
        assert response.json()["code"] == "auth_required"
        public_plan.refresh_from_db()
        assert public_plan.name == "Sommerlager"

    def test_authenticated_stranger_gets_viewer_on_public(self, public_plan: MealPlan, db) -> None:
        stranger = User.objects.create_user(username="s@x.de", email="s@x.de")
        client = Client()
        client.force_login(stranger)
        body = client.get(f"/api/meal-plans/{public_plan.pk}/").json()
        assert body["can_edit"] is False
        response = client.patch(
            f"/api/meal-plans/{public_plan.pk}/", data={"name": "X"}, content_type="application/json"
        )
        assert response.status_code == 403
