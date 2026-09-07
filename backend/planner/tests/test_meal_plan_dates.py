import json
from datetime import timedelta

import pytest
from django.utils import timezone

from planner.models import MealPlan


@pytest.mark.django_db
class TestMealPlanDates:
    def test_create_meal_plan_rejects_end_before_start(self, auth_client):
        now = timezone.now()
        payload = {
            "name": "Ungültiger Plan",
            "start_datetime": now.isoformat(),
            "end_datetime": (now - timedelta(days=1)).isoformat(),
        }
        resp = auth_client.post("/api/meal-plans/", data=json.dumps(payload), content_type="application/json")
        assert resp.status_code == 400
        assert "Endzeit muss nach der Startzeit liegen" in resp.json()["detail"]

    def test_update_meal_plan_rejects_end_before_start(self, auth_client):
        now = timezone.now()
        plan = MealPlan.objects.create(
            name="Gültiger Plan",
            created_by=auth_client._user,
            start_datetime=now,
            end_datetime=now + timedelta(days=2),
        )
        payload = {
            "end_datetime": (now - timedelta(days=1)).isoformat(),
        }
        resp = auth_client.patch(
            f"/api/meal-plans/{plan.id}/", data=json.dumps(payload), content_type="application/json"
        )
        assert resp.status_code == 400
        assert "Endzeit muss nach der Startzeit liegen" in resp.json()["detail"]

    def test_update_meal_plan_rejects_null_start_datetime(self, auth_client):
        now = timezone.now()
        plan = MealPlan.objects.create(
            name="Plan mit Datum",
            created_by=auth_client._user,
            start_datetime=now,
            end_datetime=now + timedelta(days=2),
        )
        payload = {
            "start_datetime": None,
        }
        resp = auth_client.patch(
            f"/api/meal-plans/{plan.id}/", data=json.dumps(payload), content_type="application/json"
        )
        assert resp.status_code == 400
        assert "Startdatum darf nicht leer sein" in resp.json()["detail"]
