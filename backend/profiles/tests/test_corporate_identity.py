"""Tests for GroupCorporateIdentity model (CRUD, validation, defaults)."""

import pytest
from django.core.exceptions import ValidationError

from profiles.models import GroupCorporateIdentity
from profiles.tests import make_corporate_identity, make_user_group


@pytest.mark.django_db
class TestGroupCorporateIdentityModel:
    def test_create_ci(self):
        ci = make_corporate_identity()
        assert ci.pk is not None
        assert ci.primary_color == "#2E7D32"
        assert ci.slogan == "Allzeit bereit!"

    def test_default_colors(self):
        group = make_user_group(name="Defaults-Gruppe")
        ci = GroupCorporateIdentity.objects.create(group=group)
        assert ci.primary_color == "#4a3a6b"
        assert ci.secondary_color == "#e8e4f0"

    def test_str(self):
        ci = make_corporate_identity()
        assert str(ci) == f"CI: {ci.group.name}"

    def test_logo_url_empty(self):
        ci = make_corporate_identity()
        assert ci.logo_url == ""

    def test_one_to_one_constraint(self):
        group = make_user_group(name="Einzigartig")
        make_corporate_identity(group=group)
        with pytest.raises(Exception):
            make_corporate_identity(group=group)

    def test_cascade_delete(self):
        ci = make_corporate_identity()
        group_pk = ci.group.pk
        ci.group.delete()
        assert not GroupCorporateIdentity.objects.filter(group_id=group_pk).exists()

    def test_invalid_hex_color(self):
        ci = make_corporate_identity()
        ci.primary_color = "red"
        with pytest.raises(ValidationError):
            ci.full_clean()

    def test_valid_hex_colors(self):
        ci = make_corporate_identity(primary_color="#FF0000", secondary_color="#00ff00")
        ci.full_clean()
        assert ci.primary_color == "#FF0000"

    def test_blank_text_fields(self):
        group = make_user_group(name="Leer-Gruppe")
        ci = GroupCorporateIdentity.objects.create(group=group)
        assert ci.slogan == ""
        assert ci.greeting_text == ""
        assert ci.footer_text == ""
        assert ci.payment_info == ""
        assert ci.signature_text == ""
