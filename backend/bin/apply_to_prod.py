"""
Apply local food + masterdata fixtures to a target database (prod via Cloud SQL Proxy).

Usage:
    DB_PASSWORD=xxx uv run python bin/apply_to_prod.py [--only masterdata|food]

Sets DB_HOST=localhost, DB_PORT=5433, DB_NAME=inspi, DB_USER=inspi.
"""
from __future__ import annotations

import json
import os
import sys
from contextlib import contextmanager
from pathlib import Path

import django
from django.conf import settings

# ── Target DB config ───────────────────────────────────────────────────
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5433")
os.environ.setdefault("DB_NAME", "inspi")
os.environ.setdefault("DB_USER", "inspi")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "inspi.settings.local")

BASE_DIR = Path(__file__).resolve().parent.parent

sys.path.insert(0, str(BASE_DIR))
django.setup()

from django.core import serializers
from django.db import connection, transaction


IMPORT_ORDER: list[tuple[str, list[str]]] = [
    ("masterdata", [
        "content_tag",
        "content_scoutlevel",
        "supply_measuringunit",
        "supply_retailsection",
        "supply_nutritionaltag",
    ]),
    ("food", [
        "supply_ingredient",
        "supply_ingredientalias",
        "supply_portion",
        "recipe_recipe",
        "recipe_recipetypestats",
        "recipe_rule",
        "recipe_recipeitem",
    ]),
]

ALLOWED_TABLES = {
    "content_tag",
    "content_scoutlevel",
    "supply_measuringunit",
    "supply_retailsection",
    "supply_nutritionaltag",
    "supply_ingredient",
    "supply_ingredientalias",
    "supply_portion",
    "recipe_recipe",
    "recipe_recipetypestats",
    "recipe_rule",
    "recipe_recipeitem",
}


@contextmanager
def _silence_signals():
    import recipe.signals  # noqa: F401
    import supply.signals  # noqa: F401
    from django.db.models.signals import post_delete, post_save, pre_save

    signals = [pre_save, post_save, post_delete]
    saved = {}
    for sig in signals:
        saved[id(sig)] = sig.receivers[:]
        sig.receivers = []
    try:
        yield
    finally:
        for sig in signals:
            sig.receivers = saved[id(sig)]


def _deduplicate_portions():
    from django.db.models import Count
    from django.db.models.functions import Lower
    from django.utils import timezone
    from supply.models.ingredient import Portion

    dupes = (
        Portion.objects.filter(deleted_at__isnull=True)
        .annotate(name_lower=Lower("name"))
        .values("name_lower", "ingredient_id")
        .annotate(cnt=Count("id"))
        .filter(cnt__gt=1)
    )
    now = timezone.now()
    total = 0
    for dupe in dupes:
        ids = (
            Portion.objects.filter(
                deleted_at__isnull=True,
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


def _truncate_tables(tables: list[str]) -> None:
    with connection.cursor() as cursor:
        for table in tables:
            if table in ALLOWED_TABLES:
                cursor.execute(f'TRUNCATE TABLE "{table}" CASCADE;')
    print(f"  → {len(tables)} Tabellen geleert")


def apply_fixture(fixture_path: Path) -> int:
    with open(fixture_path, encoding="utf-8") as f:
        entries = json.load(f)
    if not isinstance(entries, list) or not entries:
        return 0
    name = fixture_path.stem
    count = len(entries)
    print(f"  → {name}: {count} Einträge importieren...", end=" ")
    sys.stdout.flush()
    with transaction.atomic():
        for obj in serializers.deserialize("json", json.dumps(entries)):
            obj.save(force_insert=True)
    print("✓")
    return count


def get_fixture_path(data_dir: Path, group: str, prefix: str) -> Path | None:
    matches = sorted((data_dir / group).glob(f"{prefix}.json"))
    return matches[0] if matches else None


TABLE_MAP = {
    "content_tag": ["content_tag"],
    "content_scoutlevel": ["content_scoutlevel"],
    "supply_measuringunit": ["supply_measuringunit"],
    "supply_retailsection": ["supply_retailsection"],
    "supply_nutritionaltag": ["supply_nutritionaltag"],
    "supply_ingredient": ["supply_ingredient"],
    "supply_ingredientalias": ["supply_ingredientalias"],
    "supply_portion": ["supply_portion"],
    "recipe_recipe": ["recipe_recipe"],
    "recipe_recipetypestats": ["recipe_recipetypestats"],
    "recipe_rule": ["recipe_rule"],
    "recipe_recipeitem": ["recipe_recipeitem"],
}

DEPENDENCY_ORDER = [
    "recipe_recipeitem",
    "recipe_rule",
    "recipe_recipetypestats",
    "recipe_recipe",
    "supply_portion",
    "supply_ingredientalias",
    "supply_ingredient",
    "supply_nutritionaltag",
    "supply_retailsection",
    "supply_measuringunit",
    "content_scoutlevel",
    "content_tag",
]


def main():
    only = None
    for arg in sys.argv[1:]:
        if arg.startswith("--only="):
            only = arg.split("=", 1)[1]
        elif arg in ("--only",):
            idx = sys.argv.index(arg)
            if idx + 1 < len(sys.argv):
                only = sys.argv[idx + 1]

    data_dir = BASE_DIR / "data"
    if not data_dir.is_dir():
        print(f"Fehler: data directory nicht gefunden: {data_dir}")
        sys.exit(1)

    if only:
        groups = [(g, f) for g, f in IMPORT_ORDER if g == only]
    else:
        groups = IMPORT_ORDER

    # Determine tables to truncate (reverse order for FK safety)
    all_prefixes = []
    for _, prefixes in groups:
        all_prefixes.extend(prefixes)

    tables_to_truncate = []
    for prefix in DEPENDENCY_ORDER:
        if prefix in all_prefixes:
            tables_to_truncate.extend(TABLE_MAP[prefix])

    print(f"Leere {len(tables_to_truncate)} Tabellen...")
    _truncate_tables(tables_to_truncate)

    total = 0
    with _silence_signals():
        for group_name, prefixes in groups:
            for prefix in prefixes:
                fpath = get_fixture_path(data_dir, group_name, prefix)
                if fpath is None:
                    print(f"  → {prefix}: Datei nicht gefunden, überspringe")
                    continue
                total += apply_fixture(fpath)

    # Recreate portion unique index and deduplicate
    deduped = _deduplicate_portions()
    with connection.cursor() as cursor:
        cursor.execute("DROP INDEX IF EXISTS unique_portion_name_per_ingredient")
        cursor.execute("""
            CREATE UNIQUE INDEX unique_portion_name_per_ingredient
            ON supply_portion (LOWER(name), ingredient_id)
            WHERE deleted_at IS NULL
        """)
    if deduped:
        print(f"  ↻ {deduped} doppelte Portionen als gelöscht markiert")

    print(f"\n✅ Fertig: {total} Einträge auf Produktion importiert")


if __name__ == "__main__":
    main()
