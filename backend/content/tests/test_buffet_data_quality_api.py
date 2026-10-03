"""Tests for the staff-only buffet data-quality proposal workflow."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from content.models import Tag
from planner.tests import make_buffet_roles
from supply.models import BuffetDataProposal, Ingredient
from supply.tests import make_ingredient, make_retail_section

User = get_user_model()


def _staff_client() -> Client:
    user = User.objects.create_user(username="buffet-staff", password="x", is_staff=True)
    client = Client()
    client.force_login(user)
    return client


def _post(client: Client, path: str, body: dict):
    return client.post(path, data=json.dumps(body), content_type="application/json")


@pytest.mark.django_db
class TestBuffetDataQualityCandidates:
    def test_candidates_are_paged(self):
        client = _staff_client()

        response = client.get("/api/admin/data-quality/buffet-catalog/candidates/?action=create&page=1&page_size=2")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] > 2
        assert data["page_size"] == 2
        assert data["total_pages"] > 1

    def test_role_assignment_candidates_are_inferred_from_retail_section(self):
        make_buffet_roles()
        section = make_retail_section(name="Knabberartikel")
        ingredient = make_ingredient(name="Chips Vorschlag", retail_section=section)
        client = _staff_client()

        response = client.get(
            "/api/admin/data-quality/buffet-catalog/candidates/?q=Chips%20Vorschlag&action=add&kind=ingredient"
        )

        assert response.status_code == 200
        item = next(candidate for candidate in response.json()["items"] if candidate["source_id"] == ingredient.id)
        assert item["role_slugs"] == ["buffet-salty-snack"]

    def test_sauce_section_suggests_condiment_but_not_dip(self):
        make_buffet_roles()
        section = make_retail_section(name="Saucen & Würzsaucen")
        ingredient = make_ingredient(name="Tomaten-Ketchup", retail_section=section)
        client = _staff_client()

        response = client.get(
            "/api/admin/data-quality/buffet-catalog/candidates/?q=Tomaten-Ketchup&action=add&kind=ingredient"
        )

        assert response.status_code == 200
        item = next(candidate for candidate in response.json()["items"] if candidate["source_id"] == ingredient.id)
        assert item["role_slugs"] == ["buffet-condiment"]

    def test_alcoholic_role_items_are_only_suggested_for_reviewed_untagging(self):
        roles = make_buffet_roles()
        section = make_retail_section(name="Alkoholische Getränke")
        ingredient = make_ingredient(name="Rotwein", retail_section=section)
        ingredient.tags.add(roles["buffet-drink"])
        client = _staff_client()

        response = client.get(
            "/api/admin/data-quality/buffet-catalog/candidates/?q=Rotwein&action=untag&kind=ingredient"
        )

        assert response.status_code == 200
        item = next(candidate for candidate in response.json()["items"] if candidate["source_id"] == ingredient.id)
        assert item["role_slugs"] == ["buffet-drink"]
        assert "prüft" in item["rationale"]

    def test_quality_report_lists_incomplete_catalog_items_and_legacy_breakfast_tags(self):
        roles = make_buffet_roles()
        section = make_retail_section(name="Getränke")
        ingredient = make_ingredient(name="Unvollständiges Getränk", retail_section=section)
        ingredient.energy_kcal = 0
        ingredient.status = "draft"
        ingredient.retail_section = None
        ingredient.save()
        ingredient.tags.add(roles["buffet-drink"])
        old_tag, _ = Tag.objects.get_or_create(
            slug="breakfast-base",
            defaults={"name": "Frühstücksbasis", "group": "breakfast"},
        )
        ingredient.tags.add(old_tag)
        client = _staff_client()

        response = client.get("/api/admin/data-quality/buffet-catalog/report/")

        assert response.status_code == 200
        item = next(row for row in response.json()["items"] if row["id"] == ingredient.id)
        assert set(item["missing_fields"]) == {
            "missing_energy",
            "unverified",
            "missing_retail_section",
            "old_breakfast_tags",
        }
        assert item["legacy_breakfast_tag_slugs"] == ["breakfast-base"]
        assert response.json()["summary"]["legacy_tag_carriers"] == 1


@pytest.mark.django_db
class TestBuffetDataQualityProposals:
    def test_non_staff_cannot_list_or_create_proposals(self):
        user = User.objects.create_user(username="ordinary-user", password="x")
        client = Client()
        client.force_login(user)

        list_response = client.get("/api/admin/data-quality/buffet-catalog/proposals/")
        create_response = _post(
            client,
            "/api/admin/data-quality/buffet-catalog/proposals/",
            {"action": "create", "item_kind": "ingredient", "proposed_data": {"name": "Nope"}},
        )

        assert list_response.status_code == 403
        assert create_response.status_code == 403
        assert BuffetDataProposal.objects.count() == 0

    def test_approved_mapping_does_not_change_source_data(self):
        roles = make_buffet_roles()
        ingredient = make_ingredient(name="Käse Vorschlag", owner=None)
        client = _staff_client()
        proposal_path = "/api/admin/data-quality/buffet-catalog/proposals/"

        create_response = _post(
            client,
            proposal_path,
            {
                "action": "add",
                "item_kind": "ingredient",
                "source_id": ingredient.id,
                "source_expected_name": ingredient.name,
                "role_slugs": ["buffet-cheese"],
                "origin": "manual",
            },
        )
        assert create_response.status_code == 200
        proposal_id = create_response.json()["id"]

        preview_response = _post(
            client,
            f"{proposal_path}{proposal_id}/preview/",
            {},
        )
        assert preview_response.status_code == 200
        assert preview_response.json()["can_approve"] is True
        assert preview_response.json()["plan"][0]["will_write"] is False
        ingredient.refresh_from_db()
        assert not ingredient.tags.filter(slug="buffet-cheese").exists()

        review_response = _post(
            client,
            f"{proposal_path}{proposal_id}/review/",
            {"decision": "approve", "note": "Fachlich geprüft"},
        )
        assert review_response.status_code == 200
        assert review_response.json()["status"] == "approved"
        ingredient.refresh_from_db()
        assert not ingredient.tags.filter(slug="buffet-cheese").exists()
        assert roles["buffet-cheese"].group == "buffet"

        export_response = client.get(f"{proposal_path}export/")
        assert export_response.status_code == 200
        assert export_response.json()["items"][0]["source_id"] == ingredient.id

    def test_editing_a_proposal_invalidates_its_preview(self):
        make_buffet_roles()
        ingredient = make_ingredient(name="Noch ohne Rolle", owner=None)
        client = _staff_client()
        proposal_path = "/api/admin/data-quality/buffet-catalog/proposals/"
        create_response = _post(
            client,
            proposal_path,
            {
                "action": "add",
                "item_kind": "ingredient",
                "source_id": ingredient.id,
                "source_expected_name": ingredient.name,
                "role_slugs": ["buffet-cheese"],
            },
        )
        proposal_id = create_response.json()["id"]
        _post(client, f"{proposal_path}{proposal_id}/preview/", {})
        update_response = client.patch(
            f"{proposal_path}{proposal_id}/",
            data=json.dumps({"role_slugs": ["buffet-dip"]}),
            content_type="application/json",
        )
        review_response = _post(
            client,
            f"{proposal_path}{proposal_id}/review/",
            {"decision": "approve"},
        )

        assert update_response.status_code == 200
        assert update_response.json()["preview_current"] is False
        assert review_response.status_code == 409

    def test_catalog_changes_invalidate_a_saved_preview_before_approval(self):
        roles = make_buffet_roles()
        ingredient = make_ingredient(name="Käse ohne Rolle", owner=None)
        client = _staff_client()
        proposal_path = "/api/admin/data-quality/buffet-catalog/proposals/"
        create_response = _post(
            client,
            proposal_path,
            {
                "action": "add",
                "item_kind": "ingredient",
                "source_id": ingredient.id,
                "source_expected_name": ingredient.name,
                "role_slugs": ["buffet-cheese"],
            },
        )
        proposal_id = create_response.json()["id"]
        preview_response = _post(client, f"{proposal_path}{proposal_id}/preview/", {})
        ingredient.tags.add(roles["buffet-dip"])

        review_response = _post(
            client,
            f"{proposal_path}{proposal_id}/review/",
            {"decision": "approve"},
        )

        assert preview_response.status_code == 200
        assert review_response.status_code == 409
        ingredient.refresh_from_db()
        assert ingredient.tags.filter(slug="buffet-dip").exists()
        assert not ingredient.tags.filter(slug="buffet-cheese").exists()

    def test_incomplete_new_ingredient_is_saved_as_proposal_but_cannot_be_approved(self):
        make_buffet_roles()
        client = _staff_client()
        proposal_path = "/api/admin/data-quality/buffet-catalog/proposals/"
        create_response = _post(
            client,
            proposal_path,
            {
                "action": "create",
                "item_kind": "ingredient",
                "role_slugs": ["buffet-drink"],
                "proposed_data": {"name": "Neue Schorle"},
            },
        )
        proposal_id = create_response.json()["id"]
        preview_response = _post(client, f"{proposal_path}{proposal_id}/preview/", {})

        assert create_response.status_code == 200
        assert preview_response.status_code == 200
        assert preview_response.json()["can_approve"] is False
        assert "Nährwertangabe kcal/100 g fehlt." in preview_response.json()["blockers"]
        assert not Ingredient.objects.filter(name="Neue Schorle").exists()

    def test_ai_suggestion_only_returns_a_draft_without_creating_ingredient(self, monkeypatch):
        client = _staff_client()

        class Draft:
            name = "KI-Vorschlag"

            def model_dump(self, *, mode: str):
                return {"name": self.name, "energy_kcal": 320.0, "retail_section": "Knabberartikel"}

        monkeypatch.setattr(
            "supply.services.ingredient_ai_suggest_service.generate_ingredient_draft",
            lambda name, user: (Draft(), "interaction-1"),
        )
        response = _post(
            client,
            "/api/admin/data-quality/buffet-catalog/proposals/suggest/",
            {"item_kind": "ingredient", "name": "KI-Vorschlag", "role_slugs": ["buffet-salty-snack"]},
        )

        assert response.status_code == 200
        assert response.json()["proposed_data"]["energy_kcal"] == 320.0
        assert response.json()["ai_interaction_id"] == "interaction-1"
        assert not Ingredient.objects.filter(name="KI-Vorschlag").exists()
