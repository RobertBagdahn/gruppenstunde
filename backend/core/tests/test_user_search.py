"""Tests for the generic user search endpoint."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


@pytest.mark.django_db
class TestUserSearch:
    def _search(self, client: Client, q: str = "", page: int = 1, page_size: int = 20) -> dict:
        params = {"page": page, "page_size": page_size}
        if q:
            params["q"] = q
        return client.get("/api/users/search/", params, content_type="application/json")

    def test_search_by_username(self, client: Client):
        """Authenticated user can search by username."""
        User.objects.create_user(username="robert", email="robert@test.de", password="pass1234")
        User.objects.create_user(username="roberta", email="roberta@test.de", password="pass1234")
        User.objects.create_user(username="admin", email="admin@test.de", password="pass1234")

        client.login(username="robert@test.de", password="pass1234")
        resp = self._search(client, q="robert")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        usernames = {u["username"] for u in data["items"]}
        assert usernames == {"robert", "roberta"}

    def test_empty_query_returns_all(self, client: Client):
        """Without q, all users are returned."""
        User.objects.create_user(username="alice", email="alice@test.de", password="pass1234")
        User.objects.create_user(username="bob", email="bob@test.de", password="pass1234")

        client.login(username="alice@test.de", password="pass1234")
        resp = self._search(client)
        assert resp.status_code == 200
        data = resp.json()
        # Current user (alice) + bob = 2
        assert data["total"] == 2

    def test_pagination(self, client: Client):
        """Pagination works with page/page_size."""
        for i in range(5):
            User.objects.create_user(username=f"user{i:02d}", email=f"user{i:02d}@test.de", password="pass1234")

        client.login(username="user00@test.de", password="pass1234")
        resp = self._search(client, page=1, page_size=2)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert data["total_pages"] == 3

    def test_second_page(self, client: Client):
        """Second page returns remaining items."""
        for i in range(5):
            User.objects.create_user(username=f"user{i:02d}", email=f"user{i:02d}@test.de", password="pass1234")

        client.login(username="user00@test.de", password="pass1234")
        resp = self._search(client, page=3, page_size=2)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["items"]) == 1  # 5th user

    def test_requires_authentication(self, client: Client):
        """Unauthenticated request returns 403."""
        resp = self._search(client)
        assert resp.status_code == 403

    def test_page_size_validation_error(self, client: Client):
        """page_size > 50 returns 422 validation error."""
        client.login(username="user00@test.de", password="pass1234")
        resp = self._search(client, page_size=100)
        assert resp.status_code == 422

    def test_no_match_returns_empty(self, client: Client):
        """Search with no matching users returns empty list."""
        User.objects.create_user(username="alice", email="alice@test.de", password="pass1234")

        client.login(username="alice@test.de", password="pass1234")
        resp = self._search(client, q="nonexistent")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []
