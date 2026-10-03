"""Buffet templates and the buffet builder endpoint of a meal."""

from typing import Any

from django.db.models import QuerySet
from django.http import Http404, HttpRequest
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from core.permissions import require_login
from planner.api.meal_plan import _require_access, _require_edit
from planner.models import BuffetTemplate, Meal, MealPlan
from planner.schemas.buffet import (
    BuffetResultOut,
    BuffetSaveIn,
    BuffetStateOut,
    BuffetTemplateOut,
)
from planner.services.buffet_service import (
    BuffetError,
    BuffetResult,
    BuffetSelection,
    compute_buffet,
    save_buffet,
)

buffet_router = Router(tags=["buffet"])


def _template_out(template: BuffetTemplate) -> dict[str, Any]:
    return {
        "id": template.id,
        "name": template.name,
        "slug": template.slug,
        "description": template.description,
        "meal_types": template.meal_types,
        "sort_order": template.sort_order,
        "roles": [
            {
                "role": {"slug": role.role.slug, "name": role.role.name, "icon": role.role.icon},
                "amount_per_person": role.amount_per_person,
                "unit": role.unit,
                "enabled_by_default": role.enabled_by_default,
                "sort_order": role.sort_order,
                "default_ingredient_ids": [ingredient.id for ingredient in role.default_ingredients.all()],
                "default_recipe_ids": [recipe.id for recipe in role.default_recipes.all()],
            }
            for role in template.roles.all()
        ],
    }


def active_templates() -> QuerySet[BuffetTemplate]:
    return BuffetTemplate.objects.filter(is_active=True).prefetch_related(
        "roles__role", "roles__default_ingredients", "roles__default_recipes"
    )


@buffet_router.get("/buffet-templates/", response=list[BuffetTemplateOut], auth=None)
def list_buffet_templates(request: HttpRequest, meal_type: str | None = None) -> list[dict[str, Any]]:
    """Active buffet templates, optionally for one meal type. Readable without login."""
    templates = list(active_templates())
    if meal_type:
        templates = [template for template in templates if meal_type in (template.meal_types or [])]
    return [_template_out(template) for template in templates]


def _result_out(result: BuffetResult, *, saved: bool) -> dict[str, Any]:
    return {
        "saved": saved,
        "portions": result.portions,
        "items": [vars(item) for item in result.items],
        "energy_kcal_per_person": (
            round(result.energy_kcal_per_person, 1) if result.energy_kcal_per_person is not None else None
        ),
        "target_kcal_per_person": round(result.target_kcal_per_person, 1),
        "cost_per_person": round(result.cost_per_person, 2) if result.cost_per_person is not None else None,
        "cost_total": round(result.cost_total, 2) if result.cost_total is not None else None,
        "warnings": [warning.as_dict() for warning in result.warnings],
    }


def _get_meal(meal_plan_id: int, meal_id: int, request: HttpRequest, *, edit: bool) -> Meal:
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    if edit:
        _require_edit(meal_plan, request.user)
    else:
        _require_access(meal_plan, request.user)
    return get_object_or_404(Meal, id=meal_id, meal_plan=meal_plan)


@buffet_router.get("/{meal_plan_id}/meals/{meal_id}/buffet/", response=BuffetStateOut)
def get_buffet_state(request: HttpRequest, meal_plan_id: int, meal_id: int) -> dict[str, Any]:
    """Saved template, selection and role amounts of a meal's buffet."""
    require_login(request)
    meal = _get_meal(meal_plan_id, meal_id, request, edit=False)
    from content.services.food_access import get_visible_ingredient_or_404, get_visible_recipe_or_404
    from supply.services.buffet_catalog import recipe_price_per_kg, recipe_weight_per_serving_g
    from supply.services.price_service import price_or_none

    selections = []
    saved_items = meal.items.exclude(buffet_role="").select_related("ingredient", "recipe").order_by("id")
    for item in saved_items:
        try:
            if item.ingredient_id is not None:
                ingredient = get_visible_ingredient_or_404(request.user, item.ingredient_id, allow_system_draft=True)
                price = price_or_none(ingredient.price_per_kg)
                selections.append(
                    {
                        "role_slug": item.buffet_role,
                        "ingredient_id": ingredient.id,
                        "recipe_id": None,
                        "kind": "ingredient",
                        "name": ingredient.name,
                        "energy_kcal_per_100g": ingredient.energy_kcal,
                        "price_per_kg": float(price) if price is not None else None,
                        "weight_per_serving_g": None,
                    }
                )
            elif item.recipe_id is not None:
                recipe = get_visible_recipe_or_404(request.user, item.recipe_id, allow_system_draft=True)
                selections.append(
                    {
                        "role_slug": item.buffet_role,
                        "ingredient_id": None,
                        "recipe_id": recipe.id,
                        "kind": "recipe",
                        "name": recipe.title,
                        "energy_kcal_per_100g": recipe.cached_energy_kcal,
                        "price_per_kg": recipe_price_per_kg(recipe),
                        "weight_per_serving_g": recipe_weight_per_serving_g(recipe),
                    }
                )
        except Http404:
            raise HttpError(404, "Zutat oder Rezept nicht gefunden") from None
    return {
        "template_id": meal.buffet_template_id,
        "selections": selections,
        "role_amounts": meal.buffet_role_amounts or {},
    }


@buffet_router.post("/{meal_plan_id}/meals/{meal_id}/buffet/", response=BuffetResultOut)
def save_meal_buffet(request: HttpRequest, meal_plan_id: int, meal_id: int, payload: BuffetSaveIn) -> dict[str, Any]:
    """Preview (``dry_run``) or save a buffet; quantities are computed here only."""
    from content.services.food_access import get_visible_ingredient_or_404, get_visible_recipe_or_404

    require_login(request)
    meal = _get_meal(meal_plan_id, meal_id, request, edit=True)
    template = get_object_or_404(active_templates(), id=payload.template_id)

    selections = []
    for selection in payload.selections:
        try:
            if selection.ingredient_id is not None:
                ingredient = get_visible_ingredient_or_404(
                    request.user, selection.ingredient_id, allow_system_draft=True
                )
                selections.append(BuffetSelection(role_slug=selection.role_slug, ingredient=ingredient))
            else:
                recipe = get_visible_recipe_or_404(request.user, selection.recipe_id, allow_system_draft=True)
                selections.append(BuffetSelection(role_slug=selection.role_slug, recipe=recipe))
        except Http404:
            raise HttpError(404, "Zutat oder Rezept nicht gefunden") from None

    try:
        if payload.dry_run:
            result = compute_buffet(template, selections, payload.role_amounts, meal)
        else:
            result = save_buffet(meal, template, selections, payload.role_amounts)
    except BuffetError as exc:
        raise HttpError(422, str(exc)) from exc
    return _result_out(result, saved=not payload.dry_run)
