"""Parent access service — token management and verification."""

import logging
from datetime import timedelta

from django.utils import timezone

from event.models import ParentAccessToken, Participant

logger = logging.getLogger(__name__)


class ParentAccessService:
    """Manages parent access tokens."""

    @classmethod
    def generate_token(cls, participant: Participant, email: str = "", expires_in_days: int = 30):
        """Generate a parent access token for a participant."""
        token = ParentAccessToken.objects.create(
            participant=participant,
            email=email,
            expires_at=timezone.now() + timedelta(days=expires_in_days),
        )
        return token

    @classmethod
    def batch_generate(cls, event, expires_in_days: int = 30):
        """Generate tokens for all participants without active tokens."""
        participants = Participant.objects.filter(registration__event=event)
        tokens = []
        expires_at = timezone.now() + timedelta(days=expires_in_days)

        for participant in participants:
            if ParentAccessToken.objects.filter(
                participant=participant,
                expires_at__gt=timezone.now(),
            ).exists():
                continue

            token = ParentAccessToken.objects.create(
                participant=participant,
                email=participant.email or "",
                expires_at=expires_at,
            )
            tokens.append(token)

        return tokens

    @classmethod
    def verify_token(cls, token_str: str):
        """Verify a parent access token and return the participant data."""
        try:
            token = ParentAccessToken.objects.select_related(
                "participant__registration__event",
            ).get(token=token_str)
        except ParentAccessToken.DoesNotExist:
            return None

        if token.expires_at < timezone.now():
            return None

        return token

    @classmethod
    def revoke_token(cls, token_id: int):
        """Revoke a token by deleting it."""
        ParentAccessToken.objects.filter(id=token_id).delete()
