from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from profiles.models import UserProfile

USERS = [
    {
        "username": "admin",
        "password": "admin",
        "email": "admin@admin.de",
        "is_superuser": True,
        "is_staff": True,
        "scout_name": "Admin",
        "first_name": "Admin",
        "last_name": "User",
    },
    {
        "username": "staff",
        "password": "staff",
        "email": "staff@staff.de",
        "is_superuser": False,
        "is_staff": True,
        "scout_name": "Staffi",
        "first_name": "Staff",
        "last_name": "User",
    },
    {
        "username": "user",
        "password": "user",
        "email": "user@user.de",
        "is_superuser": False,
        "is_staff": False,
        "scout_name": "Normalo",
        "first_name": "Normal",
        "last_name": "User",
    },
    {
        "username": "author1",
        "password": "author1",
        "email": "author1@author1.de",
        "is_superuser": False,
        "is_staff": False,
        "scout_name": "Autor",
        "first_name": "Author",
        "last_name": "Eins",
    },
    {
        "username": "robert",
        "password": "robert",
        "email": "robert@robert.de",
        "is_superuser": False,
        "is_staff": True,
        "scout_name": "Robert",
        "first_name": "Robert",
        "last_name": "Bagdahn",
    },
    {
        "username": "peter",
        "password": "peter",
        "email": "peter@peter.de",
        "is_superuser": False,
        "is_staff": True,
        "scout_name": "Peter",
        "first_name": "Peter",
        "last_name": "Peter",
    },
]


class Command(BaseCommand):
    help = "Create seed users with profiles for local development"

    def add_arguments(self, parser):
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help="Create seed users only when no users exist yet.",
        )

    def handle(self, *args, **options):
        UserModel = get_user_model()

        if options.get("if_empty") and UserModel.objects.exists():
            self.stdout.write(self.style.WARNING("Users already exist; skipping add_users."))
            return

        for data in USERS:
            username = data["username"]
            user, created = UserModel.objects.get_or_create(
                username=username,
                defaults={
                    "email": data["email"],
                },
            )
            if created:
                user.set_password(data["password"])

            user.is_superuser = data["is_superuser"]
            user.is_staff = data["is_staff"]
            user.email = data["email"]
            user.save()

            UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "scout_name": data.get("scout_name", ""),
                    "first_name": data.get("first_name", ""),
                    "last_name": data.get("last_name", ""),
                },
            )

            action = "Created" if created else "Updated"
            self.stdout.write(f"  + {action} user '{username}'")

        self.stdout.write(self.style.SUCCESS("Users created"))
