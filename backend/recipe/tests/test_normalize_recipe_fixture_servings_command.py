"""Tests for normalize_recipe_fixture_servings and the shipped food fixtures."""

import json
from io import StringIO
from pathlib import Path

import pytest
from django.core.management import CommandError, call_command

from recipe.management.commands.normalize_recipe_fixture_servings import (
    DEFAULT_FOOD_DIR,
    RECIPE_FIXTURE,
    RECIPE_ITEM_FIXTURE,
)


def _recipe(pk: int, portions: int) -> dict:
    return {"model": "recipe.recipe", "pk": pk, "fields": {"title": f"Rezept {pk}", "portions": portions}}


def _item(pk: int, recipe_id: int, quantity: float) -> dict:
    return {"model": "recipe.recipeitem", "pk": pk, "fields": {"quantity": quantity, "recipe_id": recipe_id}}


def _write(food_dir: Path, recipes: list[dict], items: list[dict]) -> None:
    (food_dir / RECIPE_FIXTURE).write_text(json.dumps(recipes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (food_dir / RECIPE_ITEM_FIXTURE).write_text(
        json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )


def _read(food_dir: Path, name: str) -> list[dict]:
    return json.loads((food_dir / name).read_text(encoding="utf-8"))


def _run(food_dir: Path, *args: str) -> str:
    out = StringIO()
    call_command("normalize_recipe_fixture_servings", f"--food-dir={food_dir}", *args, stdout=out)
    return out.getvalue()


class TestNormalizeRecipeFixtureServings:
    def test_apply_divides_totals_and_keeps_per_person_quantities(self, tmp_path: Path):
        _write(
            tmp_path,
            [_recipe(1, 4), _recipe(2, 3), _recipe(3, 1)],
            [_item(10, 1, 500.0), _item(11, 1, 2.0), _item(20, 2, 120.0), _item(30, 3, 80.0)],
        )

        _run(tmp_path, "--treat-as-total=1", "--treat-as-per-person=2", "--apply")

        recipes = {record["pk"]: record["fields"] for record in _read(tmp_path, RECIPE_FIXTURE)}
        items = {record["pk"]: record["fields"]["quantity"] for record in _read(tmp_path, RECIPE_ITEM_FIXTURE)}
        assert {pk: fields["portions"] for pk, fields in recipes.items()} == {1: 1, 2: 1, 3: 1}
        assert recipes[1]["title"] == "Rezept 1"
        assert items == {10: 125.0, 11: 0.5, 20: 120.0, 30: 80.0}

    def test_dry_run_leaves_files_unchanged(self, tmp_path: Path):
        _write(tmp_path, [_recipe(1, 4)], [_item(10, 1, 500.0)])
        before = (tmp_path / RECIPE_FIXTURE).read_text(encoding="utf-8")

        output = _run(tmp_path, "--treat-as-total=1")

        assert (tmp_path / RECIPE_FIXTURE).read_text(encoding="utf-8") == before
        assert "Dry run" in output

    def test_undecided_recipes_are_rejected(self, tmp_path: Path):
        _write(tmp_path, [_recipe(1, 4), _recipe(2, 2)], [])

        with pytest.raises(CommandError, match=r"\[2\]"):
            _run(tmp_path, "--treat-as-total=1", "--apply")

    def test_others_per_person_covers_remaining_recipes(self, tmp_path: Path):
        _write(tmp_path, [_recipe(1, 4), _recipe(2, 2)], [_item(20, 2, 90.0)])

        _run(tmp_path, "--treat-as-total=1", "--others-per-person", "--apply")

        assert [record["fields"]["portions"] for record in _read(tmp_path, RECIPE_FIXTURE)] == [1, 1]
        assert _read(tmp_path, RECIPE_ITEM_FIXTURE)[0]["fields"]["quantity"] == 90.0


def test_shipped_recipe_fixture_satisfies_portions_constraint():
    """``import_prod_data --only food`` must load under the ``portions = 1`` check constraint."""
    recipes = json.loads((DEFAULT_FOOD_DIR / RECIPE_FIXTURE).read_text(encoding="utf-8"))

    assert recipes
    assert [record["pk"] for record in recipes if record["fields"].get("portions", 1) != 1] == []
