"""Schemas for data quality features."""

from datetime import datetime

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
    anomaly_type: str  # "high", "low", "missing"


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


class PriceEvaluateResponseOut(Schema):
    suggestions: list[PriceSuggestionOut]
    batch_token: str


class PriceApplyItemIn(Schema):
    ingredient_id: int
    price_per_kg: str


class PriceApplyRequestIn(Schema):
    items: list[PriceApplyItemIn]


class PriceApplyResponseOut(Schema):
    updated_ids: list[int]


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
    energy_kcal: float
    protein_g: float
    fat_g: float
    carbohydrate_g: float
    macro_sum: float
    issue: str


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
