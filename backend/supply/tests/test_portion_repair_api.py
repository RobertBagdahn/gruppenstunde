"""Tests for the staff-only portion repair API."""

import pytest
from django.test import Client

from supply.choices import PortionRepairDetectionReason, PortionRepairStatus
from supply.models import Ingredient, MeasuringUnit, Portion, PortionRepairFinding, RetailSection

BASE = "/api/admin/data-quality/portion-repair"


@pytest.fixture
def retail_section(db):
    return RetailSection.objects.create(name="Gemüse", rank=1)


@pytest.fixture
def ingredient(db, retail_section):
    return Ingredient.objects.create(
        name="Testzutat",
        slug="testzutat",
        status="approved",
        retail_section=retail_section,
    )


@pytest.fixture
def gram_unit(db):
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


@pytest.fixture
def portion(db, ingredient, gram_unit):
    p = Portion(ingredient=ingredient, measuring_unit=gram_unit, name="Stück", quantity=1.0, rank=1)
    p.weight_g = 1.0
    p.save()
    return p


@pytest.fixture
def finding(db, portion):
    return PortionRepairFinding.objects.create(
        portion=portion,
        ingredient=portion.ingredient,
        detection_reason=PortionRepairDetectionReason.PIECE_NAME_ONE_GRAM,
        status=PortionRepairStatus.PENDING_REVIEW,
        before_snapshot={"name": "Stück", "weight_g": 1.0},
        before_snapshot_hash="abc",
        ai_proposal={
            "classification": "piece",
            "proposed_name": "Stück",
            "proposed_weight_g": 60.0,
            "proposed_quantity": 1.0,
            "proposed_unit_name": "Stück",
            "confidence": 0.95,
            "rationale": "typisches Ei",
        },
        confidence=0.95,
        prompt_version="1",
        threshold=0.90,
    )


@pytest.fixture
def admin_client(db, django_user_model) -> Client:
    user = django_user_model.objects.create_superuser(
        username="admin",
        email="admin@inspi.dev",
        password="adminpass123",
    )
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def user_client(db, django_user_model) -> Client:
    user = django_user_model.objects.create_user(username="user", password="userpass123")
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def api_client() -> Client:
    return Client()


class TestAccessControl:
    def test_anonymous_gets_403(self, api_client, finding):
        assert api_client.get(f"{BASE}/").status_code == 403

    def test_non_staff_gets_403(self, user_client, finding):
        assert user_client.get(f"{BASE}/").status_code == 403

    def test_staff_can_list(self, admin_client, finding):
        resp = admin_client.get(f"{BASE}/")
        assert resp.status_code == 200


