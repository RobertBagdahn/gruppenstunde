"""API endpoint for RecipeTypeStats (category benchmarking)."""

from django.shortcuts import get_object_or_404
from ninja import Router

from recipe.models import RecipeTypeStats
from recipe.schemas import RecipeTypeStatsOut

router = Router()

# ---------------------------------------------------------------------------
# Recipe Type Stats
# ---------------------------------------------------------------------------


@router.get(
    "/type-stats/{recipe_type}/",
    response=RecipeTypeStatsOut,
    url_name="recipe_type_stats",
)
def get_recipe_type_stats(request, recipe_type: str):
    """Get cached category statistics for a recipe type.

    Returns aggregated stats (min, max, avg, median, nutri_score_dist),
    and histogram buckets (price_buckets, energy_buckets, protein_buckets)
    for all published recipes of the given type.
    Returns 404 if fewer than 10 recipes exist for this type.
    """
    stats = get_object_or_404(RecipeTypeStats, recipe_type=recipe_type)
    return stats
