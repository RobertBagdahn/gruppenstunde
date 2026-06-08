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

from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from recipe.models import Recipe, RecipeItem
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


# ---------------------------------------------------------------------------
# Allergen sync signals
# ---------------------------------------------------------------------------


@receiver(post_save, sender=RecipeItem)
@receiver(post_delete, sender=RecipeItem)
def sync_recipe_allergens_on_item_change(sender, instance, **kwargs):
    """Sync recipe allergen tags when a RecipeItem is created, updated, or deleted."""
    from recipe.services.recipe_checks import sync_recipe_allergen_tags

    try:
        recipe = instance.recipe
    except Exception:
        return
    sync_recipe_allergen_tags(recipe)


@receiver(post_save, sender=Recipe)
def sync_recipe_allergens_on_recipe_change(sender, instance, **kwargs):
    """Sync recipe allergen tags when a Recipe is saved."""
    if hasattr(instance, "_syncing_allergens"):
        return
    instance._syncing_allergens = True
    try:
        from recipe.services.recipe_checks import sync_recipe_allergen_tags
        sync_recipe_allergen_tags(instance)
    finally:
        delattr(instance, "_syncing_allergens")


# ---------------------------------------------------------------------------
# Recipe quality score signal
# ---------------------------------------------------------------------------


@receiver(post_save, sender=Recipe)
def update_recipe_quality_score(sender, instance: Recipe, created: bool, **kwargs):
    """After save, update the recipe quality score."""
    if hasattr(instance, "_updating_score"):
        return

    try:
        instance._updating_score = True
        from recipe.services.quality_score import calculate_recipe_quality_score

        new_score = calculate_recipe_quality_score(instance)
        if instance.quality_score != new_score:
            instance.quality_score = new_score
            instance.quality_score_updated_at = timezone_now()
            Recipe.objects.filter(pk=instance.pk).update(
                quality_score=new_score,
                quality_score_updated_at=instance.quality_score_updated_at,
            )
    except Exception:
        import logging
        logging.getLogger(__name__).warning("Failed to update quality score for Recipe #%d", instance.pk)
    finally:
        if hasattr(instance, "_updating_score"):
            delattr(instance, "_updating_score")


# ---------------------------------------------------------------------------
# Recipe audit log signals
# ---------------------------------------------------------------------------

_recipe_tracked_fields = {
    "title", "summary", "summary_long", "description", "recipe_type", "servings",
    "costs_rating", "execution_time", "preparation_time", "difficulty", "status",
    "visibility", "folder_id", "source_url",
}


@receiver(pre_save, sender=Recipe)
def capture_recipe_old_values(sender, instance: Recipe, **kwargs):
    """Store old values before save for audit logging."""
    if instance.pk is None:
        instance._old_values = {}
        return

    try:
        old = Recipe.objects.get(pk=instance.pk)
        instance._old_values = {
            field: getattr(old, field, None) for field in _recipe_tracked_fields
        }
    except Recipe.DoesNotExist:
        instance._old_values = {}


@receiver(post_save, sender=Recipe)
def log_recipe_changes(sender, instance: Recipe, created: bool, **kwargs):
    """Log field-level changes to ChangeAuditLog."""
    if created:
        return

    old_values = getattr(instance, "_old_values", {})
    if not old_values:
        return

    from content.services.audit_service import log_field_change

    user = getattr(instance, "_changed_by", None)

    for field in _recipe_tracked_fields:
        new_value = getattr(instance, field, None)
        old_value = old_values.get(field)
        if str(old_value) != str(new_value):
            log_field_change(instance, field, old_value, new_value, user=user)


def timezone_now():
    from django.utils import timezone
    return timezone.now()