class TestList:
    def test_paginated_format(self, admin_client, finding):
        resp = admin_client.get(f"{BASE}/", {"page": 1, "page_size": 20})
        assert resp.status_code == 200
        data = resp.json()
        assert set(data.keys()) == {"items", "total", "page", "page_size", "total_pages"}
        assert data["total"] == 1
        assert data["page"] == 1
        assert data["page_size"] == 20
        assert len(data["items"]) == 1

    def test_finding_fields(self, admin_client, finding):
        resp = admin_client.get(f"{BASE}/")
        item = resp.json()["items"][0]
        assert item["id"] == finding.id
        assert item["ingredient_name"] == "Testzutat"
        assert item["portion_name"] == "Stück"
        assert item["status"] == PortionRepairStatus.PENDING_REVIEW
        assert item["confidence"] == 0.95
        assert item["before_snapshot"]["weight_g"] == 1.0
        assert item["ai_proposal"]["proposed_weight_g"] == 60.0
        assert item["affected_recipe_ids"] == []

    def test_status_filter(self, admin_client, finding):
        resp = admin_client.get(f"{BASE}/", {"status": "applied"})
        assert resp.json()["total"] == 0
        resp = admin_client.get(f"{BASE}/", {"status": "pending_review"})
        assert resp.json()["total"] == 1

    def test_detail(self, admin_client, finding):
        resp = admin_client.get(f"{BASE}/{finding.id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == finding.id

    def test_detail_404(self, admin_client):
        assert admin_client.get(f"{BASE}/99999").status_code == 404


class TestApply:
    def test_pending_review_requires_explicit_approval(self, admin_client, finding):
        resp = admin_client.post(f"{BASE}/{finding.id}/apply/")
        assert resp.status_code == 409

    def test_ready_finding_requires_approval(self, admin_client, finding):
        finding.status = PortionRepairStatus.READY
        finding.save(update_fields=["status"])
        resp = admin_client.post(f"{BASE}/{finding.id}/apply/")
        assert resp.status_code == 409

    def test_ready_finding_can_be_approved_and_applied(self, admin_client, finding, portion):
        finding.status = PortionRepairStatus.READY
        finding.save(update_fields=["status"])

        approve = admin_client.post(f"{BASE}/{finding.id}/approve/")
        assert approve.status_code == 200

        resp = admin_client.post(f"{BASE}/{finding.id}/apply/")
        assert resp.status_code == 200
        assert resp.json()["applied"] is True

        finding.refresh_from_db()
        portion.refresh_from_db()
        assert finding.status == PortionRepairStatus.APPLIED
        assert portion.weight_g == 60.0

    def test_apply_rejected_finding_conflict(self, admin_client, finding):
        finding.status = PortionRepairStatus.REJECTED
        finding.save(update_fields=["status"])
        resp = admin_client.post(f"{BASE}/{finding.id}/apply/")
        assert resp.status_code == 409

    def test_bulk_apply_only_applies_approved_findings(self, admin_client, finding, portion):
        finding.status = PortionRepairStatus.READY
        finding.save(update_fields=["status"])
        admin_client.post(f"{BASE}/{finding.id}/approve/")

        response = admin_client.post(
            f"{BASE}/apply-approved/",
            data={"finding_ids": [finding.id, 99999]},
            content_type="application/json",
        )

        assert response.status_code == 200
        assert response.json()["applied"] == [finding.id]
        assert response.json()["blocked"] == []
        assert response.json()["failed"] == []
        portion.refresh_from_db()
        assert portion.weight_g == 60.0

    def test_bulk_approve_only_approves_ready_findings(self, admin_client, finding):
        finding.status = PortionRepairStatus.READY
        finding.save(update_fields=["status"])
        response = admin_client.post(
            f"{BASE}/approve-selected/",
            data={"finding_ids": [finding.id, 99999]},
            content_type="application/json",
        )

        assert response.status_code == 200
        assert response.json()["approved"] == [finding.id]
        assert response.json()["blocked"] == []
        finding.refresh_from_db()
        assert finding.approved_by_id is not None


class TestProcess:
    def test_scan_requires_staff(self, user_client):
        response = user_client.post(
            f"{BASE}/scan/",
            data={"limit": 10},
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_scan_returns_bounded_summary(self, admin_client, portion):
        response = admin_client.post(
            f"{BASE}/scan/",
            data={"limit": 10},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert response.json()["processed"] == 1
        assert response.json()["ready"] == 0

    def test_evaluate_persists_result(self, admin_client, finding, monkeypatch):
        finding.status = PortionRepairStatus.CANDIDATE
        finding.save(update_fields=["status"])

        def fake_evaluate(candidate, *, min_confidence=None):
            candidate.status = PortionRepairStatus.READY
            candidate.confidence = 0.95
            candidate.ai_proposal = {"classification": "piece"}
            candidate.save(update_fields=["status", "confidence", "ai_proposal"])
            return candidate

        monkeypatch.setattr("supply.services.portion_repair_ai.evaluate_finding", fake_evaluate)
        response = admin_client.post(
            f"{BASE}/evaluate/",
            data={"limit": 10},
            content_type="application/json",
        )

        assert response.status_code == 200
        assert response.json()["processed"] == 1
        assert response.json()["ready"] == 1
        finding.refresh_from_db()
        assert finding.status == PortionRepairStatus.READY

    def test_approve_requires_ready_status(self, admin_client, finding):
        response = admin_client.post(f"{BASE}/{finding.id}/approve/")
        assert response.status_code == 409


class TestReject:
    def test_reject_pending_review(self, admin_client, finding):
        resp = admin_client.post(f"{BASE}/{finding.id}/reject/")
        assert resp.status_code == 200
        assert resp.json()["status"] == PortionRepairStatus.REJECTED
        finding.refresh_from_db()
        assert finding.status == PortionRepairStatus.REJECTED
        assert finding.rejected_by is not None

    def test_reject_applied_conflict(self, admin_client, finding):
        finding.status = PortionRepairStatus.APPLIED
        finding.save(update_fields=["status"])
        resp = admin_client.post(f"{BASE}/{finding.id}/reject/")
        assert resp.status_code == 409
