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
from pgvector.django import CosineDistance, L2Distance

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIMENSIONS = 768


def _text_hash(text: str) -> str:
    """Create a SHA-256 hash of the text to detect changes."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


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
        pass

    return " ".join(parts)


def build_ingredient_embedding_text(ingredient) -> str:
    """
    Build a human-readable full-field serialization of an Ingredient.
    Includes all nutritional values, scores, price, storage, season, tags, and retail section.
    """
    parts = [f"Zutat: {ingredient.name}."]

    if ingredient.description:
        parts.append(ingredient.description[:2000])

    # Nutritional values per 100g
    nutr = []
    if ingredient.energy_kcal is not None:
        nutr.append(f"{ingredient.energy_kcal:.0f} kcal")
    if ingredient.protein_g is not None:
        nutr.append(f"{ingredient.protein_g:.1f}g Eiweiß")
    if ingredient.fat_g is not None:
        nutr.append(f"{ingredient.fat_g:.1f}g Fett")
    if ingredient.fat_sat_g is not None:
        nutr.append(f"{ingredient.fat_sat_g:.1f}g gesättigte Fettsäuren")
    if ingredient.carbohydrate_g is not None:
        nutr.append(f"{ingredient.carbohydrate_g:.1f}g Kohlenhydrate")
    if ingredient.sugar_g is not None:
        nutr.append(f"{ingredient.sugar_g:.1f}g Zucker")
    if ingredient.fibre_g is not None:
        nutr.append(f"{ingredient.fibre_g:.1f}g Ballaststoffe")
    if ingredient.salt_g is not None:
        nutr.append(f"{ingredient.salt_g:.2f}g Salz")
    if ingredient.sodium_mg is not None:
        nutr.append(f"{ingredient.sodium_mg:.0f}mg Natrium")
    if ingredient.fructose_g is not None:
        nutr.append(f"{ingredient.fructose_g:.1f}g Fructose")
    if ingredient.lactose_g is not None:
        nutr.append(f"{ingredient.lactose_g:.1f}g Lactose")
    if ingredient.vitamin_c_mg is not None:
        nutr.append(f"{ingredient.vitamin_c_mg:.1f}mg Vitamin C")
    if nutr:
        parts.append("Pro 100g: " + ", ".join(nutr) + ".")

    # Scores
    scores = []
    if ingredient.nutri_class is not None:
        scores.append(f"Nutri-Score: {ingredient.nutri_class}")
    if ingredient.child_score is not None:
        scores.append(f"Kind-Score: {ingredient.child_score}/10")
    if ingredient.scout_score is not None:
        scores.append(f"Pfadfinder-Score: {ingredient.scout_score}/10")
    if ingredient.environmental_score is not None:
        scores.append(f"Umwelt-Score: {ingredient.environmental_score}/10")
    if ingredient.nova_score is not None:
        scores.append(f"NOVA: {ingredient.nova_score}")
    if scores:
        parts.append(" ".join(scores))

    # Price
    if ingredient.price_per_kg is not None:
        parts.append(f"Preis: {ingredient.price_per_kg:.2f}EUR/kg.")

    # Physical / storage
    phys = []
    if ingredient.physical_density and ingredient.physical_density != 1.0:
        phys.append(f"Dichte: {ingredient.physical_density:.2f}g/ml")
    if ingredient.physical_viscosity:
        phys.append(f"Konsistenz: {ingredient.physical_viscosity}")
    if ingredient.storage_type:
        phys.append(f"Lagerung: {ingredient.storage_type}")
    if ingredient.durability_in_days:
        phys.append(f"Haltbar: {ingredient.durability_in_days} Tage")
    if ingredient.cooking_factor and ingredient.cooking_factor != 1.0:
        phys.append(f"Gar-Faktor: {ingredient.cooking_factor}")
    if ingredient.camp_suitable:
        phys.append("Lager-geeignet")
    if phys:
        parts.append(". ".join(phys) + ".")

    # Season
    if ingredient.season_start and ingredient.season_end:
        parts.append(f"Saison: Monat {ingredient.season_start} bis {ingredient.season_end}.")

    # Tags and retail section
    try:
        tags = ingredient.nutritional_tags.all()
        tag_names = [t.name for t in tags]
        if tag_names:
            parts.append("Tags: " + ", ".join(tag_names) + ".")
    except Exception:
        pass

    if ingredient.retail_section:
        parts.append(f"Abteilung: {ingredient.retail_section.name}.")

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
        pass

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
        items = recipe.recipe_items.select_related(
            "portion__ingredient", "portion__measuring_unit"
        ).all()
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
        pass

    return " ".join(parts)


def create_embedding(text: str) -> list[float] | None:
    """
    Create a text embedding using Cloud SQL native embedding() SQL function.
    Falls back to Gemini Python SDK if google_ml_integration extension is not available.
    """
    from django.db import connection

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT embedding(%s, %s)",
                [EMBEDDING_MODEL, text],
            )
            row = cursor.fetchone()
            if row and row[0] is not None:
                return list(row[0])
        return None
    except Exception:
        logger.debug("Cloud SQL embedding() not available, falling back to Gemini SDK")

    # Fallback: Gemini SDK
    from core.services.gemini import gemini_embed

    return gemini_embed(user=None, model=EMBEDDING_MODEL, contents=text, bypass_limits=False)


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
