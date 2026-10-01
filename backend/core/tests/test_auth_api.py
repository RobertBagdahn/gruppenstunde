"""Tests for social-login-only auth endpoints, adapters, account deletion and onboarding."""

from datetime import timedelta

import pytest
from allauth.account.models import EmailAddress
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.models import SocialAccount, SocialLogin
from django.contrib.auth import get_user_model
from django.test import Client, RequestFactory, override_settings
from django.utils import timezone

from core.auth.adapters import NoPasswordAccountAdapter, SocialAccountAdapter, safe_next_path
from profiles.models import UserProfile

User = get_user_model()

PROVIDERS_ONLY_GOOGLE = {
    "google": {"APPS": [{"client_id": "g-id", "secret": "g-secret"}]},
    "microsoft": {"APPS": []},
    "apple": {"APPS": []},
    "facebook": {"APPS": []},
}


@pytest.fixture
def user(db) -> object:
    u = User.objects.create_user(username="max@example.org", email="max@example.org")
    UserProfile.objects.create(user=u, first_name="Max", onboarded_at=timezone.now())
    return u


def _logged_in(user: object) -> Client:
    client = Client()
    client.force_login(user)
    return client


@pytest.mark.django_db
class TestSessionEndpoints:
    def test_me_anonymous_returns_200(self, api_client: Client) -> None:
        response = api_client.get("/api/auth/me/")
        assert response.status_code == 200
        assert response.json() == {"is_authenticated": False, "user": None}

    def test_me_authenticated(self, user: object) -> None:
        SocialAccount.objects.create(user=user, provider="google", uid="123")
        body = _logged_in(user).get("/api/auth/me/").json()
        assert body["is_authenticated"] is True
        assert body["user"]["email"] == "max@example.org"
        assert body["user"]["providers"] == ["google"]
        assert body["user"]["needs_onboarding"] is False
        assert body["user"]["display_name"] == "Max"

    def test_new_user_needs_onboarding(self, db) -> None:
        fresh = User.objects.create_user(username="neu@example.org", email="neu@example.org")
        UserProfile.objects.create(user=fresh)
        body = _logged_in(fresh).get("/api/auth/me/").json()
        assert body["user"]["needs_onboarding"] is True

    @override_settings(SOCIALACCOUNT_PROVIDERS=PROVIDERS_ONLY_GOOGLE)
    def test_providers_only_configured(self, api_client: Client) -> None:
        body = api_client.get("/api/auth/providers/").json()
        assert body["providers"] == [
            {"id": "google", "name": "Google", "login_url": "/api/accounts/google/login/"},
        ]
        assert body["dev_login"] is True

    @override_settings(AUTH_PASSWORD_LOGIN_ENABLED=False)
    @pytest.mark.parametrize("path", ["/api/auth/login/", "/api/auth/register/"])
    def test_password_endpoints_disabled_after_transition(self, api_client: Client, path: str) -> None:
        response = api_client.post(
            path,
            data={"email": "a@b.de", "password": "x", "password1": "x", "password2": "x"},
            content_type="application/json",
        )
        assert response.status_code == 404

    def test_logout_is_idempotent(self, api_client: Client) -> None:
        assert api_client.post("/api/auth/logout/").status_code == 200


@pytest.mark.django_db
class TestDevLogin:
    def test_dev_login_creates_session(self, api_client: Client) -> None:
        response = api_client.post(
            "/api/auth/dev-login/", data={"email": "user@inspi.dev"}, content_type="application/json"
        )
        assert response.status_code == 200
        assert api_client.get("/api/auth/me/").json()["is_authenticated"] is True
        created = User.objects.get(email="user@inspi.dev")
        assert not created.has_usable_password()

    @override_settings(AUTH_DEV_LOGIN_ENABLED=False)
    def test_dev_login_disabled_returns_404(self, api_client: Client) -> None:
        response = api_client.post(
            "/api/auth/dev-login/", data={"email": "user@inspi.dev"}, content_type="application/json"
        )
        assert response.status_code == 404


