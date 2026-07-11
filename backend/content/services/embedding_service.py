"""
Embedding service — Text embedding generation and management.

Uses Cloud SQL native embedding() function when available (google_ml_integration
extension), with fallback to Gemini Python SDK for local development.
Stores embeddings as pgvector VectorField.
Hash-check avoids unnecessary regeneration.
"""

import hashlib
import logging
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from pgvector.django import CosineDistance

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "gemini-embedding-001"
# Output dimensionality for Vertex AI embeddings.
# Must match the VectorField dimensions on both supply.Ingredient.embedding
# and content.Content.embedding (used by Recipe/Blog/Game/Session) — both are
# 768 dims.
EMBEDDING_OUTPUT_DIM = 768
EMBEDDING_DIMENSIONS = 768  # VectorField dimensions for PostgreSQL pgvector


def _text_hash(text: str) -> str:
    """Create a SHA-256 hash of the text to detect changes."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def similarity_to_pct(cosine_similarity: float, steepness: float = 10.0, midpoint: float = 0.6) -> float:
    """
    Convert cosine similarity (0-1) to percentage similarity (0-100) using sigmoid calibration.
    
    This function applies a sigmoid curve that:
    - Maps low similarities (< midpoint) to low percentages
    - Maps high similarities (> midpoint) to high percentages
    - Uses steepness to control the transition sharpness
    
    Args:
        cosine_similarity: Raw cosine similarity value (0.0 to 1.0)
        steepness: Sigmoid steepness parameter (higher = sharper transition, default 10.0)
        midpoint: Cosine similarity value that maps to 50% (default 0.6, can be fitted to ground truth)
    
    Returns:
        Percentage similarity (0.0 to 100.0)
    
    Note: These parameters should be fitted to ground-truth ingredient pairs (task 3.2).
          For now, using reasonable defaults based on typical cosine similarity distributions.
    """
    import math
    
    # Ensure input is in valid range
    cos_sim = max(0.0, min(1.0, cosine_similarity))
    
    # Sigmoid function: 1 / (1 + e^(-steepness * (x - midpoint)))
    try:
        sigmoid_value = 1.0 / (1.0 + math.exp(-steepness * (cos_sim - midpoint)))
    except OverflowError:
        # Handle extreme values
        sigmoid_value = 1.0 if cos_sim > midpoint else 0.0
    
    # Scale to 0-100 percentage
    return sigmoid_value * 100.0


def _fmt(val, suffix="", decimals=1) -> str:
    """Format a numeric value for embedding text, or skip if None."""
    if val is None:
        return ""
    return f"{val:.{decimals}f}{suffix} "


def build_embedding_text(content_obj) -> str:
    """
    Build the text string used for embedding generation for generic content.
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
        logger.warning("Could not include tags in embedding text for content", exc_info=True)

    return " ".join(parts)


def build_ingredient_embedding_text(ingredient) -> str:
    """
    Build embedding text for ingredient semantic similarity.

    Includes name, aliases, groups, description, and retail section.
    Aliases and groups improve matching for the ingredient matcher pipeline.
    """
    parts = []

    if ingredient.name:
        parts.append(ingredient.name)

    try:
        aliases = list(ingredient.aliases.values_list("name", flat=True)[:10])
        if aliases:
            parts.append("auch bekannt als: " + ", ".join(aliases))
    except Exception:
        pass

    try:
        groups = list(ingredient.groups.values_list("name", flat=True)[:5])
        if groups:
            parts.append("Gruppe: " + ", ".join(groups))
    except Exception:
        pass

    if ingredient.description:
        parts.append(ingredient.description[:2000])

    if ingredient.retail_section:
        parts.append(f"Abteilung: {ingredient.retail_section.name}")

    return " ".join(parts)


