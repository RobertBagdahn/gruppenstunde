"""Data offensive cockpit API (staff only).

Long-running work is chunked: every POST processes one bounded chunk and
returns ``remaining`` so the frontend can loop with a progress bar. This keeps
requests short on Cloud Run (CPU is throttled outside requests) and works
across instances without a job store.
"""

from __future__ import annotations

import math
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from typing import Any, cast

from django.db import connection
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from content.choices import ContentStatus
from core.permissions import require_staff
from core.services.gemini import GeminiInvalidResponseError, GeminiUpstreamRateLimitError
from supply.models import Ingredient, IngredientPackageSuggestion, RetailSection
from supply.schemas.data_offensive import (
    AiReviewRunIn,
    AiReviewRunOut,
    ApplySuggestionsIn,
    BulkActionOut,
    DuplicateGroupOut,
    DuplicateMemberOut,
    EmbeddingRunIn,
    IdsIn,
    JunkRecipeOut,
    MergeGroupIn,
    OffensiveIngredientOut,
    OffensiveIngredientPatchIn,
    OffensiveSummaryOut,
    PackageSuggestionDecisionIn,
    PackageSuggestionOut,
    PackageSuggestionPatchIn,
    PackageSuggestionStatus,
    PackageSuggestRunIn,
    PackageSuggestRunOut,
    PaginatedDuplicateGroupOut,
    PaginatedOffensiveIngredientOut,
    PaginatedPackageSuggestionOut,
    PhysicalViscosity,
    RetailSectionOptionOut,
)
from supply.services import data_offensive as offensive
from supply.services.nutrition_plausibility import ISSUE_LABELS as NUTRITION_ISSUE_LABELS

data_offensive_router = Router(tags=["Data Offensive"])

MAX_PAGE_SIZE = 100
AI_REVIEW_WORKERS = 3


def _duplicate_names(rows: list[offensive.IngredientSnapshotRow]) -> dict[int, str]:
    ids = {(row.ai_review_notes or {}).get("duplicate_of_id") for row in rows} - {None}
    return dict(Ingredient.objects.filter(id__in=ids).values_list("id", "name")) if ids else {}


def _row_out(
    row: offensive.IngredientSnapshotRow, duplicate_names: dict[int, str] | None = None
) -> OffensiveIngredientOut:
    notes = row.ai_review_notes or {}
    duplicate_of_id = notes.get("duplicate_of_id") if row.ai_review_verdict == "duplicate" else None
    duplicate_of_name = (duplicate_names or {}).get(duplicate_of_id) if duplicate_of_id else None
    suggestions = {k: float(v) for k, v in (notes.get("suggestions") or {}).items() if isinstance(v, int | float)}
    return OffensiveIngredientOut(
        id=row.id,
        name=row.name,
        slug=row.slug,
        status=row.status,
        usage_count=row.usage_count,
        retail_section_id=row.retail_section_id,
        retail_section_name=row.retail_section_name,
        retail_section_source=row.retail_section_source,
        price_per_kg=row.price_per_kg,
        quality_score=row.quality_score,
        **{field: row.nutrition.get(field) for field in offensive.CORE_NUTRITION_FIELDS},
        fat_sat_g=row.nutrition.get("fat_sat_g"),
        sugar_g=row.nutrition.get("sugar_g"),
        fibre_g=row.nutrition.get("fibre_g"),
        salt_g=row.nutrition.get("salt_g"),
        issues=row.issues,
        nutrition_issues=row.nutrition_issue_codes,
        ai_review_verdict=row.ai_review_verdict,
        ai_reviewed_at=row.ai_reviewed_at,
        ai_reason=notes.get("reason"),
        ai_confidence=notes.get("confidence"),
        suggested_name=notes.get("suggested_name"),
        duplicate_of_id=duplicate_of_id if duplicate_of_name else None,
        duplicate_of_name=duplicate_of_name,
        suggestions=suggestions,
        can_edit=True,
        can_delete=True,
    )


