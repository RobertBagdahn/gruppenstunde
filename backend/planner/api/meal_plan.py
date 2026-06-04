"""Django Ninja API routes for the MealPlan module."""

import datetime as dt

from django.db.models import Q, Prefetch
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeItem

from planner.models import (
    MEAL_TYPE_DAY_FACTORS,
    Meal,
    MealPlan,
    MealPlanCollaborator,
    MealPlanCollaboratorRole,
    MealItem,
    MealItemOverride,
)
from planner.schemas import (
    MealCreateIn,
    MealDayBulkCreateIn,
    MealPlanCostSummaryOut,
    MealPlanCreateIn,
    MealPlanDetailOut,
    MealPlanDuplicateIn,
    MealPlanOut,
    MealPlanUpdateIn,
    MealItemCreateIn,
    MealItemOut,
    MealItemUpdateIn,
    CopyMealItemIn,
    MealItemOverrideIn,
    MealItemOverrideOut,
    MealOut,
    MealUpdateIn,
    NutritionSummaryOut,
    ShoppingListItemOut,
    MealPlanCollaboratorOut,
    MealPlanCollaboratorCreateIn,
    MealPlanCollaboratorUpdateIn,
    RecipeSuggestionOut,
)

meal_plan_router = Router(tags=["meal-plans"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def _get_user_role(meal_plan: MealPlan, user) -> str | None:
    """Return the effective role of a user for a meal plan.

    Returns 'owner' for the creator, the collaborator role string,
    or None if the user has no access. Staff always gets 'owner'.
    """
    if user.is_staff:
        return "owner"
    if meal_plan.created_by_id == user.id:
        return "owner"
    try:
        collab = MealPlanCollaborator.objects.get(meal_plan=meal_plan, user=user)
        return collab.role
    except MealPlanCollaborator.DoesNotExist:
        return None


def _require_access(meal_plan: MealPlan, user) -> str:
    """Require at least viewer access. Returns the role."""
    role = _get_user_role(meal_plan, user)
    if role is None:
        raise HttpError(404, "Essensplan nicht gefunden")
    return role


def _require_edit(meal_plan: MealPlan, user) -> str:
    """Require at least editor access. Returns the role."""
    role = _require_access(meal_plan, user)
    if role == MealPlanCollaboratorRole.VIEWER:
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten")
    return role


def _require_admin(meal_plan: MealPlan, user) -> str:
    """Require at least admin access. Returns the role."""
    role = _require_access(meal_plan, user)
    if role not in ("owner", MealPlanCollaboratorRole.ADMIN):
        raise HttpError(403, "Nur Admins und Besitzer können das ändern")
    return role


# ==========================================================================
# MealPlan CRUD
# ==========================================================================


@meal_plan_router.get("/", response=list[MealPlanOut])
def list_meal_plans(request):
    """List meal plans the user owns or collaborates on."""
    _require_auth(request)

    qs = MealPlan.objects.select_related("event").prefetch_related("meals")

    if request.user.is_staff:
        return qs.all()

    return qs.filter(
        Q(created_by=request.user) | Q(collaborators__user=request.user)
    ).distinct()


@meal_plan_router.post("/", response=MealPlanOut)
def create_meal_plan(request, payload: MealPlanCreateIn):
    """Create a new meal plan with auto-generated default meals."""
    _require_auth(request)

    data = payload.dict(exclude={"event_id", "start_datetime", "end_datetime"})
    meal_plan = MealPlan(created_by=request.user, **data)

    # Optional event binding
    if payload.event_id is not None:
        from event.models import Event

        event = get_object_or_404(Event, id=payload.event_id)
        meal_plan.event = event

    # Set start/end datetime
    if payload.start_datetime and payload.end_datetime:
        meal_plan.start_datetime = payload.start_datetime
        meal_plan.end_datetime = payload.end_datetime
    elif meal_plan.event and meal_plan.event.start_date and meal_plan.event.end_date:
        meal_plan.start_datetime = meal_plan.event.start_date
        meal_plan.end_datetime = meal_plan.event.end_date

    meal_plan.save()

    # Generate default meals for date range (time-aware)
    if meal_plan.start_datetime and meal_plan.end_datetime:
        start_date = meal_plan.start_datetime.date()
        end_date = meal_plan.end_datetime.date()
        current = start_date
        while current <= end_date:
            is_first = current == start_date
            is_last = current == end_date
            meal_plan.create_meals_for_date_timeaware(current, is_first=is_first, is_last=is_last)
            current += dt.timedelta(days=1)

    return meal_plan


@meal_plan_router.get("/{meal_plan_id}/", response=MealPlanDetailOut)
def get_meal_plan(request, meal_plan_id: int):
    """Get a meal plan with all meals and items."""
    _require_auth(request)

    meal_plan = get_object_or_404(
        MealPlan.objects.select_related("event").prefetch_related(
            Prefetch(
                "meals__items",
                queryset=MealItem.objects.select_related("recipe", "meal__meal_plan"),
            ),
        ),
        id=meal_plan_id,
    )

    role = _require_access(meal_plan, request.user)
    meal_plan.can_edit = role in ("owner", MealPlanCollaboratorRole.ADMIN, MealPlanCollaboratorRole.EDITOR)
    return meal_plan


@meal_plan_router.patch("/{meal_plan_id}/", response=MealPlanOut)
def update_meal_plan(request, meal_plan_id: int, payload: MealPlanUpdateIn):
    """Update a meal plan (owner/staff only)."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(meal_plan, field, value)
    meal_plan.save()
    return meal_plan


@meal_plan_router.delete("/{meal_plan_id}/")
def delete_meal_plan(request, meal_plan_id: int):
    """Delete a meal plan and all its meals/items."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_admin(meal_plan, request.user)

    meal_plan.delete()
    return {"success": True, "message": "Essensplan gelöscht"}


@meal_plan_router.post("/{meal_plan_id}/duplicate/", response=MealPlanOut)
def duplicate_meal_plan(request, meal_plan_id: int, payload: MealPlanDuplicateIn):
    """Duplicate a meal plan with new name, start date, and portions."""
    from django.db import transaction

    _require_auth(request)
    source = get_object_or_404(
        MealPlan.objects.prefetch_related("meals__items"),
        id=meal_plan_id,
    )
    _require_access(source, request.user)

    if not source.start_datetime:
        raise HttpError(400, "Quell-Essensplan hat kein Startdatum")

    offset = payload.start_datetime - source.start_datetime

    with transaction.atomic():
        new_plan = MealPlan(
            name=payload.name,
            description=source.description,
            norm_portions=payload.norm_portions,
            reserve_factor=source.reserve_factor,
            start_datetime=payload.start_datetime,
            end_datetime=source.end_datetime + offset if source.end_datetime else None,
            created_by=request.user,
        )
        new_plan.save()

        for meal in source.meals.all():
            new_meal = Meal(
                meal_plan=new_plan,
                start_datetime=meal.start_datetime + offset,
                end_datetime=meal.end_datetime + offset,
                meal_type=meal.meal_type,
                day_part_factor=meal.day_part_factor,
                override_portions=meal.override_portions,
            )
            new_meal.save()

            for item in meal.items.all():
                MealItem.objects.create(
                    meal=new_meal,
                    recipe=item.recipe,
                    ingredient=item.ingredient,
                    quantity=item.quantity,
                    measuring_unit=item.measuring_unit,
                    display_name=item.display_name,
                    factor=item.factor,
                )

    return new_plan


# ==========================================================================
# Day Management (convenience endpoints)
# ==========================================================================


@meal_plan_router.post("/{meal_plan_id}/days/", response=list[MealOut])
def add_day(request, meal_plan_id: int, payload: MealDayBulkCreateIn):
    """Add a day with default meals (breakfast, lunch, dinner)."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    if Meal.objects.filter(meal_plan=meal_plan, start_datetime__date=payload.date).exists():
        raise HttpError(400, "Dieser Tag existiert bereits im Essensplan")

    meals = meal_plan.create_default_meals_for_date(payload.date)
    return meals


@meal_plan_router.delete("/{meal_plan_id}/days/")
def remove_day(request, meal_plan_id: int, date: dt.date):
    """Remove all meals for a specific date."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    meals = Meal.objects.filter(meal_plan=meal_plan, start_datetime__date=date)
    if not meals.exists():
        raise HttpError(404, "Keine Mahlzeiten für dieses Datum gefunden")

    meals.delete()
    return {"success": True}


@meal_plan_router.post("/{meal_plan_id}/add-day-before/", response=list[MealOut])
def add_day_before(request, meal_plan_id: int):
    """Add a day before the current start, shifting start_datetime back by one day."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    if not meal_plan.start_datetime or not meal_plan.end_datetime:
        raise HttpError(400, "Essensplan hat kein Start-/Enddatum")

    # Backfill the current first day (it becomes a middle day now)
    old_first_date = meal_plan.start_datetime.date()
    meal_plan.create_meals_for_date_timeaware(old_first_date, is_first=False, is_last=False)

    # Shift start back by one day
    meal_plan.start_datetime -= dt.timedelta(days=1)
    meal_plan.save(update_fields=["start_datetime", "updated_at"])

    # Create meals for new first day (filtered by start time)
    new_first_date = meal_plan.start_datetime.date()
    new_meals = meal_plan.create_meals_for_date_timeaware(new_first_date, is_first=True, is_last=False)
    return new_meals


@meal_plan_router.post("/{meal_plan_id}/add-day-after/", response=list[MealOut])
def add_day_after(request, meal_plan_id: int):
    """Add a day after the current end, shifting end_datetime forward by one day."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    if not meal_plan.start_datetime or not meal_plan.end_datetime:
        raise HttpError(400, "Essensplan hat kein Start-/Enddatum")

    # Backfill the current last day (it becomes a middle day now)
    old_last_date = meal_plan.end_datetime.date()
    meal_plan.create_meals_for_date_timeaware(old_last_date, is_first=False, is_last=False)

    # Shift end forward by one day
    meal_plan.end_datetime += dt.timedelta(days=1)
    meal_plan.save(update_fields=["end_datetime", "updated_at"])

    # Create meals for new last day (filtered by end time)
    new_last_date = meal_plan.end_datetime.date()
    new_meals = meal_plan.create_meals_for_date_timeaware(new_last_date, is_first=False, is_last=True)
    return new_meals


# ==========================================================================
# Meal Management
# ==========================================================================


@meal_plan_router.post("/{meal_plan_id}/meals/", response=MealOut)
def add_meal(request, meal_plan_id: int, payload: MealCreateIn):
    """Add a meal to a meal plan."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    meal_date = payload.start_datetime.date()
    if Meal.objects.filter(
        meal_plan=meal_plan,
        start_datetime__date=meal_date,
        meal_type=payload.meal_type,
    ).exists():
        raise HttpError(400, "Diese Mahlzeit existiert bereits für diesen Tag")

    day_part_factor = payload.day_part_factor
    if day_part_factor is None:
        day_part_factor = MEAL_TYPE_DAY_FACTORS.get(payload.meal_type, 0.0)

    meal = Meal.objects.create(
        meal_plan=meal_plan,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        meal_type=payload.meal_type,
        day_part_factor=day_part_factor,
    )
    return meal


@meal_plan_router.delete("/{meal_plan_id}/meals/{meal_id}/")
def remove_meal(request, meal_plan_id: int, meal_id: int):
    """Remove a meal and all its items."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    meal = get_object_or_404(Meal, id=meal_id, meal_plan=meal_plan)
    meal.delete()
    return {"success": True}


# ==========================================================================
# MealItem Management
# ==========================================================================


@meal_plan_router.post("/{meal_plan_id}/meals/{meal_id}/items/", response=MealItemOut)
def add_meal_item(request, meal_plan_id: int, meal_id: int, payload: MealItemCreateIn):
    """Add a recipe or ingredient to a meal."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    meal = get_object_or_404(Meal, id=meal_id, meal_plan=meal_plan)

    if payload.recipe_id and payload.ingredient_id:
        raise HttpError(422, "Entweder Rezept oder Zutat angeben, nicht beides")
    if not payload.recipe_id and not payload.ingredient_id:
        raise HttpError(422, "Rezept oder Zutat muss angegeben werden")

    recipe = None
    ingredient = None
    if payload.recipe_id:
        recipe = get_object_or_404(Recipe, id=payload.recipe_id)
    if payload.ingredient_id:
        from supply.models import Ingredient
        ingredient = get_object_or_404(Ingredient, id=payload.ingredient_id)

    item = MealItem.objects.create(
        meal=meal,
        recipe=recipe,
        ingredient=ingredient,
        quantity=payload.quantity,
        measuring_unit_id=payload.measuring_unit_id,
        display_name=payload.display_name,
        factor=payload.factor,
    )
    return item


@meal_plan_router.delete("/{meal_plan_id}/meal-items/{item_id}/")
def remove_meal_item(request, meal_plan_id: int, item_id: int):
    """Remove a recipe from a meal."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    item = get_object_or_404(
        MealItem,
        id=item_id,
        meal__meal_plan=meal_plan,
    )
    item.delete()
    return {"success": True}


@meal_plan_router.patch("/{meal_plan_id}/meal-items/{item_id}/", response=MealItemOut)
def update_meal_item(request, meal_plan_id: int, item_id: int, payload: MealItemUpdateIn):
    """Update a meal item (e.g. factor)."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    item = get_object_or_404(
        MealItem,
        id=item_id,
        meal__meal_plan=meal_plan,
    )
    if payload.factor is not None:
        item.factor = payload.factor
        item.save(update_fields=["factor"])
    return item


# ==========================================================================
# Meal Update (notes, portions override)
# ==========================================================================


@meal_plan_router.patch("/{meal_plan_id}/meals/{meal_id}/", response=MealOut)
def update_meal(request, meal_plan_id: int, meal_id: int, payload: MealUpdateIn):
    """Update meal notes, override_portions, or note visibility."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    meal = get_object_or_404(Meal, id=meal_id, meal_plan=meal_plan)

    if payload.override_portions is not None:
        meal.override_portions = payload.override_portions if payload.override_portions > 0 else None
    if payload.note is not None:
        meal.note = payload.note
    if payload.note_is_published is not None:
        meal.note_is_published = payload.note_is_published
    if payload.day_part_factor is not None:
        meal.day_part_factor = payload.day_part_factor
    if payload.is_external is not None:
        meal.is_external = payload.is_external
    if "external_energy_kcal" in payload.dict(exclude_unset=True):
        if payload.external_energy_kcal is not None:
            from recipe.services.nutrition_units import kcal_to_kj
            meal.external_energy_kj = kcal_to_kj(payload.external_energy_kcal)
        else:
            meal.external_energy_kj = None
    if "external_cost_per_person" in payload.dict(exclude_unset=True):
        meal.external_cost_per_person = payload.external_cost_per_person

    meal.save()
    return meal


@meal_plan_router.post("/{meal_plan_id}/meals/{meal_id}/scale-to-target/", response=MealOut)
def scale_meal_to_target(request, meal_plan_id: int, meal_id: int):
    """Scale all items in a meal proportionally to target calories."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    meal = get_object_or_404(Meal, id=meal_id, meal_plan=meal_plan)

    if meal.is_synced:
        raise HttpError(400, "Synchronisierte Mahlzeiten können nicht skaliert werden.")
    if meal.is_external:
        raise HttpError(400, "Externe Mahlzeiten können nicht skaliert werden.")

    from recipe.services.nutrition_units import kj_to_kcal
    portions = meal.override_portions or meal_plan.norm_portions or 1
    
    current_energy_kj = MealOut.resolve_total_energy_kj(meal)
    current_kcal = kj_to_kcal(current_energy_kj) / portions

    if current_kcal <= 0:
        raise HttpError(400, "Mahlzeit enthält keine Kalorien, Skalierung nicht möglich.")

    target_kcal = 2335.0 * meal.day_part_factor
    scale = target_kcal / current_kcal

    from django.db import transaction
    with transaction.atomic():
        for item in meal.items.all():
            item.factor = round(item.factor * scale, 1)
            item.save()

    meal.refresh_from_db()
    return meal


@meal_plan_router.post("/{meal_plan_id}/meal-items/{item_id}/copy/", response=MealItemOut)
def copy_meal_item(request, meal_plan_id: int, item_id: int, payload: CopyMealItemIn):
    """Copy or duplicate a meal item."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    item = get_object_or_404(MealItem, id=item_id, meal__meal_plan=meal_plan)

    target_meal_id = payload.target_meal_id
    if target_meal_id is None:
        target_meal = item.meal
    else:
        target_meal = get_object_or_404(Meal, id=target_meal_id, meal_plan=meal_plan)

    if target_meal.is_synced:
        raise HttpError(400, "Einträge können nicht in synchronisierte Mahlzeiten kopiert werden.")

    copied_item = MealItem.objects.create(
        meal=target_meal,
        recipe=item.recipe,
        ingredient=item.ingredient,
        quantity=item.quantity,
        measuring_unit=item.measuring_unit,
        factor=item.factor,
        display_name=item.display_name,
    )
    return copied_item


# ==========================================================================
# MealItem Overrides
# ==========================================================================


@meal_plan_router.patch(
    "/{meal_plan_id}/meal-items/{item_id}/overrides/",
    response=list[MealItemOverrideOut],
)
def set_meal_item_overrides(
    request, meal_plan_id: int, item_id: int, payload: list[MealItemOverrideIn]
):
    """Set overrides for a meal item's recipe ingredients."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    item = get_object_or_404(MealItem, id=item_id, meal__meal_plan=meal_plan)

    if not item.recipe:
        raise HttpError(422, "Overrides nur für Rezept-Einträge möglich")

    # Clear existing overrides and recreate
    MealItemOverride.objects.filter(meal_item=item).delete()

    overrides = []
    for override_in in payload:
        # Verify recipe_item belongs to this recipe
        recipe_item = get_object_or_404(
            RecipeItem, id=override_in.recipe_item_id, recipe=item.recipe
        )
        override = MealItemOverride.objects.create(
            meal_item=item,
            recipe_item=recipe_item,
            quantity_override=override_in.quantity_override,
            excluded=override_in.excluded,
        )
        overrides.append(override)

    return overrides


# ==========================================================================
# Nutrition Summary
# ==========================================================================


@meal_plan_router.get("/{meal_plan_id}/nutrition-summary/", response=NutritionSummaryOut)
def nutrition_summary(request, meal_plan_id: int, date: dt.date | None = None):
    """Get aggregated nutritional values for the entire meal plan, optionally filtered by date."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_access(meal_plan, request.user)

    # Collect all MealItems
    meal_items_qs = MealItem.objects.filter(
        meal__meal_plan=meal_plan,
    )
    if date:
        meal_items_qs = meal_items_qs.filter(meal__start_datetime__date=date)
    meal_items = meal_items_qs.select_related("recipe", "meal")

    totals = {
        "energy_kj": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
    }

    norm_portions = meal_plan.norm_portions or 1

    for mi in meal_items:
        if not mi.recipe:
            continue

        # Get all RecipeItems for this recipe and aggregate their nutritional data
        recipe_items = RecipeItem.objects.filter(
            recipe=mi.recipe,
        ).select_related("portion__ingredient")

        recipe_servings = mi.recipe.servings or 1

        for ri in recipe_items:
            if not ri.portion or not ri.portion.ingredient:
                continue

            ing = ri.portion.ingredient
            # RecipeItem quantity is in the portion unit; portion.weight_g converts to grams
            weight_g = ri.quantity * ri.portion.weight_g if ri.portion.weight_g else 0
            # Scale factor: per 100g, then by item factor, scaled to norm_portions
            scale = (weight_g / 100.0) * mi.factor * (norm_portions / recipe_servings)

            for field in totals:
                if field == "energy_kj" and mi.meal.meal_type == "drinks":
                    continue
                ing_val = getattr(ing, field, None)
                if ing_val is not None:
                    totals[field] += float(ing_val) * scale

    # Calculate per-portion values
    per_portion = {f"per_portion_{field}": totals[field] / norm_portions for field in totals}

    return NutritionSummaryOut(
        **totals,
        **per_portion,
        norm_portions=meal_plan.norm_portions,
        reserve_factor=meal_plan.reserve_factor,
        scaling_factor=meal_plan.scaling_factor,
    )


# ==========================================================================
# Cost Summary
# ==========================================================================


@meal_plan_router.get("/{meal_plan_id}/costs/", response=MealPlanCostSummaryOut)
def cost_summary(request, meal_plan_id: int):
    """Get aggregated cost breakdown for the entire meal plan."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_access(meal_plan, request.user)

    from collections import defaultdict
    from decimal import Decimal
    from supply.services.price_service import get_portion_price

    meals = Meal.objects.filter(meal_plan=meal_plan).prefetch_related(
        "items__recipe__recipe_items__portion__ingredient",
        "items__ingredient",
    )

    norm_portions = meal_plan.norm_portions or 1
    total_ingredients = 0
    priced_ingredients = 0

    # Aggregate costs per day and meal
    day_costs: dict[str, dict] = defaultdict(lambda: {"total": Decimal("0"), "meals": []})

    # Aggregate costs per recipe
    recipe_costs: dict[int, dict] = {}

    for meal in meals:
        if not meal.start_datetime:
            continue
        meal_date = meal.start_datetime.date()
        effective_portions = meal.override_portions or norm_portions
        meal_cost = Decimal("0")

        for item in meal.items.all():
            if item.recipe:
                # Recipe-based item: iterate RecipeItems
                recipe_servings = item.recipe.servings or 1
                recipe_items = item.recipe.recipe_items.select_related(
                    "portion__ingredient"
                )
                recipe_item_cost = Decimal("0")
                rid = item.recipe.id
                if rid not in recipe_costs:
                    recipe_costs[rid] = {
                        "recipe_id": rid,
                        "recipe_title": item.recipe.title,
                        "recipe_slug": item.recipe.slug,
                        "total_cost": Decimal("0"),
                        "priced_ingredients": 0,
                        "total_ingredients": 0,
                    }
                for ri in recipe_items:
                    if not ri.portion or not ri.portion.ingredient:
                        continue
                    total_ingredients += 1
                    recipe_costs[rid]["total_ingredients"] += 1
                    ing = ri.portion.ingredient
                    weight_g = (
                        float(ri.quantity) * float(ri.portion.weight_g)
                        if ri.portion.weight_g
                        else 0
                    )
                    # Scale: item.factor * (effective_portions / recipe_servings)
                    scaled_weight_g = weight_g * item.factor * (effective_portions / recipe_servings)
                    price = get_portion_price(ing, scaled_weight_g)
                    if price is not None:
                        priced_ingredients += 1
                        recipe_costs[rid]["priced_ingredients"] += 1
                        meal_cost += price
                        recipe_item_cost += price

                recipe_costs[rid]["total_cost"] += recipe_item_cost
            elif item.portion and item.portion.ingredient:
                # Standalone ingredient
                total_ingredients += 1
                if item.quantity:
                    price = get_portion_price(item.portion.ingredient, float(item.quantity))
                    if price is not None:
                        priced_ingredients += 1
                        meal_cost += price

        cost_per_person = (
            meal_cost / effective_portions if effective_portions > 0 else Decimal("0")
        )

        day_costs[str(meal_date)]["total"] += meal_cost
        day_costs[str(meal_date)]["meals"].append({
            "meal_id": meal.id,
            "meal_type": meal.meal_type,
            "date": meal_date,
            "cost": meal_cost,
            "cost_per_person": cost_per_person,
        })

    # Build response
    total_cost = sum(d["total"] for d in day_costs.values())
    cost_per_person = total_cost / norm_portions if norm_portions > 0 else Decimal("0")
    reserve_factor = meal_plan.reserve_factor or 1.0
    total_cost_with_reserve = total_cost * Decimal(str(reserve_factor))

    days = []
    for date_str in sorted(day_costs.keys()):
        d = day_costs[date_str]
        day_cost_per_person = d["total"] / norm_portions if norm_portions > 0 else Decimal("0")
        days.append({
            "date": date_str,
            "total_cost": d["total"],
            "cost_per_person": day_cost_per_person,
            "meals": d["meals"],
        })

    return MealPlanCostSummaryOut(
        total_cost=total_cost,
        total_cost_with_reserve=total_cost_with_reserve,
        reserve_factor=reserve_factor,
        cost_per_person=cost_per_person,
        norm_portions=norm_portions,
        total_ingredients=total_ingredients,
        priced_ingredients=priced_ingredients,
        days=days,
        recipes=[
            {
                "recipe_id": rc["recipe_id"],
                "recipe_title": rc["recipe_title"],
                "recipe_slug": rc["recipe_slug"],
                "total_cost": rc["total_cost"],
                "cost_per_person": rc["total_cost"] / norm_portions if norm_portions > 0 else Decimal("0"),
                "priced_ingredients": rc["priced_ingredients"],
                "total_ingredients": rc["total_ingredients"],
            }
            for rc in sorted(recipe_costs.values(), key=lambda x: x["total_cost"], reverse=True)
        ],
    )


# ==========================================================================
# Shopping List
# ==========================================================================


@meal_plan_router.get(
    "/{meal_plan_id}/shopping-list/",
    response=list[ShoppingListItemOut],
)
def shopping_list(request, meal_plan_id: int):
    """Generate an aggregated shopping list for a meal plan."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_access(meal_plan, request.user)

    from supply.services.shopping_service import generate_shopping_list

    items = generate_shopping_list(meal_plan)
    return [
        ShoppingListItemOut(
            ingredient_id=item.ingredient_id,
            ingredient_name=item.ingredient_name,
            ingredient_slug=item.ingredient_slug,
            total_quantity_g=item.total_quantity_g,
            unit=item.unit,
            retail_section=item.retail_section,
            estimated_price_eur=item.estimated_price_eur,
            display_quantity=item.display_quantity,
            natural_portions=item.natural_portions,
            portion_options=item.portion_options or [],
            sources=[
                {"recipe_id": s.recipe_id, "recipe_name": s.recipe_name, "recipe_slug": s.recipe_slug, "meal_label": s.meal_label, "quantity_g": s.quantity_g}
                for s in (item.sources or [])
            ],
        )
        for item in items
    ]


# ==========================================================================
# Recipe Suggestions
# ==========================================================================

# Map meal_type to recipe_type values
MEAL_TYPE_TO_RECIPE_TYPES: dict[str, list[str]] = {
    "breakfast": ["breakfast", "simple_meal"],
    "lunch": ["warm_meal", "cold_meal", "side_dish"],
    "dinner": ["warm_meal", "cold_meal", "side_dish"],
    "snack": ["simple_meal"],
}


@meal_plan_router.get(
    "/recipes/suggestions/",
    response=list[RecipeSuggestionOut],
)
def recipe_suggestions(
    request,
    meal_type: str | None = None,
    q: str | None = None,
    limit: int = 10,
):
    """Return recipe suggestions sorted by global usage frequency."""
    from django.db.models import Count, Q

    limit = min(limit, 20)

    base_filter = Q(recipe__isnull=False)

    # Text search filter
    text_filter = Q()
    if q and len(q) >= 1:
        text_filter = Q(recipe__title__icontains=q)

    # meal_type-specific results
    type_filter = Q()
    if meal_type and meal_type in MEAL_TYPE_TO_RECIPE_TYPES:
        type_filter = Q(meal__meal_type=meal_type)

    # Primary: recipes matching meal_type, sorted by usage count
    results = []
    seen_ids: set[int] = set()

    if meal_type and meal_type in MEAL_TYPE_TO_RECIPE_TYPES:
        type_qs = (
            MealItem.objects.filter(base_filter & type_filter & text_filter)
            .values("recipe_id")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )
        recipe_ids = [entry["recipe_id"] for entry in type_qs]
        if recipe_ids:
            recipes_map = {
                r.id: r for r in Recipe.objects.filter(id__in=recipe_ids)
            }
            counts_map = {entry["recipe_id"]: entry["count"] for entry in type_qs}
            for rid in recipe_ids:
                r = recipes_map.get(rid)
                if r:
                    results.append(RecipeSuggestionOut(
                        id=r.id,
                        title=r.title,
                        usage_count=counts_map[rid],
                        image_thumbnail=r.image.url if r.image else None,
                    ))
                    seen_ids.add(r.id)

    # Fallback: fill up with global usage (excluding already seen)
    remaining = limit - len(results)
    if remaining > 0:
        exclude_filter = Q()
        if seen_ids:
            exclude_filter = ~Q(recipe_id__in=seen_ids)

        global_qs = (
            MealItem.objects.filter(base_filter & text_filter & exclude_filter)
            .values("recipe_id")
            .annotate(count=Count("id"))
            .order_by("-count")[:remaining]
        )
        recipe_ids = [entry["recipe_id"] for entry in global_qs]
        if recipe_ids:
            recipes_map = {
                r.id: r for r in Recipe.objects.filter(id__in=recipe_ids)
            }
            counts_map = {entry["recipe_id"]: entry["count"] for entry in global_qs}
            for rid in recipe_ids:
                r = recipes_map.get(rid)
                if r:
                    results.append(RecipeSuggestionOut(
                        id=r.id,
                        title=r.title,
                        usage_count=counts_map[rid],
                        image_thumbnail=r.image.url if r.image else None,
                    ))

    return results


# ==========================================================================
# Popular Recipes
# ==========================================================================


@meal_plan_router.get("/recipes/popular/", response=dict)
def popular_recipes(
    request,
    meal_type: str | None = None,
    limit: int = 8,
):
    """Return most-used recipes split into personal and community rankings."""
    from django.db.models import Count

    limit = min(limit, 20)

    # Base filter
    recipe_filter = Q(status="approved", usage_count__gt=0)
    if meal_type and meal_type in MEAL_TYPE_TO_RECIPE_TYPES:
        recipe_filter &= Q(recipe_type__in=MEAL_TYPE_TO_RECIPE_TYPES[meal_type])

    # Community: top by usage_count
    community_qs = Recipe.objects.filter(recipe_filter).order_by("-usage_count")[:limit]
    community = [
        {
            "id": r.id,
            "title": r.title,
            "recipe_type": r.recipe_type,
            "image": r.image.url if r.image else None,
            "usage_count": r.usage_count,
        }
        for r in community_qs
    ]

    # Personal: aggregate MealItems for current user
    personal = []
    if request.user.is_authenticated:
        personal_qs = (
            MealItem.objects.filter(
                recipe__isnull=False,
                meal__meal_plan__created_by=request.user,
            )
        )
        if meal_type and meal_type in MEAL_TYPE_TO_RECIPE_TYPES:
            personal_qs = personal_qs.filter(meal__meal_type=meal_type)

        personal_agg = (
            personal_qs.values("recipe_id")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )
        recipe_ids = [entry["recipe_id"] for entry in personal_agg]
        if recipe_ids:
            recipes_map = {
                r.id: r
                for r in Recipe.objects.filter(id__in=recipe_ids)
            }
            counts_map = {entry["recipe_id"]: entry["count"] for entry in personal_agg}
            for rid in recipe_ids:
                r = recipes_map.get(rid)
                if r:
                    personal.append({
                        "id": r.id,
                        "title": r.title,
                        "recipe_type": r.recipe_type,
                        "image": r.image.url if r.image else None,
                        "usage_count": counts_map[rid],
                    })

    return {"personal": personal, "community": community}


# ==========================================================================
# Recipe Search (standalone recipe model)
# ==========================================================================


@meal_plan_router.get("/recipes/search/", response=dict)
def search_recipes(
    request,
    q: str = "",
    recipe_type: str | None = None,
    nutritional_tag_ids: str | None = None,
    limit: int = 8,
):
    """Search for recipes and standalone ingredients to add to meals."""
    _require_auth(request)

    limit = min(limit, 50)

    # --- Recipes ---
    qs = Recipe.objects.filter(status="approved")

    if q and len(q) >= 2:
        from django.contrib.postgres.search import SearchQuery, SearchRank

        search_query = SearchQuery(q, config="german")
        qs_fts = qs.filter(search_vector=search_query).annotate(
            rank=SearchRank("search_vector", search_query)
        )
        if qs_fts.exists():
            qs = qs_fts.order_by("-rank")
        else:
            qs = qs.filter(title__icontains=q)

    if recipe_type:
        qs = qs.filter(recipe_type=recipe_type)

    if nutritional_tag_ids:
        tag_ids = [int(t) for t in nutritional_tag_ids.split(",") if t.strip().isdigit()]
        for tag_id in tag_ids:
            qs = qs.filter(nutritional_tags__id=tag_id)

    recipes_qs = qs.select_related().prefetch_related(
        "nutritional_tags",
        Prefetch(
            "recipe_items",
            queryset=RecipeItem.objects.select_related("portion__ingredient").order_by("sort_order")[:8],
            to_attr="preview_items",
        ),
    )[:limit]

    recipes = []
    for r in recipes_qs:
        ingredients_preview = [
            item.portion.ingredient.name
            for item in (r.preview_items if hasattr(r, "preview_items") else [])
            if item.portion and item.portion.ingredient
        ][:8]
        tags = [{"id": t.id, "name": t.name} for t in r.nutritional_tags.all()]
        description = (r.description or "")[:200] if r.description else None
        recipes.append({
            "id": r.id,
            "title": r.title,
            "slug": r.slug,
            "recipe_type": r.recipe_type,
            "image": r.image.url if r.image else None,
            "servings": r.servings,
            "cached_energy_kj": r.cached_energy_kj,
            "cached_protein_g": r.cached_protein_g,
            "cached_fat_g": r.cached_fat_g,
            "cached_carbohydrate_g": r.cached_carbohydrate_g,
            "cached_price_total": float(r.cached_price_total) if r.cached_price_total else None,
            "cached_nutri_class": r.cached_nutri_class,
            "nutritional_tags": tags,
            "usage_count": r.usage_count,
            "description": description,
            "ingredients_preview": ingredients_preview,
        })

    # --- Standalone Ingredients ---
    from supply.models import Ingredient, Portion

    ing_qs = Ingredient.objects.filter(is_standalone_food=True)

    if q and len(q) >= 2:
        ing_qs = ing_qs.filter(name__icontains=q)

    if recipe_type:
        ing_qs = ing_qs.filter(standalone_type=recipe_type)

    if nutritional_tag_ids:
        tag_ids = [int(t) for t in nutritional_tag_ids.split(",") if t.strip().isdigit()]
        for tag_id in tag_ids:
            ing_qs = ing_qs.filter(nutritional_tags__id=tag_id)

    ing_list = list(ing_qs.values("id", "name", "slug", "standalone_type")[:limit])

    # Attach portions to each ingredient
    if ing_list:
        ing_ids = [i["id"] for i in ing_list]
        portions = Portion.objects.filter(ingredient_id__in=ing_ids, deleted_at__isnull=True).select_related("measuring_unit")
        portions_by_ing: dict[int, list[dict]] = {}
        for p in portions:
            portions_by_ing.setdefault(p.ingredient_id, []).append({
                "id": p.id,
                "name": p.name,
                "measuring_unit": p.measuring_unit.name if p.measuring_unit else None,
                "measuring_unit_id": p.measuring_unit_id,
                "quantity": float(p.quantity) if p.quantity else None,
                "weight_g": float(p.weight_g) if p.weight_g else None,
            })
        for ing in ing_list:
            ing["portions"] = portions_by_ing.get(ing["id"], [])

    return {"recipes": recipes, "ingredients": ing_list}


# ==========================================================================
# PDF Export
# ==========================================================================


@meal_plan_router.get("/{meal_plan_id}/export/pdf/")
def export_pdf(request, meal_plan_id: int, include_notes: bool = False):
    """Export meal plan as PDF."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_access(meal_plan, request.user)

    from django.http import HttpResponse
    from planner.services.pdf_export import generate_meal_plan_pdf

    pdf_bytes = generate_meal_plan_pdf(meal_plan, include_notes=include_notes)

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{meal_plan.slug}-essensplan.pdf"'
    return response


# ==========================================================================
# MealPlan Collaborators
# ==========================================================================


@meal_plan_router.get(
    "/{meal_plan_id}/collaborators/",
    response=list[MealPlanCollaboratorOut],
)
def list_collaborators(request, meal_plan_id: int):
    """List all collaborators of a meal plan."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_access(meal_plan, request.user)

    return MealPlanCollaborator.objects.filter(meal_plan=meal_plan).select_related("user")


@meal_plan_router.post(
    "/{meal_plan_id}/collaborators/",
    response={201: MealPlanCollaboratorOut},
)
def add_collaborator(request, meal_plan_id: int, payload: MealPlanCollaboratorCreateIn):
    """Add a collaborator to a meal plan (owner/admin only)."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_admin(meal_plan, request.user)

    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = get_object_or_404(User, id=payload.user_id)

    if user.id == meal_plan.created_by_id:
        raise HttpError(400, "Der Besitzer kann nicht als Collaborator hinzugefügt werden")

    if MealPlanCollaborator.objects.filter(meal_plan=meal_plan, user=user).exists():
        raise HttpError(409, "Nutzer ist bereits Collaborator")

    if payload.role not in MealPlanCollaboratorRole.values:
        raise HttpError(422, "Ungültige Rolle")

    collab = MealPlanCollaborator.objects.create(
        meal_plan=meal_plan,
        user=user,
        role=payload.role,
    )
    return 201, collab


@meal_plan_router.patch(
    "/{meal_plan_id}/collaborators/{collaborator_id}/",
    response=MealPlanCollaboratorOut,
)
def update_collaborator(
    request, meal_plan_id: int, collaborator_id: int, payload: MealPlanCollaboratorUpdateIn
):
    """Update a collaborator's role (owner/admin only)."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_admin(meal_plan, request.user)

    collab = get_object_or_404(MealPlanCollaborator, id=collaborator_id, meal_plan=meal_plan)

    if payload.role not in MealPlanCollaboratorRole.values:
        raise HttpError(422, "Ungültige Rolle")

    collab.role = payload.role
    collab.save()
    return collab


@meal_plan_router.delete("/{meal_plan_id}/collaborators/{collaborator_id}/")
def remove_collaborator(request, meal_plan_id: int, collaborator_id: int):
    """Remove a collaborator from a meal plan (owner/admin only)."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_admin(meal_plan, request.user)

    collab = get_object_or_404(MealPlanCollaborator, id=collaborator_id, meal_plan=meal_plan)
    collab.delete()
    return {"success": True}


# --- Suggestions ---


@meal_plan_router.get(
    "/{meal_plan_id}/suggestions/",
    response=dict,
    summary="Get suggestions dashboard for a meal plan",
)
def get_suggestions(request, meal_plan_id: int):
    """Evaluate all rules and system checks, return suggestion dashboard."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)

    from recipe.services.suggestion_service import evaluate_suggestions

    dashboard = evaluate_suggestions(meal_plan)
    return dashboard.dict()