@pytest.mark.django_db
class TestConnections:
    def test_anonymous_gets_401(self, api_client: Client) -> None:
        response = api_client.get("/api/auth/connections/")
        assert response.status_code == 401
        assert response.json()["code"] == "auth_required"

    def test_list_and_disconnect(self, user: object) -> None:
        google = SocialAccount.objects.create(user=user, provider="google", uid="g1")
        SocialAccount.objects.create(user=user, provider="microsoft", uid="m1")
        client = _logged_in(user)
        items = client.get("/api/auth/connections/").json()
        assert [i["provider"] for i in items] == ["google", "microsoft"]
        assert items[0]["provider_name"] == "Google"
        assert client.delete(f"/api/auth/connections/{google.id}/").status_code == 204
        assert not SocialAccount.objects.filter(id=google.id).exists()

    def test_last_connection_cannot_be_removed(self, user: object) -> None:
        only = SocialAccount.objects.create(user=user, provider="google", uid="g1")
        response = _logged_in(user).delete(f"/api/auth/connections/{only.id}/")
        assert response.status_code == 400
        assert response.json()["code"] == "last_connection"
        assert SocialAccount.objects.filter(id=only.id).exists()

    def test_foreign_connection_is_404(self, user: object, db) -> None:
        other = User.objects.create_user(username="o@x.de", email="o@x.de")
        foreign = SocialAccount.objects.create(user=other, provider="google", uid="o1")
        SocialAccount.objects.create(user=other, provider="apple", uid="o2")
        response = _logged_in(user).delete(f"/api/auth/connections/{foreign.id}/")
        assert response.status_code == 404


def _sociallogin(email: str, *, verified: bool, provider: str = "microsoft", next_path: str = "/recipes/new"):
    login = SocialLogin(
        user=User(email=email, username=""),
        account=SocialAccount(provider=provider, uid="uid-1"),
        email_addresses=[EmailAddress(email=email, verified=verified, primary=True)],
    )
    login.state = {"next": next_path, "process": "login"}
    return login


@pytest.mark.django_db
class TestSocialAdapter:
    def test_email_conflict_redirects_to_login(self, user: object) -> None:
        request = RequestFactory().get("/")
        with pytest.raises(ImmediateHttpResponse) as exc:
            SocialAccountAdapter().is_auto_signup_allowed(request, _sociallogin("max@example.org", verified=False))
        location = exc.value.response["Location"]
        assert location.startswith("/login?error=email_conflict")
        assert "next=%2Frecipes%2Fnew" in location

    def test_missing_email_redirects(self, db) -> None:
        login = _sociallogin("x@example.org", verified=True)
        login.email_addresses = []
        with pytest.raises(ImmediateHttpResponse) as exc:
            SocialAccountAdapter().is_auto_signup_allowed(RequestFactory().get("/"), login)
        assert "error=email_missing" in exc.value.response["Location"]

    def test_new_email_allows_auto_signup(self, db) -> None:
        assert SocialAccountAdapter().is_auto_signup_allowed(
            RequestFactory().get("/"), _sociallogin("neu@example.org", verified=True)
        )

    def test_existing_password_account_is_not_auto_linked_or_wiped(self, user: object) -> None:
        user.set_password("bleibt-geheim-123")
        user.save(update_fields=["password"])
        sociallogin = _sociallogin("max@example.org", verified=True, provider="google")
        with pytest.raises(ImmediateHttpResponse) as exc:
            SocialAccountAdapter().pre_social_login(RequestFactory().get("/"), sociallogin)
        assert "error=email_conflict" in exc.value.response["Location"]
        user.refresh_from_db()
        assert user.check_password("bleibt-geheim-123")

    def test_local_signup_closed(self) -> None:
        assert NoPasswordAccountAdapter().is_open_for_signup(RequestFactory().get("/")) is False

    def test_authentication_error_redirects(self) -> None:
        with pytest.raises(ImmediateHttpResponse) as exc:
            SocialAccountAdapter().on_authentication_error(RequestFactory().get("/"), None, error="cancelled")
        assert exc.value.response["Location"] == "/login?error=cancelled"

    def test_save_user_creates_profile(self, db, rf: RequestFactory) -> None:
        login = _sociallogin("neu@example.org", verified=True, provider="google")
        login.user.first_name = "Nele"
        request = rf.get("/")
        from django.contrib.sessions.backends.db import SessionStore

        request.session = SessionStore()
        saved = SocialAccountAdapter().save_user(request, login)
        profile = UserProfile.objects.get(user=saved)
        assert profile.first_name == "Nele"
        assert profile.onboarded_at is None


@pytest.fixture
def rf() -> RequestFactory:
    return RequestFactory()


@pytest.mark.parametrize(
    ("candidate", "expected"),
    [
        ("/recipes/new?x=1", "/recipes/new?x=1"),
        ("https://evil.example/", "/"),
        ("//evil.example/", "/"),
        (None, "/"),
    ],
)
def test_safe_next_path(rf: RequestFactory, candidate: str | None, expected: str) -> None:
    assert safe_next_path(rf.get("/"), candidate) == expected


