"""Tests for the generic user search endpoint (collaborator invites)."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from core.services.user_directory import public_display_name
from profiles.tests import make_user_profile

User = get_user_model()


def _make_user(email: str, first_name: str = "", last_name: str = "", is_active: bool = True):
    return User.objects.create_user(
        username=email,
        email=email,
        password="pass1234",
        first_name=first_name,
        last_name=last_name,
        is_active=is_active,
    )


@pytest.mark.django_db
class TestUserSearch:
    def _search(self, client: Client, q: str = "", page: int = 1, page_size: int = 20):
        params: dict[str, str | int] = {"page": page, "page_size": page_size}
        if q:
            params["q"] = q
        return client.get("/api/users/search/", params)

    @pytest.fixture
    def searcher(self, client: Client):
        user = _make_user("searcher@test.de", "Sabine", "Sucher")
        client.force_login(user)
        return user

    def test_search_by_name_returns_display_names_only(self, client: Client, searcher):
        robert = _make_user("robert@test.de", "Robert", "Bagdahn")
        roberta = _make_user("roberta@test.de", "Roberta", "Mustermann")
        _make_user("admin@test.de", "Ada", "Admin")

        resp = self._search(client, q="robert")

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert {(u["id"], u["display_name"]) for u in data["items"]} == {
            (robert.id, "Robert Bagdahn"),
            (roberta.id, "Roberta Mustermann"),
        }
        assert "@" not in resp.content.decode()

    def test_search_matches_profile_scout_name(self, client: Client, searcher):
        user = _make_user("adler@test.de")
        make_user_profile(user=user, scout_name="Adler")

        resp = self._search(client, q="adl")

        assert resp.status_code == 200
        assert resp.json()["items"] == [{"id": user.id, "display_name": "Adler"}]

    def test_search_does_not_match_email_substrings(self, client: Client, searcher):
        _make_user("hidden.person@test.de")

        resp = self._search(client, q="hidden")

        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_exact_email_match_is_case_insensitive_and_returns_one_user(self, client: Client, searcher):
        invitee = _make_user("invitee@test.de")

        resp = self._search(client, q="  INVITEE@Test.de ")

        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"] == [{"id": invitee.id, "display_name": f"Inspi-Nutzer #{invitee.id}"}]
        assert "invitee@test.de" not in resp.content.decode().lower()

    def test_partial_email_does_not_match(self, client: Client, searcher):
        _make_user("invitee@test.de")

        resp = self._search(client, q="invitee@test")

        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_inactive_users_are_excluded(self, client: Client, searcher):
        _make_user("gone@test.de", "Gerda", "Gone", is_active=False)

        resp = self._search(client, q="gerda")

        assert resp.json()["total"] == 0

    @pytest.mark.parametrize("q", ["", "a", " b "])
    def test_short_or_missing_query_is_rejected(self, client: Client, searcher, q: str):
        resp = self._search(client, q=q)

        assert resp.status_code == 422

    def test_pagination(self, client: Client, searcher):
        for i in range(5):
            _make_user(f"user{i:02d}@test.de", "Paula", f"Page{i:02d}")

        first = self._search(client, q="paula", page=1, page_size=2).json()
        last = self._search(client, q="paula", page=3, page_size=2).json()

        assert len(first["items"]) == 2
        assert first["total"] == 5
        assert first["total_pages"] == 3
        assert len(last["items"]) == 1

    def test_page_size_is_limited(self, client: Client, searcher):
        resp = self._search(client, q="paula", page_size=21)

        assert resp.status_code == 422

    def test_requires_authentication(self, client: Client):
        resp = self._search(client, q="robert")

        assert resp.status_code == 401


@pytest.mark.django_db
class TestPublicDisplayName:
    def test_prefers_scout_name_then_profile_name(self):
        user = _make_user("name@test.de", "Konto", "Name")
        profile = make_user_profile(user=user, scout_name="Fuchs", first_name="Fritz", last_name="Fuchs")
        assert public_display_name(user) == "Fuchs"

        profile.scout_name = ""
        profile.save()
        assert public_display_name(user) == "Fritz Fuchs"

    def test_falls_back_to_account_name_without_profile(self):
        user = _make_user("account@test.de", "Anna", "Account")
        assert public_display_name(user) == "Anna Account"

    def test_never_falls_back_to_email(self):
        user = _make_user("nameless@test.de")
        make_user_profile(user=user, scout_name="", first_name="", last_name="")
        user.refresh_from_db()

        assert public_display_name(user) == f"Inspi-Nutzer #{user.id}"
        assert public_display_name(None) == ""
