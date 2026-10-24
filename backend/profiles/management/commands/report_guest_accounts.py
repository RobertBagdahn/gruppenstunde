"""Report-only preview of the ``profiles.0004`` guest-flag data migration (never writes).

Runs the migration's own selection against the current database, so it also works
before the migration is applied (it never reads ``UserProfile.is_guest``). Only user
IDs are printed, no email addresses.
"""

from importlib import import_module
from typing import Any

from allauth.socialaccount.models import SocialAccount
from django.apps import apps
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_PREFIX
from django.core.management.base import BaseCommand
from django.db.models import Exists, OuterRef

from profiles.models import UserProfile

guest_migration = import_module("profiles.migrations.0004_userprofile_is_guest")

SAMPLE_SIZE = 20


class Command(BaseCommand):
    help = "Preview which accounts the profiles.0004 migration flags as guest accounts. Dry-run only."

    def handle(self, *args: Any, **options: Any) -> None:
        User = get_user_model()
        passwordless = User.objects.filter(password__startswith=UNUSABLE_PASSWORD_PREFIX, is_active=True)
        has_social = Exists(SocialAccount.objects.filter(user=OuterRef("pk")))
        social_only = passwordless.filter(has_social)

        guest_ids = sorted(user.pk for user in guest_migration.guest_candidates(apps))
        with_profile = set(UserProfile.objects.filter(user_id__in=guest_ids).values_list("user_id", flat=True))
        unflagged = list(
            passwordless.exclude(has_social).exclude(pk__in=guest_ids).order_by("pk").values_list("pk", flat=True)
        )

        self.stdout.write(f"Aktive Konten ohne nutzbares Passwort: {passwordless.count()}")
        self.stdout.write(f"  davon mit Social-Login (nie Gast): {social_only.count()}")
        self.stdout.write(f"Würden als Gastkonto markiert: {len(guest_ids)}")
        self.stdout.write(f"  mit vorhandenem Profil: {len(with_profile)}")
        self.stdout.write(f"  Profil wird neu angelegt: {len(guest_ids) - len(with_profile)}")
        self.stdout.write(f"  IDs (max. {SAMPLE_SIZE}): {guest_ids[:SAMPLE_SIZE]}")
        self.stdout.write(f"Ohne Passwort und ohne Social-Login, nicht markiert: {len(unflagged)}")
        self.stdout.write(f"  IDs zur Sichtprüfung (max. {SAMPLE_SIZE}): {unflagged[:SAMPLE_SIZE]}")