@pytest.mark.django_db
class TestDeleteAccount:
    def test_recent_login_deletes_and_removes_social_accounts(self, user: object) -> None:
        SocialAccount.objects.create(user=user, provider="google", uid="g1")
        client = _logged_in(user)
        User.objects.filter(pk=user.pk).update(last_login=timezone.now())
        response = client.post(
            "/api/auth/privacy/delete-account/",
            data={"confirmation": "KONTO LÖSCHEN"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert not SocialAccount.objects.filter(uid="g1").exists()
        user.refresh_from_db()
        assert user.is_active is False
        assert client.get("/api/auth/me/").json()["is_authenticated"] is False

    def test_old_login_requires_reauth(self, user: object) -> None:
        client = _logged_in(user)
        User.objects.filter(pk=user.pk).update(last_login=timezone.now() - timedelta(hours=1))
        response = client.post(
            "/api/auth/privacy/delete-account/",
            data={"confirmation": "KONTO LÖSCHEN"},
            content_type="application/json",
        )
        assert response.status_code == 401
        assert response.json()["code"] == "reauth_required"
        user.refresh_from_db()
        assert user.is_active is True

    def test_wrong_confirmation_rejected(self, user: object) -> None:
        client = _logged_in(user)
        User.objects.filter(pk=user.pk).update(last_login=timezone.now())
        response = client.post(
            "/api/auth/privacy/delete-account/",
            data={"confirmation": "löschen"},
            content_type="application/json",
        )
        assert response.status_code == 422


@pytest.mark.django_db
class TestOnboarding:
    def test_onboarding_sets_names_and_timestamp(self, db) -> None:
        fresh = User.objects.create_user(username="neu@example.org", email="neu@example.org")
        UserProfile.objects.create(user=fresh)
        client = _logged_in(fresh)
        response = client.post(
            "/api/profile/me/onboarding/",
            data={"scout_name": "Fuchs", "first_name": "Nele"},
            content_type="application/json",
        )
        assert response.status_code == 200
        profile = UserProfile.objects.get(user=fresh)
        assert profile.scout_name == "Fuchs"
        assert profile.onboarded_at is not None
        assert client.get("/api/auth/me/").json()["user"]["needs_onboarding"] is False

    def test_skip_onboarding(self, db) -> None:
        fresh = User.objects.create_user(username="neu@example.org", email="neu@example.org")
        response = _logged_in(fresh).post("/api/profile/me/onboarding/", data={}, content_type="application/json")
        assert response.status_code == 200
        assert UserProfile.objects.get(user=fresh).onboarded_at is not None


@pytest.mark.django_db
class TestPasswordTransition:
    """Existing e-mail/password accounts keep working during the transition period."""

    def test_providers_announce_password_login(self, api_client: Client) -> None:
        assert api_client.get("/api/auth/providers/").json()["password_login"] is True

    def test_existing_password_user_can_log_in(self, api_client: Client) -> None:
        User.objects.create_user(username="alt@example.org", email="alt@example.org", password="geheim-12345")
        response = api_client.post(
            "/api/auth/login/",
            data={"email": "Alt@Example.org", "password": "geheim-12345"},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert api_client.get("/api/auth/me/").json()["user"]["email"] == "alt@example.org"

    def test_wrong_password_is_rejected(self, api_client: Client) -> None:
        User.objects.create_user(username="alt@example.org", email="alt@example.org", password="geheim-12345")
        response = api_client.post(
            "/api/auth/login/",
            data={"email": "alt@example.org", "password": "falsch"},
            content_type="application/json",
        )
        assert response.status_code == 400
        assert response.json()["code"] == "invalid_credentials"

    def test_register_creates_user_and_profile(self, api_client: Client) -> None:
        response = api_client.post(
            "/api/auth/register/",
            data={"email": "neu@example.org", "password1": "Lagerfeuer-2026!", "password2": "Lagerfeuer-2026!"},
            content_type="application/json",
        )
        assert response.status_code == 201
        assert response.json()["needs_onboarding"] is True
        assert UserProfile.objects.filter(user__email="neu@example.org").exists()

    def test_register_rejects_duplicate_and_weak_password(self, api_client: Client) -> None:
        User.objects.create_user(username="da@example.org", email="da@example.org", password="x")
        taken = api_client.post(
            "/api/auth/register/",
            data={"email": "da@example.org", "password1": "Lagerfeuer-2026!", "password2": "Lagerfeuer-2026!"},
            content_type="application/json",
        )
        assert taken.json()["code"] == "email_taken"
        weak = api_client.post(
            "/api/auth/register/",
            data={"email": "neu2@example.org", "password1": "123", "password2": "123"},
            content_type="application/json",
        )
        assert weak.status_code == 400
        assert weak.json()["code"] == "weak_password"
