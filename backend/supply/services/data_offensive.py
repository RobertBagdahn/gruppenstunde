"""Data offensive: one-pass issue snapshot, work queues and bulk actions for ingredients.

The snapshot reads every ingredient once (``values()``) and derives all issue
codes in Python. It feeds the cockpit KPIs, the filterable work list and the
selection of ingredients for AI review and publishing, so every screen and
command agrees on what "broken" means.
"""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from supply.choices import AiReviewVerdictChoices, IngredientStatusChoices, RetailSectionSourceChoices
from supply.services.nutrition_plausibility import NUTRITION_FIELDS, detect_nutrition_issues
from supply.services.price_service import is_missing_price

# AI review cost per batch call (Gemini 3.5 Flash-Lite, ~4k input / ~3k output tokens, EUR).
ESTIMATED_EUR_PER_REVIEW_BATCH = 0.005
REVIEW_BATCH_SIZE = 15

SUSPECT_NAME_PATTERN = re.compile(
    r"(^e2e\b|\be2e\b|^test\b|\btest(zutat|daten)?\b|[a-zäöü]test\d*$|\d{10,}|^zz\b)", re.IGNORECASE
)

ISSUE_LABELS: dict[str, str] = {
    "nutrition_implausible": "Nährwerte unplausibel",
    "nutrition_missing": "Nährwerte fehlen",
    "price_missing": "Preis fehlt",
    "section_missing": "Warengruppe fehlt/Sonstiges",
    "description_missing": "Beschreibung fehlt",
    "embedding_missing": "Embedding fehlt",
    "suspect_name": "Test-/Unsinnsdaten",
    "rename_suggested": "Umbenennung vorgeschlagen",
    "duplicate_suggested": "Duplikat vermutet",
    "suggestions_pending": "KI-Vorschläge offen",
    "not_reviewed": "Noch nicht KI-geprüft",
}

CORE_NUTRITION_FIELDS: tuple[str, ...] = ("energy_kcal", "protein_g", "fat_g", "carbohydrate_g")
SNAPSHOT_FIELDS: tuple[str, ...] = (
    "id",
    "name",
    "slug",
    "status",
    "usage_count",
    "price_per_kg",
    "description",
    "retail_section_id",
    "retail_section__name",
    "retail_section_source",
    "ai_reviewed_at",
    "ai_review_verdict",
    "ai_review_notes",
    "quality_score",
    "embedding_updated_at",
    *NUTRITION_FIELDS,
)


@dataclass
class IngredientSnapshotRow:
    """Flattened ingredient with all derived issue codes."""

    id: int
    name: str
    slug: str
    status: str
    usage_count: int
    retail_section_id: int | None
    retail_section_name: str | None
    retail_section_source: str
    price_per_kg: float | None
    quality_score: int | None
    ai_reviewed_at: Any
    ai_review_verdict: str
    ai_review_notes: dict[str, Any]
    nutrition: dict[str, float | None]
    nutrition_issue_codes: list[str] = field(default_factory=list)
    issues: list[str] = field(default_factory=list)

    @property
    def publishable(self) -> bool:
        return self.status == IngredientStatusChoices.DRAFT and not (set(self.issues) & BLOCKING_ISSUES)


# Issues that block publishing (embedding and review status do not).
BLOCKING_ISSUES: frozenset[str] = frozenset(
    {
        "nutrition_implausible",
        "nutrition_missing",
        "price_missing",
        "section_missing",
        "suspect_name",
        "rename_suggested",
        "duplicate_suggested",
    }
)


