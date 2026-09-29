"""Session payload assembly for `/api/auth/me/`."""

from __future__ import annotations

from typing import Any

from core.schemas import AuthUserOut, SessionOut

from .providers import user_provider_ids


def display_name_for(user: Any) -> str:
    profile = getattr(user, "profile", None)
    if profile is not None:
        return str(profile.scout_display_name)
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or user.email


def needs_onboarding(user: Any) -> bool:
    profile = getattr(user, "profile", None)
    return profile is None or profile.onboarded_at is None


def auth_user_out(user: Any) -> AuthUserOut:
    try:
        display_name = display_name_for(user)
        onboarding = needs_onboarding(user)
    except Exception:  # a missing profile relation must never break the session call
        display_name = user.email
        onboarding = True
    return AuthUserOut(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        display_name=display_name,
        is_staff=user.is_staff,
        is_superuser=user.is_superuser,
        needs_onboarding=onboarding,
        providers=user_provider_ids(user),
    )


def session_out(user: Any) -> SessionOut:
    if user is None or not user.is_authenticated:
        return SessionOut(is_authenticated=False, user=None)
    return SessionOut(is_authenticated=True, user=auth_user_out(user))
