"""Seed predefined system message templates."""

from django.core.management.base import BaseCommand

from event.models import MessageTemplate

SYSTEM_TEMPLATES = [
    {
        "title": "Zahlungserinnerung",
        "subject": "Zahlungserinnerung für {event_name}",
        "body": (
            "Hallo {vorname},\n\n"
            "für {event_name} steht noch ein Restbetrag von {restbetrag} offen.\n\n"
            "Bitte überweise den Betrag zeitnah.\n\n"
            "Viele Grüße"
        ),
    },
    {
        "title": "Packliste-Erinnerung",
        "subject": "Packliste für {event_name}",
        "body": (
            "Hallo {vorname},\n\n"
            "denk bitte an deine Packliste für {event_name}! "
            "Schau noch einmal in Ruhe drüber und pack alles rechtzeitig ein.\n\n"
            "Viele Grüße"
        ),
    },
    {
        "title": "Treffpunkt-Info",
        "subject": "Treffpunkt für {event_name}",
        "body": (
            "Hallo {vorname},\n\n"
            "hier die Treffpunkt-Infos für {event_name}:\n\n"
            "[Treffpunkt und Uhrzeit hier einfügen]\n\n"
            "Bitte sei pünktlich da.\n\n"
            "Viele Grüße"
        ),
    },
]


class Command(BaseCommand):
    help = "Seed predefined system message templates for event messaging."

    def handle(self, *args, **options):
        created_count = 0
        for tmpl_data in SYSTEM_TEMPLATES:
            _, created = MessageTemplate.objects.get_or_create(
                title=tmpl_data["title"],
                is_system=True,
                defaults={
                    "subject": tmpl_data["subject"],
                    "body": tmpl_data["body"],
                    "user": None,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"  Created: {tmpl_data['title']}")
            else:
                self.stdout.write(f"  Already exists: {tmpl_data['title']}")

        self.stdout.write(self.style.SUCCESS(f"Done. {created_count} templates created."))
