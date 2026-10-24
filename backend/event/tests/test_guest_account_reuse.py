"""Guest registrations must only reuse accounts that were created as guests."""

from typing import Any

import pytest
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model

from event.services.guest_registration import GuestRegistrationService
from profiles.models import UserProfile

User = get_user_model()


def _make_social_user(email: str) -> Any:
    """Real user who signed up via Google and therefore has no usable password."""
    user = User.objects.create_user(username=email, email=email, password=None)
    SocialAccount.objects.create(user=user, provider="google", uid="google-uid-1")
    UserProfile.objects.create(user=user)
    return user


@pytest.mark.django_db
class TestCreateOrGetUser:
    def test_social_user_email_creates_separate_guest(self) -> None:
        social_user = _make_social_user("social@example.com")

        user = GuestRegistrationService.create_or_get_user("Social@Example.com")

        assert user.pk != social_user.pk
        assert user.email == "social@example.com"
        assert user.username.startswith("guest+")
        assert not user.has_usable_password()
        assert user.profile.is_guest is True
        social_user.refresh_from_db()
        assert social_user.profile.is_guest is False

    def test_social_user_email_reuses_its_separate_guest(self) -> None:
        social_user = _make_social_user("social@example.com")

        first = GuestRegistrationService.create_or_get_user("social@example.com")
        second = GuestRegistrationService.create_or_get_user("social@example.com")

        assert first.pk == second.pk != social_user.pk
        assert User.objects.filter(email__iexact="social@example.com").count() == 2

    def test_repeated_guest_registration_reuses_guest(self) -> None:
        first = GuestRegistrationService.create_or_get_user("guest@example.com")
        second = GuestRegistrationService.create_or_get_user(" GUEST@example.com ")

        assert first.pk == second.pk
        assert first.username == "guest@example.com"
        assert first.profile.is_guest is True
        assert User.objects.filter(email__iexact="guest@example.com").count() == 1

    def test_password_user_email_creates_separate_guest(self) -> None:
        real_user = User.objects.create_user(username="real", email="real@example.com", password="secret123")

        first = GuestRegistrationService.create_or_get_user("real@example.com")
        second = GuestRegistrationService.create_or_get_user("real@example.com")

        assert first.pk == second.pk != real_user.pk
        assert first.profile.is_guest is True
        assert not UserProfile.objects.filter(user=real_user).exists()

    def test_unflagged_passwordless_account_is_not_reused(self) -> None:
        """Without the explicit flag a passwordless account counts as a real user."""
        unflagged = User.objects.create_user(username="nopw@example.com", email="nopw@example.com", password=None)

        user = GuestRegistrationService.create_or_get_user("nopw@example.com")

        assert user.pk != unflagged.pk
        assert user.profile.is_guest is True
