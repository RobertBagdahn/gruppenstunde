"""End-to-end benchmark: real Chefkoch pages → ingredient review rows → gold labels.

Ten randomly drawn Chefkoch recipes (stored, trimmed HTML) run through the real
review pipeline against a snapshot of the production ingredient catalog. See
`fixtures/chefkoch_matching/benchmark.py` for the scoring rules.

The thresholds are a ratchet: raise them whenever the pipeline improves, never
lower them. Set CHEFKOCH_BENCHMARK_REPORT=<path> to write the row-level report.
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest

from recipe.tests.fixtures.chefkoch_matching.benchmark import (
    CONTROL_PAGES,
    CONTROL_PAGES_DIR,
    PAGES,
    PAGES_DIR,
    load_catalog,
    page_url,
    run_benchmark,
)

pytestmark = [pytest.mark.slow, pytest.mark.usefixtures("gemini_unavailable")]

# Ratchet — raise after each improvement, never lower.
# Baseline 2026-10-14: ingredient 61 %, wrong 11 %, grams 64 %, fully ok 42 %.
# After line parser + quantity rules: ingredient 84 %, wrong 4 %, grams 100 %, fully ok 84 %.
# After the matching index: ingredient 97 %, wrong 1 %, grams 100 %, fully ok 97 %.
MIN_INGREDIENT_ACCURACY = 0.97
MAX_WRONG_RATE = 0.01
MIN_GRAMS_ACCURACY = 0.99
MIN_FULLY_OK_RATE = 0.97


@pytest.mark.parametrize(
    ("page", "pages", "pages_dir"),
    [(page, PAGES, PAGES_DIR) for page in PAGES] + [(page, CONTROL_PAGES, CONTROL_PAGES_DIR) for page in CONTROL_PAGES],
)
def test_every_benchmark_page_yields_its_ingredient_lines(page, pages, pages_dir):
    from recipe.services.import_service import parse_recipe_html

    recipe = parse_recipe_html((pages_dir / page).read_text(encoding="utf-8"), page_url(page))

    assert len(recipe.ingredients) == len(pages[page])


@pytest.mark.django_db
def test_chefkoch_import_matching_quality(django_user_model):
    load_catalog()
    user = django_user_model.objects.create_user(username="benchmark-cook", password="x")

    report = run_benchmark(user)

    report_path = os.environ.get("CHEFKOCH_BENCHMARK_REPORT")
    if report_path:
        Path(report_path).write_text(report.to_markdown(), encoding="utf-8")

    assert report.ingredient_accuracy >= MIN_INGREDIENT_ACCURACY, report.summary()
    assert report.wrong_rate <= MAX_WRONG_RATE, report.summary()
    assert report.grams_accuracy >= MIN_GRAMS_ACCURACY, report.summary()
    assert report.fully_ok_rate >= MIN_FULLY_OK_RATE, report.summary()


# Control set: never used to tune rules. First measured after the matching index
# (ingredient 86 %, wrong 6 %, fully ok 80 %); after generic fixes 91 % / 2 % / 88 %.
MIN_CONTROL_INGREDIENT_ACCURACY = 0.91
MAX_CONTROL_WRONG_RATE = 0.03
MIN_CONTROL_FULLY_OK_RATE = 0.88


@pytest.mark.django_db
def test_chefkoch_import_matching_quality_on_control_set(django_user_model):
    load_catalog()
    user = django_user_model.objects.create_user(username="benchmark-control", password="x")

    report = run_benchmark(user, control=True)

    report_path = os.environ.get("CHEFKOCH_CONTROL_REPORT")
    if report_path:
        Path(report_path).write_text(report.to_markdown(), encoding="utf-8")

    assert report.ingredient_accuracy >= MIN_CONTROL_INGREDIENT_ACCURACY, report.summary()
    assert report.wrong_rate <= MAX_CONTROL_WRONG_RATE, report.summary()
    assert report.fully_ok_rate >= MIN_CONTROL_FULLY_OK_RATE, report.summary()
