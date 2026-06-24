"""Ingredient statistics API — public endpoints for statistical exploration."""

import math

from ninja import Router

from supply.models import Ingredient, RetailSection
from supply.schemas.ingredient_statistics import (
    ComparisonGroup,
    ComparisonOut,
    DistributionBucket,
    DistributionOut,
    DistributionStats,
    FieldOutliers,
    OutlierItem,
    OutliersOut,
    RankingItem,
    RankingsOut,
    ScatterOut,
    ScatterPoint,
    ScoreClassData,
    ScoreClassItem,
    ScoresOut,
    TagListItem,
    TagListOut,
)

ingredient_statistics_router = Router(tags=["ingredient-statistics"])

# =============================================================================
# Shared Utilities
# =============================================================================

NUMERIC_FIELDS = [
    "energy_kcal",
    "protein_g",
    "fat_g",
    "fat_sat_g",
    "carbohydrate_g",
    "sugar_g",
    "fibre_g",
    "salt_g",
    "sodium_mg",
    "fructose_g",
    "lactose_g",
    "vitamin_c_mg",
    "child_score",
    "scout_score",
    "environmental_score",
    "nova_score",
    "fruit_factor",
    "nutri_score",
    "price_per_kg",
]

FIELD_LABELS = {
    "energy_kcal": ("Energie", "kcal"),
    "protein_g": ("Protein", "g"),
    "fat_g": ("Fett", "g"),
    "fat_sat_g": ("Gesättigte Fettsäuren", "g"),
    "carbohydrate_g": ("Kohlenhydrate", "g"),
    "sugar_g": ("Zucker", "g"),
    "fibre_g": ("Ballaststoffe", "g"),
    "salt_g": ("Salz", "g"),
    "sodium_mg": ("Natrium", "mg"),
    "fructose_g": ("Fructose", "g"),
    "lactose_g": ("Laktose", "g"),
    "vitamin_c_mg": ("Vitamin C", "mg"),
    "child_score": ("Kinderfreundlichkeit", "pts"),
    "scout_score": ("Pfadfindereignung", "pts"),
    "environmental_score": ("Umweltfreundlichkeit", "pts"),
    "nova_score": ("NOVA", "pts"),
    "fruit_factor": ("Obstanteil", ""),
    "nutri_score": ("Nutri-Score", "pts"),
    "price_per_kg": ("Preis", "€"),
}

NUTRI_CLASS_LABELS = {1: "A", 2: "B", 3: "C", 4: "D", 5: "E"}


def _base_queryset(retail_section_id: str | None = None, tag: str | None = None):
    """Build base QuerySet: verified only, optional retail section and tag filters."""
    qs = Ingredient.objects.filter(status="verified")

    if retail_section_id:
        ids = [int(i) for i in retail_section_id.split(",") if i.strip()]
        if ids:
            qs = qs.filter(retail_section_id__in=ids)

    if tag:
        qs = qs.filter(nutritional_tags__name__iexact=tag).distinct()

    return qs


def _get_field_values(qs, field: str, exclude_zero: bool = True):
    """Return list of (id, name, slug, value) tuples for a given numeric field."""
    qs = qs.exclude(**{f"{field}__isnull": True})
    if exclude_zero:
        qs = qs.exclude(**{field: 0})

    results = []
    for ing in qs:
        value = getattr(ing, field)
        if value is not None:
            value = float(value)
            results.append((ing.id, ing.name, ing.slug, value))

    return results


