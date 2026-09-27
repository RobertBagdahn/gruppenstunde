"""Create the default buffet templates (idempotent, never overwrites staff changes)."""

from django.core.management.base import BaseCommand

from planner.services.buffet_template_seed import seed_buffet_templates


class Command(BaseCommand):
    help = "Standard-Buffet-Vorlagen anlegen (Frühstück, Belegte Baguettes, Abendbrot)."

    def handle(self, *args, **options):
        report = seed_buffet_templates()
        for name in report.created:
            self.stdout.write(self.style.SUCCESS(f"Vorlage angelegt: {name}"))
        for name in report.existing:
            self.stdout.write(f"Vorlage existiert bereits: {name}")
        for message in report.missing:
            self.stdout.write(self.style.WARNING(message))