class OffensiveIngredientFilters(Schema):
    issue: str | None = None
    nutrition_issue: str | None = None
    section_id: int | None = None
    verdict: str | None = None
    status: str | None = None
    search: str | None = None
    used_only: bool = False
    page: int = 1
    page_size: int = 50


@data_offensive_router.get("/summary/", response=OffensiveSummaryOut)
def summary(request):
    require_staff(request)
    from recipe.services.recipe_data_offensive import junk_recipes
    from supply.services.ingredient_merge import exact_duplicate_groups, near_duplicate_groups

    data = offensive.summarize(offensive.build_snapshot())
    return OffensiveSummaryOut(
        total=data["total"],
        issue_counts=data["issue_counts"],
        nutrition_issue_counts=data["nutrition_issue_counts"],
        status_counts=data["status_counts"],
        verdict_counts=data["verdict_counts"],
        needs_review=data["needs_review"],
        publishable=data["publishable"],
        estimated_review_cost_eur=data["estimated_review_cost_eur"],
        embeddings_missing=offensive.missing_embedding_queryset().count(),
        exact_duplicate_groups=len(exact_duplicate_groups()),
        near_duplicate_groups=len(near_duplicate_groups()),
        junk_recipes=len(junk_recipes()),
        issue_labels=offensive.ISSUE_LABELS,
        nutrition_issue_labels=NUTRITION_ISSUE_LABELS,
    )


