"""Pydantic schemas for ingredient statistics endpoints."""

from ninja import Schema

# =============================================================================
# Rankings
# =============================================================================


class RankingItem(Schema):
    id: int
    name: str
    slug: str
    value: float
    nutri_class: int | None = None
    retail_section_name: str | None = None


class RankingFilters(Schema):
    field: str  # sugar_g, protein_g, energy_kcal, price_per_kg, fibre_g, etc.
    retail_section_id: str | None = None  # comma-separated IDs
    tag: str | None = None  # tag name, e.g. "vegan"


class RankingsOut(Schema):
    top: list[RankingItem]
    bottom: list[RankingItem]
    count: int


# =============================================================================
# Distributions
# =============================================================================


class DistributionBucket(Schema):
    min: float
    max: float | None = None
    count: int
    percentage: float
    label: str


class DistributionStats(Schema):
    mean: float | None = None
    median: float | None = None
    p5: float | None = None
    p95: float | None = None
    count: int


class DistributionFilters(Schema):
    field: str
    retail_section_id: str | None = None
    tag: str | None = None


class DistributionOut(Schema):
    buckets: list[DistributionBucket]
    stats: DistributionStats


# =============================================================================
# Scatter / Correlations
# =============================================================================


class ScatterPoint(Schema):
    id: int
    name: str
    slug: str
    x: float
    y: float
    nutri_class: int | None = None
    retail_section_name: str | None = None


class ScatterFilters(Schema):
    x_field: str
    y_field: str
    color_by: str | None = None  # "nutri_class" or tag name
    retail_section_id: str | None = None


class ScatterOut(Schema):
    points: list[ScatterPoint]
    pearson_r: float | None = None
    count: int


# =============================================================================
# Tag Lists
# =============================================================================


class TagListItem(Schema):
    id: int
    name: str
    slug: str
    energy_kcal: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    carbohydrate_g: float | None = None
    sugar_g: float | None = None
    fibre_g: float | None = None
    salt_g: float | None = None
    price_per_kg: str | None = None
    nutri_class: int | None = None
    retail_section_name: str | None = None
    lactose_g: float | None = None


class TagListFilters(Schema):
    tag: str  # tag name, e.g. "gluten"
    sort_by: str | None = "name"  # name, protein_g, energy_kcal, price_per_kg
    retail_section_id: str | None = None


class TagListOut(Schema):
    items: list[TagListItem]
    total_count: int  # count of matching items
    total_overall: int  # total verified ingredients for context "X von Y"
    tag_name: str


# =============================================================================
# Scores
# =============================================================================


class ScoreClassItem(Schema):
    id: int
    name: str
    slug: str
    value: float | None = None
    nutri_class: int | None = None


class ScoreClassData(Schema):
    class_value: int  # 1-5 for nutri_class, 1-4 for nova_score
    class_label: str  # "A" for nutri, "1" for nova
    count: int
    percentage: float
    top: list[ScoreClassItem]
    bottom: list[ScoreClassItem]


class ScoreFilters(Schema):
    score_type: str  # "nutri_score" or "nova"
    retail_section_id: str | None = None


class ScoresOut(Schema):
    classes: list[ScoreClassData]
    total_count: int


# =============================================================================
# Outliers
# =============================================================================


class OutlierItem(Schema):
    id: int
    name: str
    slug: str
    value: float
    severity: str  # "moderate" or "extreme"
    deviation: float  # value / median


class FieldOutliers(Schema):
    field: str
    field_label: str
    unit: str
    count: int
    items: list[OutlierItem]


class OutlierFilters(Schema):
    field: str | None = None  # specific field or all
    retail_section_id: str | None = None


class OutliersOut(Schema):
    fields: list[FieldOutliers]
    summary: str  # e.g. "5 Ausreißer bei Zucker, 3 bei Protein, ..."


# =============================================================================
# Comparison
# =============================================================================


class ComparisonGroup(Schema):
    label: str
    count: int
    mean: float | None = None
    median: float | None = None
    p5: float | None = None
    p95: float | None = None
    buckets: list[DistributionBucket]


class ComparisonFilters(Schema):
    group_by: str  # tag name, e.g. "vegan"
    metric: str  # e.g. "protein_g"
    retail_section_id: str | None = None


class ComparisonOut(Schema):
    group: ComparisonGroup
    rest: ComparisonGroup
    mean_difference_pct: float | None = None  # how much higher/lower the group mean is vs rest
    metric: str
    metric_unit: str
    group_label: str
