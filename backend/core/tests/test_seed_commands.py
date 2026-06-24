from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from content.choices import ContentStatus
from session.models import GroupSession


@pytest.mark.django_db
class TestAddUsersCommand:
    def test_if_empty_skips_when_users_exist(self):
        UserModel = get_user_model()
        UserModel.objects.create_user(username="existing", password="existing")

        output = StringIO()
        call_command("add_users", "--if-empty", stdout=output)

        assert UserModel.objects.count() == 1
        assert "skipping add_users" in output.getvalue()


@pytest.mark.django_db
class TestSeedAllCommand:
    def test_if_empty_skips_selected_section_when_seed_data_exists(self):
        GroupSession.objects.create(
            title="Existing session",
            summary="Already seeded",
            session_type="scout_skills",
            status=ContentStatus.APPROVED,
        )

        output = StringIO()
        call_command("seed_all", "--only", "content", "--if-empty", stdout=output)

        assert GroupSession.objects.count() == 1
        assert "skipping seed_all" in output.getvalue()
