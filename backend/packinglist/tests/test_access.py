"""Authorization tests for packing list clone and text export."""

import pytest

from packinglist.models import PackingList
from packinglist.tests import make_packing_list


@pytest.mark.django_db
class TestCloneAuthorization:
    def test_clone_private_list_without_permission_returns_404(self, auth_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        pl = make_packing_list(owner=owner, visibility="private")
        resp = auth_client.post(f"/api/packing-lists/{pl.id}/clone/")
        assert resp.status_code == 404
        assert PackingList.objects.filter(owner=auth_client._user).count() == 0

    def test_clone_own_private_list_succeeds(self, auth_client):
        pl = make_packing_list(owner=auth_client._user, visibility="private")
        resp = auth_client.post(f"/api/packing-lists/{pl.id}/clone/")
        assert resp.status_code == 200

    def test_clone_template_succeeds(self, auth_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        pl = make_packing_list(owner=owner, is_template=True, visibility="private")
        resp = auth_client.post(f"/api/packing-lists/{pl.id}/clone/")
        assert resp.status_code == 200

    def test_clone_link_only_list_succeeds(self, auth_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        pl = make_packing_list(owner=owner, visibility="link_only")
        resp = auth_client.post(f"/api/packing-lists/{pl.id}/clone/")
        assert resp.status_code == 200


@pytest.mark.django_db
class TestExportAuthorization:
    def test_anonymous_export_private_list_returns_404(self, api_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        pl = make_packing_list(owner=owner, visibility="private")
        resp = api_client.get(f"/api/packing-lists/{pl.id}/export/text/")
        assert resp.status_code == 404

    def test_non_owner_export_private_list_returns_404(self, auth_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        pl = make_packing_list(owner=owner, visibility="private")
        resp = auth_client.get(f"/api/packing-lists/{pl.id}/export/text/")
        assert resp.status_code == 404

    def test_owner_export_private_list_succeeds(self, auth_client):
        pl = make_packing_list(owner=auth_client._user, visibility="private")
        resp = auth_client.get(f"/api/packing-lists/{pl.id}/export/text/")
        assert resp.status_code == 200

    def test_anonymous_export_link_only_list_succeeds(self, api_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        pl = make_packing_list(owner=owner, visibility="link_only")
        resp = api_client.get(f"/api/packing-lists/{pl.id}/export/text/")
        assert resp.status_code == 200
