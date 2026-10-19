"""Manual allocation rules: validation and creation."""

from __future__ import annotations

from ninja.errors import HttpError

from shopping.models import ShoppingAllocationRule, ShoppingList
from supply.models import Ingredient, Material

from .demand import event_meal_plans


def create_rule(
    *,
    event,
    user,
    target_id: int,
    ingredient_id: int | None,
    material_id: int | None,
    meal_id: int | None,
    quantity: float | None,
) -> ShoppingAllocationRule:
    if (ingredient_id is None) == (material_id is None):
        raise HttpError(422, "Bitte wähle entweder eine Zutat oder ein Material aus.")

    target = ShoppingList.objects.filter(id=target_id, event=event).first()
    if target is None:
        raise HttpError(422, "Der Einkauf gehört nicht zu diesem Event.")

    if ingredient_id is not None and not Ingredient.objects.filter(id=ingredient_id).exists():
        raise HttpError(422, "Zutat nicht gefunden")
    if material_id is not None and not Material.objects.filter(id=material_id).exists():
        raise HttpError(422, "Material nicht gefunden")

    if meal_id is not None:
        from planner.models import Meal

        plan_ids = [plan.id for plan in event_meal_plans(event)]
        if not Meal.objects.filter(id=meal_id, meal_plan_id__in=plan_ids).exists():
            raise HttpError(422, "Die Mahlzeit gehört nicht zu diesem Event.")

    if quantity is None:
        # A full move replaces an earlier full move of the same scope; otherwise the first rule would win forever
        ShoppingAllocationRule.objects.filter(
            event=event,
            ingredient_id=ingredient_id,
            material_id=material_id,
            meal_id=meal_id,
            quantity__isnull=True,
        ).delete()

    return ShoppingAllocationRule.objects.create(
        event=event,
        target=target,
        ingredient_id=ingredient_id,
        material_id=material_id,
        meal_id=meal_id,
        quantity=quantity,
        created_by=user,
    )
