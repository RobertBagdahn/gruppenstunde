"""Tests for packing list API: visibility, share links, share checks."""

import json

import pytest

from packinglist.models import PackingListShareCheck
from packinglist.tests import (
    make_packing_category,
    make_packing_item,
    make_packing_list,
    make_packing_list_share,
)

# ==========================================================================
# Visibility Tests
# ==========================================================================


@pytest.mark.django_db
class TestVisibilityEnforcement:
    def test_link_only_list_accessible_by_anyone(self, api_client):
        pl = make_packing_list(visibility="link_only")
        resp = api_client.get(f"/api/packing-lists/{pl.id}/")
        assert resp.status_code == 200

    def test_private_list_returns_404_for_unauthenticated(self, api_client):
        pl = make_packing_list(visibility="private")
        resp = api_client.get(f"/api/packing-lists/{pl.id}/")
        assert resp.status_code == 404

    def test_private_list_returns_404_for_non_owner(self, auth_client):
        pl = make_packing_list(visibility="private")
        resp = auth_client.get(f"/api/packing-lists/{pl.id}/")
        assert resp.status_code == 404

    def test_private_list_accessible_by_owner(self, auth_client):
        pl = make_packing_list(owner=auth_client._user, visibility="private")
        resp = auth_client.get(f"/api/packing-lists/{pl.id}/")
        assert resp.status_code == 200

    def test_private_list_accessible_by_staff(self, admin_client):
        pl = make_packing_list(visibility="private")
        resp = admin_client.get(f"/api/packing-lists/{pl.id}/")
        assert resp.status_code == 200

    def test_template_always_accessible_regardless_of_visibility(self, api_client):
        pl = make_packing_list(is_template=True, visibility="private")
        resp = api_client.get(f"/api/packing-lists/{pl.id}/")
        assert resp.status_code == 200

    def test_create_with_visibility(self, auth_client):
        resp = auth_client.post(
            "/api/packing-lists/",
            data=json.dumps({"title": "Private Liste", "visibility": "private"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["visibility"] == "private"

    def test_update_visibility(self, auth_client):
        pl = make_packing_list(owner=auth_client._user, visibility="link_only")
        resp = auth_client.patch(
            f"/api/packing-lists/{pl.id}/",
            data=json.dumps({"visibility": "private"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["visibility"] == "private"


# ==========================================================================
# Share Link CRUD Tests
# ==========================================================================


@pytest.mark.django_db
class TestShareLinkCRUD:
    def test_create_share_link(self, auth_client):
        pl = make_packing_list(owner=auth_client._user)
        resp = auth_client.post(
            f"/api/packing-lists/{pl.id}/shares/",
            data=json.dumps({"label": "Für Max"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["label"] == "Für Max"
        assert data["is_active"] is True
        assert "token" in data

    def test_create_share_link_requires_auth(self, api_client):
        pl = make_packing_list()
        resp = api_client.post(
            f"/api/packing-lists/{pl.id}/shares/",
            data=json.dumps({"label": "Test"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_create_share_link_requires_edit_permission(self, auth_client):
        pl = make_packing_list()  # Different owner
        resp = auth_client.post(
            f"/api/packing-lists/{pl.id}/shares/",
            data=json.dumps({"label": "Test"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_list_share_links(self, auth_client):
        pl = make_packing_list(owner=auth_client._user)
        make_packing_list_share(packing_list=pl, label="Link 1")
        make_packing_list_share(packing_list=pl, label="Link 2")
        make_packing_list_share(packing_list=pl, label="Inactive", is_active=False)

        resp = auth_client.get(f"/api/packing-lists/{pl.id}/shares/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2  # Only active links

    def test_deactivate_share_link(self, auth_client):
        pl = make_packing_list(owner=auth_client._user)
        share = make_packing_list_share(packing_list=pl)

        resp = auth_client.delete(f"/api/packing-lists/{pl.id}/shares/{share.id}/")
        assert resp.status_code == 200

        share.refresh_from_db()
        assert share.is_active is False


# ==========================================================================
# Share Check State Tests
# ==========================================================================


@pytest.mark.django_db
class TestShareCheckState:
    def test_get_shared_packing_list(self, api_client):
        pl = make_packing_list()
        cat = make_packing_category(packing_list=pl)
        make_packing_item(category=cat, name="Regenjacke")
        share = make_packing_list_share(packing_list=pl)

        resp = api_client.get(f"/api/packing-lists/shared/{share.token}/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == pl.title
        assert len(data["categories"]) == 1
        assert len(data["categories"][0]["items"]) == 1
        assert data["categories"][0]["items"][0]["is_checked"] is False

    def test_inactive_share_returns_404(self, api_client):
        pl = make_packing_list()
        share = make_packing_list_share(packing_list=pl, is_active=False)
        resp = api_client.get(f"/api/packing-lists/shared/{share.token}/")
        assert resp.status_code == 404

    def test_update_share_check(self, api_client):
        pl = make_packing_list()
        cat = make_packing_category(packing_list=pl)
        item = make_packing_item(category=cat)
        share = make_packing_list_share(packing_list=pl)

        resp = api_client.patch(
            f"/api/packing-lists/shared/{share.token}/checks/",
            data=json.dumps({"item_id": item.id, "is_checked": True}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["is_checked"] is True

        # Verify check was stored
        check = PackingListShareCheck.objects.get(share=share, item=item)
        assert check.is_checked is True

    def test_share_check_does_not_modify_original(self, api_client):
        pl = make_packing_list()
        cat = make_packing_category(packing_list=pl)
        item = make_packing_item(category=cat, is_checked=False)
        share = make_packing_list_share(packing_list=pl)

        api_client.patch(
            f"/api/packing-lists/shared/{share.token}/checks/",
            data=json.dumps({"item_id": item.id, "is_checked": True}),
            content_type="application/json",
        )

        item.refresh_from_db()
        assert item.is_checked is False  # Original unchanged

    def test_do_not_bring_items_cannot_be_checked(self, api_client):
        pl = make_packing_list()
        cat = make_packing_category(packing_list=pl)
        item = make_packing_item(category=cat, is_do_not_bring=True)
        share = make_packing_list_share(packing_list=pl)

        resp = api_client.patch(
            f"/api/packing-lists/shared/{share.token}/checks/",
            data=json.dumps({"item_id": item.id, "is_checked": True}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_shared_list_shows_share_specific_checks(self, api_client):
        pl = make_packing_list()
        cat = make_packing_category(packing_list=pl)
        item = make_packing_item(category=cat)
        share = make_packing_list_share(packing_list=pl)

        # Check item via share link
        PackingListShareCheck.objects.create(share=share, item=item, is_checked=True)

        resp = api_client.get(f"/api/packing-lists/shared/{share.token}/")
        data = resp.json()
        assert data["categories"][0]["items"][0]["is_checked"] is True
