"""
Unified search service that searches across all content types.

Replaces core/search_service.py with proper support for all content types
(GroupSession, Blog, Game, Recipe) plus legacy Ideas, Tags, and Events.

Uses PostgreSQL full-text search + trigram similarity for ranking.
Falls back to icontains queries on SQLite (test environment).
"""

import logging
from typing import Literal

from django.db import connection
from django.db.models import Q, Value
from django.db.models.functions import Greatest

from content.models import SearchLog

logger = logging.getLogger(__name__)


def _is_postgres() -> bool:
    """Check if the database backend is PostgreSQL."""
    return connection.vendor == "postgresql"


# Content types that are searchable
CONTENT_TYPES = {"session", "blog", "game", "recipe", "event"}


def apply_mine_filter(queryset, user, content_type: str):
    """Return a filtered queryset restricted to items related to the user.

    Per-type semantics:
    - session/blog/game: created_by OR authors
    - recipe: owner OR authors
    - event: created_by OR responsible_persons OR invited_users OR
             invited_groups (via GroupMembership) OR registrations
    """
    if content_type in ("session", "blog", "game"):
        return queryset.filter(Q(created_by=user) | Q(authors=user))
    elif content_type == "recipe":
        return queryset.filter(Q(owner=user) | Q(authors=user))
    elif content_type == "event":
        from profiles.models import GroupMembership

        user_group_ids = GroupMembership.objects.filter(
            user=user, is_active=True
        ).values_list("group_id", flat=True)
        return queryset.filter(
            Q(created_by=user)
            | Q(responsible_persons=user)
            | Q(invited_users=user)
            | Q(invited_groups__in=user_group_ids)
            | Q(registrations__user=user)
        ).distinct()
    return queryset


def unified_search(
    q: str = "",
    result_types: list[str] | None = None,
    page: int = 1,
    page_size: int = 20,
    sort: str = "relevant",
    scope: Literal["all", "mine"] = "all",
    user=None,
) -> tuple[list[dict], int, dict[str, int]]:
    """
    Search across all content types.

    Args:
        q: Search query text.
        result_types: Filter by type(s). None = search all types.
        page: Page number (1-indexed).
        page_size: Items per page.
        sort: Sort order ('relevant', 'newest').
        scope: 'all' (default) or 'mine' (restrict to user's content).
        user: The requesting user (needed for scope=mine).

    Returns:
        (items, total_count, type_counts) where items are dicts with result_type,
        and type_counts maps each type to its hit count.
    """
    # Anonymous users: ignore scope=mine
    effective_scope = scope
    if effective_scope == "mine" and (user is None or not user.is_authenticated):
        effective_scope = "all"

    if result_types:
        search_types = set(result_types) & CONTENT_TYPES
    else:
        search_types = CONTENT_TYPES

    all_results: list[dict] = []
    type_counts: dict[str, int] = {}

    for content_type in CONTENT_TYPES:
        results = (
            _search_by_type(content_type, q, scope=effective_scope, user=user)
            if content_type in search_types
            else []
        )
        type_counts[content_type] = len(results)
        if content_type in search_types:
            all_results.extend(results)

    # If filtering, still compute counts for ALL types (for tab badges)
    if result_types:
        for content_type in CONTENT_TYPES - search_types:
            count_results = _search_by_type(content_type, q, scope=effective_scope, user=user)
            type_counts[content_type] = len(count_results)

    # Sort results
    if sort == "relevant" and q:
        all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    elif sort == "newest":
        all_results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    else:
        all_results.sort(key=lambda x: x.get("score", 0), reverse=True)

    total = len(all_results)
    offset = (page - 1) * page_size
    paginated = all_results[offset : offset + page_size]

    return paginated, total, type_counts


