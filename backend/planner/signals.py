"""Signals for updating Recipe.usage_count when MealItems change."""

from django.db.models import F
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from planner.models.meal_plan import MealItem


@receiver(post_save, sender=MealItem)
def increment_usage_count_on_create(sender, instance, created, **kwargs):
    """Increment recipe usage_count when a MealItem is created with a recipe."""
    if created and instance.recipe_id:
        from recipe.models import Recipe

        Recipe.objects.filter(pk=instance.recipe_id).update(
            usage_count=F("usage_count") + 1
        )


@receiver(pre_save, sender=MealItem)
def track_previous_recipe(sender, instance, **kwargs):
    """Store previous recipe_id before save to detect changes."""
    if instance.pk:
        try:
            instance._previous_recipe_id = MealItem.objects.values_list(
                "recipe_id", flat=True
            ).get(pk=instance.pk)
        except MealItem.DoesNotExist:
            instance._previous_recipe_id = None
    else:
        instance._previous_recipe_id = None


@receiver(post_save, sender=MealItem)
def update_usage_count_on_change(sender, instance, created, **kwargs):
    """Update usage_counts when a MealItem's recipe FK changes."""
    if created:
        return  # Handled by increment_usage_count_on_create

    from recipe.models import Recipe

    previous = getattr(instance, "_previous_recipe_id", None)
    current = instance.recipe_id

    if previous == current:
        return

    if previous:
        Recipe.objects.filter(pk=previous).update(usage_count=F("usage_count") - 1)
    if current:
        Recipe.objects.filter(pk=current).update(usage_count=F("usage_count") + 1)


@receiver(post_delete, sender=MealItem)
def decrement_usage_count_on_delete(sender, instance, **kwargs):
    """Decrement recipe usage_count when a MealItem is deleted."""
    if instance.recipe_id:
        from recipe.models import Recipe

        Recipe.objects.filter(pk=instance.recipe_id).update(
            usage_count=F("usage_count") - 1
        )