@data_offensive_router.get("/ingredients/", response=PaginatedOffensiveIngredientOut)
def ingredient_list(request, filters: Query[OffensiveIngredientFilters]):
    require_staff(request)
    rows = offensive.filter_rows(
        offensive.build_snapshot(),
        issue=filters.issue,
        nutrition_issue=filters.nutrition_issue,
        section_id=filters.section_id,
        verdict=filters.verdict,
        status=filters.status,
        search=filters.search,
        used_only=filters.used_only,
    )
    page_size = max(1, min(filters.page_size, MAX_PAGE_SIZE))
    total = len(rows)
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(filters.page, total_pages))
    start = (page - 1) * page_size
    page_rows = rows[start : start + page_size]
    duplicate_names = _duplicate_names(page_rows)
    return PaginatedOffensiveIngredientOut(
        items=[_row_out(row, duplicate_names) for row in page_rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@data_offensive_router.get("/ingredients/ids/", response=list[int])
def ingredient_ids(request, filters: Query[OffensiveIngredientFilters]):
    """All ids matching the filters — for "select all N matches" bulk actions."""
    require_staff(request)
    rows = offensive.filter_rows(
        offensive.build_snapshot(),
        issue=filters.issue,
        nutrition_issue=filters.nutrition_issue,
        section_id=filters.section_id,
        verdict=filters.verdict,
        status=filters.status,
        search=filters.search,
        used_only=filters.used_only,
    )
    return [row.id for row in rows]


@data_offensive_router.patch("/ingredients/{ingredient_id}/", response=OffensiveIngredientOut)
def ingredient_patch(request, ingredient_id: int, payload: OffensiveIngredientPatchIn):
    require_staff(request)
    ingredient = get_object_or_404(Ingredient, id=ingredient_id)
    data = payload.dict(exclude_unset=True)
    if "name" in data and not (data["name"] or "").strip():
        raise HttpError(400, "Name darf nicht leer sein")
    if data.get("retail_section_id") and not RetailSection.objects.filter(id=data["retail_section_id"]).exists():
        raise HttpError(400, "Warengruppe existiert nicht")
    offensive.update_ingredient_fields(ingredient, data)
    row = offensive.build_snapshot(Ingredient.objects.filter(id=ingredient.id))[0]
    return _row_out(row, _duplicate_names([row]))


def _review_batch(ids: list[int], user: Any) -> tuple[list[Any], str | None]:
    from supply.services.ingredient_ai_review_service import review_ingredients

    try:
        ingredients = list(Ingredient.objects.filter(id__in=ids).select_related("retail_section"))
        return review_ingredients(ingredients, user=user), None
    except (GeminiUpstreamRateLimitError, GeminiInvalidResponseError) as exc:
        return [], str(exc.message if hasattr(exc, "message") else exc)
    finally:
        connection.close()


@data_offensive_router.post("/ai-review/", response=AiReviewRunOut)
def ai_review(request, payload: AiReviewRunIn):
    """Review the next chunk of the AI queue (or the given ids)."""
    require_staff(request)
    from supply.services.ingredient_ai_review_service import MAX_BATCH_SIZE

    ids = offensive.review_queue_ids(limit=payload.limit, ids=payload.ids or None, force=payload.force)
    batches = [ids[i : i + MAX_BATCH_SIZE] for i in range(0, len(ids), MAX_BATCH_SIZE)]
    verdicts: Counter[str] = Counter()
    changed_fields: Counter[str] = Counter()
    errors: list[str] = []
    reviewed = 0
    with ThreadPoolExecutor(max_workers=AI_REVIEW_WORKERS) as pool:
        for outcomes, error in pool.map(lambda batch: _review_batch(batch, request.user), batches):
            if error:
                errors.append(error)
            for outcome in outcomes:
                reviewed += 1
                verdicts[outcome.verdict] += 1
                changed_fields.update(outcome.applied.keys())

    remaining = 0 if payload.ids else len(offensive.review_queue_ids(limit=100000))
    return AiReviewRunOut(
        reviewed=reviewed,
        remaining=remaining,
        verdicts=dict(verdicts),
        changed_fields=dict(changed_fields),
        errors=errors,
    )


@data_offensive_router.post("/auto-resolve/", response=BulkActionOut)
def auto_resolve(request):
    """Decide pending AI suggestions, renames, duplicates and junk by conservative rules."""
    require_staff(request)
    from supply.services.data_offensive_auto import auto_resolve as run_auto_resolve

    report = run_auto_resolve(apply=True, user=request.user)
    changed = report.suggestions_applied + report.renamed + report.merged + report.variants_merged + report.junk_deleted
    left = report.suggestions_kept + report.duplicates_left
    return BulkActionOut(
        changed=changed,
        skipped=report.renames_dismissed,
        remaining=left,
        messages=[
            f"{report.suggestions_applied} Wertvorschläge übernommen",
            f"{report.renamed} umbenannt, {report.renames_dismissed} Umbenennungen verworfen",
            f"{report.merged + report.variants_merged} Duplikate zusammengeführt",
            f"{report.junk_deleted} Testdaten gelöscht",
            f"{left} Fälle bleiben zur manuellen Prüfung",
        ],
    )


@data_offensive_router.post("/repair-nutrition/", response=BulkActionOut)
def repair_nutrition(request, payload: IdsIn):
    require_staff(request)
    from supply.services.nutrition_repair import repair_nutrition as run_repair

    report = run_repair(apply=True, ingredient_ids=payload.ids or None)
    return BulkActionOut(
        changed=report.repaired,
        skipped=report.checked - report.repaired,
        remaining=len(report.needs_ai),
        messages=[f"{field}: {count}" for field, count in report.field_changes.most_common()],
    )


@data_offensive_router.post("/reclassify-sections/", response=BulkActionOut)
def reclassify_sections(request, payload: IdsIn):
    require_staff(request)
    from supply.services.retail_section_reclassify import reclassify_retail_sections

    report = reclassify_retail_sections(apply=True, ingredient_ids=payload.ids or None)
    return BulkActionOut(
        changed=report.changed,
        skipped=report.unchanged + report.skipped_manual,
        remaining=report.unclassified,
        messages=[f"{source} → {target}: {count}" for (source, target), count in report.transitions.most_common(10)],
    )


@data_offensive_router.post("/embeddings/", response=BulkActionOut)
def embeddings(request, payload: EmbeddingRunIn):
    require_staff(request)
    from supply.services.ingredient_embeddings import backfill_embeddings, stale_or_missing_ids

    ids = stale_or_missing_ids(limit=payload.limit)
    result = backfill_embeddings(ids=ids, workers=6)
    remaining = offensive.missing_embedding_queryset().count()
    return BulkActionOut(changed=result.updated, skipped=result.failed, remaining=remaining)


@data_offensive_router.post("/apply-suggestions/", response=BulkActionOut)
def apply_suggestions(request, payload: ApplySuggestionsIn):
    require_staff(request)
    result = offensive.apply_ai_suggestions(ids=payload.ids, fields=set(payload.fields))
    return BulkActionOut(changed=result.changed, skipped=result.skipped, messages=result.messages)


@data_offensive_router.post("/soft-delete/", response=BulkActionOut)
def soft_delete(request, payload: IdsIn):
    require_staff(request)
    if not payload.ids:
        raise HttpError(400, "Keine Zutaten ausgewählt")
    result = offensive.soft_delete_ingredients(ids=payload.ids)
    return BulkActionOut(changed=result.changed, skipped=result.skipped, messages=result.messages)


@data_offensive_router.post("/publish/", response=BulkActionOut)
def publish(request, payload: IdsIn):
    require_staff(request)
    result = offensive.publish_ingredients(ids=payload.ids or None, apply=True)
    return BulkActionOut(changed=result.changed, skipped=result.skipped)


@data_offensive_router.post("/merge-exact-duplicates/", response=BulkActionOut)
def merge_exact(request):
    require_staff(request)
    from supply.services.ingredient_merge import merge_exact_duplicates

    merged, messages = merge_exact_duplicates(apply=True, user=request.user)
    return BulkActionOut(changed=merged, skipped=0, messages=messages[:20])


@data_offensive_router.get("/duplicate-groups/", response=PaginatedDuplicateGroupOut)
def duplicate_groups(request, page: int = 1, page_size: int = 20):
    require_staff(request)
    from supply.services.ingredient_merge import near_duplicate_groups, similarity_key

    groups = near_duplicate_groups()
    page_size = max(1, min(page_size, MAX_PAGE_SIZE))
    total = len(groups)
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(page, total_pages))
    start = (page - 1) * page_size
    return PaginatedDuplicateGroupOut(
        items=[
            DuplicateGroupOut(
                key=similarity_key(group[0].name),
                items=[
                    DuplicateMemberOut(
                        id=i.id, name=i.name, slug=i.slug, status=i.status, usage_count=i.usage_count or 0
                    )
                    for i in group
                ],
            )
            for group in groups[start : start + page_size]
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@data_offensive_router.post("/merge-group/", response=BulkActionOut)
def merge_group(request, payload: MergeGroupIn):
    require_staff(request)
    from supply.services.ingredient_merge import IngredientMergeError, merge_ingredient

    target = get_object_or_404(Ingredient, id=payload.target_id)
    result = BulkActionOut(changed=0, skipped=0)
    for source in Ingredient.objects.filter(id__in=payload.source_ids).exclude(id=target.id):
        try:
            merge_ingredient(source, target, user=request.user)
            result.changed += 1
        except IngredientMergeError as exc:
            result.skipped += 1
            result.messages.append(f"{source.name}: {exc}")
    return result


@data_offensive_router.get("/retail-sections/", response=list[RetailSectionOptionOut])
def retail_sections(request):
    require_staff(request)
    sections = RetailSection.objects.annotate(
        ingredient_count=Count("ingredients", filter=Q(ingredients__deleted_at__isnull=True))
    ).order_by("rank", "name")
    return [
        RetailSectionOptionOut(id=s.id, name=s.name, rank=s.rank, ingredient_count=s.ingredient_count) for s in sections
    ]


@data_offensive_router.get("/recipes/junk/", response=list[JunkRecipeOut])
def recipe_junk(request):
    require_staff(request)
    from recipe.services.recipe_data_offensive import junk_recipes

    return [
        JunkRecipeOut(
            id=recipe.id,
            title=recipe.title,
            slug=recipe.slug,
            status=recipe.status,
            recipe_type=recipe.recipe_type,
            reason=reason,
        )
        for recipe, reason in junk_recipes()
    ]


@data_offensive_router.post("/recipes/archive/", response=BulkActionOut)
def recipe_archive(request, payload: IdsIn):
    require_staff(request)
    from recipe.services.recipe_data_offensive import archive_junk_recipes

    result = archive_junk_recipes(ids=payload.ids or None, apply=True)
    return BulkActionOut(changed=result.changed, skipped=result.skipped, messages=result.messages[:30])


@data_offensive_router.post("/recipes/recategorize/", response=BulkActionOut)
def recipe_recategorize(request, payload: IdsIn):
    require_staff(request)
    from recipe.models import Recipe
    from recipe.services.recipe_data_offensive import recategorize_recipes

    active = Recipe.objects.exclude(status=ContentStatus.ARCHIVED).count()
    result = recategorize_recipes(ids=payload.ids or None, apply=True, user=request.user, bypass_limits=False)
    return BulkActionOut(changed=result.changed, skipped=active - result.changed, messages=result.messages[:50])


# ---------------------------------------------------------------------------
# Package suggestions (AI) — suggest in chunks, then accept/reject in the cockpit
# ---------------------------------------------------------------------------

DEFAULT_PACKAGE_PAGE_SIZE = 50


class PackageSuggestionFilters(Schema):
    status: str = IngredientPackageSuggestion.Status.PENDING
    min_confidence: float | None = None
    section_id: int | None = None
    search: str | None = None
    page: int = 1
    page_size: int = DEFAULT_PACKAGE_PAGE_SIZE


def _package_suggestions_qs(
    *, status: str | None, min_confidence: float | None, section_id: int | None, search: str | None = None
):
    queryset = IngredientPackageSuggestion.objects.select_related("ingredient", "ingredient__retail_section")
    if status:
        queryset = queryset.filter(status=status)
    if min_confidence is not None:
        queryset = queryset.filter(confidence__gte=min_confidence)
    if section_id is not None:
        queryset = queryset.filter(ingredient__retail_section_id=section_id)
    if search and search.strip():
        queryset = queryset.filter(ingredient__name__icontains=search.strip())
    return queryset


def _package_suggestion_out(suggestion: IngredientPackageSuggestion) -> PackageSuggestionOut:
    from supply.choices import PhysicalPropertiesSourceChoices

    ingredient = suggestion.ingredient
    section = ingredient.retail_section
    return PackageSuggestionOut(
        id=suggestion.pk,
        ingredient_id=ingredient.pk,
        ingredient_name=ingredient.name,
        ingredient_slug=ingredient.slug,
        retail_section_id=section.pk if section else None,
        retail_section_name=section.name if section else None,
        package_name=suggestion.package_name,
        weight_g=suggestion.weight_g,
        volume_ml=suggestion.volume_ml,
        # Model choices guarantee the literal values.
        physical_viscosity=cast(PhysicalViscosity, suggestion.physical_viscosity),
        physical_density=suggestion.physical_density,
        confidence=suggestion.confidence,
        reason=suggestion.reason,
        status=cast(PackageSuggestionStatus, suggestion.status),
        viscosity_is_manual=ingredient.viscosity_source == PhysicalPropertiesSourceChoices.MANUAL,
        created_at=suggestion.created_at,
        can_edit=suggestion.status == IngredientPackageSuggestion.Status.PENDING,
    )


@data_offensive_router.post("/packages/suggest/", response=PackageSuggestRunOut)
def package_suggest(request, payload: PackageSuggestRunIn):
    """Run one chunk of AI package suggestions; ``dry_run`` returns only the cost estimate."""
    require_staff(request)
    from supply.services import package_suggestions as packages

    candidates = packages.candidate_queryset()
    total = candidates.count()
    calls, cost = packages.estimate(total)
    if payload.dry_run:
        return PackageSuggestRunOut(
            dry_run=True, candidates=total, estimated_calls=calls, estimated_cost_eur=cost, remaining=total
        )
    ids = list(candidates.values_list("id", flat=True)[: payload.limit])
    result = packages.suggest_packages(ingredient_ids=ids, user=request.user)
    return PackageSuggestRunOut(
        dry_run=False,
        candidates=total,
        estimated_calls=calls,
        estimated_cost_eur=cost,
        suggested=result.suggested,
        skipped=result.skipped,
        calls=result.calls,
        remaining=packages.candidate_queryset().count(),
        errors=result.errors,
    )


@data_offensive_router.get("/packages/", response=PaginatedPackageSuggestionOut)
def package_suggestion_list(request, filters: Query[PackageSuggestionFilters]):
    require_staff(request)
    queryset = _package_suggestions_qs(
        status=filters.status or None,
        min_confidence=filters.min_confidence,
        section_id=filters.section_id,
        search=filters.search,
    )
    page_size = max(1, min(filters.page_size, MAX_PAGE_SIZE))
    total = queryset.count()
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(filters.page, total_pages))
    start = (page - 1) * page_size
    return PaginatedPackageSuggestionOut(
        items=[_package_suggestion_out(s) for s in queryset[start : start + page_size]],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@data_offensive_router.patch("/packages/{int:suggestion_id}/", response=PackageSuggestionOut)
def package_suggestion_patch(request, suggestion_id: int, payload: PackageSuggestionPatchIn):
    require_staff(request)
    suggestion = get_object_or_404(
        IngredientPackageSuggestion.objects.select_related("ingredient", "ingredient__retail_section"),
        id=suggestion_id,
    )
    if suggestion.status != IngredientPackageSuggestion.Status.PENDING:
        raise HttpError(400, "Nur offene Vorschläge können bearbeitet werden")
    data = payload.dict(exclude_unset=True)
    if "package_name" in data and not (data["package_name"] or "").strip():
        raise HttpError(400, "Packungsname darf nicht leer sein")
    for field_name, value in data.items():
        if value is None and field_name in {"package_name", "weight_g", "physical_viscosity"}:
            continue
        setattr(suggestion, field_name, value.strip() if isinstance(value, str) else value)
    suggestion.save()
    return _package_suggestion_out(suggestion)


def _decision_queryset(payload: PackageSuggestionDecisionIn):
    if not payload.ids and payload.min_confidence is None:
        raise HttpError(400, "Keine Vorschläge ausgewählt")
    queryset = _package_suggestions_qs(
        status=IngredientPackageSuggestion.Status.PENDING,
        min_confidence=payload.min_confidence,
        section_id=payload.section_id,
    )
    return queryset.filter(id__in=payload.ids) if payload.ids else queryset


@data_offensive_router.post("/packages/accept/", response=BulkActionOut)
def package_suggestion_accept(request, payload: PackageSuggestionDecisionIn):
    """Accept the given suggestions, or all pending ones with ``confidence >= min_confidence``."""
    require_staff(request)
    from supply.services.package_suggestions import accept_suggestions

    result = accept_suggestions(_decision_queryset(payload), user=request.user)
    return BulkActionOut(changed=result.changed, skipped=result.skipped, messages=result.messages[:30])


@data_offensive_router.post("/packages/reject/", response=BulkActionOut)
def package_suggestion_reject(request, payload: PackageSuggestionDecisionIn):
    require_staff(request)
    from supply.services.package_suggestions import reject_suggestions

    result = reject_suggestions(_decision_queryset(payload), user=request.user)
    return BulkActionOut(changed=result.changed, skipped=result.skipped)
