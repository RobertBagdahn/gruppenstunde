"""Django Ninja API routes for RefMeal (reference meals)."""

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from planner.api.meal_plan import _get_user_role, _require_access, _require_auth, _require_edit
from planner.models import (
    MEAL_TYPE_DAY_FACTORS,
    Meal,
    MealItem,
    MealPlan,
    MealPlanCollaboratorRole,
)
from planner.schemas import (
    LinkMealIn,
    RefMealCreateIn,
    RefMealOut,
    RefMealUpdateIn,
)


def _create_ref_meal_item(**kwargs):
    try:
        return MealItem.objects.create(**kwargs)
    except IntegrityError as e:
        from planner.api.meal_plan import _describe_integrity_error

        raise _describe_integrity_error(
            e,
            kwargs.get("ingredient_id") or kwargs.get("ingredient"),
            kwargs.get("recipe_id") or kwargs.get("recipe"),
        )


ref_meal_router = Router(tags=["ref-meals"])


def _get_plan(plan_id: int, user, edit: bool = False) -> MealPlan:
    plan = get_object_or_404(MealPlan, id=plan_id)
    if edit:
        _require_edit(plan, user)
    else:
        _require_access(plan, user)
    return plan


def _get_ref_meal(plan: MealPlan, ref_meal_id: int) -> Meal:
    meal = get_object_or_404(Meal, id=ref_meal_id, meal_plan=plan, is_reference=True)
    return meal


def _validate_ref_meal_items(ref_meal: Meal):
    """Check that ref_meal items don't contain duplicates within themselves."""
    recipe_ids = []
    ingredient_ids = []
    for item in ref_meal.items.all():
        if item.recipe_id:
            if item.recipe_id in recipe_ids:
                raise HttpError(422, f"Rezept «{item.recipe.title}» ist mehrfach im RefMeal enthalten")
            recipe_ids.append(item.recipe_id)
        if item.ingredient_id:
            if item.ingredient_id in ingredient_ids:
                raise HttpError(422, f"Zutat «{item.ingredient.name}» ist mehrfach im RefMeal enthalten")
            ingredient_ids.append(item.ingredient_id)


def _sync_ref_meal_to_targets(ref_meal: Meal) -> int:
    """Copy all MealItems from ref_meal to all synced meals. Returns count of synced meals."""
    targets = Meal.objects.filter(ref_meal=ref_meal, is_synced=True)
    ref_items = list(ref_meal.items.all())
    count = 0
    for target in targets:
        target.items.all().delete()
        for item in ref_items:
            _create_ref_meal_item(
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
    return plan.meals.filter(is_reference=True).prefetch_related(
        "items__recipe", "items__ingredient", "items__measuring_unit", "synced_meals"
    )


@ref_meal_router.post(
    "/{plan_id}/ref-meals/",
    response={201: RefMealOut},
    summary="RefMeal erstellen",
)
@transaction.atomic
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

    if payload.items:
        from planner.api.meal_plan import check_duplicates_in_input

        check_duplicates_in_input(payload.items)
        for item_in in payload.items:
            _create_ref_meal_item(
                meal=meal,
                recipe_id=item_in.recipe_id,
                ingredient_id=item_in.ingredient_id,
                quantity=item_in.quantity,
                measuring_unit_id=item_in.measuring_unit_id,
                display_name=item_in.display_name,
                factor=item_in.factor,
            )

    meal.refresh_from_db()
    return 201, meal


@ref_meal_router.get(
    "/{plan_id}/ref-meals/{ref_meal_id}/",
    response=RefMealOut,
    summary="RefMeal Detail",
)
def get_ref_meal(request, plan_id: int, ref_meal_id: int):
    _require_auth(request)
    plan = _get_plan(plan_id, request.user)
    ref_meal = _get_ref_meal(plan, ref_meal_id)
    role = _get_user_role(plan, request.user)
    ref_meal.can_edit = role in ("owner", MealPlanCollaboratorRole.ADMIN, MealPlanCollaboratorRole.EDITOR)
    ref_meal.can_delete = role == "owner"
    return ref_meal


@ref_meal_router.put(
    "/{plan_id}/ref-meals/{ref_meal_id}/",
    response=RefMealOut,
    summary="RefMeal aktualisieren (Items ersetzen, verlinkte Mahlzeiten automatisch synchronisieren)",
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
        from planner.api.meal_plan import check_duplicates_in_input

        check_duplicates_in_input(payload.items)
        ref_meal.items.all().delete()
        for item_in in payload.items:
            _create_ref_meal_item(
                meal=ref_meal,
                recipe_id=item_in.recipe_id,
                ingredient_id=item_in.ingredient_id,
                quantity=item_in.quantity,
                measuring_unit_id=item_in.measuring_unit_id,
                display_name=item_in.display_name,
                factor=item_in.factor,
            )

    ref_meal.refresh_from_db()

    # Auto-sync verlinkte (is_synced=true) Mahlzeiten mit der aktualisierten Vorlage.
    _validate_ref_meal_items(ref_meal)
    synced_meal_count = _sync_ref_meal_to_targets(ref_meal)
    ref_meal.synced_meal_count = synced_meal_count
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

    _validate_ref_meal_items(ref_meal)
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

    _validate_ref_meal_items(ref_meal)

    meal.ref_meal = ref_meal
    meal.is_synced = True
    meal.save(update_fields=["ref_meal", "is_synced"])

    # Sync items immediately
    meal.items.all().delete()
    for item in ref_meal.items.all():
        _create_ref_meal_item(
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
