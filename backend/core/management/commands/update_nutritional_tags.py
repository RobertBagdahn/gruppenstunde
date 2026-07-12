"""
Management command to update NutritionalTag entries to the standardized schema.

Maps current prod names to target values, handles already-migrated entries,
deletes obsolete entries, and creates new ones.

Usage:
    uv run python manage.py update_nutritional_tags
    uv run python manage.py update_nutritional_tags --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import connection
from supply.models import NutritionalTag

MAPPING: dict[str, tuple[str, str, int, bool, str]] = {
    "vegan": ("Vegan", "Tierische Produkte", 1, False, "Keine tierischen Produkte wie Fleisch, Milch, Eier, Honig"),
    "vegetarisch": ("Vegetarisch", "Fleisch", 2, False, "Kein Fleisch"),
    "Gluten (Zöliakie)": ("Glutenunverträglichkeit (Zöliakie)", "Gluten", 3, True, "Medizinisch notwendiger Verzicht auf Gluten (Autoimmunerkrankung)"),
    "Laktose": ("Laktoseunverträglichkeit", "Laktose", 4, True, "Keine Laktose (Milchzucker)"),
    "nussfrei": ("Nussallergie", "Nüsse und Schalenfrüchte", 5, True, "Allergie gegen Nüsse, Schalenfrüchte und Mandeln"),
    "eifrei": ("Eiallergie", "Ei und Eierzeugnisse", 6, True, "Allergie gegen Hühnerei und Eierzeugnisse"),
    "Gluten (nicht zöliakie)": ("Glutenfrei (freiwillig)", "Gluten", 8, False, "Freiwilliger Verzicht auf Gluten"),
    "Gluten (nicht Zöliakie)": ("Glutenfrei (freiwillig)", "Gluten", 8, False, "Freiwilliger Verzicht auf Gluten"),
    "Erdnüsse": ("Erdnussallergie", "Erdnüsse und Erdnusserzeugnisse", 11, True, "Allergie gegen Erdnüsse und Erdnusserzeugnisse"),
    "Kamut": ("Kamutfrei", "Kamut und Kamuterzeugnisse", 29, False, "Kein Kamut und Kamuterzeugnisse"),
}

ALREADY_MIGRATED_FIXUPS = {
    "Fischallergie": {"is_dangerous": True, "description": "Allergie gegen Fisch und Fischerzeugnisse"},
    "Sojaallergie": {"is_dangerous": True, "description": "Allergie gegen Soja und Sojaerzeugnisse"},
    "Sellerieallergie": {"is_dangerous": True, "description": "Allergie gegen Sellerie und Sellerieerzeugnisse"},
    "Sesamallergie": {"is_dangerous": True, "description": "Allergie gegen Sesam und Sesamerzeugnisse"},
    "Senfallergie": {"is_dangerous": True, "description": "Allergie gegen Senf und Senferzeugnisse"},
    "Sulfitallergie": {"is_dangerous": True, "description": "Allergie gegen Schwefeldioxid und Sulfite"},
    "Lupinenallergie": {"is_dangerous": True, "description": "Allergie gegen Lupinen und Lupinenerzeugnisse"},
}

TO_DELETE_NAMES = [
    "Schalenfrüchte, Nüsse, Mandeln, Nußähnliches, ...",
    "Halal",
    "Koscher",
]

NEW_TAGS: list[tuple[str, str, int, bool, str]] = [
    ("Erdnussallergie", "Erdnüsse und Erdnusserzeugnisse", 11, True, "Allergie gegen Erdnüsse und Erdnusserzeugnisse"),
    ("Milchallergie", "Milch und Milcherzeugnisse", 16, True, "Allergie gegen Milch und Milcherzeugnisse"),
    ("Schalentierallergie", "Krebstiere und Weichtiere", 17, True, "Allergie gegen Krebstiere und Weichtiere"),
    ("Kamutfrei", "Kamut und Kamuterzeugnisse", 29, False, "Kein Kamut und Kamuterzeugnisse"),
]


class Command(BaseCommand):
    help = "Update NutritionalTag entries to the standardized name/name_opposite schema."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show what would change without modifying")

    def _safe_delete(self, tag, dry_run):
        for related in tag._meta.related_objects:
            through = related.remote_field.through
            try:
                with connection.cursor() as cursor:
                    table = through._meta.db_table
                    cursor.execute(f'SELECT 1 FROM "{table}" LIMIT 1')
            except Exception:
                self.stdout.write(f"    (Through-Table {through._meta.db_table} nicht vorhanden, überspringe)")
                continue
            # Clear M2M links via the through table
            field_name = related.remote_field.name
            fk_filter = {field_name: tag}
            count = through.objects.filter(**fk_filter).delete()[0]
            if count:
                self.stdout.write(f"    {count} M2M-Links aus {through._meta.db_table} gelöscht")
        if not dry_run:
            tag.delete()

    def handle(self, **options):
        dry_run = options["dry_run"]

        updated = 0
        deleted = 0
        created = 0
        skipped = 0
        fixups = 0

        for old_name, (new_name, new_opposite, new_rank, new_dangerous, new_desc) in MAPPING.items():
            tag = NutritionalTag.objects.filter(name__iexact=old_name).first()
            if tag is None:
                self.stdout.write(self.style.WARNING(f"  Nicht gefunden: '{old_name}'"))
                skipped += 1
                continue

            self.stdout.write(f"  {tag.name!r} → {new_name!r}")
            if not dry_run:
                tag.name = new_name
                tag.name_opposite = new_opposite
                tag.rank = new_rank
                tag.is_dangerous = new_dangerous
                tag.description = new_desc
                tag.save(update_fields=["name", "name_opposite", "rank", "is_dangerous", "description"])
            updated += 1

        for name, fixup in ALREADY_MIGRATED_FIXUPS.items():
            tag = NutritionalTag.objects.filter(name=name).first()
            if tag is None:
                continue
            changed = False
            for field, value in fixup.items():
                if getattr(tag, field) != value:
                    self.stdout.write(f"  Fixup {name!r}: {field}={getattr(tag, field)!r} → {value!r}")
                    if not dry_run:
                        setattr(tag, field, value)
                    changed = True
            if changed and not dry_run:
                tag.save(update_fields=list(fixup.keys()))
                fixups += 1

        for delete_name in TO_DELETE_NAMES:
            for tag in NutritionalTag.objects.filter(name=delete_name):
                self.stdout.write(self.style.WARNING(f"  Löschen: '{tag.name}' (pk={tag.pk})"))
                if not dry_run:
                    self._safe_delete(tag, dry_run)
                deleted += 1

        for new_name, new_opposite, new_rank, new_dangerous, new_desc in NEW_TAGS:
            if NutritionalTag.objects.filter(name=new_name).exists():
                self.stdout.write(f"  Existiert bereits: {new_name!r}")
            else:
                self.stdout.write(f"  Neu: {new_name!r}")
                if not dry_run:
                    NutritionalTag.objects.create(
                        name=new_name,
                        name_opposite=new_opposite,
                        rank=new_rank,
                        is_dangerous=new_dangerous,
                        description=new_desc,
                    )
                created += 1

        total = NutritionalTag.objects.count()

        self.stdout.write(self.style.SUCCESS(
            f"\nFertig: {updated} aktualisiert, {fixups} fixups, {deleted} gelöscht, "
            f"{created} neu erstellt, {skipped} nicht gefunden. "
            f"Gesamt: {total} NutritionalTags."
        ))

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — keine Änderungen gespeichert."))
