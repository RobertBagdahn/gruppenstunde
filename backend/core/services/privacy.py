"""GDPR collector for linked social login accounts."""

from __future__ import annotations

from typing import Any

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount, SocialToken
from django.contrib.auth.models import User

from core.auth.providers import provider_name
from profiles.services.privacy import PrivacyDataCollector


class SocialLoginPrivacyCollector(PrivacyDataCollector):
    """Lists linked providers and removes them on account deletion."""

    def collect(self, user: User) -> dict[str, Any]:
        accounts = SocialAccount._default_manager.filter(user=user).order_by("date_joined")
        items = [
            {
                "provider": provider_name(account.provider),
                "connected_at": account.date_joined.isoformat(),
                "last_login": account.last_login.isoformat() if account.last_login else None,
            }
            for account in accounts
        ]
        return {"login_providers": {"count": len(items), "items": items}}

    def anonymize(self, user: User) -> None:
        # Deleting the SocialAccount rows ensures a later login with the same
        # provider creates a fresh account instead of reviving the deleted one.
        SocialToken._default_manager.filter(account__user=user).delete()
        SocialAccount._default_manager.filter(user=user).delete()
        EmailAddress._default_manager.filter(user=user).delete()