def unified_autocomplete(q: str, limit: int = 10) -> list[dict]:
    """
    Fast autocomplete across all content types.
    Returns lightweight results (id, title, slug, result_type, url).
    """
    if not q or len(q) < 2:
        return []

    results: list[dict] = []

    # New content types
    for content_type in ("session", "blog", "game", "recipe"):
        results.extend(_autocomplete_content(content_type, q, limit=4))

    # Other types
    results.extend(_autocomplete_tags(q, limit=3))
    results.extend(_autocomplete_events(q, limit=3))

    results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return results[:limit]


def log_search(q: str, results_count: int, user=None) -> None:
    """Log a search query for analytics."""
    if not q:
        return
    SearchLog.objects.create(
        query=q,
        results_count=results_count,
        user=user if user and user.is_authenticated else None,
    )


# ---------------------------------------------------------------------------
# Content type search helpers
# ---------------------------------------------------------------------------


def _search_by_type(
    content_type: str,
    q: str,
    scope: Literal["all", "mine"] = "all",
    user=None,
) -> list[dict]:
    """Dispatch to the correct search function by type."""
    dispatchers = {
        "session": _search_sessions,
        "blog": _search_blogs,
        "game": _search_games,
        "recipe": _search_recipes,
        "event": _search_events,
    }
    fn = dispatchers.get(content_type)
    if fn:
        return fn(q, scope=scope, user=user)
    return []


def _fulltext_annotate(qs, q: str):
    """Add fulltext search rank + trigram similarity annotations to a queryset.

    On PostgreSQL: Uses SearchVector/SearchRank + TrigramSimilarity.
    On SQLite (tests): Falls back to icontains filtering with constant scores.
    """
    if q:
        if _is_postgres():
            from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector, TrigramSimilarity

            search_vector = SearchVector("title", weight="A") + SearchVector("summary", weight="B")
            search_query = SearchQuery(q, config="german")
            trigram_sim = Greatest(
                TrigramSimilarity("title", q),
                TrigramSimilarity("summary", q),
            )
            qs = qs.annotate(
                search_rank=SearchRank(search_vector, search_query),
                trigram_score=trigram_sim,
            ).filter(Q(search_rank__gt=0.01) | Q(trigram_score__gt=0.1))
        else:
            # SQLite fallback: simple icontains with constant scores
            qs = qs.annotate(
                search_rank=Value(1.0),
                trigram_score=Value(1.0),
            ).filter(Q(title__icontains=q) | Q(summary__icontains=q))
    else:
        qs = qs.annotate(search_rank=Value(0.0), trigram_score=Value(0.0))
    return qs.distinct().order_by("-search_rank", "-trigram_score")[:50]


def _to_result(obj, result_type: str, url: str, extra: dict | None = None) -> dict:
    """Convert a content object to a unified search result dict."""
    score = float(getattr(obj, "search_rank", 0)) + float(getattr(obj, "trigram_score", 0))
    return {
        "result_type": result_type,
        "id": obj.id,
        "title": obj.title if hasattr(obj, "title") else getattr(obj, "name", ""),
        "slug": obj.slug,
        "summary": getattr(obj, "summary", "")[:300],
        "image_url": obj.image.url if hasattr(obj, "image") and obj.image else None,
        "url": url,
        "score": score,
        "created_at": obj.created_at.isoformat() if hasattr(obj, "created_at") and obj.created_at else "",
        "status": getattr(obj, "status", None),
        "extra": extra or {},
    }


# --- New content types ---


def _search_sessions(
    q: str,
    scope: Literal["all", "mine"] = "all",
    user=None,
) -> list[dict]:
    from session.models import GroupSession
    from content.choices import ContentStatus

    if scope == "mine" and user and user.is_authenticated:
        # Mine: approved OR (draft AND owned by user)
        mine_q = Q(created_by=user) | Q(authors=user)
        qs = GroupSession.objects.filter(
            Q(status=ContentStatus.APPROVED) | (Q(status=ContentStatus.DRAFT) & mine_q)
        )
        qs = apply_mine_filter(qs, user, "session")
    else:
        qs = GroupSession.objects.filter(status=ContentStatus.APPROVED)
    qs = _fulltext_annotate(qs, q)
    return [
        _to_result(
            obj,
            "session",
            f"/sessions/{obj.slug}",
            {
                "session_type": obj.session_type,
                "difficulty": obj.difficulty,
                "execution_time": obj.execution_time,
            },
        )
        for obj in qs
    ]


