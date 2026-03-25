"""
Management command to seed the database from inspi/data JSON fixtures.

Maps the old inspi data model (activity, topic, etc.) to the new
gruppenstunde idea model (Idea, Tag, ScoutLevel, etc.).

Usage:
    python manage.py seed                  # seed all
    python manage.py seed --only tags      # seed only tags
    python manage.py seed --only levels    # seed only scout levels
    python manage.py seed --only units     # seed only material units
    python manage.py seed --only materials # seed only material names
    python manage.py seed --only ideas     # seed only ideas + material items
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from idea.choices import (
    CostsRatingChoices,
    DifficultyChoices,
    ExecutionTimeChoices,
    StatusChoices,
)
from idea.models import (
    Idea,
    MaterialItem,
    MaterialName,
    MeasuringUnit,
    ScoutLevel,
    Tag,
)

# Resolve the inspi/data directory relative to the project root
DATA_DIR = Path(__file__).resolve().parents[5] / "inspi" / "data"
MASTER_DIR = DATA_DIR / "activity" / "master-data"
TEST_DIR = DATA_DIR / "activity" / "test-data"

# ---------------------------------------------------------------------------
# Mapping tables: old integer values → new TextChoices
# ---------------------------------------------------------------------------

COSTS_MAP = {
    0: CostsRatingChoices.FREE,
    1: CostsRatingChoices.LESS_1,
    2: CostsRatingChoices.BETWEEN_1_2,
    3: CostsRatingChoices.MORE_2,
}

DIFFICULTY_MAP = {
    0: DifficultyChoices.EASY,
    1: DifficultyChoices.EASY,
    2: DifficultyChoices.MEDIUM,
    3: DifficultyChoices.HARD,
}

EXECUTION_TIME_MAP = {
    0: ExecutionTimeChoices.LESS_30,
    1: ExecutionTimeChoices.LESS_30,
    2: ExecutionTimeChoices.BETWEEN_30_60,
    3: ExecutionTimeChoices.BETWEEN_60_90,
    4: ExecutionTimeChoices.MORE_90,
}

STATUS_MAP = {
    "0": StatusChoices.DRAFT,
    "1": StatusChoices.REVIEW,
    "2": StatusChoices.PUBLISHED,
    "3": StatusChoices.ARCHIVED,
}

# Tag category parent slugs + names
TAG_CATEGORIES = {
    "topic": ("thema", "Thema"),
    "activity_type": ("aktivitaetstyp", "Aktivitätstyp"),
    "location": ("ort", "Ort"),
    "time": ("jahreszeit", "Jahreszeit"),
}


def _load_json(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _make_slug(prefix: str, name: str) -> str:
    """Create a unique slug from category prefix and name."""
    return slugify(f"{prefix}-{name}", allow_unicode=True)


class Command(BaseCommand):
    help = "Seed the database with data from inspi/data JSON fixtures."

    def add_arguments(self, parser):
        parser.add_argument(
            "--only",
            type=str,
            choices=["tags", "levels", "units", "materials", "ideas"],
            help="Seed only a specific data category.",
        )

    def handle(self, *args, **options):
        only = options.get("only")

        if not DATA_DIR.exists():
            self.stderr.write(self.style.ERROR(f"Data directory not found: {DATA_DIR}"))
            return

        with transaction.atomic():
            if only in (None, "tags"):
                self._seed_tags()
            if only in (None, "levels"):
                self._seed_scout_levels()
            if only in (None, "units"):
                self._seed_material_units()
            if only in (None, "materials"):
                self._seed_material_names()
            if only in (None, "ideas"):
                self._seed_ideas()

        self.stdout.write(self.style.SUCCESS("Seeding complete."))

    # ------------------------------------------------------------------
    # Tags (Topics, ActivityTypes, Locations, Times → hierarchical Tags)
    # ------------------------------------------------------------------

    def _seed_tags(self):
        self.stdout.write("Seeding tags...")

        # old pk → new Tag id mapping, keyed by category
        self._tag_map: dict[str, dict[int, Tag]] = {}

        file_map = {
            "topic": MASTER_DIR / "1_topic.json",
            "activity_type": MASTER_DIR / "2_activity_type_choice.json",
            "location": MASTER_DIR / "5_location_choice.json",
            "time": MASTER_DIR / "6_time_choice.json",
        }

        for category, filepath in file_map.items():
            slug_prefix, display_name = TAG_CATEGORIES[category]

            # Create or get the parent tag for this category
            parent, _ = Tag.objects.get_or_create(
                slug=slug_prefix,
                defaults={"name": display_name, "sort_order": 0},
            )

            records = _load_json(filepath)
            pk_map: dict[int, Tag] = {}

            for rec in records:
                fields = rec["fields"]
                old_pk = rec["pk"]
                name = fields["name"]
                sorting = fields.get("sorting", 0)
                child_slug = _make_slug(slug_prefix, name)

                tag, created = Tag.objects.get_or_create(
                    slug=child_slug,
                    defaults={
                        "name": name,
                        "parent": parent,
                        "sort_order": sorting,
                    },
                )
                pk_map[old_pk] = tag
                if created:
                    self.stdout.write(f"  + Tag: {display_name} / {name}")

            self._tag_map[category] = pk_map

        total = Tag.objects.count()
        self.stdout.write(self.style.SUCCESS(f"  Tags total: {total}"))

    # ------------------------------------------------------------------
    # Scout Levels
    # ------------------------------------------------------------------

    def _seed_scout_levels(self):
        self.stdout.write("Seeding scout levels...")
        self._level_map: dict[int, ScoutLevel] = {}

        records = _load_json(MASTER_DIR / "3_scout_level_choice.json")
        for rec in records:
            fields = rec["fields"]
            old_pk = rec["pk"]

            level, created = ScoutLevel.objects.get_or_create(
                name=fields["name"],
                defaults={"sorting": fields.get("sorting", 0)},
            )
            self._level_map[old_pk] = level
            if created:
                self.stdout.write(f"  + ScoutLevel: {fields['name']}")

        self.stdout.write(self.style.SUCCESS(f"  ScoutLevels total: {ScoutLevel.objects.count()}"))

    # ------------------------------------------------------------------
    # Material Units
    # ------------------------------------------------------------------

    def _seed_material_units(self):
        self.stdout.write("Seeding material units...")
        self._unit_map: dict[int, MeasuringUnit] = {}

        records = _load_json(MASTER_DIR / "4_material_unit.json")
        for rec in records:
            fields = rec["fields"]
            old_pk = rec["pk"]

            unit, created = MeasuringUnit.objects.get_or_create(name=fields["name"])
            self._unit_map[old_pk] = unit
            if created:
                self.stdout.write(f"  + MeasuringUnit: {fields['name']}")

        self.stdout.write(self.style.SUCCESS(f"  MeasuringUnits total: {MeasuringUnit.objects.count()}"))

    # ------------------------------------------------------------------
    # Material Names
    # ------------------------------------------------------------------

    def _seed_material_names(self):
        self.stdout.write("Seeding material names...")
        self._material_name_map: dict[int, MaterialName] = {}

        # Ensure unit map is available
        if not hasattr(self, "_unit_map"):
            self._build_unit_map()

        records = _load_json(TEST_DIR / "1_material_name.json")
        for rec in records:
            fields = rec["fields"]
            old_pk = rec["pk"]
            name = fields["name"]
            default_unit_pk = fields.get("unit_detaults_id") or fields.get("unit_defaults_id")

            default_unit = self._unit_map.get(default_unit_pk) if default_unit_pk else None

            mat, created = MaterialName.objects.get_or_create(
                name=name,
                defaults={"default_unit": default_unit},
            )
            self._material_name_map[old_pk] = mat

        self.stdout.write(self.style.SUCCESS(f"  MaterialNames total: {MaterialName.objects.count()}"))

    # ------------------------------------------------------------------
    # Ideas + MaterialItems
    # ------------------------------------------------------------------

    def _seed_ideas(self):
        self.stdout.write("Seeding ideas...")

        # Ensure lookup maps are available
        if not hasattr(self, "_tag_map"):
            self._build_tag_map()
        if not hasattr(self, "_level_map"):
            self._build_level_map()
        if not hasattr(self, "_material_name_map"):
            self._build_material_name_map()
        if not hasattr(self, "_unit_map"):
            self._build_unit_map()

        activities = _load_json(TEST_DIR / "3_activity.json")
        material_items = _load_json(TEST_DIR / "4_materialitem.json")

        # Index material items by activity pk
        items_by_activity: dict[int, list[dict]] = {}
        for mi in material_items:
            act_id = mi["fields"]["activity_id"]
            items_by_activity.setdefault(act_id, []).append(mi["fields"])

        created_count = 0
        skipped_count = 0

        for rec in activities:
            fields = rec["fields"]
            old_pk = rec["pk"]
            title = fields["title"]

            # Skip if already exists (idempotent)
            if Idea.objects.filter(title=title).exists():
                skipped_count += 1
                continue

            idea = Idea.objects.create(
                title=title,
                summary=fields.get("summary", ""),
                description=fields.get("description", ""),
                costs_rating=COSTS_MAP.get(fields.get("costs_rating", 0), CostsRatingChoices.FREE),
                execution_time=EXECUTION_TIME_MAP.get(fields.get("execution_time", 0), ExecutionTimeChoices.LESS_30),
                difficulty=DIFFICULTY_MAP.get(fields.get("difficulty", 0), DifficultyChoices.EASY),
                status=STATUS_MAP.get(str(fields.get("status", "0")), StatusChoices.DRAFT),
            )

            # M2M: tags (topics + activity_types + locations + times)
            tag_ids = []
            for category, old_pks in [
                ("topic", fields.get("topics", [])),
                ("activity_type", fields.get("activity_types", [])),
                ("location", fields.get("locations", [])),
                ("time", fields.get("times", [])),
            ]:
                cat_map = self._tag_map.get(category, {})
                for opk in old_pks:
                    tag = cat_map.get(opk)
                    if tag:
                        tag_ids.append(tag.id)

            if tag_ids:
                idea.tags.set(tag_ids)

            # M2M: scout_levels
            level_ids = []
            for opk in fields.get("scout_levels", []):
                level = self._level_map.get(opk)
                if level:
                    level_ids.append(level.id)
            if level_ids:
                idea.scout_levels.set(level_ids)

            # Material items
            for mi_fields in items_by_activity.get(old_pk, []):
                mat_name = self._material_name_map.get(mi_fields.get("material_name_id"))
                mat_unit = self._unit_map.get(mi_fields.get("material_unit_id"))
                MaterialItem.objects.create(
                    idea=idea,
                    quantity=str(mi_fields.get("quantity", "")),
                    material_name=mat_name,
                    material_unit=mat_unit,
                )

            created_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"  Ideas created: {created_count}, skipped (duplicate): {skipped_count}"
        ))
        self.stdout.write(self.style.SUCCESS(f"  Ideas total: {Idea.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"  MaterialItems total: {MaterialItem.objects.count()}"))

    # ------------------------------------------------------------------
    # Helpers: build lookup maps from DB when running --only ideas
    # ------------------------------------------------------------------

    def _build_tag_map(self):
        """Rebuild tag map from existing DB tags."""
        self._tag_map = {}
        file_map = {
            "topic": MASTER_DIR / "1_topic.json",
            "activity_type": MASTER_DIR / "2_activity_type_choice.json",
            "location": MASTER_DIR / "5_location_choice.json",
            "time": MASTER_DIR / "6_time_choice.json",
        }
        for category, filepath in file_map.items():
            slug_prefix, _ = TAG_CATEGORIES[category]
            records = _load_json(filepath)
            pk_map: dict[int, Tag] = {}
            for rec in records:
                child_slug = _make_slug(slug_prefix, rec["fields"]["name"])
                try:
                    pk_map[rec["pk"]] = Tag.objects.get(slug=child_slug)
                except Tag.DoesNotExist:
                    pass
            self._tag_map[category] = pk_map

    def _build_level_map(self):
        """Rebuild level map from existing DB levels."""
        self._level_map = {}
        records = _load_json(MASTER_DIR / "3_scout_level_choice.json")
        for rec in records:
            try:
                self._level_map[rec["pk"]] = ScoutLevel.objects.get(name=rec["fields"]["name"])
            except ScoutLevel.DoesNotExist:
                pass

    def _build_unit_map(self):
        """Rebuild unit map from existing DB units."""
        self._unit_map = {}
        records = _load_json(MASTER_DIR / "4_material_unit.json")
        for rec in records:
            try:
                self._unit_map[rec["pk"]] = MeasuringUnit.objects.get(name=rec["fields"]["name"])
            except MeasuringUnit.DoesNotExist:
                pass

    def _build_material_name_map(self):
        """Rebuild material name map from existing DB."""
        self._material_name_map = {}
        if not hasattr(self, "_unit_map"):
            self._build_unit_map()
        records = _load_json(TEST_DIR / "1_material_name.json")
        for rec in records:
            try:
                self._material_name_map[rec["pk"]] = MaterialName.objects.get(name=rec["fields"]["name"])
            except MaterialName.DoesNotExist:
                pass
