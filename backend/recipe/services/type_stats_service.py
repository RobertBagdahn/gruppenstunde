"""Service for computing and caching Recipe type statistics for benchmarking."""

from __future__ import annotations

from statistics import median

from django.db.models import Q

from content.choices import ContentStatus


def _create_buckets(values: list[float], num_buckets: int = 12) -> list[dict]:
    """Create histogram buckets from a list of values.

    Args:
        values: List of numeric values to bucket
        num_buckets: Number of buckets (default 12)

    Returns:
        List of bucket dicts with keys: min, max, count
    """
    if not values:
        return []

    min_val = min(values)
    max_val = max(values)

    # Handle case where all values are the same
    if min_val == max_val:
        return [{"min": float(min_val), "max": float(max_val), "count": len(values)}]

    # Create bucket boundaries
    bucket_width = (max_val - min_val) / num_buckets
    buckets = []

    for i in range(num_buckets):
        bucket_min = min_val + (i * bucket_width)
        bucket_max = min_val + ((i + 1) * bucket_width)
        # Last bucket includes the max value
        if i == num_buckets - 1:
            bucket_max = max_val

        # Count values in this bucket
        count = sum(1 for v in values if bucket_min <= v <= bucket_max)

        buckets.append(
            {
                "min": float(bucket_min),
                "max": float(bucket_max),
                "count": count,
            }
        )

    return buckets


def recalculate_type_stats(recipe_type: str) -> dict | None:
    """Aggregate published recipes of the given type and store in RecipeTypeStats.

    Returns the stats dict or None if fewer than 10 recipes.
    """
    from recipe.models import Recipe, RecipeTypeStats

    recipes = Recipe.objects.filter(Q(recipe_type=recipe_type) & Q(status=ContentStatus.APPROVED))
    recipes = recipes.exclude(portions__isnull=True)

    count = recipes.count()
    if count < 10:
        RecipeTypeStats.objects.filter(recipe_type=recipe_type).delete()
        return None

    # Collect per-portion values
    prices = []
    energies = []
    weights = []
    proteins = []
    fats = []
    carbs = []
    nutri_scores = []

    for recipe in recipes.iterator():
        portions = recipe.portions
        if not portions:
            continue

        # Price per portion
        if recipe.cached_price_total is not None:
            price = float(recipe.cached_price_total) / portions
            prices.append(price)

        # Energy per portion
        if recipe.cached_energy_total_kcal is not None:
            energy = recipe.cached_energy_total_kcal / portions
            energies.append(energy)

        # Weight per portion
        if recipe.cached_weight_g is not None and recipe.cached_weight_g > 0:
            weight = recipe.cached_weight_g / portions
            weights.append(weight)

        # Macronutrients per portion (from cached per-100g values)
        total_weight = recipe.cached_weight_g or 0
        if total_weight > 0:
            scale = total_weight / 100.0
            if recipe.cached_protein_g is not None:
                proteins.append(float(recipe.cached_protein_g) * scale / portions)
            if recipe.cached_fat_g is not None:
                fats.append(float(recipe.cached_fat_g) * scale / portions)
            if recipe.cached_carbohydrate_g is not None:
                carbs.append(float(recipe.cached_carbohydrate_g) * scale / portions)

        # Nutri-Score distribution
        if recipe.cached_nutri_class is not None:
            nutri_scores.append(recipe.cached_nutri_class)

    def _agg(values):
        if not values:
            return None, None, None, None
        return min(values), max(values), sum(values) / len(values), median(values)

    price_min, price_max, price_avg, price_median = _agg(prices)
    energy_min, energy_max, energy_avg, energy_median = _agg(energies)
    weight_min, weight_max, weight_avg, weight_median = _agg(weights)

    protein_avg = sum(proteins) / len(proteins) if proteins else None
    fat_avg = sum(fats) / len(fats) if fats else None
    carbs_avg = sum(carbs) / len(carbs) if carbs else None

    # Nutri-Score distribution: 1=A, 2=B, 3=C, 4=D, 5=E
    nutri_score_dist = {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0}
    for ns in nutri_scores:
        label = {1: "A", 2: "B", 3: "C", 4: "D", 5: "E"}.get(ns)
        if label:
            nutri_score_dist[label] += 1

    # Generate histogram buckets
    price_buckets = _create_buckets(prices, num_buckets=12) if prices else []
    energy_buckets = _create_buckets(energies, num_buckets=12) if energies else []
    protein_buckets = _create_buckets(proteins, num_buckets=12) if proteins else []

    stats_data = {
        "recipe_type": recipe_type,
        "count": count,
        "price_min": price_min,
        "price_max": price_max,
        "price_avg": price_avg,
        "price_median": price_median,
        "energy_min": energy_min,
        "energy_max": energy_max,
        "energy_avg": energy_avg,
        "energy_median": energy_median,
        "protein_avg": protein_avg,
        "fat_avg": fat_avg,
        "carbs_avg": carbs_avg,
        "weight_min": weight_min,
        "weight_max": weight_max,
        "weight_avg": weight_avg,
        "weight_median": weight_median,
        "nutri_score_dist": nutri_score_dist,
        "price_buckets": price_buckets,
        "energy_buckets": energy_buckets,
        "protein_buckets": protein_buckets,
    }

    if any(v is not None for v in stats_data.values()):
        RecipeTypeStats.objects.update_or_create(
            recipe_type=recipe_type,
            defaults=stats_data,
        )
    else:
        RecipeTypeStats.objects.filter(recipe_type=recipe_type).delete()
        return None

    return stats_data
