"""Quality score calculation for Recipe objects."""

import logging

logger = logging.getLogger(__name__)


def calculate_recipe_quality_score(recipe) -> int:
    """
    Calculate a 0-100 quality score for a Recipe.

    Categories and weights:
    - Ingredients (30%): RecipeItems with valid portions and nutritional ingredients
    - Metadata (25%): Summary, description, image, tags
    - Cache freshness (20%): Cache up to date vs ingredient changes
    - Nutrition (15%): Cached nutritional fields filled
    - Price (10%): cached_price_total set
    """
    scores = []

    # Ingredients (30%) — materialise once, reuse for cache freshness check
    items = list(recipe.recipe_items.select_related("portion", "portion__ingredient").all())
    if items:
        valid_items = sum(
            1
            for item in items
            if item.portion
            and item.portion.ingredient
            and item.portion.ingredient.energy_kcal
            and item.portion.ingredient.energy_kcal > 0
        )
        ingredient_score = (valid_items / len(items)) * 100
    else:
        ingredient_score = 0.0
    scores.append(("ingredients", 0.30, ingredient_score))

    # Metadata (25%)
    has_tags = recipe.tags.exists()
    meta_fields = [
        bool(recipe.summary),
        bool(recipe.description),
        bool(recipe.image),
        has_tags,
    ]
    meta_filled = sum(1 for v in meta_fields if v)
    meta_score = (meta_filled / len(meta_fields)) * 100 if meta_fields else 0
    scores.append(("metadata", 0.25, meta_score))

    # Cache freshness (20%) — reuse materialised items list
    if recipe.cached_at:
        stale = any(
            item.portion and item.portion.ingredient and item.portion.ingredient.updated_at > recipe.cached_at
            for item in items
        )
        cache_score = 0.0 if stale else 100.0
    else:
        cache_score = 0.0
    scores.append(("cache", 0.20, cache_score))

    # Nutrition (15%)
    nutrition_fields = [
        recipe.cached_energy_kcal,
        recipe.cached_protein_g,
        recipe.cached_fat_g,
        recipe.cached_carbohydrate_g,
        recipe.cached_sugar_g,
        recipe.cached_fibre_g,
        recipe.cached_salt_g,
        recipe.cached_vitamin_c_mg,
        recipe.cached_nutri_class,
    ]
    nutrition_filled = sum(1 for v in nutrition_fields if v is not None)
    nutrition_score = (nutrition_filled / len(nutrition_fields)) * 100 if nutrition_fields else 0
    scores.append(("nutrition", 0.15, nutrition_score))

    # Price (10%)
    price_score = 100.0 if recipe.cached_price_total is not None else 0.0
    scores.append(("price", 0.10, price_score))

    total = sum(weight * score for _, weight, score in scores)
    return int(round(total))