def build_recipe_embedding_text(recipe) -> str:
    """
    Build the text string used for embedding generation for a Recipe.
    Includes title, summary, description, tags, recipe_type, servings,
    and human-readable data of all associated Ingredients.
    """
    parts = []

    if recipe.title:
        parts.append(f"Titel: {recipe.title}.")
    if recipe.summary:
        parts.append(recipe.summary)
    if recipe.description:
        parts.append(recipe.description[:2000])

    meta = []
    if recipe.recipe_type:
        meta.append(f"Typ: {recipe.recipe_type}")
    if recipe.portions:
        meta.append(f"{recipe.portions} Portionen")
    if recipe.difficulty:
        meta.append(f"Schwierigkeit: {recipe.difficulty}")
    if recipe.execution_time:
        meta.append(f"Dauer: {recipe.execution_time}min")
    if meta:
        parts.append(". ".join(meta) + ".")

    try:
        tags = recipe.tags.all()
        tag_names = [t.name for t in tags]
        if tag_names:
            parts.append("Tags: " + ", ".join(tag_names) + ".")
    except Exception:
        logger.warning("Could not include tags in embedding text for recipe", exc_info=True)

    # Nutritional summary from cache
    nutr = []
    if recipe.cached_energy_kcal is not None:
        nutr.append(f"{recipe.cached_energy_kcal:.0f} kcal/100g")
    if recipe.cached_protein_g is not None:
        nutr.append(f"{recipe.cached_protein_g:.1f}g Eiweiß/100g")
    if recipe.cached_fat_g is not None:
        nutr.append(f"{recipe.cached_fat_g:.1f}g Fett/100g")
    if recipe.cached_carbohydrate_g is not None:
        nutr.append(f"{recipe.cached_carbohydrate_g:.1f}g Kohlenhydrate/100g")
    if recipe.cached_nutri_class is not None:
        nutr.append(f"Nutri-Score: {recipe.cached_nutri_class}")
    if nutr:
        parts.append("Nährwerte: " + ", ".join(nutr) + ".")

    # Ingredients
    try:
        items = recipe.recipe_items.select_related("portion__ingredient", "portion__measuring_unit").all()
        if items:
            ingredient_parts = []
            for item in items:
                ing = item.portion.ingredient
                ing_text = ing.name
                if ing.energy_kcal is not None:
                    ing_text += f" ({ing.energy_kcal:.0f} kcal"
                    if ing.protein_g is not None:
                        ing_text += f", {ing.protein_g:.1f}g Eiweiß"
                    if ing.fat_g is not None:
                        ing_text += f", {ing.fat_g:.1f}g Fett"
                    if ing.carbohydrate_g is not None:
                        ing_text += f", {ing.carbohydrate_g:.1f}g Kohlenhydrate"
                    ing_text += ")"
                ingredient_parts.append(ing_text[:150])
            parts.append("Zutaten: " + "; ".join(ingredient_parts) + ".")
    except Exception:
        logger.warning("Could not include ingredients in embedding text for recipe", exc_info=True)

    return " ".join(parts)


def create_embedding(text: str, output_dimensionality: int | None = None) -> list[float] | None:
    """
    Create a text embedding using Vertex AI Gemini model.
    
    This directly uses the Vertex AI client via gemini_embed().
    The cloud-sql-based embedding() SQL function is no longer used.
    
    Args:
        text: Text to embed
        output_dimensionality: Optional output dimension for the embedding.
                             If None, uses EMBEDDING_OUTPUT_DIM constant.
    
    Returns: List of floats or None if unavailable.
    """
    from core.services.gemini import gemini_embed

    dim = output_dimensionality or EMBEDDING_OUTPUT_DIM
    return gemini_embed(
        user=None,
        model=EMBEDDING_MODEL,
        contents=text,
        output_dimensionality=dim,
        bypass_limits=False,
    )