def _row_issues(row: dict[str, Any], nutrition_codes: list[str]) -> list[str]:
    issues: list[str] = []
    if nutrition_codes:
        issues.append("nutrition_implausible")
    if any(row.get(f) is None for f in CORE_NUTRITION_FIELDS):
        issues.append("nutrition_missing")
    if is_missing_price(row.get("price_per_kg")):
        issues.append("price_missing")
    # "Sonstiges" is fine when a rule or the AI chose it deliberately (e.g. protein powder).
    if row.get("retail_section_id") is None or (
        row.get("retail_section__name") == "Sonstiges" and not row.get("retail_section_source")
    ):
        issues.append("section_missing")
    if len((row.get("description") or "").strip()) < 40:
        issues.append("description_missing")
    if row.get("embedding_updated_at") is None:
        issues.append("embedding_missing")
    verdict = row.get("ai_review_verdict") or ""
    if SUSPECT_NAME_PATTERN.search(row.get("name") or "") or verdict == AiReviewVerdictChoices.NOT_AN_INGREDIENT:
        issues.append("suspect_name")
    if verdict == AiReviewVerdictChoices.RENAME:
        issues.append("rename_suggested")
    if verdict == AiReviewVerdictChoices.DUPLICATE:
        issues.append("duplicate_suggested")
    notes = row.get("ai_review_notes") or {}
    if notes.get("suggestions") or notes.get("suggested_name"):
        issues.append("suggestions_pending")
    if row.get("ai_reviewed_at") is None:
        issues.append("not_reviewed")
    return issues


def build_snapshot(queryset: Any | None = None) -> list[IngredientSnapshotRow]:
    """Compute issue codes for all (or the given) ingredients in one query."""
    from supply.models import Ingredient

    queryset = queryset if queryset is not None else Ingredient.objects.all()
    rows: list[IngredientSnapshotRow] = []
    for row in queryset.order_by("name").values(*SNAPSHOT_FIELDS):
        nutrition = {f: row.get(f) for f in NUTRITION_FIELDS}
        codes = [issue.code for issue in detect_nutrition_issues(nutrition, name=row["name"])]
        price = row.get("price_per_kg")
        rows.append(
            IngredientSnapshotRow(
                id=row["id"],
                name=row["name"],
                slug=row["slug"],
                status=row["status"],
                usage_count=row.get("usage_count") or 0,
                retail_section_id=row.get("retail_section_id"),
                retail_section_name=row.get("retail_section__name"),
                retail_section_source=row.get("retail_section_source") or "",
                price_per_kg=float(price) if isinstance(price, Decimal | float | int) else None,
                quality_score=row.get("quality_score"),
                ai_reviewed_at=row.get("ai_reviewed_at"),
                ai_review_verdict=row.get("ai_review_verdict") or "",
                ai_review_notes=row.get("ai_review_notes") or {},
                nutrition=nutrition,
                nutrition_issue_codes=codes,
                issues=_row_issues(row, codes),
            )
        )
    return rows


