"""
Import exported production data from fixture files into the local database.

Reads fixture files from backend/data/ and loads them in dependency order.

Usage:
    uv run python manage.py import_prod_data                # full import
    uv run python manage.py import_prod_data --flush         # flush DB first
    uv run python manage.py import_prod_data --only food     # only food data
    uv run python manage.py import_prod_data --data-dir /path/to/data
"""

from __future__ import annotations

import json
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"

# Complete import order: groups + files within each group
# FK-safe ordering — parents before children
IMPORT_ORDER: list[tuple[str, list[str]]] = [
    (
        "masterdata",
        [
            "content_tag",
            "content_scoutlevel",
            "supply_measuringunit",
            "supply_retailsection",
            "supply_nutritionaltag",
        ],
    ),
    (
        "users",
        [
            "auth_user",
        ],
    ),
    (
        "food",
        [
            "supply_ingredient",
            "supply_ingredientalias",
            "supply_portion",
            "supply_package",
            "recipe_recipe",
            "recipe_recipetypestats",
            "recipe_rule",
            "recipe_recipeitem",
        ],
    ),
    (
        "planner",
        [
            "planner_mealplan",
            "planner_meal",
            "planner_mealitem",
            "planner_planner",
            "planner_plannerentry",
            "planner_plannercollaborator",
        ],
    ),
    (
        "shopping",
        [
            "shopping_shoppinglist",
            "shopping_kitchenremindercategory",
            "shopping_kitchenreminder",
            "shopping_shoppinglistitem",
            "shopping_shoppinglistitemsource",
        ],
    ),
]

GROUP_NAMES = [g[0] for g in IMPORT_ORDER]


@contextmanager
def _silence_signals():
    # Ensure signal modules are registered before we manipulate the receivers list
    from django.db.models.signals import post_delete, post_save, pre_save

    signals = [pre_save, post_save, post_delete]
    saved: dict[int, list] = {}
    for sig in signals:
        saved[id(sig)] = sig.receivers[:]
        sig.receivers = []
    try:
        yield
    finally:
        for sig in signals:
            sig.receivers = saved[id(sig)]


def _deduplicate_portions():
    """Set deleted_at on duplicate (LOWER(name), ingredient_id) combos (same logic as migration 0044)."""
    from django.db.models import Count
    from django.db.models.functions import Lower
    from django.utils import timezone

    from supply.models.ingredient import Portion

    dupes = (
        Portion.objects.active()
        .annotate(name_lower=Lower("name"))
        .values("name_lower", "ingredient_id")
        .annotate(cnt=Count("id"))
        .filter(cnt__gt=1)
    )
    now = timezone.now()
    total = 0
    for dupe in dupes:
        ids = (
            Portion.objects.active()
            .filter(
                ingredient_id=dupe["ingredient_id"],
            )
            .annotate(name_lower=Lower("name"))
            .filter(name_lower=dupe["name_lower"])
            .order_by("id")
            .values_list("id", flat=True)
        )
        duplicate_ids = list(ids[1:])
        count = Portion.objects.filter(id__in=duplicate_ids).update(deleted_at=now)
        total += count
    return total


