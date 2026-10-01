"""A meal plan needs a positive number of persons."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.tests import make_meal_plan

User = get_user_model()


def _post(client: Client, payload: dict):
    return client.post("/api/meal-plans/", data=json.dumps(payload), content_type="application/json")


@pytest.mark.django_db
class TestNormPortionsValidation:
    @pytest.mark.parametrize("value", [0, -3, 1001])
    def test_create_rejects_non_positive_or_absurd_portions(self, client: Client, value):
        client.force_login(baker.make(User))

        response = _post(client, {"name": "Testplan", "norm_portions": value})

        assert response.status_code == 422

    def test_create_accepts_a_normal_group_size(self, client: Client):
        client.force_login(baker.make(User))

        response = _post(client, {"name": "Testplan", "norm_portions": 12})

        assert response.status_code == 200, response.content
        assert response.json()["norm_portions"] == 12

    def test_update_rejects_zero_portions(self, client: Client):
        user = baker.make(User)
        client.force_login(user)
        plan = make_meal_plan(created_by=user, norm_portions=10)

        response = client.patch(
            f"/api/meal-plans/{plan.id}/",
            data=json.dumps({"norm_portions": 0}),
            content_type="application/json",
        )

        assert response.status_code == 422

    def test_anonymous_cannot_create(self, client: Client):
        assert _post(client, {"name": "Testplan", "norm_portions": 12}).status_code in (401, 403)

    def test_end_before_start_is_still_rejected(self, client: Client):
        client.force_login(baker.make(User))

        response = _post(
            client,
            {
                "name": "Testplan",
                "norm_portions": 12,
                "start_datetime": "2026-10-10T18:00:00+02:00",
                "end_datetime": "2026-10-08T12:00:00+02:00",
            },
        )

        assert response.status_code == 400
        assert "Endzeit" in response.json()["detail"]
