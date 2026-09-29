"""Configured OAuth providers and account-connection helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.db.models import QuerySet

# Display order in login dialogs.
PROVIDER_ORDER: tuple[str, ...] = ("google", "apple", "microsoft", "facebook")
PROVIDER_NAMES: dict[str, str] = {
    "google": "Google",
    "apple": "Apple",
    "microsoft": "Microsoft",
    "facebook": "Facebook",
}


@dataclass(frozen=True)
class ConfiguredProvider:
    id: str
    name: str
    login_url: str


def configured_providers() -> list[ConfiguredProvider]:
    """Providers with credentials; unconfigured providers are never offered."""
    config: dict[str, dict[str, Any]] = settings.SOCIALACCOUNT_PROVIDERS
    result = []
    for provider_id in PROVIDER_ORDER:
        if config.get(provider_id, {}).get("APPS"):
            result.append(
                ConfiguredProvider(
                    id=provider_id,
                    name=PROVIDER_NAMES[provider_id],
                    login_url=f"/api/accounts/{provider_id}/login/",
                )
            )
    return result


def user_connections(user: Any) -> QuerySet[SocialAccount]:
    return SocialAccount._default_manager.filter(user=user).order_by("date_joined")


def user_provider_ids(user: Any) -> list[str]:
    return list(user_connections(user).values_list("provider", flat=True))


def provider_name(provider_id: str) -> str:
    return PROVIDER_NAMES.get(provider_id, provider_id.capitalize())