@contextmanager
def _drop_portion_unique_index():
    with connection.cursor() as cursor:
        cursor.execute("DROP INDEX IF EXISTS unique_portion_name_per_ingredient")
        cursor.execute("DROP INDEX IF EXISTS unique_rank1_portion_per_ingredient")
    try:
        yield
    finally:
        dedup_count = _deduplicate_portions()
        rank1_dedup = _deduplicate_rank1_portions()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE UNIQUE INDEX unique_portion_name_per_ingredient
                ON supply_portion (LOWER(name), ingredient_id)
                WHERE deleted_at IS NULL
            """
            )
            cursor.execute(
                """
                CREATE UNIQUE INDEX unique_rank1_portion_per_ingredient
                ON supply_portion (ingredient_id)
                WHERE deleted_at IS NULL AND rank = 1
            """
            )
        if dedup_count:
            print(f"  ↻ {dedup_count} doppelte Portionen (Name) als gelöscht markiert")
        if rank1_dedup:
            print(f"  ↻ {rank1_dedup} doppelte Portionen (Rank 1) als gelöscht markiert")


def _deduplicate_ingredient_aliases():
    from django.db.models import Count, Min

    from supply.models.ingredient import IngredientAlias

    dupes = (
        IngredientAlias.objects.values("ingredient_id", "rank")
        .annotate(cnt=Count("id"), min_id=Min("id"))
        .filter(cnt__gt=1)
    )
    total = 0
    for dupe in dupes:
        ids = (
            IngredientAlias.objects.filter(ingredient_id=dupe["ingredient_id"], rank=dupe["rank"])
            .exclude(id=dupe["min_id"])
            .values_list("id", flat=True)
        )
        count, _ = IngredientAlias.objects.filter(id__in=list(ids)).delete()
        total += count
    return total


def _deduplicate_rank1_portions():
    from django.db.models import Count, Min

    from supply.models.ingredient import Portion

    dupes = (
        Portion.objects.active()
        .filter(rank=1)
        .values("ingredient_id")
        .annotate(cnt=Count("id"), min_id=Min("id"))
        .filter(cnt__gt=1)
    )
    total = 0
    for dupe in dupes:
        ids = (
            Portion.objects.active()
            .filter(ingredient_id=dupe["ingredient_id"], rank=1)
            .exclude(id=dupe["min_id"])
            .values_list("id", flat=True)
        )
        from django.utils import timezone

        count = Portion.objects.filter(id__in=list(ids)).update(deleted_at=timezone.now())
        total += count
    return total


@contextmanager
def _drop_ingredientalias_unique_indexes():
    with connection.cursor() as cursor:
        cursor.execute(
            "ALTER TABLE supply_ingredientalias DROP CONSTRAINT IF EXISTS supply_ingredientalias_ingredient_id_rank_e49b396a_uniq"
        )
        cursor.execute("DROP INDEX IF EXISTS unique_alias_name_per_ingredient")
        cursor.execute("DROP INDEX IF EXISTS unique_alias_name_when_not_generic")
    try:
        yield
    finally:
        alias_dedup = _deduplicate_ingredient_aliases()
        with connection.cursor() as cursor:
            cursor.execute(
                """
                ALTER TABLE supply_ingredientalias
                ADD CONSTRAINT supply_ingredientalias_ingredient_id_rank_e49b396a_uniq
                UNIQUE (ingredient_id, rank)
            """
            )
            cursor.execute(
                """
                CREATE UNIQUE INDEX unique_alias_name_per_ingredient
                ON supply_ingredientalias (LOWER(name), ingredient_id)
            """
            )
            cursor.execute(
                """
                CREATE UNIQUE INDEX unique_alias_name_when_not_generic
                ON supply_ingredientalias (LOWER(name)) WHERE NOT is_generic
            """
            )
        if alias_dedup:
            print(f"  ↻ {alias_dedup} doppelte IngredientAliases gelöscht")


class Command(BaseCommand):
    help = "Import production data fixtures into the local database."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--data-dir",
            type=str,
            default=str(DEFAULT_DATA_DIR),
            help=f"Data directory (default: {DEFAULT_DATA_DIR})",
        )
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Flush the database before importing (removes all data)",
        )
        parser.add_argument(
            "--only",
            type=str,
            default=None,
            choices=GROUP_NAMES,
            help="Only import a specific group",
        )
        parser.add_argument(
            "--overwrite-existing",
            action="store_true",
            help="Allow fixture rows to overwrite existing rows with the same primary key",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        data_dir = Path(options["data_dir"])
        if not data_dir.is_dir():
            raise CommandError(f"Data directory not found: {data_dir}")

        do_flush = options["flush"]
        only_group = options["only"]
        overwrite_existing = options["overwrite_existing"]

        if do_flush:
            self.stdout.write(self.style.WARNING("Flushe Datenbank..."))
            call_command("flush", interactive=False, reset_sequences=True)
            self.stdout.write(self.style.SUCCESS("✓ Datenbank geleert\n"))

        if only_group:
            groups = [(g_name, g_files) for g_name, g_files in IMPORT_ORDER if g_name == only_group]
        else:
            groups = IMPORT_ORDER

        with _silence_signals():
            total = 0
            for group_name, file_prefixes in groups:
                count = self._import_group(
                    data_dir,
                    group_name,
                    file_prefixes,
                    overwrite_existing=overwrite_existing,
                )
                total += count

        self.stdout.write(self.style.SUCCESS(f"\nImport abgeschlossen: {total} Einträge"))

    def _import_group(
        self,
        data_dir: Path,
        group_name: str,
        file_prefixes: list[str],
        *,
        overwrite_existing: bool = False,
    ) -> int:
        group_dir = data_dir / group_name
        if not group_dir.is_dir():
            self.stdout.write(f"  {group_name}: Verzeichnis nicht gefunden")
            return 0

        fixture_files: list[Path] = []
        for prefix in file_prefixes:
            matches = list(group_dir.glob(f"{prefix}.json"))
            if matches:
                fixture_files.extend(sorted(matches))

        if not fixture_files:
            return 0

        self.stdout.write(f"  → {group_name} ({len(fixture_files)} Dateien)")

        group_total = 0
        for fixture_file in fixture_files:
            try:
                with open(fixture_file, encoding="utf-8") as f:
                    entries = json.load(f)
                    count = len(entries) if isinstance(entries, list) else 0
            except (json.JSONDecodeError, Exception):
                count = 0

            if count == 0:
                continue

            short_name = fixture_file.stem
            import_file = fixture_file
            skipped_count = 0
            if not overwrite_existing:
                entries, skipped_count = self._exclude_existing_entries(short_name, entries)
                if not entries:
                    self.stdout.write(f"    {short_name}: übersprungen ({skipped_count} vorhandene Einträge)")
                    continue
                with tempfile.NamedTemporaryFile(mode="w", suffix=".json", encoding="utf-8", delete=False) as temp_file:
                    json.dump(entries, temp_file, ensure_ascii=False)
                import_file = Path(temp_file.name)

            self.stdout.write(f"    {short_name}: {len(entries)} Einträge...", ending=" ")
            self.stdout.flush()

            try:
                if short_name == "supply_portion":
                    ctx = _drop_portion_unique_index()
                elif short_name == "supply_ingredientalias":
                    ctx = _drop_ingredientalias_unique_indexes()
                else:
                    ctx = _noop_context()
                with ctx:
                    with transaction.atomic():
                        call_command("loaddata", str(import_file), verbosity=0, skip_checks=True)
                self.stdout.write(self.style.SUCCESS("✓"))
                group_total += len(entries)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"FEHLER: {e}"))
                if "violates foreign key constraint" in str(e):
                    self.stdout.write(
                        self.style.WARNING(
                            "    → FK-Fehler. Möglicherweise fehlen abhängige Modelle. "
                            "Importiere in der richtigen Reihenfolge."
                        )
                    )
            finally:
                if import_file != fixture_file:
                    import_file.unlink(missing_ok=True)

        return group_total

    @staticmethod
    def _exclude_existing_entries(short_name: str, entries: list[dict]) -> tuple[list[dict], int]:
        """Keep existing rows untouched unless explicit overwrite was requested."""
        app_label, model_name = short_name.split("_", 1)
        model = apps.get_model(app_label, model_name)
        existing_ids = set(model.objects.filter(pk__in=[entry["pk"] for entry in entries]).values_list("pk", flat=True))
        fresh_entries = [entry for entry in entries if entry["pk"] not in existing_ids]
        return fresh_entries, len(entries) - len(fresh_entries)


@contextmanager
def _noop_context():
    yield
