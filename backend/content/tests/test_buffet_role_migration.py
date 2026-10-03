"""Tests for the additive buffet role data migration."""

from importlib import import_module

import pytest
from django.apps import apps

from content.models import Tag


@pytest.mark.django_db
def test_buffet_role_migration_is_idempotent_and_preserves_existing_tags():
    migration = import_module("content.migrations.0018_add_buffet_roles")
    slugs = [slug for slug, _, _ in migration.NEW_BUFFET_ROLES]
    parent = Tag.objects.create(slug="buffet", name="Buffet", group="buffet")
    existing = Tag.objects.create(slug="buffet-dip", name="Dips", group="buffet", parent=parent)
    existing.name = "Staff-Anpassung"
    existing.save(update_fields=["name"])

    migration.add_buffet_roles(apps, None)
    migration.add_buffet_roles(apps, None)

    assert Tag.objects.filter(slug__in=slugs).count() == len(slugs)
    assert Tag.objects.get(slug="buffet-dip").name == "Staff-Anpassung"
    assert Tag.objects.get(slug="buffet-cheese").parent_id == parent.id
