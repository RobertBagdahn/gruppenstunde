"""Tests for the equipment API mounted at /api/supply/equipment/."""

import json

import pytest

from supply.models import Equipment

EQUIPMENT_URL = "/api/supply/equipment/"


@pytest.mark.django_db
class TestEquipmentApi:
    def test_list_equipment_is_public(self, api_client):
        Equipment.objects.create(name="Topf", sort_order=1)
        Equipment.objects.create(name="Pfanne", sort_order=0)

        resp = api_client.get(EQUIPMENT_URL)

        assert resp.status_code == 200
        assert [item["name"] for item in resp.json()] == ["Pfanne", "Topf"]

    def test_staff_can_create_update_and_delete_equipment(self, admin_client):
        resp = admin_client.post(
            EQUIPMENT_URL,
            data=json.dumps({"name": "Backofen", "sort_order": 3}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        equipment_id = resp.json()["id"]
        assert resp.json()["slug"] == "backofen"

        resp = admin_client.patch(
            f"{EQUIPMENT_URL}{equipment_id}/",
            data=json.dumps({"name": "Heißluftofen", "sort_order": 4}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Heißluftofen"

        resp = admin_client.delete(f"{EQUIPMENT_URL}{equipment_id}/")
        assert resp.status_code == 204
        assert not Equipment.objects.filter(id=equipment_id).exists()

    def test_non_staff_cannot_create_equipment(self, auth_client):
        resp = auth_client.post(
            EQUIPMENT_URL,
            data=json.dumps({"name": "Topf"}),
            content_type="application/json",
        )
        assert resp.status_code == 403
        assert not Equipment.objects.exists()

    def test_update_unknown_equipment_returns_404(self, admin_client):
        resp = admin_client.patch(
            f"{EQUIPMENT_URL}999999/",
            data=json.dumps({"name": "Topf"}),
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_supply_prefix_root_no_longer_serves_equipment(self, api_client):
        assert api_client.get("/api/supply/").status_code == 404
