"""Safety behavior of the buffet role migration command."""

from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import CommandError, call_command

from supply.data.buffet_role_mapping import BUFFET_ROLE_MAPPING
from supply.services.buffet_role_migration import BuffetMigrationReport


def _empty_report(dry_run: bool) -> BuffetMigrationReport:
    return BuffetMigrationReport(dry_run=dry_run)


@pytest.mark.django_db
def test_command_defaults_to_dry_run():
    output = StringIO()
    with patch(
        "supply.management.commands.migrate_buffet_roles.migrate_buffet_roles",
        side_effect=lambda *, dry_run, mapping: _empty_report(dry_run),
    ) as migrate:
        call_command("migrate_buffet_roles", stdout=output)

    migrate.assert_called_once_with(dry_run=True, mapping=BUFFET_ROLE_MAPPING)
    assert "[Dry-Run] Zusammenfassung" in output.getvalue()
    assert "Dry-Run: nichts gespeichert." in output.getvalue()


@pytest.mark.django_db
def test_command_requires_explicit_apply_flag():
    with patch(
        "supply.management.commands.migrate_buffet_roles.migrate_buffet_roles",
        side_effect=lambda *, dry_run, mapping: _empty_report(dry_run),
    ) as migrate:
        call_command("migrate_buffet_roles", "--apply", stdout=StringIO())

    migrate.assert_called_once_with(dry_run=False, mapping=BUFFET_ROLE_MAPPING)


@pytest.mark.django_db
def test_command_loads_reviewed_mapping_export(tmp_path):
    mapping_file = tmp_path / "approved-buffet-mapping.json"
    mapping_file.write_text(
        '{"items":[{"action":"add","item_kind":"ingredient","source_id":7,"source_name":"Gouda","role_slugs":["buffet-cheese"]}]}',
        encoding="utf-8",
    )
    with patch(
        "supply.management.commands.migrate_buffet_roles.migrate_buffet_roles",
        side_effect=lambda *, dry_run, mapping: _empty_report(dry_run),
    ) as migrate:
        call_command("migrate_buffet_roles", "--mapping-file", str(mapping_file), stdout=StringIO())

    migrate.assert_called_once()
    assert migrate.call_args.kwargs["dry_run"] is True
    assert migrate.call_args.kwargs["mapping"][0].id == 7
    assert migrate.call_args.kwargs["mapping"][0].role == "buffet-cheese"


@pytest.mark.django_db
def test_command_rejects_conflicting_flags():
    with pytest.raises(CommandError, match="schließen sich gegenseitig aus"):
        call_command("migrate_buffet_roles", "--dry-run", "--apply", stdout=StringIO())
