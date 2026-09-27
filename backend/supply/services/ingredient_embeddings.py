"""Parallel backfill of ingredient embeddings (missing or stale).

Vertex ``gemini-embedding-001`` accepts one text per request, so throughput
comes from a small thread pool. Stale embeddings are detected via the stored
text hash, so a changed name/description/retail section is re-embedded too.
"""

from __future__ import annotations

import logging
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from django.db import connection

logger = logging.getLogger(__name__)

RETRY_DELAYS_SECONDS = (2.0, 8.0)


@dataclass
class EmbeddingBackfillResult:
    processed: int = 0
    updated: int = 0
    failed: int = 0
    remaining: int = 0


def stale_or_missing_ids(*, limit: int | None = None) -> list[int]:
    """Ingredient ids whose embedding is missing or whose embedding text changed."""
    from content.services.embedding_service import _text_hash, build_ingredient_embedding_text
    from supply.models import Ingredient

    ids: list[int] = []
    queryset = (
        Ingredient.objects.select_related("retail_section")
        .prefetch_related("aliases", "groups")
        .only("id", "name", "description", "retail_section", "embedding_text_hash", "embedding_updated_at")
        .order_by("-usage_count", "id")
    )
    for ingredient in queryset.iterator(chunk_size=500):
        if (
            ingredient.embedding_updated_at is None
            or _text_hash(build_ingredient_embedding_text(ingredient)) != ingredient.embedding_text_hash
        ):
            ids.append(ingredient.id)
        if limit is not None and len(ids) >= limit:
            break
    return ids


def _embed_one(ingredient_id: int) -> bool:
    from content.services.embedding_service import update_ingredient_embedding
    from supply.models import Ingredient

    try:
        ingredient = Ingredient.objects.select_related("retail_section").get(id=ingredient_id)
        for delay in (0.0, *RETRY_DELAYS_SECONDS):
            if delay:
                time.sleep(delay)
            # force=True: the caller already decided this embedding is missing or stale.
            if update_ingredient_embedding(ingredient, force=True, bypass_limits=True):
                return True
        return False
    except Exception:
        logger.warning("Embedding backfill failed for ingredient #%s", ingredient_id, exc_info=True)
        return False
    finally:
        connection.close()


def backfill_embeddings(*, ids: list[int], workers: int = 6) -> EmbeddingBackfillResult:
    """Embed the given ingredients in parallel."""
    result = EmbeddingBackfillResult(processed=len(ids))
    if not ids:
        return result
    with ThreadPoolExecutor(max_workers=max(1, workers), thread_name_prefix="embed") as pool:
        for ok in pool.map(_embed_one, ids):
            if ok:
                result.updated += 1
            else:
                result.failed += 1
    return result
