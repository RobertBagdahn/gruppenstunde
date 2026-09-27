"""Move the breakfast tags onto the buffet roles (approved table, design.md D10)."""

from django.core.management.base import BaseCommand

from supply.services.buffet_role_migration import migrate_buffet_roles


class Command(BaseCommand):
    help = "Buffet-Rollen nach der freigegebenen Zuordnungstabelle setzen (mit --dry-run zuerst prüfen)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Nur anzeigen, nichts speichern.")

    def handle(self, *args, **options):
        report = migrate_buffet_roles(dry_run=options["dry_run"])
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
