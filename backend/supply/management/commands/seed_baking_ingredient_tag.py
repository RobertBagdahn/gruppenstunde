"""Seed command for the `baking-ingredient` Content-Tag.

Idempotent (get_or_create by slug). Analog zu `seed_breakfast_catalog`.

Erstellt lediglich den Tag; die Zuweisung zu konkreten Zutaten (Mehl, Zucker,
Hefe, Backpulver, ...) erfolgt manuell/über die KI-Anreicherung und ist NICHT
Teil dieses Seeds (siehe openspec change
rework-ingredient-portion-ai-suggestions, Non-Goal: kein automatischer Backfill).
"""

from django.core.management.base import BaseCommand

from content.models import Tag

BAKING_TAG_SLUG = "baking-ingredient"


class Command(BaseCommand):
    help = "Seedet den Content-Tag 'baking-ingredient' für Backzutaten (Mehl, Zucker, Hefe, Backpulver, ...)."

    def handle(self, *args, **options):
        tag, created = Tag.objects.get_or_create(
            slug=BAKING_TAG_SLUG,
            defaults={"name": BAKING_TAG_SLUG},
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Tag '{BAKING_TAG_SLUG}' erstellt."))
        else:
            self.stdout.write(f"Tag '{BAKING_TAG_SLUG}' existiert bereits.")
