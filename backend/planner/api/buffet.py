"""Buffet templates and the buffet builder endpoint of a meal."""

# Pyright cannot resolve Django-generated fields/managers; mypy-django is the ORM type gate.
# pyright: reportAttributeAccessIssue=false

from django.http import Http404
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


def _template_out(template: BuffetTemplate) -> dict:
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


def active_templates():
    return BuffetTemplate.objects.filter(is_active=True).prefetch_related(
        "roles__role", "roles__default_ingredients", "roles__default_recipes"
    )


@buffet_router.get("/buffet-templates/", response=list[BuffetTemplateOut], auth=None)
def list_buffet_templates(request, meal_type: str | None = None):
    """Active buffet templates, optionally for one meal type. Readable without login."""
    templates = list(active_templates())
    if meal_type:
        templates = [template for template in templates if meal_type in (template.meal_types or [])]
    return [_template_out(template) for template in templates]


def _result_out(result: BuffetResult, *, saved: bool) -> dict:
    return {
        "saved": saved,
        "portions": result.portions,
        "items": [vars(item) for item in result.items],
        "energy_kcal_per_person": round(result.energy_kcal_per_person, 1),
        "target_kcal_per_person": round(result.target_kcal_per_person, 1),
        "cost_per_person": round(result.cost_per_person, 2),
        "cost_total": round(result.cost_total, 2),
        "warnings": [warning.as_dict() for warning in result.warnings],
    }


def _get_meal(meal_plan_id: int, meal_id: int, request, *, edit: bool) -> Meal:
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    if edit:
        _require_edit(meal_plan, request.user)
    else:
        _require_access(meal_plan, request.user)
    return get_object_or_404(Meal, id=meal_id, meal_plan=meal_plan)


@buffet_router.get("/{meal_plan_id}/meals/{meal_id}/buffet/", response=BuffetStateOut)
def get_buffet_state(request, meal_plan_id: int, meal_id: int):
    """Saved template, selection and role amounts of a meal's buffet."""
    require_login(request)
    meal = _get_meal(meal_plan_id, meal_id, request, edit=False)
    selections = [
        {"role_slug": item.buffet_role, "ingredient_id": item.ingredient_id, "recipe_id": item.recipe_id}
        for item in meal.items.exclude(buffet_role="").order_by("id")
    ]
    return {
        "template_id": meal.buffet_template_id,
        "selections": selections,
        "role_amounts": meal.buffet_role_amounts or {},
    }


@buffet_router.post("/{meal_plan_id}/meals/{meal_id}/buffet/", response=BuffetResultOut)
def save_meal_buffet(request, meal_plan_id: int, meal_id: int, payload: BuffetSaveIn):
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
            elif selection.recipe_id is not None:
                recipe = get_visible_recipe_or_404(request.user, selection.recipe_id, allow_system_draft=True)
                selections.append(BuffetSelection(role_slug=selection.role_slug, recipe=recipe))
            else:
                raise HttpError(422, "Jede Buffet-Auswahl braucht eine Zutat oder ein Rezept")
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
