"""Schemas for the data offensive cockpit.

MUST stay in sync with frontend-food/src/schemas/dataOffensive.ts.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from ninja import Schema
from pydantic import Field


class OffensiveSummaryOut(Schema):
    total: int
    issue_counts: dict[str, int]
    nutrition_issue_counts: dict[str, int]
    status_counts: dict[str, int]
    verdict_counts: dict[str, int]
    needs_review: int
    publishable: int
    estimated_review_cost_eur: float
    embeddings_missing: int
    exact_duplicate_groups: int
    near_duplicate_groups: int
    junk_recipes: int
    issue_labels: dict[str, str]
    nutrition_issue_labels: dict[str, str]


class OffensiveIngredientOut(Schema):
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
    energy_kcal: float | None
    protein_g: float | None
    fat_g: float | None
    fat_sat_g: float | None
    carbohydrate_g: float | None
    sugar_g: float | None
    fibre_g: float | None
    salt_g: float | None
    issues: list[str]
    nutrition_issues: list[str]
    ai_review_verdict: str
    ai_reviewed_at: datetime | None
    ai_reason: str | None
    ai_confidence: float | None
    suggested_name: str | None
    duplicate_of_id: int | None
    duplicate_of_name: str | None
    suggestions: dict[str, float]
    can_edit: bool
    can_delete: bool


class PaginatedOffensiveIngredientOut(Schema):
    items: list[OffensiveIngredientOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class IdsIn(Schema):
    ids: list[int] = Field(default_factory=list, description="Leer = alle passenden Zutaten")


class AiReviewRunIn(Schema):
    ids: list[int] = Field(default_factory=list)
    limit: int = Field(default=45, ge=1, le=90)
    force: bool = False


class AiReviewRunOut(Schema):
    reviewed: int
    remaining: int
    verdicts: dict[str, int]
    changed_fields: dict[str, int]
    errors: list[str]


class BulkActionOut(Schema):
    changed: int
    skipped: int
    remaining: int = 0
    messages: list[str] = Field(default_factory=list)


class EmbeddingRunIn(Schema):
    limit: int = Field(default=60, ge=1, le=200)


class ApplySuggestionsIn(Schema):
    ids: list[int]
    fields: list[Literal["name", "nutrition", "price"]]


class OffensiveIngredientPatchIn(Schema):
    name: str | None = None
    retail_section_id: int | None = None
    energy_kcal: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    fat_sat_g: float | None = None
    carbohydrate_g: float | None = None
    sugar_g: float | None = None
    fibre_g: float | None = None
    salt_g: float | None = None
    price_per_kg: float | None = None


class DuplicateMemberOut(Schema):
    id: int
    name: str
    slug: str
    status: str
    usage_count: int


class DuplicateGroupOut(Schema):
    key: str
    items: list[DuplicateMemberOut]


class PaginatedDuplicateGroupOut(Schema):
    items: list[DuplicateGroupOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class MergeGroupIn(Schema):
    target_id: int
    source_ids: list[int]


class RetailSectionOptionOut(Schema):
    id: int
    name: str
    rank: int
    ingredient_count: int


class JunkRecipeOut(Schema):
    id: int
    title: str
    slug: str
    status: str
    recipe_type: str
    reason: str


# ---------------------------------------------------------------------------
# Package suggestions
# ---------------------------------------------------------------------------

PackageSuggestionStatus = Literal["pending", "accepted", "rejected"]
PhysicalViscosity = Literal["solid", "liquid", "beverage"]


class PackageSuggestRunIn(Schema):
    """One chunk of the AI run. ``dry_run`` only returns the cost estimate."""

    limit: int = Field(default=45, ge=1, le=150)
    dry_run: bool = False


class PackageSuggestRunOut(Schema):
    dry_run: bool
    candidates: int
    estimated_calls: int
    estimated_cost_eur: float
    suggested: int = 0
    skipped: int = 0
    calls: int = 0
    remaining: int
    errors: list[str] = []


class PackageSuggestionOut(Schema):
    id: int
    ingredient_id: int
    ingredient_name: str
    ingredient_slug: str
    retail_section_id: int | None = None
    retail_section_name: str | None = None
    package_name: str
    weight_g: float
    volume_ml: float | None = None
    physical_viscosity: PhysicalViscosity
    physical_density: float | None = None
    confidence: float
    reason: str
    status: PackageSuggestionStatus
    viscosity_is_manual: bool
    created_at: datetime
    can_edit: bool = True
    can_delete: bool = False


class PaginatedPackageSuggestionOut(Schema):
    items: list[PackageSuggestionOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class PackageSuggestionPatchIn(Schema):
    package_name: str | None = Field(default=None, min_length=1, max_length=255)
    weight_g: float | None = Field(default=None, gt=0, le=50_000)
    volume_ml: float | None = Field(default=None, gt=0)
    physical_viscosity: PhysicalViscosity | None = None
    physical_density: float | None = Field(default=None, ge=0.3, le=2.5)


class PackageSuggestionDecisionIn(Schema):
    """Decide the given ids, or (bulk) every pending suggestion matching the filters."""

    ids: list[int] = []
    min_confidence: float | None = Field(default=None, ge=0, le=1)
    section_id: int | None = None
