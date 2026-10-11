"""Management command: normalize legacy recipe portions in the food fixtures.

``data/food/recipe_recipe.json`` (loaded by ``import_prod_data --only food``)
still contains recipes with ``portions > 1``, which violate the
``portions = 1`` check constraint. The decision per recipe (quantities are
totals for ``portions`` people or already per person) cannot be derived from
the fixture alone, so every legacy recipe must be decided explicitly:

  - ``--treat-as-total``: divide the recipe's item quantities by ``portions``.
  - ``--treat-as-per-person`` / ``--others-per-person``: keep the quantities.

Both cases set ``portions`` to 1. Only ``portions`` in the recipe fixture and
``quantity`` in the recipe item fixture change; the JSON layout stays as
written by ``dumpdata --indent 2``. Reports only unless ``--apply`` is given.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from recipe.management.commands.normalize_recipe_servings import _parse_ids

DEFAULT_FOOD_DIR = Path(__file__).resolve().parents[3] / "data" / "food"
RECIPE_FIXTURE = "recipe_recipe.json"
RECIPE_ITEM_FIXTURE = "recipe_recipeitem.json"

FixtureRecord = dict[str, Any]


@dataclass
class FixturePortionChanges:
    per_person_ids: list[int] = field(default_factory=list)
    total_ids: list[int] = field(default_factory=list)
    divided_item_ids: list[int] = field(default_factory=list)


def normalize_fixture_portions(
    recipes: list[FixtureRecord],
    recipe_items: list[FixtureRecord],
    *,
    treat_as_total: set[int],
    treat_as_per_person: set[int],
    others_per_person: bool,
) -> FixturePortionChanges:
    """Set ``portions`` to 1 in place; divide item quantities of total recipes."""
    legacy = {record["pk"]: record for record in recipes if (record["fields"].get("portions") or 1) > 1}
    undecided = set(legacy) - treat_as_total - treat_as_per_person
    if undecided and not others_per_person:
        raise CommandError(
            f"Undecided fixture recipes with portions > 1: {sorted(undecided)}. "
            "Pass them via --treat-as-total/--treat-as-per-person or use --others-per-person."
        )

    changes = FixturePortionChanges()
    for pk in sorted(legacy):
        record = legacy[pk]
        portions = record["fields"]["portions"]
        if pk in treat_as_total:
            for item in recipe_items:
                if item["fields"]["recipe_id"] == pk:
                    item["fields"]["quantity"] = item["fields"]["quantity"] / portions
                    changes.divided_item_ids.append(item["pk"])
            changes.total_ids.append(pk)
        else:
            changes.per_person_ids.append(pk)
        record["fields"]["portions"] = 1
    return changes


def _read_fixture(path: Path) -> list[FixtureRecord]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_fixture(path: Path, records: list[FixtureRecord]) -> None:
    path.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


class Command(BaseCommand):
    help = "Set portions=1 for legacy recipes in the food fixtures (divide totals). Reports only unless --apply."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--food-dir", default=str(DEFAULT_FOOD_DIR), help="Directory with the food fixtures.")
        parser.add_argument("--apply", action="store_true", help="Write the changed fixtures.")
        parser.add_argument(
            "--treat-as-total",
            default=None,
            help="Recipe ids whose quantities are totals for `portions` people (comma-separated).",
        )
        parser.add_argument(
            "--treat-as-per-person",
            default=None,
            help="Recipe ids whose quantities are already per person (comma-separated).",
        )
        parser.add_argument(
            "--others-per-person",
            action="store_true",
            help="Treat every legacy recipe not passed explicitly as per person.",
        )

    def handle(self, *args, **options) -> None:
        food_dir = Path(options["food_dir"])
        treat_as_total = _parse_ids(options["treat_as_total"], "--treat-as-total")
        treat_as_per_person = _parse_ids(options["treat_as_per_person"], "--treat-as-per-person")
        conflicting = treat_as_total & treat_as_per_person
        if conflicting:
            raise CommandError(f"Ids in both --treat-as-total and --treat-as-per-person: {sorted(conflicting)}")

        recipe_path = food_dir / RECIPE_FIXTURE
        item_path = food_dir / RECIPE_ITEM_FIXTURE
        recipes = _read_fixture(recipe_path)
        recipe_items = _read_fixture(item_path)
        changes = normalize_fixture_portions(
            recipes,
            recipe_items,
            treat_as_total=treat_as_total,
            treat_as_per_person=treat_as_per_person,
            others_per_person=options["others_per_person"],
        )

        prefix = "" if options["apply"] else "[DRY-RUN] "
        self.stdout.write(f"{prefix}Per person (portions=1 only): {changes.per_person_ids}")
        self.stdout.write(
            f"{prefix}Totals (quantities divided): {changes.total_ids}, {len(changes.divided_item_ids)} items"
        )
        if not options["apply"]:
            self.stdout.write(self.style.WARNING("Dry run — no files changed. Use --apply to write."))
            return
        _write_fixture(recipe_path, recipes)
        _write_fixture(item_path, recipe_items)
        self.stdout.write(self.style.SUCCESS("Done."))
