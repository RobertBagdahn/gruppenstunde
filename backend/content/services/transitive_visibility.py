"""Transitive content visibility helpers.

A draft `Recipe` is transitively visible to a user if it's referenced by a
`MealItem` in a `MealPlan` the user collaborates on (via `ContentCollaborator`).
A draft `Ingredient` is transitively visible if it's used (via a `Portion` /
`RecipeItem`) in a recipe that is itself visible to the user (directly or
transitively).

These helpers intentionally only affect single-object detail lookups, never
list/queryset filters — transitively-visible drafts must not leak into global
list endpoints.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from recipe.models import Recipe
    from supply.models import Ingredient


def _mealplan_collaborator_ids_for_user(user) -> set[int]:
    """MealPlan IDs the user has ContentCollaborator access to (any role)."""
    from django.contrib.contenttypes.models import ContentType

    from content.models import ContentCollaborator
    from planner.models import MealPlan

    ct = ContentType.objects.get_for_model(MealPlan)
    return set(
        ContentCollaborator.objects.filter(content_type=ct, user=user).values_list("object_id", flat=True)
    )


def recipe_visible_transitively(recipe: "Recipe", user) -> bool:
    """Whether `recipe` is visible to `user` via a shared MealPlan referencing it."""
    if not user.is_authenticated:
        return False

    from planner.models import MealItem

    meal_plan_ids = set(
        MealItem.objects.filter(recipe=recipe).values_list("meal__meal_plan_id", flat=True).distinct()
    )
    if not meal_plan_ids:
        return False

    return bool(meal_plan_ids & _mealplan_collaborator_ids_for_user(user))


def ingredient_visible_transitively(ingredient: "Ingredient", user) -> bool:
    """Whether `ingredient` is visible to `user` via a recipe that uses it and
    is itself visible to the user (directly owned or transitively via MealPlan).
    """
    if not user.is_authenticated:
        return False

    from recipe.models import Recipe, RecipeItem

    recipe_ids = list(
        RecipeItem.objects.filter(portion__ingredient=ingredient).values_list("recipe_id", flat=True).distinct()
    )
    if not recipe_ids:
        return False

    recipes = Recipe.objects.filter(id__in=recipe_ids)
    for recipe in recipes:
        if recipe.created_by_id == user.id:
            return True
        if getattr(recipe, "owner_id", None) == user.id:
            return True
        if recipe_visible_transitively(recipe, user):
            return True
    return False