def update_content_embedding(content_obj, force: bool = False) -> bool:
    """
    Update the embedding for a content object.
    Delegates to recipe-specific builder for Recipe instances.
    Uses hash-check to avoid unnecessary regeneration unless force=True.
    Returns True if embedding was updated, False otherwise.
    """
    if hasattr(content_obj, "recipe_type"):
        text = build_recipe_embedding_text(content_obj)
    else:
        text = build_embedding_text(content_obj)

    if not text.strip():
        return False

    # Hash-based change detection
    current_hash = _text_hash(text)
    if not force and content_obj.embedding is not None:
        if current_hash == content_obj.embedding_text_hash:
            logger.debug(
                "Skipping embedding update for %s #%d — text hash unchanged",
                type(content_obj).__name__,
                content_obj.pk,
            )
            return False

    embedding = create_embedding(text)
    if embedding is None:
        return False

    content_obj.embedding = embedding
    content_obj.embedding_updated_at = timezone.now()
    content_obj.embedding_text_hash = current_hash
    content_obj.save(update_fields=["embedding", "embedding_updated_at", "embedding_text_hash"])

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
    Uses hash-based change detection to avoid unnecessary regeneration.
    Returns True if embedding was updated, False otherwise.
    
    Note: Uses raw SQL to bypass signal handlers that try to access Recipe table.
    """
    from django.db import connection
    
    text = build_ingredient_embedding_text(ingredient)
    if not text.strip():
        return False

    # Hash-based change detection
    current_hash = _text_hash(text)
    if not force and ingredient.embedding is not None:
        if current_hash == ingredient.embedding_text_hash:
            logger.debug("Skipping embedding update for Ingredient #%d — text hash unchanged", ingredient.pk)
            return False

    embedding = create_embedding(text)
    if embedding is None:
        return False

    # Use raw SQL to bypass signal handlers
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE supply_ingredient 
            SET embedding = %s, 
                embedding_updated_at = %s, 
                embedding_text_hash = %s 
            WHERE id = %s
            """,
            [embedding, timezone.now(), current_hash, ingredient.pk]
        )

    logger.info("Updated embedding for Ingredient #%d (%d dims)", ingredient.pk, len(embedding))
    return True


def find_similar_ingredients(ingredient, similarity_threshold_pct: float = 50.0, limit: int = 20) -> list[dict[str, Any]]:
    """
    Find similar ingredients using pgvector cosine distance with calibrated similarity percentage.

    Args:
        ingredient: The source Ingredient instance
        similarity_threshold_pct: Minimum similarity percentage to return (0-100, default 50%)
        limit: Maximum number of results

    Returns list of {id, name, slug, similarity_pct} dicts.
    """
    from supply.models import Ingredient

    if ingredient.embedding is None:
        return []

    # Query using cosine distance
    # pgvector's CosineDistance returns distance (0=identical, 2=opposite)
    # We convert to cosine_similarity by: cosine_similarity = 1 - distance
    results = (
        Ingredient.objects.exclude(pk=ingredient.pk)
        .exclude(embedding__isnull=True)
        .annotate(distance=CosineDistance("embedding", ingredient.embedding))
        .filter(distance__lt=1.0)  # Filter to valid cosine distances (0-2, but we only care about 0-1 range)
        .order_by("distance")[:limit]
    )

    similar = []
    for item in results:
        # Convert distance to cosine similarity
        cosine_sim = 1.0 - float(item.distance)
        # Convert to percentage using sigmoid calibration
        similarity_pct = similarity_to_pct(cosine_sim)
        
        if similarity_pct >= similarity_threshold_pct:
            similar.append({
                "id": item.id,
                "name": item.name,
                "slug": item.slug,
                "similarity_pct": round(similarity_pct, 1),
            })
    
    return similar


def get_embedding_vector(content_obj) -> list[float] | None:
    """Extract the embedding vector from a content object."""
    if content_obj.embedding is None:
        return None
    if hasattr(content_obj.embedding, "tolist"):
        return content_obj.embedding.tolist()
    return list(content_obj.embedding)


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b, strict=False))
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
