"""Schemas for data quality features."""

from datetime import datetime
from typing import Any, Literal

from ninja import Schema

# ---------------------------------------------------------------------------
# Price Analysis
# ---------------------------------------------------------------------------


class PriceAnomalyOut(Schema):
    id: int
    name: str
    slug: str
    price_per_kg: str | None = None
    retail_section: str | None = None
    z_score: float | None = None
    anomaly_type: str  # "high", "low", "missing", "pending"
    price_source: str = "missing"  # "manual" | "ai_accepted" | "missing"


class PaginatedPriceAnomalyOut(Schema):
    items: list[PriceAnomalyOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class PriceEvaluateRequestIn(Schema):
    ingredient_ids: list[int]


class PriceSuggestionOut(Schema):
    ingredient_id: int
    current_price: str | None = None
    suggested_price: str | None = None
    reasoning: str
    proposal_id: int | None = None
    status: str | None = None
    confidence: float | None = None


class PriceEvaluateResponseOut(Schema):
    suggestions: list[PriceSuggestionOut]
    batch_token: str


class PriceApplyItemIn(Schema):
    ingredient_id: int
    action: str = "accept"  # "accept" | "reject"
    replace: bool = False


class PriceApplyRequestIn(Schema):
    items: list[PriceApplyItemIn]


class PriceApplyResultOut(Schema):
    ingredient_id: int
    proposal_id: int | None = None
    status: str  # "accepted" | "rejected" | "conflict" | "missing_proposal" | "not_found" | "failed"
    message: str = ""


class PriceApplyResponseOut(Schema):
    results: list[PriceApplyResultOut]


# ---------------------------------------------------------------------------
# Duplicate Detection
# ---------------------------------------------------------------------------


class DuplicatePairOut(Schema):
    ingredient_a: dict
    ingredient_b: dict
    similarity: float


class PaginatedDuplicatePairOut(Schema):
    items: list[DuplicatePairOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class MergePreviewOut(Schema):
    source_id: int
    source_name: str
    target_id: int
    target_name: str
    affected_recipe_items: int
    source_aliases: list[str]
    target_aliases: list[str]
    nutrition_comparison: dict


class MergeRequestIn(Schema):
    source_id: int
    target_id: int


class RecipeDismissRequestIn(Schema):
    recipe_a_id: int
    recipe_b_id: int


class RecipeMergePreviewOut(Schema):
    source_id: int
    source_name: str
    target_id: int
    target_name: str
    affected_meal_count: int


class DismissRequestIn(Schema):
    ingredient_a_id: int
    ingredient_b_id: int


# ---------------------------------------------------------------------------
# Completeness & Data Quality
# ---------------------------------------------------------------------------


class CompletenessItemOut(Schema):
    id: int
    name: str
    slug: str
    quality_score: int | None = None
    status: str
    nutrition_score: float
    price_score: float
    physical_score: float
    classification_score: float
    scout_score: float
    portion_score: float
    price_status: str = "missing"  # "priced" | "pending" | "missing"
    price_source: str = "missing"  # "manual" | "ai_accepted" | "missing"


class PaginatedCompletenessOut(Schema):
    items: list[CompletenessItemOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class MissingClassificationOut(Schema):
    id: int
    name: str
    slug: str
    missing_retail_section: bool
    missing_tags: bool


class NutritionPlausibilityOut(Schema):
    id: int
    name: str
    slug: str
    energy_kcal: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    carbohydrate_g: float | None = None
    sugar_g: float | None = None
    fat_sat_g: float | None = None
    macro_sum: float | None = None
    issue: str
    anomaly_type: str | None = None
    severity: str = "error"
    missing_fields: list[str] = []


class PaginatedNutritionPlausibilityOut(Schema):
    items: list[NutritionPlausibilityOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class FilledFieldInfoOut(Schema):
    field: str
    label: str
    value: Any = None


class IngredientFillResultOut(Schema):
    id: int
    name: str
    slug: str
    filled_fields: list[FilledFieldInfoOut]
    quality_score: int | None = None
    message: str | None = None


class AiFillMissingRequestIn(Schema):
    ingredient_ids: list[int]


class AiFillMissingBatchOut(Schema):
    results: list[IngredientFillResultOut]
    total_filled: int


class RecipeMetadataCheckOut(Schema):
    id: int
    title: str
    slug: str
    missing_image: bool
    missing_tags: bool
    missing_summary: bool


class CacheStalenessOut(Schema):
    id: int
    title: str
    slug: str
    cached_at: str | None = None
    stale_since: str | None = None


class PortionPlausibilityOut(Schema):
    id: int
    title: str
    slug: str
    cached_weight_g: float | None = None
    issue: str


class MissingSystemPortionOut(Schema):
    id: int
    name: str
    slug: str
    missing_portions: list[str]


class OutdatedPortionRecipeOut(Schema):
    """A recipe with at least one RecipeItem still pointing at a superseded Portion."""

    id: int
    title: str
    slug: str
    outdated_item_count: int


# ---------------------------------------------------------------------------
# Trend
# ---------------------------------------------------------------------------


class QualityTrendPointOut(Schema):
    date: str
    avg_score: float


class QualityTrendOut(Schema):
    points: list[QualityTrendPointOut]


# ---------------------------------------------------------------------------
# Distribution Charts
# ---------------------------------------------------------------------------


class DistributionBucketOut(Schema):
    min: float
    max: float | None = None
    count: int
    label: str


class DistributionStatsOut(Schema):
    mean: float | None = None
    median: float | None = None
    p5: float | None = None
    p95: float | None = None
    count: int


class CostDistributionOut(Schema):
    buckets: list[DistributionBucketOut]
    stats: DistributionStatsOut


class EnergyDistributionOut(Schema):
    buckets: list[DistributionBucketOut]
    stats: DistributionStatsOut
    top_dense: list[dict]
    bottom_dense: list[dict]


class NutrientScatterItemOut(Schema):
    id: int
    name: str
    energy_kcal: float
    protein_g: float
    fat_g: float
    carbohydrate_g: float
    is_vegan: bool


class NutrientDistributionOut(Schema):
    nutrients: list[dict]
    scatter_data: list[NutrientScatterItemOut]


class NutriScoreClassOut(Schema):
    class_label: str  # A-E
    count: int


class NutriScoreDistributionOut(Schema):
    classes: list[NutriScoreClassOut]


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------


class AuditLogEntryOut(Schema):
    id: int
    field_name: str
    old_value: str | None = None
    new_value: str | None = None
    changed_by_name: str | None = None
    changed_at: datetime


class PaginatedAuditLogOut(Schema):
    items: list[AuditLogEntryOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Impact
# ---------------------------------------------------------------------------


class ImpactOut(Schema):
    recipe_count: int
    meal_plan_count: int


# ---------------------------------------------------------------------------
# Buffet catalog proposals
# ---------------------------------------------------------------------------


class BuffetCandidateOut(Schema):
    candidate_key: str
    action: Literal["add", "untag", "merge_into", "create"]
    item_kind: Literal["ingredient", "recipe"]
    source_id: int | None = None
    source_name: str
    target_id: int | None = None
    target_name: str | None = None
    role_slugs: list[str] = []
    retail_section: str | None = None
    recipe_type: str | None = None
    is_standalone_food: bool | None = None
    similarity: float | None = None
    candidate_status: Literal["available", "stale", "already_tagged", "existing_match"] = "available"
    rationale: str = ""


class PaginatedBuffetCandidateOut(Schema):
    items: list[BuffetCandidateOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class BuffetDataProposalOut(Schema):
    id: int
    action: str
    item_kind: str
    source_id: int | None = None
    source_expected_name: str = ""
    target_id: int | None = None
    target_expected_name: str = ""
    role_slugs: list[str] = []
    proposed_data: dict[str, Any] = {}
    origin: str
    ai_confidence: float | None = None
    rationale: str = ""
    status: str
    created_by_name: str | None = None
    reviewed_by_name: str | None = None
    review_note: str = ""
    preview_current: bool = False
    preview_result: dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime
    reviewed_at: datetime | None = None


class PaginatedBuffetDataProposalOut(Schema):
    items: list[BuffetDataProposalOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class BuffetDataProposalCreateIn(Schema):
    action: Literal["add", "untag", "merge_into", "create"]
    item_kind: Literal["ingredient", "recipe"]
    source_id: int | None = None
    source_expected_name: str = ""
    target_id: int | None = None
    target_expected_name: str = ""
    role_slugs: list[str] = []
    proposed_data: dict[str, Any] = {}
    origin: Literal["manual", "ai", "mixed"] = "manual"
    ai_confidence: float | None = None
    rationale: str = ""


class BuffetDataProposalUpdateIn(Schema):
    source_id: int | None = None
    source_expected_name: str | None = None
    target_id: int | None = None
    target_expected_name: str | None = None
    role_slugs: list[str] | None = None
    proposed_data: dict[str, Any] | None = None
    rationale: str | None = None


class BuffetDataProposalSuggestionIn(Schema):
    item_kind: Literal["ingredient", "recipe"]
    name: str
    recipe_type: str | None = None
    role_slugs: list[str] = []


class BuffetDataProposalSuggestionOut(Schema):
    item_kind: Literal["ingredient", "recipe"]
    name: str
    proposed_data: dict[str, Any]
    ai_confidence: float | None = None
    rationale: str = ""
    ai_interaction_id: str | None = None


class BuffetDataProposalPreviewOut(Schema):
    proposal_id: int
    fingerprint: str
    can_approve: bool
    blockers: list[str] = []
    warnings: list[str] = []
    plan: list[dict[str, Any]] = []
    affected_references: dict[str, int] = {}
    previewed_at: datetime


class BuffetDataProposalReviewIn(Schema):
    decision: Literal["approve", "reject"]
    note: str = ""


class BuffetDataProposalMappingOut(Schema):
    action: str
    item_kind: str
    source_id: int | None = None
    source_name: str = ""
    target_id: int | None = None
    target_name: str = ""
    role_slugs: list[str] = []
    proposed_data: dict[str, Any] = {}


class BuffetDataProposalExportOut(Schema):
    items: list[BuffetDataProposalMappingOut]
    exported_at: datetime


class BuffetDataQualityIssueOut(Schema):
    item_kind: Literal["ingredient", "recipe"]
    id: int
    name: str
    slug: str
    role_slugs: list[str] = []
    legacy_breakfast_tag_slugs: list[str] = []
    status: str
    missing_fields: list[str] = []
    retail_section: str | None = None
    is_standalone_food: bool | None = None


class BuffetDataQualityReportOut(Schema):
    items: list[BuffetDataQualityIssueOut]
    total: int
    page: int
    page_size: int
    total_pages: int
    summary: dict[str, int]
