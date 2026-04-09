"""Signals for Recipe cache invalidation and recalculation.

Listens to RecipeItem save/delete and Ingredient save to trigger
synchronous recalculation of the denormalized cache fields on Recipe.
"""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from recipe.models import RecipeItem
from supply.models import Ingredient


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


@receiver(post_save, sender=Ingredient)
def invalidate_recipes_on_ingredient_change(sender, instance, **kwargs):
    """Recalculate cache for all recipes that use this ingredient."""
    from recipe.services.recipe_checks import recalculate_recipe_cache

    # Find recipes that reference this ingredient (directly or via portion)
    recipe_ids = set()

    # Direct ingredient FK on RecipeItem
    direct_items = RecipeItem.objects.filter(ingredient=instance).values_list("recipe_id", flat=True)
    recipe_ids.update(direct_items)

    # Via Portion → Ingredient
    portion_items = RecipeItem.objects.filter(portion__ingredient=instance).values_list("recipe_id", flat=True)
    recipe_ids.update(portion_items)

    if recipe_ids:
        from recipe.models import Recipe

        for recipe in Recipe.objects.filter(id__in=recipe_ids):
            recalculate_recipe_cache(recipe)
