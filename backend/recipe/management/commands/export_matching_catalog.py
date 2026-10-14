"""Export a compact ingredient catalog snapshot for the import matching benchmark.

The snapshot holds what the matcher and the quantity conversion read: system
ingredients, their aliases, active portions and measuring units. The Chefkoch
end-to-end test (`recipe/tests/test_chefkoch_import_matching_e2e.py`) loads it
into the test database, so matching quality is measured against the real catalog.

Usage:
    uv run python manage.py export_matching_catalog
    uv run python manage.py export_matching_catalog --output /tmp/catalog.json.gz
"""

from __future__ import annotations

import gzip
import json
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand

DEFAULT_OUTPUT = (
    Path(__file__).resolve().parent.parent.parent / "tests" / "fixtures" / "chefkoch_matching" / "catalog.json.gz"
)

INGREDIENT_FIELDS = ("id", "name", "slug", "status", "usage_count", "physical_density", "physical_viscosity")
ALIAS_FIELDS = ("id", "ingredient_id", "name", "rank", "is_generic")
PORTION_FIELDS = (
    "id",
    "ingredient_id",
    "name",
    "quantity",
    "weight_g",
    "rank",
    "measuring_unit_id",
    "weight_status",
    "weight_source",
)
UNIT_FIELDS = ("id", "name", "quantity", "unit")


def build_catalog_snapshot() -> dict[str, Any]:
    """Collect the system catalog (no user-owned ingredients) as plain rows."""
    from supply.models import Ingredient, IngredientAlias, MeasuringUnit, Portion

    ingredients = Ingredient.objects.filter(deleted_at__isnull=True, owner__isnull=True).order_by("id")
    ingredient_ids = ingredients.values("id")
    return {
        "measuring_units": list(MeasuringUnit.objects.order_by("id").values(*UNIT_FIELDS)),
        "ingredients": list(ingredients.values(*INGREDIENT_FIELDS)),
        "aliases": list(
            IngredientAlias.objects.filter(ingredient_id__in=ingredient_ids).order_by("id").values(*ALIAS_FIELDS)
        ),
        "portions": list(
            Portion.objects.active().filter(ingredient_id__in=ingredient_ids).order_by("id").values(*PORTION_FIELDS)
        ),
    }


class Command(BaseCommand):
    help = "Export a compact ingredient catalog snapshot for the import matching benchmark."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Target .json.gz file")

    def handle(self, *args: Any, **options: Any) -> None:
        snapshot = build_catalog_snapshot()
        output = Path(options["output"])
        output.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"), default=str).encode("utf-8")
        with gzip.GzipFile(output, "wb", mtime=0) as handle:
            handle.write(payload)
        counts = ", ".join(f"{key}={len(rows)}" for key, rows in snapshot.items())
        self.stdout.write(self.style.SUCCESS(f"Catalog snapshot written to {output} ({counts})"))
