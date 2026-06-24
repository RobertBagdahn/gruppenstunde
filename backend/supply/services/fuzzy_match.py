"""Fuzzy matching service for ingredients using pg_trgm similarity."""

from django.contrib.postgres.search import TrigramSimilarity

from supply.models import Ingredient, IngredientAlias


def suggest_ingredients(query: str, limit: int = 5, threshold: float = 0.3) -> list[dict]:
    """Find ingredients similar to the query string.

    Uses pg_trgm trigram similarity on both Ingredient.name and IngredientAlias.name.
    Returns top matches above the threshold, ordered by similarity score.
    """
    if not query or len(query) < 2:
        return []

    # Search in ingredient names
    ingredient_matches = (
        Ingredient.objects.annotate(
            similarity=TrigramSimilarity("name", query),
        )
        .filter(similarity__gt=threshold)
        .values("id", "name", "slug", "similarity")
        .order_by("-similarity")[:limit]
    )

    # Search in aliases
    alias_matches = (
        IngredientAlias.objects.annotate(
            similarity=TrigramSimilarity("name", query),
        )
        .filter(similarity__gt=threshold)
        .select_related("ingredient")
        .values(
            "ingredient__id",
            "ingredient__name",
            "ingredient__slug",
            "name",
            "similarity",
        )
        .order_by("-similarity")[:limit]
    )

    # Merge results, deduplicate by ingredient id
    seen_ids: set[int] = set()
    results: list[dict] = []

    # Combine and sort by similarity
    all_matches: list[dict] = []

    for m in ingredient_matches:
        all_matches.append(
            {
                "id": m["id"],
                "name": m["name"],
                "slug": m["slug"],
                "similarity": float(m["similarity"]),
                "matched_via": None,
            }
        )

    for m in alias_matches:
        all_matches.append(
            {
                "id": m["ingredient__id"],
                "name": m["ingredient__name"],
                "slug": m["ingredient__slug"],
                "similarity": float(m["similarity"]),
                "matched_via": m["name"],
            }
        )

    all_matches.sort(key=lambda x: x["similarity"], reverse=True)

    for match in all_matches:
        if match["id"] not in seen_ids:
            seen_ids.add(match["id"])
            results.append(match)
            if len(results) >= limit:
                break

    return results
