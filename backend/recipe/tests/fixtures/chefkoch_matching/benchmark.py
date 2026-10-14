"""Chefkoch import matching benchmark: real pages, real catalog, gold labels.

Runs the production review pipeline (`preview_recipe_ingredients`) on stored
Chefkoch pages and scores every row against `expected.PAGES`:

- ingredient: the selected ingredient is one of the accepted names
- grams: selected quantity × portion weight is within the line's tolerance
- split: compound lines ("Salz und Pfeffer") became one row per ingredient

Only the network fetch and the Gemini metadata call are replaced; the parser,
matcher and quantity conversion run unchanged. Gemini-dependent steps (container
unit estimates, enrichment) are unavailable, so the numbers show what the
deterministic pipeline achieves on its own.
"""

from __future__ import annotations

import gzip
import json
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from unittest.mock import patch

from recipe.tests.fixtures.chefkoch_matching.expected import CONTROL_PAGES, PAGES, Expected, Split

FIXTURE_DIR = Path(__file__).resolve().parent
PAGES_DIR = FIXTURE_DIR / "pages"
CONTROL_PAGES_DIR = FIXTURE_DIR / "control_pages"
CATALOG_PATH = FIXTURE_DIR / "catalog.json.gz"


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------


def load_catalog() -> None:
    """Load the catalog snapshot into the (empty) test database."""
    from supply.models import Ingredient, IngredientAlias, MeasuringUnit, Portion, RetailSection

    with gzip.open(CATALOG_PATH, "rt", encoding="utf-8") as handle:
        snapshot = json.load(handle)

    existing_units = set(MeasuringUnit.objects.values_list("id", flat=True))
    MeasuringUnit.objects.bulk_create(
        [MeasuringUnit(**row) for row in snapshot["measuring_units"] if row["id"] not in existing_units]
    )
    retail_section = RetailSection.objects.order_by("id").first()
    Ingredient.objects.bulk_create(
        [Ingredient(**row, retail_section=retail_section) for row in snapshot["ingredients"]], batch_size=500
    )
    IngredientAlias.objects.bulk_create([IngredientAlias(**row) for row in snapshot["aliases"]], batch_size=500)
    Portion.objects.bulk_create([Portion(**row) for row in snapshot["portions"]], batch_size=500)
    # bulk_create sends no signals: invalidate the matching index explicitly.
    from recipe.services.matching_index import bump_catalog_version

    bump_catalog_version()


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


@dataclass
class RowScore:
    page: str
    expected: Expected
    actual_source: str = ""
    selected: str = ""
    candidates: list[str] = field(default_factory=list)
    method: str = ""
    grams: float | None = None
    portion: str = ""
    quantity: float | None = None
    split_missing: bool = False

    @property
    def ingredient_ok(self) -> bool:
        if self.split_missing:
            return False
        if self.selected:
            return self.selected in self.expected.accepted
        # Leaving a row open is right when nothing suitable exists in the catalog.
        return self.expected.new

    @property
    def is_wrong(self) -> bool:
        """A silently wrong selection, the most harmful outcome."""
        return bool(self.selected) and self.selected not in self.expected.accepted

    @property
    def candidate_hit(self) -> bool:
        """Correct ingredient offered among the top-5 candidates (a one-click fix)."""
        return any(name in self.expected.accepted for name in self.candidates[:5])

    @property
    def grams_ok(self) -> bool | None:
        """None when the line has no amount to check or the ingredient is not right."""
        if self.expected.grams is None or not self.ingredient_ok or not self.selected:
            return None
        if self.grams is None:
            return False
        return abs(self.grams - self.expected.grams) <= self.expected.tol * self.expected.grams

    @property
    def fully_ok(self) -> bool:
        """Row needs no human correction: right ingredient and plausible amount."""
        return self.ingredient_ok and self.grams_ok is not False

    @property
    def outcome(self) -> str:
        if self.split_missing:
            return "not split"
        if self.is_wrong:
            return "WRONG"
        if not self.selected:
            if self.expected.new:
                return "open (new ok)"
            return "open, cand. hit" if self.candidate_hit else "open, no hit"
        if self.grams_ok is False:
            return "ok, amount off" if self.grams is not None else "ok, amount missing"
        return "ok"


