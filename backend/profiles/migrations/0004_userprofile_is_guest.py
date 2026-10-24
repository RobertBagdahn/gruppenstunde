import re

from django.db import migrations, models
from django.db.models import Exists, OuterRef

# Mirrors django.contrib.auth.hashers.UNUSABLE_PASSWORD_PREFIX; historical models
# have no has_usable_password().
UNUSABLE_PASSWORD_PREFIX = "!"
GUEST_ALIAS_PATTERN = re.compile(r"^guest\+[0-9a-f]{12}@(?P<email>.+)$")


def _is_guest_username(username: str, email: str) -> bool:
    """Usernames GuestRegistrationService assigns: the email itself or guest+<hex>@<email>."""
    username = username.lower()
    email = email.lower()
    if username == email:
        return True
    match = GUEST_ALIAS_PATTERN.match(username)
    return match is not None and match.group("email") == email


def guest_candidates(apps):
    """Accounts created by guest registrations that never signed in.

    Social-only accounts also lack a usable password, so the SocialAccount
    exclusion is what separates real users from guests. Requiring an owned
    Person and an empty last_login keeps the selection conservative.
    """
    User = apps.get_model("auth", "User")
    SocialAccount = apps.get_model("socialaccount", "SocialAccount")
    Person = apps.get_model("event", "Person")
    candidates = (
        User.objects.filter(
            password__startswith=UNUSABLE_PASSWORD_PREFIX,
            last_login__isnull=True,
            is_active=True,
            is_staff=False,
            is_superuser=False,
        )
        .exclude(email="")
        .exclude(Exists(SocialAccount.objects.filter(user=OuterRef("pk"))))
        .filter(Exists(Person.objects.filter(user=OuterRef("pk"))))
    )
    return [user for user in candidates if _is_guest_username(user.username, user.email)]


def mark_guest_profiles(apps, schema_editor):
    UserProfile = apps.get_model("profiles", "UserProfile")
    for user in guest_candidates(apps):
        UserProfile.objects.update_or_create(user=user, defaults={"is_guest": True})


class Migration(migrations.Migration):
    dependencies = [
        ("event", "0006_remove_event_meal_plan"),
        ("profiles", "0003_userprofile_onboarded_at"),
        ("socialaccount", "0006_alter_socialaccount_extra_data"),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="is_guest",
            field=models.BooleanField(
                default=False,
                help_text="Durch eine Gast-Anmeldung ohne Login entstanden; nur solche Konten werden dafür wiederverwendet",
                verbose_name="Gastkonto",
            ),
        ),
        migrations.RunPython(mark_guest_profiles, migrations.RunPython.noop),
    ]
