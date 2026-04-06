"""
Unified search service that searches across Ideas, Recipes, Tags, and Events.
"""

import logging
import math

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector, TrigramSimilarity
from django.db.models import Q, Value, CharField
from django.db.models.functions import Greatest

logger = logging.getLogger(__name__)


def unified_search(
    q: str = "",
    result_types: list[str] | None = None,
    page: int = 1,
    page_size: int = 20,
    sort: str = "relevant",
) -> tuple[list[dict], int]:
    """
    Search across Ideas, Recipes, Tags, and Events.

    Args:
        q: Search query text.
        result_types: Filter by type(s). Options: 'idea', 'recipe', 'tag', 'event'.
                      None or empty means search all types.
        page: Page number (1-indexed).
        page_size: Items per page.
        sort: Sort order ('relevant', 'newest').

    Returns:
        (items, total_count) where items are dicts with result_type field.
    """
    allowed_types = {"idea", "recipe", "tag", "event"}
    if result_types:
        search_types = set(result_types) & allowed_types
    else:
        search_types = allowed_types

    all_results: list[dict] = []

    if "idea" in search_types:
        all_results.extend(_search_ideas(q))

    if "recipe" in search_types:
        all_results.extend(_search_recipes(q))

    if "tag" in search_types:
        all_results.extend(_search_tags(q))

    if "event" in search_types:
        all_results.extend(_search_events(q))

    # Sort results
    if sort == "relevant" and q:
        all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    elif sort == "newest":
        # Items without created_at (like tags) go last
        all_results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    else:
        all_results.sort(key=lambda x: x.get("score", 0), reverse=True)

    total = len(all_results)
    offset = (page - 1) * page_size
    paginated = all_results[offset : offset + page_size]

    return paginated, total


def unified_autocomplete(q: str, limit: int = 8) -> list[dict]:
    """
    Fast autocomplete across Ideas, Recipes, Tags, and Events.
    Returns lightweight results (id, title, slug, result_type, url).
    """
    if not q or len(q) < 2:
        return []

    results: list[dict] = []

    # Ideas
    from idea.choices import StatusChoices
    from idea.models import Idea

    ideas = (
        Idea.objects.filter(status=StatusChoices.PUBLISHED)
        .annotate(trigram_score=TrigramSimilarity("title", q))
        .filter(Q(title__icontains=q) | Q(trigram_score__gt=0.2))
        .order_by("-trigram_score")[:limit]
    )
    for idea in ideas:
        results.append(
            {
                "result_type": "idea",
                "id": idea.id,
                "title": idea.title,
                "slug": idea.slug,
                "url": f"/idea/{idea.slug}",
                "score": float(idea.trigram_score),
            }
        )

    # Recipes
    from recipe.choices import RecipeStatusChoices
    from recipe.models import Recipe

    recipes = (
        Recipe.objects.filter(status=RecipeStatusChoices.PUBLISHED)
        .annotate(trigram_score=TrigramSimilarity("title", q))
        .filter(Q(title__icontains=q) | Q(trigram_score__gt=0.2))
        .order_by("-trigram_score")[:limit]
    )
    for recipe in recipes:
        results.append(
            {
                "result_type": "recipe",
                "id": recipe.id,
                "title": recipe.title,
                "slug": recipe.slug,
                "url": f"/recipes/{recipe.slug}",
                "score": float(recipe.trigram_score),
            }
        )

    # Tags
    from idea.models import Tag

    tags = (
        Tag.objects.filter(is_approved=True)
        .annotate(trigram_score=TrigramSimilarity("name", q))
        .filter(Q(name__icontains=q) | Q(trigram_score__gt=0.3))
        .order_by("-trigram_score")[:4]
    )
    for tag in tags:
        results.append(
            {
                "result_type": "tag",
                "id": tag.id,
                "title": tag.name,
                "slug": tag.slug,
                "url": f"/search?tag_slugs={tag.slug}",
                "score": float(tag.trigram_score),
            }
        )

    # Events
    from event.models import Event

    events = (
        Event.objects.filter(is_public=True)
        .annotate(trigram_score=TrigramSimilarity("name", q))
        .filter(Q(name__icontains=q) | Q(trigram_score__gt=0.2))
        .order_by("-trigram_score")[:limit]
    )
    for event in events:
        results.append(
            {
                "result_type": "event",
                "id": event.id,
                "title": event.name,
                "slug": event.slug,
                "url": f"/events/{event.slug}",
                "score": float(event.trigram_score),
            }
        )

    # Sort by score and limit total
    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return results[:limit]