def summarize(rows: Iterable[IngredientSnapshotRow]) -> dict[str, Any]:
    """KPI counters for the cockpit."""
    rows = list(rows)
    issue_counts: Counter[str] = Counter()
    nutrition_counts: Counter[str] = Counter()
    status_counts: Counter[str] = Counter()
    section_counts: Counter[str] = Counter()
    verdict_counts: Counter[str] = Counter()
    needs_review = 0
    publishable = 0
    for row in rows:
        issue_counts.update(row.issues)
        nutrition_counts.update(row.nutrition_issue_codes)
        status_counts[row.status] += 1
        section_counts[row.retail_section_name or "—"] += 1
        verdict_counts[row.ai_review_verdict or "none"] += 1
        if row_needs_review(row):
            needs_review += 1
        if row.publishable:
            publishable += 1
    review_batches = -(-needs_review // REVIEW_BATCH_SIZE)
    return {
        "total": len(rows),
        "issue_counts": dict(issue_counts),
        "nutrition_issue_counts": dict(nutrition_counts),
        "status_counts": dict(status_counts),
        "section_counts": dict(section_counts),
        "verdict_counts": dict(verdict_counts),
        "needs_review": needs_review,
        "publishable": publishable,
        "estimated_review_cost_eur": round(review_batches * ESTIMATED_EUR_PER_REVIEW_BATCH, 2),
    }


REVIEW_TRIGGER_ISSUES: frozenset[str] = frozenset(
    {"nutrition_implausible", "nutrition_missing", "price_missing", "section_missing", "description_missing"}
)


def row_needs_review(row: IngredientSnapshotRow) -> bool:
    """An unreviewed ingredient with at least one issue the AI can fix."""
    return row.ai_reviewed_at is None and bool(set(row.issues) & REVIEW_TRIGGER_ISSUES)


def filter_rows(
    rows: list[IngredientSnapshotRow],
    *,
    issue: str | None = None,
    nutrition_issue: str | None = None,
    section_id: int | None = None,
    verdict: str | None = None,
    status: str | None = None,
    search: str | None = None,
    used_only: bool = False,
) -> list[IngredientSnapshotRow]:
    """Filter snapshot rows for the work list."""
    needle = (search or "").strip().lower()
    result = []
    for row in rows:
        if issue == "publishable":
            if not row.publishable:
                continue
        elif issue == "needs_review":
            if not row_needs_review(row):
                continue
        elif issue and issue not in row.issues:
            continue
        if nutrition_issue and nutrition_issue not in row.nutrition_issue_codes:
            continue
        if section_id is not None and row.retail_section_id != section_id:
            continue
        if verdict and row.ai_review_verdict != verdict:
            continue
        if status and row.status != status:
            continue
        if needle and needle not in row.name.lower():
            continue
        if used_only and row.usage_count <= 0:
            continue
        result.append(row)
    return result


def review_queue_ids(*, limit: int, ids: list[int] | None = None, force: bool = False) -> list[int]:
    """Ingredient ids for the next AI review run: used ones first, then by name."""
    from supply.models import Ingredient

    queryset = Ingredient.objects.all()
    if ids:
        queryset = queryset.filter(id__in=ids)
    rows = build_snapshot(queryset)
    if not force:
        rows = [row for row in rows if row_needs_review(row)]
    rows.sort(key=lambda row: (row.usage_count <= 0, row.name.lower()))
    return [row.id for row in rows[:limit]]


# ---------------------------------------------------------------------------
# Bulk actions
# ---------------------------------------------------------------------------


@dataclass
class BulkResult:
    changed: int = 0
    skipped: int = 0
    messages: list[str] = field(default_factory=list)


def publish_ingredients(*, ids: list[int] | None, apply: bool) -> BulkResult:
    """Verify eligible system drafts (no owner, no blocking issues) via the status service.

    User-owned ingredients are never published automatically: verifying them
    would make a private ingredient public.
    """
    from supply.models import Ingredient
    from supply.services.ingredient_status import SYSTEM, set_ingredient_status

    queryset = Ingredient.objects.filter(status=IngredientStatusChoices.DRAFT, owner__isnull=True)
    if ids:
        queryset = queryset.filter(id__in=ids)
    rows = build_snapshot(queryset)
    eligible = [row.id for row in rows if row.publishable]
    result = BulkResult(changed=len(eligible), skipped=len(rows) - len(eligible))
    if apply:
        for ingredient in Ingredient.objects.filter(id__in=eligible):
            set_ingredient_status(ingredient, IngredientStatusChoices.VERIFIED, actor=SYSTEM)
    return result


def apply_ai_suggestions(*, ids: list[int], fields: set[str]) -> BulkResult:
    """Accept stored AI suggestions (name, nutrition values, price) for the given ingredients."""
    from supply.models import Ingredient
    from supply.services.nutri_service import calculate_nutri_score
    from supply.services.quality_score import calculate_ingredient_quality_score

    result = BulkResult()
    to_update: list[Ingredient] = []
    updated_fields: set[str] = set()
    for ingredient in Ingredient.objects.filter(id__in=ids).select_related("retail_section"):
        notes = dict(ingredient.ai_review_notes or {})
        suggestions = dict(notes.get("suggestions") or {})
        changed = False
        if "name" in fields and notes.get("suggested_name"):
            new_name = str(notes["suggested_name"]).strip()
            if new_name and not Ingredient.objects.filter(name__iexact=new_name).exclude(id=ingredient.id).exists():
                ingredient.name = new_name
                updated_fields.add("name")
                notes["suggested_name"] = None
                if ingredient.ai_review_verdict == AiReviewVerdictChoices.RENAME:
                    ingredient.ai_review_verdict = AiReviewVerdictChoices.CORRECTED
                changed = True
            else:
                result.messages.append(f"„{new_name}“ existiert bereits – bitte zusammenführen.")
        if "nutrition" in fields:
            for field_name in NUTRITION_FIELDS:
                if field_name in suggestions:
                    setattr(ingredient, field_name, suggestions.pop(field_name))
                    updated_fields.add(field_name)
                    changed = True
        if "price" in fields and "price_per_kg" in suggestions:
            ingredient.price_per_kg = Decimal(str(suggestions.pop("price_per_kg")))
            updated_fields.add("price_per_kg")
            changed = True
        if not changed:
            result.skipped += 1
            continue
        notes["suggestions"] = suggestions
        ingredient.ai_review_notes = notes
        ingredient.nutri_score, ingredient.nutri_class = calculate_nutri_score(ingredient)
        ingredient.quality_score = calculate_ingredient_quality_score(ingredient)
        to_update.append(ingredient)
        result.changed += 1

    if to_update:
        Ingredient.objects.bulk_update(
            to_update,
            [*updated_fields, "ai_review_notes", "ai_review_verdict", "nutri_score", "nutri_class", "quality_score"],
        )
    return result


def soft_delete_ingredients(*, ids: list[int]) -> BulkResult:
    """Soft-delete junk ingredients that are not referenced by recipes or meal plans."""
    from planner.models import MealItem
    from recipe.models import RecipeItem
    from supply.models import Ingredient

    result = BulkResult()
    used_in_recipes = set(
        RecipeItem.objects.filter(portion__ingredient_id__in=ids).values_list("portion__ingredient_id", flat=True)
    )
    used_in_meals = set(MealItem.objects.filter(ingredient_id__in=ids).values_list("ingredient_id", flat=True))
    blocked = used_in_recipes | used_in_meals
    with transaction.atomic():
        for ingredient in Ingredient.objects.filter(id__in=ids):
            if ingredient.id in blocked:
                result.skipped += 1
                result.messages.append(f"„{ingredient.name}“ wird noch verwendet und bleibt erhalten.")
                continue
            ingredient.soft_delete()
            result.changed += 1
    return result


def update_ingredient_fields(ingredient: Any, data: dict[str, Any]) -> list[str]:
    """Inline edit from the cockpit. Returns the changed field names."""
    from supply.models import RetailSection
    from supply.services.nutri_service import calculate_nutri_score
    from supply.services.quality_score import calculate_ingredient_quality_score

    changed: list[str] = []
    if "retail_section_id" in data:
        section_id = data["retail_section_id"]
        section = RetailSection.objects.filter(id=section_id).first() if section_id else None
        ingredient.retail_section = section
        ingredient.retail_section_source = RetailSectionSourceChoices.MANUAL if section else ""
        changed += ["retail_section", "retail_section_source"]
    for field_name in (*NUTRITION_FIELDS, "name"):
        if field_name in data:
            setattr(ingredient, field_name, data[field_name])
            changed.append(field_name)
    if "name" in data:
        # A chosen name resolves the rename suggestion.
        notes = dict(ingredient.ai_review_notes or {})
        notes["suggested_name"] = None
        ingredient.ai_review_notes = notes
        if ingredient.ai_review_verdict == AiReviewVerdictChoices.RENAME:
            ingredient.ai_review_verdict = AiReviewVerdictChoices.CORRECTED
        changed += ["ai_review_notes", "ai_review_verdict"]
    suggestions = dict((ingredient.ai_review_notes or {}).get("suggestions") or {})
    resolved = [field_name for field_name in suggestions if field_name in data]
    if resolved:
        notes = dict(ingredient.ai_review_notes or {})
        notes["suggestions"] = {k: v for k, v in suggestions.items() if k not in resolved}
        ingredient.ai_review_notes = notes
        if "ai_review_notes" not in changed:
            changed.append("ai_review_notes")
    if "price_per_kg" in data:
        price = data["price_per_kg"]
        ingredient.price_per_kg = Decimal(str(price)) if price is not None else None
        changed.append("price_per_kg")
    if not changed:
        return changed
    ingredient.nutri_score, ingredient.nutri_class = calculate_nutri_score(ingredient)
    ingredient.quality_score = calculate_ingredient_quality_score(ingredient)
    ingredient.quality_score_updated_at = timezone.now()
    ingredient.save(update_fields=[*changed, "nutri_score", "nutri_class", "quality_score", "quality_score_updated_at"])
    return changed


def missing_embedding_queryset() -> Any:
    """Ingredients without an up-to-date embedding (never computed)."""
    from supply.models import Ingredient

    return Ingredient.objects.filter(Q(embedding__isnull=True) | Q(embedding_updated_at__isnull=True))
