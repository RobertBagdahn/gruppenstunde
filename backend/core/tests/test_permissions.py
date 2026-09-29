"""Tests for the unified error contract and central permission guards."""

from datetime import timedelta

import pytest
from django.contrib.auth.models import AnonymousUser
from django.http import HttpRequest
from django.test import Client, RequestFactory
from django.utils import timezone

from core.errors import ApiError
from core.permissions import (
    deny,
    optional_user,
    require_login,
    require_recent_login,
    require_staff,
)


@pytest.fixture
def rf() -> RequestFactory:
    return RequestFactory()


def _request(rf: RequestFactory, user: object) -> HttpRequest:
    request = rf.get("/")
    setattr(request, "user", user)  # noqa: B010 - HttpRequest does not declare `user`
    return request


class TestRequireLogin:
    def test_anonymous_raises_401_auth_required(self, rf: RequestFactory) -> None:
        with pytest.raises(ApiError) as exc:
            require_login(_request(rf, AnonymousUser()))
        assert exc.value.status_code == 401
        assert exc.value.code == "auth_required"
        assert exc.value.detail == "Bitte melde dich an, um das zu speichern."

    def test_action_text_is_used(self, rf: RequestFactory) -> None:
        with pytest.raises(ApiError) as exc:
            require_login(_request(rf, AnonymousUser()), "um diesen Essensplan zu bearbeiten")
        assert exc.value.detail == "Bitte melde dich an, um diesen Essensplan zu bearbeiten."

    @pytest.mark.django_db
    def test_authenticated_returns_user(self, rf: RequestFactory, django_user_model: type) -> None:
        user = django_user_model.objects.create_user(username="u", email="u@x.de")
        assert require_login(_request(rf, user)) == user

    @pytest.mark.django_db
    def test_optional_user(self, rf: RequestFactory, django_user_model: type) -> None:
        user = django_user_model.objects.create_user(username="u", email="u@x.de")
        assert optional_user(_request(rf, AnonymousUser())) is None
        assert optional_user(_request(rf, user)) == user


@pytest.mark.django_db
class TestRequireStaff:
    def test_anonymous_gets_401(self, rf: RequestFactory) -> None:
        with pytest.raises(ApiError) as exc:
            require_staff(_request(rf, AnonymousUser()))
        assert exc.value.status_code == 401

    def test_non_staff_gets_403_staff_required(self, rf: RequestFactory, django_user_model: type) -> None:
        user = django_user_model.objects.create_user(username="u", email="u@x.de")
        with pytest.raises(ApiError) as exc:
            require_staff(_request(rf, user))
        assert exc.value.status_code == 403
        assert exc.value.code == "staff_required"

    def test_staff_passes(self, rf: RequestFactory, django_user_model: type) -> None:
        user = django_user_model.objects.create_user(username="s", email="s@x.de", is_staff=True)
        assert require_staff(_request(rf, user)) == user


def test_deny_raises_permission_denied() -> None:
    with pytest.raises(ApiError) as exc:
        deny()
    assert exc.value.status_code == 403
    assert exc.value.code == "permission_denied"


@pytest.mark.django_db
class TestRequireRecentLogin:
    def test_recent_login_passes(self, rf: RequestFactory, django_user_model: type) -> None:
        user = django_user_model.objects.create_user(username="u", email="u@x.de")
        user.last_login = timezone.now() - timedelta(minutes=5)
        assert require_recent_login(_request(rf, user)) == user

    def test_old_login_requires_reauth(self, rf: RequestFactory, django_user_model: type) -> None:
        user = django_user_model.objects.create_user(username="u", email="u@x.de")
        user.last_login = timezone.now() - timedelta(minutes=30)
        with pytest.raises(ApiError) as exc:
            require_recent_login(_request(rf, user))
        assert exc.value.status_code == 401
        assert exc.value.code == "reauth_required"


@pytest.mark.django_db
class TestErrorHandler:
    def test_anonymous_protected_endpoint_returns_code(self, api_client: Client) -> None:
        response = api_client.get("/api/auth/connections/")
        assert response.status_code == 401
        body = response.json()
        assert body["code"] == "auth_required"
        assert "melde dich an" in body["detail"]

    def test_plain_http_error_gets_default_code(self, api_client: Client) -> None:
        response = api_client.get("/api/recipes/999999/")
        assert response.status_code == 404
        assert response.json()["code"] == "not_found"
