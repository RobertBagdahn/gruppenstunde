"""Quality score calculation for Ingredient objects."""

import logging

logger = logging.getLogger(__name__)


def calculate_ingredient_quality_score(ingredient) -> int:
    """
    Calculate a 0-100 quality score for an Ingredient.

    Categories and weights:
    - Nutrition (42%): Filled nutritional fields
    - Price (15%): Has price_per_kg
    - Physical data (15%): Physical properties filled
    - Classification (15%): Retail section + nutritional tags
    - Scout fields (13%): Camp suitability, season, prep time
    """
    scores = []

    # Nutrition (42%)
    nutrition_fields = [
        ingredient.energy_kcal,
        ingredient.protein_g,
        ingredient.fat_g,
        ingredient.fat_sat_g,
        ingredient.carbohydrate_g,
        ingredient.sugar_g,
        ingredient.fibre_g,
        ingredient.salt_g,
        ingredient.sodium_mg,
        ingredient.fructose_g,
        ingredient.lactose_g,
        ingredient.vitamin_c_mg,
    ]
    filled = sum(1 for v in nutrition_fields if v is not None and v > 0)
    nutrition_score = (filled / len(nutrition_fields)) * 100
    scores.append(("nutrition", 0.42, nutrition_score))

    # Price (15%)
    price_score = 100.0 if ingredient.price_per_kg is not None else 0.0
    scores.append(("price", 0.15, price_score))

    # Physical data (15%)
    physical_fields = [
        ingredient.physical_density is not None and ingredient.physical_density != 1.0,
        ingredient.physical_viscosity is not None and ingredient.physical_viscosity,
        ingredient.storage_type is not None,
        ingredient.durability_in_days is not None,
        ingredient.cooking_factor is not None and ingredient.cooking_factor != 1.0,
    ]
    physical_filled = sum(1 for v in physical_fields if v)
    physical_score = (physical_filled / len(physical_fields)) * 100 if physical_fields else 0
    scores.append(("physical", 0.15, physical_score))

    # Classification (15%)
    classification_fields = [
        ingredient.retail_section is not None,
        ingredient.nutritional_tags.exists(),
    ]
    class_filled = sum(1 for v in classification_fields if v)
    class_score = (class_filled / len(classification_fields)) * 100 if classification_fields else 0
    scores.append(("classification", 0.15, class_score))

    # Scout fields (13%)
    scout_fields = [
        ingredient.camp_suitable,
        ingredient.season_start is not None and ingredient.season_end is not None,
        ingredient.preparation_time_min is not None,
    ]
    scout_filled = sum(1 for v in scout_fields if v)
    scout_score = (scout_filled / len(scout_fields)) * 100 if scout_fields else 0
    scores.append(("scout", 0.13, scout_score))

    total = sum(weight * score for _, weight, score in scores)
    return int(round(total))
