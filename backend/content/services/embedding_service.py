"""
Embedding service — Text embedding generation and management.

Uses centralized Gemini client from core.services.gemini.
Stores embeddings as pgvector VectorField.
Hash-check avoids unnecessary regeneration.
"""

import hashlib
import logging
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from pgvector.django import CosineDistance, L2Distance

from core.services.gemini import gemini_embed

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIMENSIONS = 768


def _text_hash(text: str) -> str:
    """Create a SHA-256 hash of the text to detect changes."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_embedding_text(content_obj) -> str:
    """
    Build the text string used for embedding generation.

    Combines title, summary, description, and tag names.
    """
    parts = []
    if content_obj.title:
        parts.append(content_obj.title)
    if content_obj.summary:
        parts.append(content_obj.summary)
    if content_obj.description:
        parts.append(content_obj.description[:2000])

    try:
        tags = content_obj.tags.all()
        tag_names = [t.name for t in tags]
        if tag_names:
            parts.append("Tags: " + ", ".join(tag_names))
    except Exception:
        pass

    return " ".join(parts)


def build_ingredient_embedding_text(ingredient) -> str:
    """
    Build the text string used for embedding generation for an Ingredient.

    Combines name, description, nutritional tags, and retail section.
    """
    parts = [ingredient.name]
    if ingredient.description:
        parts.append(ingredient.description[:2000])

    try:
        tags = ingredient.nutritional_tags.all()
        tag_names = [t.name for t in tags]
        if tag_names:
            parts.append("Tags: " + ", ".join(tag_names))
    except Exception:
        pass

    if ingredient.retail_section:
        parts.append("Abteilung: " + ingredient.retail_section.name)

    return " ".join(parts)


def create_embedding(text: str) -> list[float] | None:
    """
    Create a text embedding using Gemini text-embedding-004.

    Returns a list of 768 floats, or None if generation fails.
    """
    return gemini_embed(user=None, model=EMBEDDING_MODEL, contents=text, bypass_limits=False)


def update_content_embedding(content_obj, force: bool = False) -> bool:
    """
    Update the embedding for a content object.

    Uses hash-check to avoid unnecessary regeneration unless force=True.
    Returns True if embedding was updated, False otherwise.
    """
    text = build_embedding_text(content_obj)
    if not text.strip():
        return False

    if not force and content_obj.embedding and content_obj.embedding_updated_at:
        if content_obj.embedding_updated_at >= content_obj.updated_at:
            logger.debug(
                "Skipping embedding update for %s #%d — already up to date",
                type(content_obj).__name__,
                content_obj.pk,
            )
            return False

    embedding = create_embedding(text)
    if embedding is None:
        return False

    content_obj.embedding = embedding
    content_obj.embedding_updated_at = timezone.now()
    content_obj.save(update_fields=["embedding", "embedding_updated_at"])

    logger.info(
        "Updated embedding for %s #%d (%d dims)",
        type(content_obj).__name__,
        content_obj.pk,
        len(embedding),
    )
    return True


def update_ingredient_embedding(ingredient, force: bool = False) -> bool:
    """
    Update the embedding for an Ingredient.

    Returns True if embedding was updated, False otherwise.
    """
    text = build_ingredient_embedding_text(ingredient)
    if not text.strip():
        return False

    if not force and ingredient.embedding and ingredient.embedding_updated_at:
        if ingredient.embedding_updated_at >= ingredient.updated_at:
            logger.debug("Skipping embedding update for Ingredient #%d — already up to date", ingredient.pk)
            return False

    embedding = create_embedding(text)
    if embedding is None:
        return False

    ingredient.embedding = embedding
    ingredient.embedding_updated_at = timezone.now()
    ingredient.save(update_fields=["embedding", "embedding_updated_at"])

    logger.info("Updated embedding for Ingredient #%d (%d dims)", ingredient.pk, len(embedding))
    return True


def find_similar_ingredients(ingredient, threshold: float = 0.05, limit: int = 20) -> list[dict[str, Any]]:
    """
    Find similar ingredients using pgvector cosine distance.

    Args:
        ingredient: The source Ingredient instance
        threshold: Maximum cosine distance (0 = identical, 2 = opposite)
        limit: Maximum number of results

    Returns list of {id, name, slug, distance} dicts.
    """
    from supply.models import Ingredient

    if ingredient.embedding is None:
        return []

    results = (
        Ingredient.objects.exclude(pk=ingredient.pk)
        .exclude(embedding__isnull=True)
        .annotate(distance=CosineDistance("embedding", ingredient.embedding))
        .filter(distance__lt=threshold)
        .order_by("distance")[:limit]
    )

    return [
        {
            "id": item.id,
            "name": item.name,
            "slug": item.slug,
            "distance": round(float(item.distance), 4),
        }
        for item in results
    ]


def get_embedding_vector(content_obj) -> list[float] | None:
    """Extract the embedding vector from a content object."""
    if not content_obj.embedding:
        return None
    if hasattr(content_obj.embedding, "tolist"):
        return content_obj.embedding.tolist()
    return list(content_obj.embedding)


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a) ** 0.5
    norm_b = sum(b * b for b in vec_b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def find_similar_content(
    content_obj,
    limit: int = 5,
    min_score: float = 0.3,
) -> list[dict[str, Any]]:
    """
    Find similar content items across all content types using embedding similarity.

    Returns a list of dicts with: content_type, object_id, title, slug, score.
    """
    source_vec = get_embedding_vector(content_obj)
    if source_vec is None:
        return []

    from blog.models import Blog
    from game.models import Game
    from recipe.models import Recipe
    from session.models import GroupSession

    source_ct = ContentType.objects.get_for_model(content_obj)
    results: list[dict[str, Any]] = []

    for model_class in [GroupSession, Blog, Game, Recipe]:
        ct = ContentType.objects.get_for_model(model_class)
        qs = model_class.objects.filter(
            status="approved",
            embedding__isnull=False,
        ).exclude(pk=content_obj.pk if ct == source_ct else None)

        for item in qs.only("id", "title", "slug", "summary", "embedding", "image"):
            item_vec = get_embedding_vector(item)
            if item_vec is None:
                continue
            score = cosine_similarity(source_vec, item_vec)
            if score >= min_score:
                results.append(
                    {
                        "content_type": ct.model,
                        "object_id": item.id,
                        "title": item.title,
                        "slug": item.slug,
                        "summary": item.summary[:200] if item.summary else "",
                        "image_url": item.image.url if item.image else None,
                        "score": round(score, 4),
                    }
                )

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:limit]


def find_similar_recipes(recipe, threshold: float = 0.05, limit: int = 20) -> list[dict[str, Any]]:
    """
    Find similar recipes using pgvector cosine distance.

    Returns list of {id, title, slug, distance} dicts.
    """
    from recipe.models import Recipe

    if recipe.embedding is None:
        return []

    results = (
        Recipe.objects.exclude(pk=recipe.pk)
        .exclude(embedding__isnull=True)
        .annotate(distance=CosineDistance("embedding", recipe.embedding))
        .filter(distance__lt=threshold)
        .order_by("distance")[:limit]
    )

    return [
        {
            "id": item.id,
            "title": item.title,
            "slug": item.slug,
            "distance": round(float(item.distance), 4),
        }
        for item in results
    ]


def batch_update_embeddings(
    content_type: str | None = None,
    force: bool = False,
    limit: int = 100,
) -> dict[str, int]:
    """
    Batch update embeddings for content objects and ingredients.

    Args:
        content_type: 'session', 'blog', 'game', 'recipe', 'ingredient', or None for all
        force: If True, regenerate all embeddings regardless of hash
        limit: Maximum number of items to process per type

    Returns:
        Dict with counts: {"updated": N, "skipped": M, "failed": K}
    """
    from blog.models import Blog
    from game.models import Game
    from recipe.models import Recipe
    from session.models import GroupSession
    from supply.models import Ingredient

    model_map = {
        "groupsession": GroupSession,
        "blog": Blog,
        "game": Game,
        "recipe": Recipe,
        "ingredient": Ingredient,
    }

    models_to_process = (
        [model_map[content_type]] if content_type and content_type in model_map else list(model_map.values())
    )

    stats = {"updated": 0, "skipped": 0, "failed": 0}

    for model_class in models_to_process:
        qs = model_class.objects.all()

        if model_class is Ingredient:
            update_fn = update_ingredient_embedding
        else:
            qs = qs.filter(status="approved")
            update_fn = update_content_embedding

        for item in qs[:limit]:
            try:
                updated = update_fn(item, force=force)
                if updated:
                    stats["updated"] += 1
                else:
                    stats["skipped"] += 1
            except Exception:
                logger.warning(
                    "Failed to update embedding for %s #%d",
                    model_class.__name__,
                    item.pk,
                    exc_info=True,
                )
                stats["failed"] += 1

    return stats
