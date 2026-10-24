"""Selection logic of the data migration that flags existing guest accounts."""

from importlib import import_module
from io import StringIO
from typing import Any

import pytest
from allauth.socialaccount.models import SocialAccount
from django.apps import apps
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone

from event.tests import make_person
from profiles.models import UserProfile

User = get_user_model()
migration = import_module("profiles.migrations.0004_userprofile_is_guest")


def _make_user(username: str, email: str, *, password: str | None = None, with_person: bool = True) -> Any:
    user = User.objects.create_user(username=username, email=email, password=password)
    if with_person:
        make_person(user=user)
    return user


@pytest.mark.django_db
class TestGuestCandidates:
    def test_marks_only_guest_accounts(self) -> None:
        guest = _make_user("guest@example.com", "guest@example.com")
        alias_guest = _make_user("guest+0123456789ab@real@example.com", "real@example.com")
        mixed_case_guest = _make_user("Mixed@Example.com", "Mixed@Example.com")

        social = _make_user("social@example.com", "social@example.com")
        SocialAccount.objects.create(user=social, provider="apple", uid="apple-uid-1")
        _make_user("real", "real@example.com", password="secret123")
        logged_in = _make_user("dev@example.com", "dev@example.com")
        User.objects.filter(pk=logged_in.pk).update(last_login=timezone.now())
        _make_user("noperson@example.com", "noperson@example.com", with_person=False)
        staff = _make_user("staff@example.com", "staff@example.com")
        User.objects.filter(pk=staff.pk).update(is_staff=True)
        _make_user("other-name", "other@example.com")
        _make_user("guest+0123456789ab@x@example.com", "y@example.com")

        candidates = migration.guest_candidates(apps)

        assert {user.pk for user in candidates} == {guest.pk, alias_guest.pk, mixed_case_guest.pk}

    def test_mark_guest_profiles_sets_flag(self) -> None:
        guest = _make_user("guest@example.com", "guest@example.com")
        UserProfile.objects.create(user=guest, scout_name="Falke")
        new_profile_guest = _make_user("guest2@example.com", "guest2@example.com")
        real = _make_user("real", "real@example.com", password="secret123")
        UserProfile.objects.create(user=real)

        migration.mark_guest_profiles(apps, None)

        assert UserProfile.objects.get(user=guest).is_guest is True
        assert UserProfile.objects.get(user=guest).scout_name == "Falke"
        assert UserProfile.objects.get(user=new_profile_guest).is_guest is True
        assert UserProfile.objects.get(user=real).is_guest is False


@pytest.mark.django_db
def test_report_guest_accounts_is_read_only() -> None:
    guest = _make_user("guest@example.com", "guest@example.com")
    social = _make_user("social@example.com", "social@example.com")
    SocialAccount.objects.create(user=social, provider="google", uid="google-uid-1")
    out = StringIO()

    call_command("report_guest_accounts", stdout=out)

    output = out.getvalue()
    assert "Aktive Konten ohne nutzbares Passwort: 2" in output
    assert "davon mit Social-Login (nie Gast): 1" in output
    assert "Würden als Gastkonto markiert: 1" in output
    assert f"[{guest.pk}]" in output
    assert "guest@example.com" not in output
    assert not UserProfile.objects.exists()
