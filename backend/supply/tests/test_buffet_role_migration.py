"""Tests for supply/services/buffet_role_migration.py (migrate_buffet_roles command)."""

import pytest

from content.models import Tag
from planner.tests import make_buffet_roles
from supply.data.buffet_role_mapping import RoleMapping
from supply.services.buffet_role_migration import migrate_buffet_roles
from supply.tests import make_ingredient


def _make_old_tag(slug: str) -> Tag:
    tag, _ = Tag.objects.get_or_create(slug=slug, defaults={"name": slug})
    return tag


@pytest.fixture(autouse=True)
def _buffet_roles(db):
    """Role tags normally exist via the content data migration (disabled in tests)."""
    return make_buffet_roles()


@pytest.mark.django_db
class TestMigrateBuffetRoles:
    def test_dry_run_changes_nothing(self):
        ingredient = make_ingredient(name="Bauernbrot", owner=None)
        mapping = (
            RoleMapping(action="keep", kind="ingredient", id=ingredient.id, name="Bauernbrot", role="buffet-bread"),
        )

        report = migrate_buffet_roles(dry_run=True, mapping=mapping)

        assert report.total_changes == 1
        ingredient.refresh_from_db()
        assert not ingredient.tags.filter(slug="buffet-bread").exists()

    def test_apply_sets_role(self):
        ingredient = make_ingredient(name="Bauernbrot", owner=None)
        mapping = (
            RoleMapping(action="keep", kind="ingredient", id=ingredient.id, name="Bauernbrot", role="buffet-bread"),
        )

        migrate_buffet_roles(dry_run=False, mapping=mapping)

        ingredient.refresh_from_db()
        assert ingredient.tags.filter(slug="buffet-bread").exists()

    def test_idempotent_second_run_reports_zero(self):
        ingredient = make_ingredient(name="Bauernbrot", owner=None)
        mapping = (
            RoleMapping(action="keep", kind="ingredient", id=ingredient.id, name="Bauernbrot", role="buffet-bread"),
        )

        migrate_buffet_roles(dry_run=False, mapping=mapping)
        report2 = migrate_buffet_roles(dry_run=False, mapping=mapping)

        assert report2.total_changes == 0
        assert report2.skipped == []

    def test_name_mismatch_is_skipped(self):
        ingredient = make_ingredient(name="Anderer Name", owner=None)
        mapping = (
            RoleMapping(action="keep", kind="ingredient", id=ingredient.id, name="Bauernbrot", role="buffet-bread"),
        )

        report = migrate_buffet_roles(dry_run=True, mapping=mapping)

        assert report.total_changes == 0
        assert len(report.skipped) == 1
        assert "erwartet ‚Bauernbrot‘, gefunden ‚Anderer Name‘" in report.skipped[0]

    def test_bread_merge_takes_over_missing_kcal(self):
        from supply.models import Ingredient

        target = make_ingredient(name="Brötchen", owner=None)
        Ingredient.objects.filter(id=target.id).update(energy_kcal=0)
        target.refresh_from_db()
        source = make_ingredient(name="Brötchen (ganzes)", owner=None)
        Ingredient.objects.filter(id=source.id).update(energy_kcal=265)
        source.refresh_from_db()
        mapping = (
            RoleMapping(
                action="merge_into", kind="ingredient", id=source.id, name="Brötchen (ganzes)", target_id=target.id
            ),
        )

        report = migrate_buffet_roles(dry_run=False, mapping=mapping)

        target.refresh_from_db()
        assert target.energy_kcal == 265
        assert target.is_deleted is False
        source.refresh_from_db()
        assert source.is_deleted is True
        assert report.changes["merge_into"] == 1

    def test_merge_skipped_when_source_owned(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        owner = User.objects.create_user(username="owner", password="x")
        target = make_ingredient(name="Ziel", owner=None)
        source = make_ingredient(name="Quelle", owner=owner)
        mapping = (
            RoleMapping(action="merge_into", kind="ingredient", id=source.id, name="Quelle", target_id=target.id),
        )

        report = migrate_buffet_roles(dry_run=True, mapping=mapping)

        assert report.total_changes == 0
        assert len(report.skipped) == 1
        assert "System-Einträge" in report.skipped[0]

    def test_status_and_visibility_never_changed(self):
        ingredient = make_ingredient(name="Margarine", owner=None, status="draft", visibility="private")
        mapping = (
            RoleMapping(action="keep", kind="ingredient", id=ingredient.id, name="Margarine", role="buffet-fat"),
        )

        migrate_buffet_roles(dry_run=False, mapping=mapping)

        ingredient.refresh_from_db()
        assert ingredient.status == "draft"
        assert ingredient.visibility == "private"

    def test_manual_review_lists_missing_kcal_and_drafts_at_runtime(self):
        from supply.models import Ingredient

        no_kcal = make_ingredient(name="Margarine", owner=None, status="verified")
        Ingredient.objects.filter(id=no_kcal.id).update(energy_kcal=0)
        no_kcal.refresh_from_db()
        no_kcal.tags.clear()
        draft = make_ingredient(name="Hummus", owner=None, status="draft")
        Ingredient.objects.filter(id=draft.id).update(energy_kcal=100)
        draft.refresh_from_db()
        draft.tags.clear()
        mapping = (
            RoleMapping(action="keep", kind="ingredient", id=no_kcal.id, name="Margarine", role="buffet-fat"),
            RoleMapping(action="keep", kind="ingredient", id=draft.id, name="Hummus", role="buffet-savory"),
        )

        report = migrate_buffet_roles(dry_run=True, mapping=mapping)

        assert any("Margarine" in line and "Nährwerte fehlen" in line for line in report.manual_review)
        assert any("Hummus" in line and "Entwurf" in line for line in report.manual_review)

    def test_manual_review_excludes_already_verified_by_predecessor(self):
        from supply.models import Ingredient

        ingredient = make_ingredient(name="Mayonnaise", owner=None, status="verified")
        Ingredient.objects.filter(id=ingredient.id).update(energy_kcal=680)
        ingredient.refresh_from_db()
        mapping = (
            RoleMapping(action="keep", kind="ingredient", id=ingredient.id, name="Mayonnaise", role="buffet-condiment"),
        )

        report = migrate_buffet_roles(dry_run=True, mapping=mapping)

        assert not any("Mayonnaise" in line for line in report.manual_review)

    def test_old_tags_deleted_when_no_carriers_remain(self):
        old_tag = _make_old_tag("breakfast-base")
        ingredient = make_ingredient(name="Bauernbrot", owner=None)
        ingredient.tags.add(old_tag)
        mapping = (
            RoleMapping(action="keep", kind="ingredient", id=ingredient.id, name="Bauernbrot", role="buffet-bread"),
        )

        migrate_buffet_roles(dry_run=False, mapping=mapping)

        assert not Tag.objects.filter(slug="breakfast-base").exists()

    def test_old_tags_kept_when_carrier_remains(self):
        old_tag = _make_old_tag("breakfast-fat")
        migrated = make_ingredient(name="Butter", owner=None)
        migrated.tags.add(old_tag)
        remaining = make_ingredient(name="Etwas anderes", owner=None)
        remaining.tags.add(old_tag)
        mapping = (RoleMapping(action="keep", kind="ingredient", id=migrated.id, name="Butter", role="buffet-fat"),)

        report = migrate_buffet_roles(dry_run=False, mapping=mapping)

        assert Tag.objects.filter(slug="breakfast-fat").exists()
        assert "breakfast-fat" in report.kept_old_tags
