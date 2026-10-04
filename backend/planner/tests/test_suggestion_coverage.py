"""Tests for the suggestion coverage report."""

from __future__ import annotations

from io import StringIO

import pytest
from django.core.management import call_command

from planner.services.suggestion_panel.coverage import (
    compute_coverage,
    find_empty_directions,
    to_markdown,
)
from recipe.tests import make_recipe
from supply.tests import make_ingredient, make_portion, make_retail_section


def _snack(title: str, sugar: float):
    return make_recipe(
        title=title,
        summary="",
        description="",
        recipe_type="snack",
        cached_sugar_g=sugar,
        cached_weight_g=100,
        cached_price_total=1,
        portions=1,
    )


@pytest.mark.django_db
class TestCoverage:
    def test_gaps_are_flagged_and_listed_in_backlog(self):
        for i in range(4):
            _snack(f"Keks {i}", sugar=30)
        _snack("Salzstange", sugar=1)

        rows = {(r.meal_type, r.direction): r for r in compute_coverage(("snack",))}

        assert rows[("snack", "sweet")].counts["alle"] == 4
        assert "alle" not in rows[("snack", "sweet")].gaps()
        assert rows[("snack", "savory")].counts["alle"] == 1
        assert "alle" in rows[("snack", "savory")].gaps()
        markdown = to_markdown(list(rows.values()))
        assert "snack / savory" in markdown

    def test_empty_directions_are_reported(self):
        rows = compute_coverage(("drinks",))
        assert ("drinks", "ready") in find_empty_directions(rows)

    def test_standalone_ingredients_count_for_ready_drinks(self):
        section = make_retail_section(name="Wasser & Erfrischungsgetränke")
        for name in ("Mineralwasser", "Orangensaft"):
            ing = make_ingredient(name=name, is_standalone_food=True, retail_section=section)
            make_portion(ing, name="Glas", rank=1, weight_g=200)

        rows = {r.direction: r for r in compute_coverage(("drinks",))}

        assert rows["ready"].counts["alle"] == 2

    def test_cooking_scenario_removes_warm_recipes(self):
        make_recipe(title="Eintopf", summary="", description="", recipe_type="warm_meal", cached_price_total=4)

        rows = {r.direction: r for r in compute_coverage(("dinner",))}

        assert rows["classic"].counts["alle"] == 1
        assert rows["classic"].counts["cooking=none"] == 0

    def test_command_writes_markdown_and_json(self, tmp_path):
        _snack("Keks", sugar=30)
        out = tmp_path / "coverage.md"
        call_command("report_suggestion_coverage", "--output", str(out), stdout=StringIO())
        assert "Seed-Backlog" in out.read_text(encoding="utf-8")

        stdout = StringIO()
        call_command("report_suggestion_coverage", "--format", "json", stdout=stdout)
        assert '"meal_type": "snack"' in stdout.getvalue()