def _compute_histogram(values: list[float], num_buckets: int = 20):
    """Compute histogram buckets from a list of values."""
    if not values:
        return [], DistributionStats(mean=None, median=None, p5=None, p95=None, count=0)

    n = len(values)
    sorted_vals = sorted(values)
    min_val = sorted_vals[0]
    max_val = sorted_vals[-1]

    if min_val == max_val:
        bucket = DistributionBucket(min=min_val, max=max_val, count=n, percentage=100.0, label=f"{min_val:.1f}")
        stats = DistributionStats(
            mean=round(sum(values) / n, 2),
            median=round(sorted_vals[n // 2], 2),
            p5=round(sorted_vals[int(n * 0.05)], 2),
            p95=round(sorted_vals[int(n * 0.95)], 2),
            count=n,
        )
        return [bucket], stats

    bin_width = (max_val - min_val) / num_buckets
    if bin_width == 0:
        bin_width = 1

    buckets = []
    for i in range(num_buckets):
        lo = min_val + i * bin_width
        hi = min_val + (i + 1) * bin_width if i < num_buckets - 1 else max_val + 0.01
        count = sum(1 for v in sorted_vals if lo <= v < hi)
        buckets.append(
            DistributionBucket(
                min=round(lo, 2),
                max=round(hi, 2),
                count=count,
                percentage=round(count / n * 100, 1) if n > 0 else 0,
                label=f"{lo:.1f}–{hi:.1f}",
            )
        )

    stats = DistributionStats(
        mean=round(sum(values) / n, 2),
        median=round(sorted_vals[n // 2], 2),
        p5=round(sorted_vals[int(n * 0.05)], 2),
        p95=round(sorted_vals[int(n * 0.95)], 2),
        count=n,
    )

    return buckets, stats


def _compute_iqr_outliers(
    values: list[tuple[int, str, str, float]],
) -> list[OutlierItem]:
    """Compute IQR-based outliers. Returns moderate (>1.5×IQR) and extreme (>3×IQR)."""
    if len(values) < 4:
        return []

    sorted_vals = sorted(values, key=lambda x: x[3])
    n = len(sorted_vals)
    flat = [v[3] for v in sorted_vals]

    q1 = flat[int(n * 0.25)]
    q3 = flat[int(n * 0.75)]
    iqr = q3 - q1

    if iqr == 0:
        return []

    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    extreme_lower = q1 - 3 * iqr
    extreme_upper = q3 + 3 * iqr
    median_val = flat[n // 2]

    outliers = []
    for id_val, name, slug, val in sorted_vals:
        if val < extreme_lower or val > extreme_upper:
            deviation = val / median_val if median_val != 0 else 0
            outliers.append(
                OutlierItem(
                    id=id_val,
                    name=name,
                    slug=slug,
                    value=round(val, 2),
                    severity="extreme",
                    deviation=round(deviation, 2),
                )
            )
        elif val < lower or val > upper:
            deviation = val / median_val if median_val != 0 else 0
            outliers.append(
                OutlierItem(
                    id=id_val,
                    name=name,
                    slug=slug,
                    value=round(val, 2),
                    severity="moderate",
                    deviation=round(deviation, 2),
                )
            )

    return outliers


def _compute_pearson_r(x_values: list[float], y_values: list[float]) -> float | None:
    """Compute Pearson correlation coefficient between two lists."""
    n = len(x_values)
    if n < 3:
        return None

    mean_x = sum(x_values) / n
    mean_y = sum(y_values) / n

    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_values, y_values, strict=False))
    std_x = math.sqrt(sum((x - mean_x) ** 2 for x in x_values))
    std_y = math.sqrt(sum((y - mean_y) ** 2 for y in y_values))

    if std_x == 0 or std_y == 0:
        return None

    return round(cov / (std_x * std_y), 4)


def _get_retail_section_name(ing):
    """Get retail section name from an ingredient instance."""
    if ing.retail_section_id:
        try:
            rs = RetailSection.objects.get(id=ing.retail_section_id)
            return rs.name
        except RetailSection.DoesNotExist:
            pass
    return "Ohne Kategorie"


def _make_ranking_item(ing, value: float) -> RankingItem:
    return RankingItem(
        id=ing.id,
        name=ing.name,
        slug=ing.slug,
        value=round(value, 2),
        nutri_class=ing.nutri_class,
        retail_section_name=_get_retail_section_name(ing),
    )


# =============================================================================
# Rankings Endpoint
# =============================================================================


@ingredient_statistics_router.get("/rankings/", response=RankingsOut)
def ingredient_rankings(request, field: str, retail_section_id: str | None = None, tag: str | None = None):
    qs = _base_queryset(retail_section_id=retail_section_id, tag=tag)
    values = _get_field_values(qs, field, exclude_zero=True)

    if not values:
        return RankingsOut(top=[], bottom=[], count=0)

    sorted_desc = sorted(values, key=lambda x: x[3], reverse=True)
    sorted_asc = sorted(values, key=lambda x: x[3])

    top = [_make_ranking_item_from_tuple(v) for v in sorted_desc[:20]]
    bottom_raw = [v for v in sorted_asc[:20] if v[3] > 0]
    bottom = [_make_ranking_item_from_tuple(v) for v in bottom_raw]

    return RankingsOut(top=top, bottom=bottom, count=len(values))


def _make_ranking_item_from_tuple(t: tuple) -> RankingItem:
    return RankingItem(
        id=t[0],
        name=t[1],
        slug=t[2],
        value=round(t[3], 2),
        nutri_class=None,
        retail_section_name=None,
    )


# =============================================================================
# Distributions Endpoint
# =============================================================================


@ingredient_statistics_router.get("/distributions/", response=DistributionOut)
def ingredient_distributions(request, field: str, retail_section_id: str | None = None, tag: str | None = None):
    qs = _base_queryset(retail_section_id=retail_section_id, tag=tag)
    raw = _get_field_values(qs, field, exclude_zero=False)
    values = [v[3] for v in raw if v[3] is not None]

    buckets, stats = _compute_histogram(values)
    return DistributionOut(buckets=buckets, stats=stats)


# =============================================================================
# Scatter Endpoint
# =============================================================================


@ingredient_statistics_router.get("/scatter/", response=ScatterOut)
def ingredient_scatter(
    request,
    x_field: str,
    y_field: str,
    color_by: str | None = None,
    retail_section_id: str | None = None,
):
    qs = _base_queryset(retail_section_id=retail_section_id)
    qs = qs.exclude(**{f"{x_field}__isnull": True}).exclude(**{f"{y_field}__isnull": True})

    points = []
    x_vals = []
    y_vals = []

    for ing in qs:
        x = float(getattr(ing, x_field) or 0)
        y = float(getattr(ing, y_field) or 0)
        points.append(
            ScatterPoint(
                id=ing.id,
                name=ing.name,
                slug=ing.slug,
                x=round(x, 2),
                y=round(y, 2),
                nutri_class=ing.nutri_class,
                retail_section_name=_get_retail_section_name(ing),
            )
        )
        x_vals.append(x)
        y_vals.append(y)

    pearson_r = _compute_pearson_r(x_vals, y_vals)
    return ScatterOut(points=points, pearson_r=pearson_r, count=len(points))


# =============================================================================
# Tag Lists Endpoint
# =============================================================================


@ingredient_statistics_router.get("/tag-lists/", response=TagListOut)
def ingredient_tag_lists(
    request,
    tag: str,
    sort_by: str | None = "name",
    retail_section_id: str | None = None,
):
    total_overall = Ingredient.objects.filter(status="verified").count()

    qs = _base_queryset(retail_section_id=retail_section_id)
    qs = qs.filter(nutritional_tags__name__iexact=tag).distinct()

    sort_field = sort_by if sort_by in NUMERIC_FIELDS else "name"
    if sort_field == "name":
        qs = qs.order_by("name")
    else:
        qs = qs.order_by(f"-{sort_field}")

    items = []
    for ing in qs:
        items.append(
            TagListItem(
                id=ing.id,
                name=ing.name,
                slug=ing.slug,
                energy_kcal=ing.energy_kcal,
                protein_g=ing.protein_g,
                fat_g=ing.fat_g,
                carbohydrate_g=ing.carbohydrate_g,
                sugar_g=ing.sugar_g,
                fibre_g=ing.fibre_g,
                salt_g=ing.salt_g,
                price_per_kg=str(ing.price_per_kg) if ing.price_per_kg else None,
                nutri_class=ing.nutri_class,
                retail_section_name=_get_retail_section_name(ing),
                lactose_g=ing.lactose_g,
            )
        )

    return TagListOut(
        items=items,
        total_count=len(items),
        total_overall=total_overall,
        tag_name=tag,
    )


# =============================================================================
# Scores Endpoint
# =============================================================================


@ingredient_statistics_router.get("/scores/", response=ScoresOut)
def ingredient_scores(request, score_type: str, retail_section_id: str | None = None):
    qs = _base_queryset(retail_section_id=retail_section_id)

    if score_type == "nutri_score":
        field = "nutri_class"
        class_range = range(1, 6)  # 1-5 (A-E)
        class_labels = NUTRI_CLASS_LABELS
    elif score_type == "nova":
        field = "nova_score"
        class_range = range(1, 5)  # 1-4
        class_labels = {i: str(i) for i in range(1, 5)}
    else:
        return ScoresOut(classes=[], total_count=0)

    qs = qs.exclude(**{f"{field}__isnull": True})
    total_count = qs.count()

    classes = []
    for class_val in class_range:
        class_qs = qs.filter(**{field: class_val})
        count = class_qs.count()

        # Top 3 and bottom 3 by energy_kcal for context
        top_qs = class_qs.exclude(energy_kcal__isnull=True).order_by("-energy_kcal")[:3]
        bottom_qs = class_qs.exclude(energy_kcal__isnull=True).order_by("energy_kcal")[:3]

        top = [
            ScoreClassItem(id=ing.id, name=ing.name, slug=ing.slug, value=ing.energy_kcal, nutri_class=ing.nutri_class)
            for ing in top_qs
        ]
        bottom = [
            ScoreClassItem(id=ing.id, name=ing.name, slug=ing.slug, value=ing.energy_kcal, nutri_class=ing.nutri_class)
            for ing in bottom_qs
        ]

        classes.append(
            ScoreClassData(
                class_value=class_val,
                class_label=class_labels.get(class_val, str(class_val)),
                count=count,
                percentage=round(count / total_count * 100, 1) if total_count > 0 else 0,
                top=top,
                bottom=bottom,
            )
        )

    return ScoresOut(classes=classes, total_count=total_count)


# =============================================================================
# Outliers Endpoint
# =============================================================================


@ingredient_statistics_router.get("/outliers/", response=OutliersOut)
def ingredient_outliers(request, field: str | None = None, retail_section_id: str | None = None):
    qs = _base_queryset(retail_section_id=retail_section_id)

    outlier_nutrient_fields = [
        "sugar_g",
        "protein_g",
        "energy_kcal",
        "fat_g",
        "fibre_g",
        "salt_g",
        "price_per_kg",
        "carbohydrate_g",
    ]

    if field:
        outlier_nutrient_fields = [field] if field in outlier_nutrient_fields else outlier_nutrient_fields

    fields_out = []
    summary_parts = []

    for f in outlier_nutrient_fields:
        raw = _get_field_values(qs, f, exclude_zero=True)
        outliers = _compute_iqr_outliers(raw)

        if outliers:
            label, unit = FIELD_LABELS.get(f, (f, ""))
            fields_out.append(
                FieldOutliers(
                    field=f,
                    field_label=label,
                    unit=unit,
                    count=len(outliers),
                    items=outliers,
                )
            )
            summary_parts.append(f"{len(outliers)} bei {label}")

    summary = ", ".join(summary_parts) if summary_parts else "Keine Ausreißer gefunden"

    return OutliersOut(fields=fields_out, summary=summary)


# =============================================================================
# Comparison Endpoint
# =============================================================================


@ingredient_statistics_router.get("/comparison/", response=ComparisonOut)
def ingredient_comparison(
    request,
    group_by: str,
    metric: str,
    retail_section_id: str | None = None,
):
    label, unit = FIELD_LABELS.get(metric, (metric, ""))

    base_qs = _base_queryset(retail_section_id=retail_section_id)
    base_qs = base_qs.exclude(**{f"{metric}__isnull": True})

    group_qs = base_qs.filter(nutritional_tags__name__iexact=group_by).distinct()
    rest_qs = base_qs.exclude(nutritional_tags__name__iexact=group_by).distinct()

    def _make_group(qs, label_text):
        raw = _get_field_values(qs, metric, exclude_zero=False)
        values = [v[3] for v in raw if v[3] is not None]
        buckets, stats = _compute_histogram(values)
        return ComparisonGroup(
            label=label_text,
            count=len(values),
            mean=stats.mean,
            median=stats.median,
            p5=stats.p5,
            p95=stats.p95,
            buckets=buckets,
        )

    group = _make_group(group_qs, group_by)
    rest = _make_group(rest_qs, "Rest")

    mean_diff = None
    if group.mean is not None and rest.mean is not None and rest.mean != 0:
        mean_diff = round((group.mean - rest.mean) / rest.mean * 100, 1)

    return ComparisonOut(
        group=group,
        rest=rest,
        mean_difference_pct=mean_diff,
        metric=metric,
        metric_unit=unit,
        group_label=group_by,
    )