def _search_blogs(
    q: str,
    scope: Literal["all", "mine"] = "all",
    user=None,
) -> list[dict]:
    from blog.models import Blog
    from content.choices import ContentStatus

    if scope == "mine" and user and user.is_authenticated:
        mine_q = Q(created_by=user) | Q(authors=user)
        qs = Blog.objects.filter(
            Q(status=ContentStatus.APPROVED) | (Q(status=ContentStatus.DRAFT) & mine_q)
        )
        qs = apply_mine_filter(qs, user, "blog")
    else:
        qs = Blog.objects.filter(status=ContentStatus.APPROVED)
    qs = _fulltext_annotate(qs, q)
    return [
        _to_result(
            obj,
            "blog",
            f"/blogs/{obj.slug}",
            {
                "blog_type": obj.blog_type,
                "reading_time_minutes": obj.reading_time_minutes,
            },
        )
        for obj in qs
    ]


def _search_games(
    q: str,
    scope: Literal["all", "mine"] = "all",
    user=None,
) -> list[dict]:
    from game.models import Game
    from content.choices import ContentStatus

    if scope == "mine" and user and user.is_authenticated:
        mine_q = Q(created_by=user) | Q(authors=user)
        qs = Game.objects.filter(
            Q(status=ContentStatus.APPROVED) | (Q(status=ContentStatus.DRAFT) & mine_q)
        )
        qs = apply_mine_filter(qs, user, "game")
    else:
        qs = Game.objects.filter(status=ContentStatus.APPROVED)
    qs = _fulltext_annotate(qs, q)
    return [
        _to_result(
            obj,
            "game",
            f"/games/{obj.slug}",
            {
                "game_type": obj.game_type,
                "min_players": obj.min_players,
                "max_players": obj.max_players,
                "play_area": obj.play_area,
            },
        )
        for obj in qs
    ]


def _search_recipes(
    q: str,
    scope: Literal["all", "mine"] = "all",
    user=None,
) -> list[dict]:
    from recipe.models import Recipe
    from content.choices import ContentStatus

    if scope == "mine" and user and user.is_authenticated:
        mine_q = Q(owner=user) | Q(authors=user)
        qs = Recipe.objects.filter(
            Q(status=ContentStatus.APPROVED) | (Q(status=ContentStatus.DRAFT) & mine_q)
        )
        qs = apply_mine_filter(qs, user, "recipe")
    else:
        qs = Recipe.objects.filter(status=ContentStatus.APPROVED)
    qs = _fulltext_annotate(qs, q)
    return [
        _to_result(
            obj,
            "recipe",
            f"/recipes/{obj.slug}",
            {
                "recipe_type": obj.recipe_type,
                "difficulty": obj.difficulty,
                "servings": obj.servings,
            },
        )
        for obj in qs
    ]


def _search_events(
    q: str,
    scope: Literal["all", "mine"] = "all",
    user=None,
) -> list[dict]:
    from event.models import Event

    # Always exclude templates (task 1.7)
    qs = Event.objects.filter(is_template=False)

    if scope == "mine" and user and user.is_authenticated:
        qs = apply_mine_filter(qs, user, "event")
    else:
        qs = qs.filter(is_public=True)
    if q:
        if _is_postgres():
            from django.contrib.postgres.search import TrigramSimilarity

            trigram_sim = Greatest(
                TrigramSimilarity("name", q),
                TrigramSimilarity("description", q),
            )
            qs = qs.annotate(trigram_score=trigram_sim).filter(
                Q(name__icontains=q) | Q(description__icontains=q) | Q(trigram_score__gt=0.1)
            )
        else:
            qs = qs.annotate(trigram_score=Value(1.0)).filter(Q(name__icontains=q) | Q(description__icontains=q))
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
                "status": None,
                "extra": {
                    "location": event.location,
                    "start_date": event.start_date.isoformat() if event.start_date else None,
                    "end_date": event.end_date.isoformat() if event.end_date else None,
                },
            }
        )
    return results


