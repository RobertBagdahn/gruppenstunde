from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "add users"

    def handle(self, *args, **options):
        UserModel = get_user_model()

        if not UserModel.objects.filter(username="admin").exists():
            user = UserModel.objects.create_user(
                "admin",
                password="admin",
                email="admin@admin.de",
            )

            user.is_superuser = True
            user.is_staff = True
            user.save()

        if not UserModel.objects.filter(username="staff").exists():
            user = UserModel.objects.create_user(
                "staff",
                password="staff",
                email="staff@staff.de",
            )

            user.is_superuser = False
            user.is_staff = True
            user.save()

        if not UserModel.objects.filter(username="user").exists():
            user = UserModel.objects.create_user(
                "user",
                password="user",
                email="user@user.de",
            )

            user.is_superuser = False
            user.is_staff = False
            user.save()

        if not UserModel.objects.filter(username="author1").exists():
            user = UserModel.objects.create_user(
                "author1",
                password="author1",
                email="author1@author1.de",
            )

            user.is_superuser = False
            user.is_staff = False
            user.save()

        if not UserModel.objects.filter(username="robert").exists():
            user = UserModel.objects.create_user(
                "robert",
                password="robert",
                email="robert@robert.de",
            )

            user.is_superuser = False
            user.is_staff = False
            user.save()

        if not UserModel.objects.filter(username="mats").exists():
            user = UserModel.objects.create_user(
                "mats",
                password="mats",
                email="mats@mats.de",
            )

            user.is_superuser = False
            user.is_staff = False
            user.save()

        self.stdout.write(self.style.SUCCESS("users created"))