@dataclass
class BenchmarkReport:
    rows: list[RowScore]

    def _ratio(self, values: list[bool]) -> float:
        return sum(values) / len(values) if values else 0.0

    @property
    def ingredient_accuracy(self) -> float:
        return self._ratio([row.ingredient_ok for row in self.rows])

    @property
    def wrong_rate(self) -> float:
        return self._ratio([row.is_wrong for row in self.rows])

    @property
    def candidate_recall(self) -> float:
        """Rows whose correct ingredient is selected or offered in the top 5."""
        relevant = [row for row in self.rows if row.expected.accepted]
        return self._ratio([row.selected in row.expected.accepted or row.candidate_hit for row in relevant])

    @property
    def grams_accuracy(self) -> float:
        checked = [row.grams_ok for row in self.rows if row.grams_ok is not None]
        return self._ratio([bool(value) for value in checked])

    @property
    def fully_ok_rate(self) -> float:
        return self._ratio([row.fully_ok for row in self.rows])

    def summary(self) -> str:
        return (
            f"rows={len(self.rows)} ingredient={self.ingredient_accuracy:.0%} "
            f"wrong={self.wrong_rate:.0%} candidate_recall={self.candidate_recall:.0%} "
            f"grams={self.grams_accuracy:.0%} fully_ok={self.fully_ok_rate:.0%}"
        )

    def to_markdown(self) -> str:
        lines = [
            f"**{self.summary()}**",
            "",
            "| Seite | Zeile | Ergebnis | Gewählt | Kandidaten | Menge | Erwartet |",
            "|---|---|---|---|---|---|---|",
        ]
        for row in self.rows:
            grams = f"{row.grams:.0f} g ({row.quantity}× {row.portion})" if row.grams is not None else "—"
            expected = f"{' / '.join(row.expected.accepted[:2]) or 'neu'}"
            if row.expected.grams is not None:
                expected += f", {row.expected.grams:g} g"
            lines.append(
                f"| {row.page.split('-', 1)[1][:22]} | {row.expected.source} | {row.outcome} | "
                f"{row.selected or '—'} | {', '.join(row.candidates[:3])} | {grams} | {expected} |"
            )
        return "\n".join(lines)


def _score_row(page: str, expected: Expected, row) -> RowScore:
    grams = None
    portion = row.selected_portion
    if row.selected_ingredient_id and portion is not None and row.quantity and portion.weight_g:
        # A portion count times the gram weight of one whole portion.
        grams = row.quantity * portion.weight_g
    return RowScore(
        page=page,
        expected=expected,
        actual_source=row.source_text,
        selected=row.selected_ingredient_name if row.selected_ingredient_id else "",
        candidates=[candidate.name for candidate in row.candidates],
        method=row.technical_details.method if row.technical_details else "",
        grams=grams,
        portion=portion.name if portion else "",
        quantity=row.quantity,
    )


def score_page(page: str, rows: list, expected: list[Expected | Split]) -> list[RowScore]:
    """Align review rows with the gold lines. Split lines may consume several rows."""
    scores: list[RowScore] = []
    remaining = list(rows)
    for entry in expected:
        if isinstance(entry, Split):
            first = remaining.pop(0) if remaining else None
            group = [first] if first is not None else []
            while remaining and first is not None and len(group) < len(entry.parts):
                if remaining[0].source_text != first.source_text:
                    break
                group.append(remaining.pop(0))
            unused = list(group)
            for index, part in enumerate(entry.parts):
                labelled = Expected(f"{entry.source} → {part.source}", part.accepted, part.grams, part.tol)
                match = next((row for row in unused if row.selected_ingredient_name in part.accepted), None)
                if match is None and len(group) == len(entry.parts):
                    match = group[index] if group[index] in unused else None
                if match is None and index == 0 and unused:
                    # An unsplit row is judged as the first part; the other parts are missing.
                    match = unused[0]
                if match is None:
                    scores.append(RowScore(page=page, expected=labelled, split_missing=True))
                    continue
                unused.remove(match)
                scores.append(_score_row(page, labelled, match))
            continue
        if not remaining:
            scores.append(RowScore(page=page, expected=entry))
            continue
        scores.append(_score_row(page, entry, remaining.pop(0)))
    return scores


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


def page_url(page: str) -> str:
    recipe_id, slug = page.removesuffix(".html").split("-", 1)
    return f"https://www.chefkoch.de/rezepte/{recipe_id}/{slug}.html"


@contextmanager
def offline_pipeline(pages: dict[str, list[Expected | Split]], pages_dir: Path) -> Iterator[None]:
    """Serve stored pages instead of fetching; skip the Gemini metadata call."""
    from recipe.services.import_service import parse_recipe_html
    from recipe.services.url_import_service import GeminiRecipeExtraction

    html_by_url = {page_url(page): (pages_dir / page).read_text(encoding="utf-8") for page in pages}

    def fake_import(url: str):
        return parse_recipe_html(html_by_url[url], url)

    def fake_metadata(parsed, user):
        return GeminiRecipeExtraction(title=parsed.title or "Rezept", ingredients=[]), None

    with (
        patch("recipe.services.import_service.import_from_url", side_effect=fake_import),
        patch("recipe.services.ingredient_review_service._call_gemini_for_metadata", side_effect=fake_metadata),
    ):
        yield


def run_benchmark(user, control: bool = False) -> BenchmarkReport:
    """Run the main set, or the control set with ``control=True``."""
    from recipe.schemas.ingredient_review import RecipeImportSourceIn
    from recipe.services.exceptions import NoRecipeFoundError
    from recipe.services.ingredient_review_service import preview_recipe_ingredients

    pages, pages_dir = (CONTROL_PAGES, CONTROL_PAGES_DIR) if control else (PAGES, PAGES_DIR)
    scores: list[RowScore] = []
    with offline_pipeline(pages, pages_dir):
        for page in pages:
            try:
                preview = preview_recipe_ingredients([RecipeImportSourceIn(type="url", value=page_url(page))], user)
                rows = preview.rows
            except NoRecipeFoundError:
                rows = []
            scores.extend(score_page(page, rows, pages[page]))
    return BenchmarkReport(scores)
