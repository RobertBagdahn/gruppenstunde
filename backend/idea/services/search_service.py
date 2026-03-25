"""
Hybrid search service combining PostgreSQL full-text search,
trigram fuzzy matching, and (future) pgvector similarity.
"""

import logging
import math

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector, TrigramSimilarity
from django.db.models import F, Q, Value
from django.db.models.functions import Greatest

from idea.choices import StatusChoices
from idea.models import Idea, Tag

logger = logging.getLogger(__name__)


def hybrid_search(filters) -> tuple[list, int]:
    """
    Perform hybrid search combining:
    1. PostgreSQL Full-Text Search (SearchVector + SearchRank)
    2. Trigram fuzzy matching (pg_trgm)
    3. Tag/filter matching
    4. (Future) pgvector similarity

    Returns (items, total_count).
    """
    qs = Idea.objects.filter(status=StatusChoices.PUBLISHED)

    if filters.idea_type:
        qs = qs.filter(idea_type=filters.idea_type)

    query_text = filters.q

    if query_text:
        # Full-text search with ranking
        search_vector = SearchVector("title", weight="A") + SearchVector("summary", weight="B")
        search_query = SearchQuery(query_text, config="german")

        # Trigram similarity for fuzzy matching
        trigram_sim = Greatest(
            TrigramSimilarity("title", query_text),
            TrigramSimilarity("summary", query_text),
        )

        qs = (
            qs.annotate(
                search_rank=SearchRank(search_vector, search_query),
                trigram_score=trigram_sim,
            )
            .filter(
                Q(search_rank__gt=0.01) | Q(trigram_score__gt=0.1)
            )
        )
    else:
        qs = qs.annotate(
            search_rank=Value(0.0),
            trigram_score=Value(0.0),
        )

    # Apply filters
    if filters.scout_level_ids:
        qs = qs.filter(scout_levels__id__in=filters.scout_level_ids)

    if filters.tag_slugs:
        # Hierarchical: include children of selected tags
        selected_tags = Tag.objects.filter(slug__in=filters.tag_slugs)
        expanded_ids = set(selected_tags.values_list("id", flat=True))
        for tag in selected_tags:
            for child in tag.get_descendants():
                expanded_ids.add(child.id)
        qs = qs.filter(tags__id__in=expanded_ids)

    if filters.difficulty:
        qs = qs.filter(difficulty=filters.difficulty)
    if filters.costs_rating:
        qs = qs.filter(costs_rating=filters.costs_rating)
    if filters.execution_time:
        qs = qs.filter(execution_time=filters.execution_time)

    qs = qs.distinct()

    # Sorting
    if filters.sort == "relevant" and query_text:
        # Combined score: text_rank + trigram
        qs = qs.order_by("-search_rank", "-trigram_score", "-like_score")
    elif filters.sort == "newest":
        qs = qs.order_by("-created_at")
    elif filters.sort == "oldest":
        qs = qs.order_by("created_at")
    elif filters.sort == "most_liked" or filters.sort == "popular":
        qs = qs.order_by("-like_score")
    elif filters.sort == "random":
        qs = qs.order_by("?")
    else:
        if query_text:
            qs = qs.order_by("-search_rank", "-trigram_score")
        else:
            qs = qs.order_by("-created_at")

    total = qs.count()
    offset = (filters.page - 1) * filters.page_size
    items = list(qs.prefetch_related("scout_levels", "tags")[offset : offset + filters.page_size])

    return items, total


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _unpack_embedding(raw: bytes) -> list[float] | None:
    """Unpack binary embedding (struct-packed floats) into a list."""
    import struct

    if not raw:
        return None
    try:
        count = len(raw) // 4  # 4 bytes per float
        return list(struct.unpack(f"{count}f", raw))
    except struct.error:
        return None


def find_similar(idea: Idea, limit: int = 6) -> list[Idea]:
    """
    Find similar ideas. Strategy:
    1. Cosine similarity on embeddings if available
    2. Fallback: tag overlap + like_score
    """
    source_embedding = _unpack_embedding(idea.embedding) if idea.embedding else None

    if source_embedding:
        # Compute cosine similarity against all published ideas with embeddings
        candidates = (
            Idea.objects.filter(status=StatusChoices.PUBLISHED)
            .exclude(id=idea.id)
            .exclude(embedding__isnull=True)
            .exclude(embedding=b"")
        )

        scored = []
        for candidate in candidates:
            candidate_embedding = _unpack_embedding(candidate.embedding)
            if candidate_embedding and len(candidate_embedding) == len(source_embedding):
                score = _cosine_similarity(source_embedding, candidate_embedding)
                scored.append((score, candidate))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [candidate for _, candidate in scored[:limit]]

    # Fallback: tag-based similarity
    idea_tag_ids = set(idea.tags.values_list("id", flat=True))

    if not idea_tag_ids:
        # No tags: return popular ideas
        return list(
            Idea.objects.filter(status=StatusChoices.PUBLISHED)
            .exclude(id=idea.id)
            .order_by("-like_score")[:limit]
        )

    # Find ideas with overlapping tags, ordered by overlap count
    from django.db.models import Count

    similar = (
        Idea.objects.filter(status=StatusChoices.PUBLISHED, tags__id__in=idea_tag_ids)
        .exclude(id=idea.id)
        .annotate(tag_overlap=Count("tags", filter=Q(tags__id__in=idea_tag_ids)))
        .order_by("-tag_overlap", "-like_score")
        .distinct()[:limit]
    )

    return list(similar)
