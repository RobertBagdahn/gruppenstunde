"""Move the breakfast tags onto the buffet roles (approved table, design.md D10)."""

import json
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from supply.data.buffet_role_mapping import BUFFET_ROLE_MAPPING, role_mappings_from_export
from supply.services.buffet_role_migration import migrate_buffet_roles


class Command(BaseCommand):
    help = "Buffet-Rollen nach der freigegebenen Zuordnungstabelle setzen (mit --dry-run zuerst prüfen)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--dry-run", action="store_true", help="Nur anzeigen, nichts speichern (Standard).")
        parser.add_argument("--apply", action="store_true", help="Mapping tatsächlich anwenden.")
        parser.add_argument("--mapping-file", type=Path, help="Freigegebenes Mapping-JSON aus der Datenqualität.")

    def handle(self, *args: Any, **options: Any) -> None:
        if options["dry_run"] and options["apply"]:
            raise CommandError("--dry-run und --apply schließen sich gegenseitig aus.")
        dry_run = not options["apply"]
        mapping = BUFFET_ROLE_MAPPING
        mapping_file = options.get("mapping_file")
        if mapping_file is not None:
            try:
                export_data = json.loads(mapping_file.read_text(encoding="utf-8"))
                mapping = role_mappings_from_export(export_data)
            except (OSError, json.JSONDecodeError, ValueError) as exc:
                raise CommandError(f"Mapping-Export konnte nicht gelesen werden: {exc}") from exc
        report = migrate_buffet_roles(dry_run=dry_run, mapping=mapping)
        prefix = "[Dry-Run] " if report.dry_run else ""

        for line in report.lines:
            self.stdout.write(f"{prefix}{line}")
        for line in report.skipped:
            self.stdout.write(self.style.WARNING(line))

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING(f"{prefix}Zusammenfassung"))
        if not report.changes:
            self.stdout.write("0 Änderungen")
        for action, count in sorted(report.changes.items()):
            self.stdout.write(f"  {action}: {count}")
        self.stdout.write(f"  übersprungen: {len(report.skipped)}")
        for slug, carriers in report.kept_old_tags.items():
            self.stdout.write(self.style.WARNING(f"  {slug} bleibt, noch getragen von: {', '.join(carriers)}"))
        if report.manual_review:
            self.stdout.write(self.style.WARNING("⚠️ manuell prüfen:"))
            for line in report.manual_review:
                self.stdout.write(f"  {line}")
        if report.dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-Run: nichts gespeichert."))
