"""Signals for Recipe cache invalidation and recalculation.

Listens to RecipeItem save/delete, Ingredient save/delete, Portion save/delete,
and MeasuringUnit save to trigger synchronous recalculation of the denormalized
cache fields on Recipe.

NOTE: Synchronous recalc trade-off
All signal handlers call recalculate_recipe_cache() synchronously in the same
request cycle. This guarantees cached_* fields are always up-to-date for reads,
but may become slow if a single Ingredient/Portion/MeasuringUnit change affects
many recipes. If profiling shows >100 affected recipes per operation, consider
switching to a lazy strategy: set cached_at = NULL in the signal and recalculate
on next read (requires updating all consumers that assume cached_* is always
current, e.g. list views, cockpit).
"""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from recipe.models import RecipeItem
from supply.models import Ingredient, MeasuringUnit, Portion


def _recipes_using_ingredient(ingredient):
    """Return set of Recipe IDs that reference the given Ingredient.

    Looks up RecipeItem via Portion → Ingredient references.
    """
    recipe_ids = set()
    # Via Portion → Ingredient
    via_portion = RecipeItem.objects.filter(portion__ingredient=ingredient).values_list("recipe_id", flat=True)
    recipe_ids.update(via_portion)
    return recipe_ids


def _recalculate_for_recipe_ids(recipe_ids):
    """Recalculate cache for all recipes with the given IDs."""
    if not recipe_ids:
        return
    from recipe.models import Recipe
    from recipe.services.recipe_checks import recalculate_recipe_cache

    for recipe in Recipe.objects.filter(id__in=recipe_ids):
        recalculate_recipe_cache(recipe)


# ---------------------------------------------------------------------------
# RecipeItem signals
# ---------------------------------------------------------------------------


@receiver(post_save, sender=RecipeItem)
@receiver(post_delete, sender=RecipeItem)
def recalculate_recipe_cache_on_item_change(sender, instance, **kwargs):
    """Recalculate recipe cache when a RecipeItem is created, updated, or deleted."""
    from recipe.services.recipe_checks import recalculate_recipe_cache

    try:
        recipe = instance.recipe
    except Exception:
        return
    recalculate_recipe_cache(recipe)


# ---------------------------------------------------------------------------
# Ingredient signals
# ---------------------------------------------------------------------------


@receiver(post_save, sender=Ingredient)
@receiver(post_delete, sender=Ingredient)
def invalidate_recipes_on_ingredient_change(sender, instance, **kwargs):
    """Recalculate cache for all recipes that use this ingredient (save or delete)."""
    recipe_ids = _recipes_using_ingredient(instance)
    _recalculate_for_recipe_ids(recipe_ids)


# ---------------------------------------------------------------------------
# Portion signals
# ---------------------------------------------------------------------------


@receiver(post_save, sender=Portion)
@receiver(post_delete, sender=Portion)
def invalidate_recipes_on_portion_change(sender, instance, **kwargs):
    """Recalculate cache for all recipes that use this portion."""
    recipe_ids = set(
        RecipeItem.objects.filter(portion=instance).values_list("recipe_id", flat=True)
    )
    _recalculate_for_recipe_ids(recipe_ids)


# ---------------------------------------------------------------------------
# MeasuringUnit signals
# ---------------------------------------------------------------------------


@receiver(post_save, sender=MeasuringUnit)
def invalidate_recipes_on_measuring_unit_change(sender, instance, **kwargs):
    """Recalculate cache for all recipes whose items reference this MeasuringUnit via Portion."""
    recipe_ids = set()
    via_portion = RecipeItem.objects.filter(portion__measuring_unit=instance).values_list("recipe_id", flat=True)
    recipe_ids.update(via_portion)
    _recalculate_for_recipe_ids(recipe_ids)
