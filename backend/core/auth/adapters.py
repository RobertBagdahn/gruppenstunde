"""Allauth adapters: social login only, SPA-friendly redirects, profile bootstrap."""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlencode

from allauth.account.adapter import DefaultAccountAdapter
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialLogin
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import HttpRequest, HttpResponseRedirect
from django.utils.http import url_has_allowed_host_and_scheme

logger = logging.getLogger(__name__)


def safe_next_path(request: HttpRequest, candidate: str | None, fallback: str = "/") -> str:
    """Accept only same-host relative paths; anything else falls back."""
    if not candidate or not candidate.startswith("/") or candidate.startswith("//"):
        return fallback
    if not url_has_allowed_host_and_scheme(candidate, allowed_hosts={request.get_host()}):
        return fallback
    return candidate


def login_error_redirect(code: str, next_path: str | None = None, base: str | None = None) -> HttpResponseRedirect:
    params = {"error": code}
    if next_path:
        params["next"] = next_path
    target = base or settings.FRONTEND_LOGIN_URL
    return HttpResponseRedirect(f"{target}?{urlencode(params)}")


def _state_next(sociallogin: SocialLogin) -> str | None:
    state = getattr(sociallogin, "state", None) or {}
    value = state.get("next")
    return value if isinstance(value, str) else None


class NoPasswordAccountAdapter(DefaultAccountAdapter):
    """Local (password) signup is closed; accounts are created via social login only."""

    def is_open_for_signup(self, request: HttpRequest) -> bool:  # pyright: ignore[reportIncompatibleMethodOverride]
        return False

    def is_safe_url(self, url: str | None) -> bool:
        if not url or not url.startswith("/") or url.startswith("//"):
            return False
        return super().is_safe_url(url)

    def get_login_redirect_url(self, request: HttpRequest) -> str:
        return "/"


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    """Auto-signup with profile bootstrap and SPA error redirects instead of allauth HTML."""

    def is_open_for_signup(  # pyright: ignore[reportIncompatibleMethodOverride]
        self, request: HttpRequest, sociallogin: SocialLogin
    ) -> bool:
        return True

    def pre_social_login(self, request: HttpRequest, sociallogin: SocialLogin) -> None:
        process = (getattr(sociallogin, "state", None) or {}).get("process")
        user = getattr(request, "user", None)
        if (
            process == "connect"
            and sociallogin.is_existing
            and user is not None
            and user.is_authenticated
            and sociallogin.user != user
        ):
            raise ImmediateHttpResponse(login_error_redirect("connected_other", base=settings.FRONTEND_ACCOUNT_URL))

    def is_auto_signup_allowed(self, request: HttpRequest, sociallogin: SocialLogin) -> bool:
        # Reached only when no linked account and no verified-email match exists.
        next_path = _state_next(sociallogin)
        emails = [address.email for address in sociallogin.email_addresses if address.email]
        if not emails:
            raise ImmediateHttpResponse(login_error_redirect("email_missing", next_path))
        user_model = get_user_model()
        if user_model.objects.filter(email__iexact=emails[0]).exists():
            raise ImmediateHttpResponse(login_error_redirect("email_conflict", next_path))
        return True

    def populate_user(self, request: HttpRequest, sociallogin: SocialLogin, data: dict[str, Any]) -> Any:
        user = super().populate_user(request, sociallogin, data)
        email = (user.email or "").strip().lower()
        user.email = email
        if not user.username:
            user.username = email
        return user

    def save_user(self, request: HttpRequest, sociallogin: SocialLogin, form: Any = None) -> Any:
        user: Any = super().save_user(request, sociallogin, form)
        from profiles.models import UserProfile

        UserProfile._default_manager.get_or_create(
            user=user,
            defaults={"first_name": user.first_name or "", "last_name": user.last_name or ""},
        )
        return user

    def on_authentication_error(
        self,
        request: HttpRequest,
        provider: Any,
        error: str | None = None,
        exception: Exception | None = None,
        extra_context: dict[str, Any] | None = None,
    ) -> None:
        code = "cancelled" if error == "cancelled" else "provider_error"
        logger.info("Social login failed for provider %s: %s", getattr(provider, "id", provider), error)
        raise ImmediateHttpResponse(login_error_redirect(code))

    def get_connect_redirect_url(self, request: HttpRequest, socialaccount: Any) -> str:
        return f"{settings.FRONTEND_ACCOUNT_URL}?connected={socialaccount.provider}"
