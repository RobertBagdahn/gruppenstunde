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
        "is_staff": False,
        "scout_name": "Robert",
        "first_name": "Robert",
        "last_name": "Bagdahn",
    },
    {
        "username": "mats",
        "password": "mats",
        "email": "mats@mats.de",
        "is_superuser": False,
        "is_staff": False,
        "scout_name": "Mats",
        "first_name": "Mats",
        "last_name": "User",
    },
]


class Command(BaseCommand):
    help = "Create seed users with profiles for local development"

    def handle(self, *args, **options):
        UserModel = get_user_model()

        for data in USERS:
            username = data["username"]
            if UserModel.objects.filter(username=username).exists():
                self.stdout.write(f"  User '{username}' already exists, skipping.")
                continue

            user = UserModel.objects.create_user(
                username,
                password=data["password"],
                email=data["email"],
            )
            user.is_superuser = data["is_superuser"]
            user.is_staff = data["is_staff"]
            user.save()

            UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "scout_name": data.get("scout_name", ""),
                    "first_name": data.get("first_name", ""),
                    "last_name": data.get("last_name", ""),
                },
            )

            self.stdout.write(f"  + Created user '{username}'")

        self.stdout.write(self.style.SUCCESS("Users created"))
