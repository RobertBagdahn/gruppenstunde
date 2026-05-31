"""Django Ninja API routes for RefMeal (reference meals)."""

from django.db import transaction
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from planner.models import (
    MEAL_TYPE_DAY_FACTORS,
    Meal,
    MealItem,
    MealPlan,
)
from planner.schemas import (
    LinkMealIn,
    MealItemCreateIn,
    RefMealCreateIn,
    RefMealOut,
    RefMealUpdateIn,
)
from planner.api.meal_plan import _require_auth, _require_edit, _require_access

ref_meal_router = Router(tags=["ref-meals"])


def _get_plan(plan_id: int, user, edit: bool = False) -> MealPlan:
    plan = get_object_or_404(MealPlan, id=plan_id)
    if edit:
        _require_edit(plan, user)
    else:
        _require_access(plan, user)
    return plan


def _get_ref_meal(plan: MealPlan, ref_meal_id: int) -> Meal:
    meal = get_object_or_404(
        Meal, id=ref_meal_id, meal_plan=plan, is_reference=True
    )
    return meal


def _sync_ref_meal_to_targets(ref_meal: Meal) -> int:
    """Copy all MealItems from ref_meal to all synced meals. Returns count of synced meals."""
    targets = Meal.objects.filter(ref_meal=ref_meal, is_synced=True)
    ref_items = list(ref_meal.items.all())
    count = 0
    for target in targets:
        target.items.all().delete()
        for item in ref_items:
            MealItem.objects.create(
                meal=target,
                recipe=item.recipe,
                ingredient=item.ingredient,
                quantity=item.quantity,
                measuring_unit=item.measuring_unit,
                display_name=item.display_name,
                factor=item.factor,
            )
        count += 1
    return count


@ref_meal_router.get(
    "/{plan_id}/ref-meals/",
    response=list[RefMealOut],
    summary="Liste aller RefMeals eines Plans",
)
def list_ref_meals(request, plan_id: int):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user)
    return plan.meals.filter(is_reference=True).prefetch_related("items__recipe", "items__ingredient", "items__measuring_unit", "synced_meals")


@ref_meal_router.post(
    "/{plan_id}/ref-meals/",
    response={201: RefMealOut},
    summary="RefMeal erstellen",
)
def create_ref_meal(request, plan_id: int, payload: RefMealCreateIn):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user, edit=True)

    # Check uniqueness
    if plan.meals.filter(is_reference=True, meal_type=payload.meal_type).exists():
        raise HttpError(409, f"Es existiert bereits ein RefMeal vom Typ '{payload.meal_type}' für diesen Plan.")

    day_part_factor = payload.day_part_factor or MEAL_TYPE_DAY_FACTORS.get(payload.meal_type, 0.25)
    meal = Meal.objects.create(
        meal_plan=plan,
        meal_type=payload.meal_type,
        day_part_factor=day_part_factor,
        is_reference=True,
        start_datetime=None,
        end_datetime=None,
    )
    return 201, meal


@ref_meal_router.get(
    "/{plan_id}/ref-meals/{ref_meal_id}/",
    response=RefMealOut,
    summary="RefMeal Detail",
)
def get_ref_meal(request, plan_id: int, ref_meal_id: int):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user)
    return _get_ref_meal(plan, ref_meal_id)


@ref_meal_router.put(
    "/{plan_id}/ref-meals/{ref_meal_id}/",
    response=RefMealOut,
    summary="RefMeal aktualisieren (Items ersetzen)",
)
@transaction.atomic
def update_ref_meal(request, plan_id: int, ref_meal_id: int, payload: RefMealUpdateIn):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user, edit=True)
    ref_meal = _get_ref_meal(plan, ref_meal_id)

    if payload.day_part_factor is not None:
        ref_meal.day_part_factor = payload.day_part_factor
        ref_meal.save(update_fields=["day_part_factor"])

    if payload.items is not None:
        ref_meal.items.all().delete()
        for item_in in payload.items:
            MealItem.objects.create(
                meal=ref_meal,
                recipe_id=item_in.recipe_id,
                ingredient_id=item_in.ingredient_id,
                quantity=item_in.quantity,
                measuring_unit_id=item_in.measuring_unit_id,
                display_name=item_in.display_name,
                factor=item_in.factor,
            )

    ref_meal.refresh_from_db()
    return ref_meal


@ref_meal_router.delete(
    "/{plan_id}/ref-meals/{ref_meal_id}/",
    response={204: None},
    summary="RefMeal löschen",
)
@transaction.atomic
def delete_ref_meal(request, plan_id: int, ref_meal_id: int):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user, edit=True)
    ref_meal = _get_ref_meal(plan, ref_meal_id)

    # Unlink all synced meals
    Meal.objects.filter(ref_meal=ref_meal).update(ref_meal=None, is_synced=False)
    ref_meal.delete()
    return 204, None


@ref_meal_router.post(
    "/{plan_id}/ref-meals/{ref_meal_id}/sync",
    response={200: dict},
    summary="RefMeal auf alle verknüpften Meals synchronisieren",
)
@transaction.atomic
def sync_ref_meal(request, plan_id: int, ref_meal_id: int):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user, edit=True)
    ref_meal = _get_ref_meal(plan, ref_meal_id)

    count = _sync_ref_meal_to_targets(ref_meal)
    return {"synced_meals": count}


@ref_meal_router.post(
    "/{plan_id}/meals/{meal_id}/link",
    response={200: dict},
    summary="Meal mit RefMeal verknüpfen",
)
@transaction.atomic
def link_meal(request, plan_id: int, meal_id: int, payload: LinkMealIn):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user, edit=True)
    meal = get_object_or_404(Meal, id=meal_id, meal_plan=plan, is_reference=False)
    ref_meal = _get_ref_meal(plan, payload.ref_meal_id)

    if meal.meal_type != ref_meal.meal_type:
        raise HttpError(400, "Meal-Typ stimmt nicht mit RefMeal überein.")

    meal.ref_meal = ref_meal
    meal.is_synced = True
    meal.save(update_fields=["ref_meal", "is_synced"])

    # Sync items immediately
    meal.items.all().delete()
    for item in ref_meal.items.all():
        MealItem.objects.create(
            meal=meal,
            recipe=item.recipe,
            ingredient=item.ingredient,
            quantity=item.quantity,
            measuring_unit=item.measuring_unit,
            display_name=item.display_name,
            factor=item.factor,
        )

    return {"linked": True}


@ref_meal_router.post(
    "/{plan_id}/meals/{meal_id}/unlink",
    response={200: dict},
    summary="Meal vom RefMeal entkoppeln",
)
def unlink_meal(request, plan_id: int, meal_id: int):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user, edit=True)
    meal = get_object_or_404(Meal, id=meal_id, meal_plan=plan, is_reference=False)

    meal.is_synced = False
    meal.save(update_fields=["is_synced"])
    return {"unlinked": True}


@ref_meal_router.post(
    "/{plan_id}/meals/link-all",
    response={200: dict},
    summary="Alle Meals eines Typs verknüpfen und synchronisieren",
)
@transaction.atomic
def link_all_meals(request, plan_id: int, meal_type: str):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user, edit=True)

    ref_meal = plan.meals.filter(is_reference=True, meal_type=meal_type).first()
    if not ref_meal:
        raise HttpError(404, f"Kein RefMeal vom Typ '{meal_type}' gefunden.")

    meals = plan.meals.filter(meal_type=meal_type, is_reference=False)
    meals.update(ref_meal=ref_meal, is_synced=True)

    count = _sync_ref_meal_to_targets(ref_meal)
    return {"linked_meals": count}
