"""Create the default buffet templates (idempotent, never overwrites staff changes)."""

from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from planner.services.buffet_template_seed import seed_buffet_templates


class Command(BaseCommand):
    help = "Standard-Buffet-Vorlagen prüfen; Änderungen nur mit --apply speichern."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--dry-run", action="store_true", help="Nur geplante Änderungen zeigen (Standard).")
        parser.add_argument("--apply", action="store_true", help="Vorlagen tatsächlich anlegen.")

    def handle(self, *args: Any, **options: Any) -> None:
        if options["dry_run"] and options["apply"]:
            raise CommandError("--dry-run und --apply schließen sich gegenseitig aus.")
        dry_run = not options["apply"]
        report = seed_buffet_templates(dry_run=dry_run)
        prefix = "[Dry-Run] " if report.dry_run else ""
        for name in report.created:
            self.stdout.write(self.style.SUCCESS(f"{prefix}Vorlage anlegen: {name}"))
        for name in report.existing:
            self.stdout.write(f"Vorlage existiert bereits: {name}")
        for message in report.missing:
            self.stdout.write(self.style.WARNING(message))
        if report.dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-Run: nichts gespeichert."))
