"""Django Ninja API routes for the MealEvent module."""

import datetime as dt

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeItem

from planner.models import (
    MEAL_TYPE_DAY_FACTORS,
    Meal,
    MealEvent,
    MealItem,
)
from planner.schemas import (
    MealCreateIn,
    MealDayBulkCreateIn,
    MealEventCreateIn,
    MealEventDetailOut,
    MealEventOut,
    MealEventUpdateIn,
    MealItemCreateIn,
    MealItemOut,
    MealOut,
    NutritionSummaryOut,
    ShoppingListItemOut,
)

meal_plan_router = Router(tags=["meal-events"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def _check_owner(meal_event: MealEvent, user):
    """Only owner or staff may modify the meal event."""
    if meal_event.created_by != user and not user.is_staff:
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten dieses Essensplans")


# ==========================================================================
# MealEvent CRUD
# ==========================================================================


@meal_plan_router.get("/", response=list[MealEventOut])
def list_meal_events(request):
    """List meal events owned by the current user."""
    _require_auth(request)

    qs = MealEvent.objects.select_related("event").prefetch_related("meals")

    if request.user.is_staff:
        return qs.all()

    return qs.filter(created_by=request.user)


@meal_plan_router.post("/", response=MealEventOut)
def create_meal_event(request, payload: MealEventCreateIn):
    """Create a new meal event with auto-generated default meals."""
    _require_auth(request)

    data = payload.dict(exclude={"event_id", "start_date", "num_days"})
    meal_event = MealEvent(created_by=request.user, **data)

    # Optional event binding
    if payload.event_id is not None:
        from event.models import Event

        event = get_object_or_404(Event, id=payload.event_id)
        meal_event.event = event

    meal_event.save()

    # Generate default meals for date range
    if meal_event.event and meal_event.event.start_date and meal_event.event.end_date:
        start = meal_event.event.start_date.date()
        end = meal_event.event.end_date.date()
        current = start
        while current <= end:
            meal_event.create_default_meals_for_date(current)
            current += dt.timedelta(days=1)
    elif payload.start_date:
        for i in range(max(1, payload.num_days)):
            day_date = payload.start_date + dt.timedelta(days=i)
            meal_event.create_default_meals_for_date(day_date)

    return meal_event


@meal_plan_router.get("/{meal_event_id}/", response=MealEventDetailOut)
def get_meal_event(request, meal_event_id: int):
    """Get a meal event with all meals and items."""
    _require_auth(request)

    meal_event = get_object_or_404(
        MealEvent.objects.select_related("event").prefetch_related(
            "meals__items__recipe",
        ),
        id=meal_event_id,
    )

    if meal_event.created_by != request.user and not request.user.is_staff:
        raise HttpError(403, "Kein Zugriff auf diesen Essensplan")

    meal_event.can_edit = (meal_event.created_by == request.user) or request.user.is_staff
    return meal_event


@meal_plan_router.patch("/{meal_event_id}/", response=MealEventOut)
def update_meal_event(request, meal_event_id: int, payload: MealEventUpdateIn):
    """Update a meal event (owner/staff only)."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)
    _check_owner(meal_event, request.user)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(meal_event, field, value)
    meal_event.save()
    return meal_event


@meal_plan_router.delete("/{meal_event_id}/")
def delete_meal_event(request, meal_event_id: int):
    """Delete a meal event and all its meals/items."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)
    _check_owner(meal_event, request.user)

    meal_event.delete()
    return {"success": True, "message": "Essensplan gelöscht"}


# ==========================================================================
# Day Management (convenience endpoints)
# ==========================================================================


@meal_plan_router.post("/{meal_event_id}/days/", response=list[MealOut])
def add_day(request, meal_event_id: int, payload: MealDayBulkCreateIn):
    """Add a day with default meals (breakfast, lunch, dinner)."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)
    _check_owner(meal_event, request.user)

    if Meal.objects.filter(meal_event=meal_event, start_datetime__date=payload.date).exists():
        raise HttpError(400, "Dieser Tag existiert bereits im Essensplan")

    meals = meal_event.create_default_meals_for_date(payload.date)
    return meals


@meal_plan_router.delete("/{meal_event_id}/days/")
def remove_day(request, meal_event_id: int, date: dt.date):
    """Remove all meals for a specific date."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)
    _check_owner(meal_event, request.user)

    meals = Meal.objects.filter(meal_event=meal_event, start_datetime__date=date)
    if not meals.exists():
        raise HttpError(404, "Keine Mahlzeiten für dieses Datum gefunden")

    meals.delete()
    return {"success": True}


# ==========================================================================
# Meal Management
# ==========================================================================


@meal_plan_router.post("/{meal_event_id}/meals/", response=MealOut)
def add_meal(request, meal_event_id: int, payload: MealCreateIn):
    """Add a meal to a meal event."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)
    _check_owner(meal_event, request.user)

    meal_date = payload.start_datetime.date()
    if Meal.objects.filter(
        meal_event=meal_event,
        start_datetime__date=meal_date,
        meal_type=payload.meal_type,
    ).exists():
        raise HttpError(400, "Diese Mahlzeit existiert bereits für diesen Tag")

    day_part_factor = payload.day_part_factor
    if day_part_factor is None:
        day_part_factor = MEAL_TYPE_DAY_FACTORS.get(payload.meal_type, 0.0)

    meal = Meal.objects.create(
        meal_event=meal_event,
        start_datetime=payload.start_datetime,
        end_datetime=payload.end_datetime,
        meal_type=payload.meal_type,
        day_part_factor=day_part_factor,
    )
    return meal


@meal_plan_router.delete("/{meal_event_id}/meals/{meal_id}/")
def remove_meal(request, meal_event_id: int, meal_id: int):
    """Remove a meal and all its items."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)
    _check_owner(meal_event, request.user)

    meal = get_object_or_404(Meal, id=meal_id, meal_event=meal_event)
    meal.delete()
    return {"success": True}


# ==========================================================================
# MealItem Management
# ==========================================================================


@meal_plan_router.post("/{meal_event_id}/meals/{meal_id}/items/", response=MealItemOut)
def add_meal_item(request, meal_event_id: int, meal_id: int, payload: MealItemCreateIn):
    """Add a recipe to a meal."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)
    _check_owner(meal_event, request.user)

    meal = get_object_or_404(Meal, id=meal_id, meal_event=meal_event)

    # Verify recipe exists
    recipe = get_object_or_404(Recipe, id=payload.recipe_id)

    item = MealItem.objects.create(
        meal=meal,
        recipe=recipe,
        factor=payload.factor,
    )
    return item


@meal_plan_router.delete("/{meal_event_id}/meal-items/{item_id}/")
def remove_meal_item(request, meal_event_id: int, item_id: int):
    """Remove a recipe from a meal."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)
    _check_owner(meal_event, request.user)

    item = get_object_or_404(
        MealItem,
        id=item_id,
        meal__meal_event=meal_event,
    )
    item.delete()
    return {"success": True}


# ==========================================================================
# Nutrition Summary
# ==========================================================================


@meal_plan_router.get("/{meal_event_id}/nutrition-summary/", response=NutritionSummaryOut)
def nutrition_summary(request, meal_event_id: int):
    """Get aggregated nutritional values for the entire meal event."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)

    if meal_event.created_by != request.user and not request.user.is_staff:
        raise HttpError(403, "Kein Zugriff auf diesen Essensplan")

    # Collect all MealItems
    meal_items = MealItem.objects.filter(
        meal__meal_event=meal_event,
    ).select_related("recipe", "meal")

    totals = {
        "energy_kj": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
    }

    for mi in meal_items:
        # Get all RecipeItems for this recipe and aggregate their nutritional data
        recipe_items = RecipeItem.objects.filter(
            recipe=mi.recipe,
        ).select_related("portion__ingredient")

        for ri in recipe_items:
            if not ri.portion or not ri.portion.ingredient:
                continue

            ing = ri.portion.ingredient
            # RecipeItem quantity is in the portion unit; portion.weight_g converts to grams
            weight_g = ri.quantity * ri.portion.weight_g if ri.portion.weight_g else 0
            # Scale factor: per 100g, then by item factor
            scale = (weight_g / 100.0) * mi.factor

            for field in totals:
                ing_val = getattr(ing, field, None)
                if ing_val is not None:
                    totals[field] += float(ing_val) * scale

    return NutritionSummaryOut(**totals)


# ==========================================================================
# Shopping List
# ==========================================================================


@meal_plan_router.get(
    "/{meal_event_id}/shopping-list/",
    response=list[ShoppingListItemOut],
)
def shopping_list(request, meal_event_id: int):
    """Generate an aggregated shopping list for a meal event."""
    _require_auth(request)
    meal_event = get_object_or_404(MealEvent, id=meal_event_id)

    if meal_event.created_by != request.user and not request.user.is_staff:
        raise HttpError(403, "Kein Zugriff auf diesen Essensplan")

    from supply.services.shopping_service import generate_shopping_list

    items = generate_shopping_list(meal_event)
    return [
        ShoppingListItemOut(
            ingredient_id=item.ingredient_id,
            ingredient_name=item.ingredient_name,
            total_quantity_g=item.total_quantity_g,
            unit=item.unit,
            retail_section=item.retail_section,
            estimated_price_eur=item.estimated_price_eur,
            display_quantity=item.display_quantity,
            natural_portions=item.natural_portions,
        )
        for item in items
    ]


# ==========================================================================
# Recipe Search (standalone recipe model)
# ==========================================================================


@meal_plan_router.get("/recipes/search/", response=list[dict])
def search_recipes(request, q: str = ""):
    """Search for recipes to add to meals."""
    _require_auth(request)

    qs = Recipe.objects.filter(status="published")
    if q:
        qs = qs.filter(title__icontains=q)

    qs = qs.values("id", "title", "slug")[:20]
    return list(qs)
