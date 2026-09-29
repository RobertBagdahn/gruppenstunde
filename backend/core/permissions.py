"""Central authentication and authorization guards for API endpoints.

All endpoints MUST use these helpers instead of local `_require_auth` variants so
that anonymous access (401) and missing permissions (403) are distinguishable.
"""

from __future__ import annotations

from datetime import timedelta
from typing import NoReturn

from django.contrib.auth.models import AbstractBaseUser, AnonymousUser
from django.http import HttpRequest
from django.utils import timezone

from core.errors import ApiError

AUTH_REQUIRED_DETAIL = "Bitte melde dich an, um das zu speichern."
PERMISSION_DENIED_DETAIL = (
    "Dafür fehlt dir die Berechtigung. Frag die Person, der das gehört, oder einen Gruppen-Admin."
)
STAFF_REQUIRED_DETAIL = "Dieser Bereich ist nur für das Inspi-Team."
REAUTH_REQUIRED_DETAIL = "Bitte melde dich zur Sicherheit noch einmal an."


def _request_user(request: HttpRequest) -> AbstractBaseUser | AnonymousUser:
    # AuthenticationMiddleware attaches `user` dynamically; HttpRequest does not declare it.
    user = getattr(request, "user", None)
    return user if user is not None else AnonymousUser()


def require_login(request: HttpRequest, action: str | None = None) -> AbstractBaseUser:
    """Return the authenticated user or raise 401 `auth_required`.

    `action` completes the sentence "Bitte melde dich an, …", e.g.
    "um diesen Essensplan zu bearbeiten".
    """
    user = _request_user(request)
    if not user.is_authenticated:
        detail = f"Bitte melde dich an, {action}." if action else AUTH_REQUIRED_DETAIL
        raise ApiError(401, "auth_required", detail)
    return user  # type: ignore[return-value]


def optional_user(request: HttpRequest) -> AbstractBaseUser | None:
    """Return the authenticated user or None for anonymous visitors."""
    user = _request_user(request)
    if isinstance(user, AnonymousUser) or not user.is_authenticated:
        return None
    return user  # type: ignore[return-value]


def is_staff_user(user: object) -> bool:
    """Staff = Django `is_staff` or the profile role staff/admin (legacy role field)."""
    if getattr(user, "is_staff", False):
        return True
    profile = getattr(user, "profile", None)
    return getattr(profile, "role", None) in ("staff", "admin")


def require_staff(request: HttpRequest) -> AbstractBaseUser:
    """Return the staff user; 401 for anonymous, 403 `staff_required` otherwise."""
    user = require_login(request, "um diesen Bereich zu öffnen")
    try:
        allowed = is_staff_user(user)
    except Exception:  # missing profile relation must not grant access
        allowed = bool(getattr(user, "is_staff", False))
    if not allowed:
        raise ApiError(403, "staff_required", STAFF_REQUIRED_DETAIL)
    return user


def deny(detail: str | None = None) -> NoReturn:
    """Raise 403 `permission_denied` for an authenticated user lacking rights."""
    raise ApiError(403, "permission_denied", detail or PERMISSION_DENIED_DETAIL)


def require_recent_login(request: HttpRequest, minutes: int = 15) -> AbstractBaseUser:
    """Require a login within the last `minutes`; raise 401 `reauth_required` otherwise."""
    user = require_login(request)
    last_login = getattr(user, "last_login", None)
    if last_login is None or timezone.now() - last_login > timedelta(minutes=minutes):
        raise ApiError(401, "reauth_required", REAUTH_REQUIRED_DETAIL)
    return user