def _search_ideas(q: str) -> list[dict]:
    """Search ideas and return unified result dicts."""
    from idea.choices import StatusChoices
    from idea.models import Idea

    qs = Idea.objects.filter(status=StatusChoices.PUBLISHED)

    if q:
        search_vector = SearchVector("title", weight="A") + SearchVector("summary", weight="B")
        search_query = SearchQuery(q, config="german")
        trigram_sim = Greatest(
            TrigramSimilarity("title", q),
            TrigramSimilarity("summary", q),
        )
        qs = qs.annotate(search_rank=SearchRank(search_vector, search_query), trigram_score=trigram_sim).filter(
            Q(search_rank__gt=0.01) | Q(trigram_score__gt=0.1)
        )
    else:
        qs = qs.annotate(search_rank=Value(0.0), trigram_score=Value(0.0))

    qs = qs.distinct().order_by("-search_rank", "-trigram_score")[:50]

    results = []
    for idea in qs:
        score = float(idea.search_rank) + float(idea.trigram_score)
        results.append(
            {
                "result_type": "idea",
                "id": idea.id,
                "title": idea.title,
                "slug": idea.slug,
                "summary": idea.summary,
                "image_url": idea.image.url if idea.image else None,
                "url": f"/idea/{idea.slug}",
                "score": score,
                "created_at": idea.created_at.isoformat() if idea.created_at else "",
                "extra": {
                    "idea_type": idea.idea_type,
                    "difficulty": idea.difficulty,
                    "execution_time": idea.execution_time,
                    "like_score": idea.like_score,
                },
            }
        )
    return results


def _search_recipes(q: str) -> list[dict]:
    """Search recipes and return unified result dicts."""
    from recipe.choices import RecipeStatusChoices
    from recipe.models import Recipe

    qs = Recipe.objects.filter(status=RecipeStatusChoices.PUBLISHED)

    if q:
        search_vector = SearchVector("title", weight="A") + SearchVector("summary", weight="B")
        search_query = SearchQuery(q, config="german")
        trigram_sim = Greatest(
            TrigramSimilarity("title", q),
            TrigramSimilarity("summary", q),
        )
        qs = qs.annotate(search_rank=SearchRank(search_vector, search_query), trigram_score=trigram_sim).filter(
            Q(search_rank__gt=0.01) | Q(trigram_score__gt=0.1)
        )
    else:
        qs = qs.annotate(search_rank=Value(0.0), trigram_score=Value(0.0))

    qs = qs.distinct().order_by("-search_rank", "-trigram_score")[:50]

    results = []
    for recipe in qs:
        score = float(recipe.search_rank) + float(recipe.trigram_score)
        results.append(
            {
                "result_type": "recipe",
                "id": recipe.id,
                "title": recipe.title,
                "slug": recipe.slug,
                "summary": recipe.summary,
                "image_url": recipe.image.url if recipe.image else None,
                "url": f"/recipes/{recipe.slug}",
                "score": score,
                "created_at": recipe.created_at.isoformat() if recipe.created_at else "",
                "extra": {
                    "recipe_type": recipe.recipe_type,
                    "difficulty": recipe.difficulty,
                    "servings": recipe.servings,
                },
            }
        )
    return results


def _search_tags(q: str) -> list[dict]:
    """Search tags and return unified result dicts."""
    from idea.models import Tag

    qs = Tag.objects.filter(is_approved=True)

    if q:
        trigram_sim = TrigramSimilarity("name", q)
        qs = qs.annotate(trigram_score=trigram_sim).filter(Q(name__icontains=q) | Q(trigram_score__gt=0.2))
    else:
        qs = qs.annotate(trigram_score=Value(0.0))

    qs = qs.distinct().order_by("-trigram_score")[:30]

    results = []
    for tag in qs:
        score = float(tag.trigram_score) if hasattr(tag, "trigram_score") else 0.0
        results.append(
            {
                "result_type": "tag",
                "id": tag.id,
                "title": tag.name,
                "slug": tag.slug,
                "summary": "",
                "image_url": None,
                "url": f"/search?tag_slugs={tag.slug}",
                "score": score,
                "created_at": "",
                "extra": {
                    "icon": tag.icon,
                    "parent_id": tag.parent_id,
                },
            }
        )
    return results


def _search_events(q: str) -> list[dict]:
    """Search public events and return unified result dicts."""
    from event.models import Event

    qs = Event.objects.filter(is_public=True)

    if q:
        trigram_sim = Greatest(
            TrigramSimilarity("name", q),
            TrigramSimilarity("description", q),
        )
        qs = qs.annotate(trigram_score=trigram_sim).filter(
            Q(name__icontains=q) | Q(description__icontains=q) | Q(trigram_score__gt=0.1)
        )
    else:
        qs = qs.annotate(trigram_score=Value(0.0))

    qs = qs.distinct().order_by("-trigram_score")[:30]

    results = []
    for event in qs:
        score = float(event.trigram_score) if hasattr(event, "trigram_score") else 0.0
        results.append(
            {
                "result_type": "event",
                "id": event.id,
                "title": event.name,
                "slug": event.slug,
                "summary": event.description[:200] if event.description else "",
                "image_url": None,
                "url": f"/events/{event.slug}",
                "score": score,
                "created_at": event.created_at.isoformat() if event.created_at else "",
                "extra": {
                    "location": event.location,
                    "start_date": event.start_date.isoformat() if event.start_date else None,
                    "end_date": event.end_date.isoformat() if event.end_date else None,
                },
            }
        )
    return results