# ---------------------------------------------------------------------------
# Autocomplete helpers
# ---------------------------------------------------------------------------


def _autocomplete_content(content_type: str, q: str, limit: int = 4) -> list[dict]:
    """Generic autocomplete for new content types."""
    from content.choices import ContentStatus

    model_map = {
        "session": ("session.models", "GroupSession", "/sessions/"),
        "blog": ("blog.models", "Blog", "/blogs/"),
        "game": ("game.models", "Game", "/games/"),
        "recipe": ("recipe.models", "Recipe", "/recipes/"),
    }
    if content_type not in model_map:
        return []

    module_name, class_name, url_prefix = model_map[content_type]
    import importlib

    module = importlib.import_module(module_name)
    Model = getattr(module, class_name)

    qs = Model.objects.filter(status=ContentStatus.APPROVED)
    if _is_postgres():
        from django.contrib.postgres.search import TrigramSimilarity

        qs = (
            qs.annotate(trigram_score=TrigramSimilarity("title", q))
            .filter(Q(title__icontains=q) | Q(trigram_score__gt=0.2))
            .order_by("-trigram_score")[:limit]
        )
    else:
        qs = qs.annotate(trigram_score=Value(1.0)).filter(title__icontains=q).order_by("-trigram_score")[:limit]
    return [
        {
            "result_type": content_type,
            "id": obj.id,
            "title": obj.title,
            "slug": obj.slug,
            "url": f"{url_prefix}{obj.slug}",
            "score": float(obj.trigram_score),
        }
        for obj in qs
    ]


def _autocomplete_tags(q: str, limit: int = 3) -> list[dict]:
    from content.models import Tag

    qs = Tag.objects.filter(is_approved=True)
    if _is_postgres():
        from django.contrib.postgres.search import TrigramSimilarity

        qs = (
            qs.annotate(trigram_score=TrigramSimilarity("name", q))
            .filter(Q(name__icontains=q) | Q(trigram_score__gt=0.3))
            .order_by("-trigram_score")[:limit]
        )
    else:
        qs = qs.annotate(trigram_score=Value(1.0)).filter(name__icontains=q).order_by("-trigram_score")[:limit]
    return [
        {
            "result_type": "tag",
            "id": obj.id,
            "title": obj.name,
            "slug": obj.slug,
            "url": f"/search?tag_slugs={obj.slug}",
            "score": float(obj.trigram_score),
        }
        for obj in qs
    ]


def _autocomplete_events(q: str, limit: int = 3) -> list[dict]:
    from event.models import Event

    qs = Event.objects.filter(is_public=True, is_template=False)
    if _is_postgres():
        from django.contrib.postgres.search import TrigramSimilarity

        qs = (
            qs.annotate(trigram_score=TrigramSimilarity("name", q))
            .filter(Q(name__icontains=q) | Q(trigram_score__gt=0.2))
            .order_by("-trigram_score")[:limit]
        )
    else:
        qs = qs.annotate(trigram_score=Value(1.0)).filter(name__icontains=q).order_by("-trigram_score")[:limit]
    return [
        {
            "result_type": "event",
            "id": obj.id,
            "title": obj.name,
            "slug": obj.slug,
            "url": f"/events/{obj.slug}",
            "score": float(obj.trigram_score),
        }
        for obj in qs
    ]
