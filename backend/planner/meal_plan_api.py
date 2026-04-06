"""Django Ninja API routes for the MealPlan module."""

import datetime as dt

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeItem

from .models import (
    MEAL_TYPE_DAY_FACTORS,
    MealDay,
    MealItem,
    Meal,
    MealPlan,
)
from .schemas import (
    MealCreateIn,
    MealDayCreateIn,
    MealDayOut,
    MealItemCreateIn,
    MealItemOut,
    MealOut,
    MealPlanCreateIn,
    MealPlanDetailOut,
    MealPlanOut,
    MealPlanUpdateIn,
    NutritionSummaryOut,
    ShoppingListItemOut,
)

meal_plan_router = Router(tags=["meal-plans"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def _check_owner(meal_plan: MealPlan, user):
    """Only owner or staff may modify the meal plan."""
    if meal_plan.created_by != user and not user.is_staff:
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten dieses Essensplans")


# ==========================================================================
# MealPlan CRUD
# ==========================================================================


@meal_plan_router.get("/", response=list[MealPlanOut])
def list_meal_plans(request):
    """List meal plans owned by the current user."""
    _require_auth(request)

    qs = MealPlan.objects.select_related("event").prefetch_related("days")

    if request.user.is_staff:
        return qs.all()

    return qs.filter(created_by=request.user)


@meal_plan_router.post("/", response=MealPlanOut)
def create_meal_plan(request, payload: MealPlanCreateIn):
    """Create a new meal plan with auto-generated days and default meals."""
    _require_auth(request)

    data = payload.dict(exclude={"event_id", "start_date", "num_days"})
    meal_plan = MealPlan(created_by=request.user, **data)

    # Optional event binding
    if payload.event_id is not None:
        from event.models import Event

        event = get_object_or_404(Event, id=payload.event_id)
        meal_plan.event = event

    meal_plan.save()

    # Generate days
    if meal_plan.event and meal_plan.event.start_date and meal_plan.event.end_date:
        # Event-bound: generate days from event date range
        start = meal_plan.event.start_date.date()
        end = meal_plan.event.end_date.date()
        current = start
        while current <= end:
            day = MealDay.objects.create(meal_plan=meal_plan, date=current)
            day.create_default_meals()
            current += dt.timedelta(days=1)
    elif payload.start_date:
        # Standalone: generate num_days from start_date
        for i in range(max(1, payload.num_days)):
            day_date = payload.start_date + dt.timedelta(days=i)
            day = MealDay.objects.create(meal_plan=meal_plan, date=day_date)
            day.create_default_meals()

    return meal_plan


@meal_plan_router.get("/{meal_plan_id}/", response=MealPlanDetailOut)
def get_meal_plan(request, meal_plan_id: int):
    """Get a meal plan with all days, meals, and items."""
    _require_auth(request)

    meal_plan = get_object_or_404(
        MealPlan.objects.select_related("event").prefetch_related(
            "days__meals__items__recipe",
        ),
        id=meal_plan_id,
    )

    if meal_plan.created_by != request.user and not request.user.is_staff:
        raise HttpError(403, "Kein Zugriff auf diesen Essensplan")

    meal_plan.can_edit = (meal_plan.created_by == request.user) or request.user.is_staff
    return meal_plan


@meal_plan_router.patch("/{meal_plan_id}/", response=MealPlanOut)
def update_meal_plan(request, meal_plan_id: int, payload: MealPlanUpdateIn):
    """Update a meal plan (owner/staff only)."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _check_owner(meal_plan, request.user)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(meal_plan, field, value)
    meal_plan.save()
    return meal_plan


@meal_plan_router.delete("/{meal_plan_id}/")
def delete_meal_plan(request, meal_plan_id: int):
    """Delete a meal plan and all its days/meals/items."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _check_owner(meal_plan, request.user)

    meal_plan.delete()
    return {"success": True, "message": "Essensplan gelöscht"}


# ==========================================================================
# MealDay Management
# ==========================================================================


@meal_plan_router.post("/{meal_plan_id}/days/", response=MealDayOut)
def add_day(request, meal_plan_id: int, payload: MealDayCreateIn):
    """Add a day to a meal plan with default meals."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _check_owner(meal_plan, request.user)

    if MealDay.objects.filter(meal_plan=meal_plan, date=payload.date).exists():
        raise HttpError(400, "Dieser Tag existiert bereits im Essensplan")

    day = MealDay.objects.create(meal_plan=meal_plan, date=payload.date)
    day.create_default_meals()
    return day


@meal_plan_router.delete("/{meal_plan_id}/days/{day_id}/")
def remove_day(request, meal_plan_id: int, day_id: int):
    """Remove a day and all its meals from a meal plan."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _check_owner(meal_plan, request.user)

    day = get_object_or_404(MealDay, id=day_id, meal_plan=meal_plan)
    day.delete()
    return {"success": True}


# ==========================================================================
# Meal Management
# ==========================================================================


@meal_plan_router.post("/{meal_plan_id}/days/{day_id}/meals/", response=MealOut)
def add_meal(request, meal_plan_id: int, day_id: int, payload: MealCreateIn):
    """Add a meal to a day."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _check_owner(meal_plan, request.user)

    day = get_object_or_404(MealDay, id=day_id, meal_plan=meal_plan)

    day_part_factor = payload.day_part_factor
    if day_part_factor is None:
        day_part_factor = MEAL_TYPE_DAY_FACTORS.get(payload.meal_type, 0.0)

    meal = Meal.objects.create(
        meal_day=day,
        meal_type=payload.meal_type,
        time_start=payload.time_start,
        time_end=payload.time_end,
        day_part_factor=day_part_factor,
    )
    return meal


@meal_plan_router.delete("/{meal_plan_id}/meals/{meal_id}/")
def remove_meal(request, meal_plan_id: int, meal_id: int):
    """Remove a meal and all its items."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _check_owner(meal_plan, request.user)

    meal = get_object_or_404(Meal, id=meal_id, meal_day__meal_plan=meal_plan)
    meal.delete()
    return {"success": True}


# ==========================================================================
# MealItem Management
# ==========================================================================


@meal_plan_router.post("/{meal_plan_id}/meals/{meal_id}/items/", response=MealItemOut)
def add_meal_item(request, meal_plan_id: int, meal_id: int, payload: MealItemCreateIn):
    """Add a recipe to a meal."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _check_owner(meal_plan, request.user)

    meal = get_object_or_404(Meal, id=meal_id, meal_day__meal_plan=meal_plan)

    # Verify recipe exists
    recipe = get_object_or_404(Recipe, id=payload.recipe_id)

    item = MealItem.objects.create(
        meal=meal,
        recipe=recipe,
        factor=payload.factor,
    )
    return item


@meal_plan_router.delete("/{meal_plan_id}/meal-items/{item_id}/")
def remove_meal_item(request, meal_plan_id: int, item_id: int):
    """Remove a recipe from a meal."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _check_owner(meal_plan, request.user)

    item = get_object_or_404(
        MealItem,
        id=item_id,
        meal__meal_day__meal_plan=meal_plan,
    )
    item.delete()
    return {"success": True}


# ==========================================================================
# Nutrition Summary
# ==========================================================================


@meal_plan_router.get("/{meal_plan_id}/nutrition-summary/", response=NutritionSummaryOut)
def nutrition_summary(request, meal_plan_id: int):
    """Get aggregated nutritional values for the entire meal plan."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)

    if meal_plan.created_by != request.user and not request.user.is_staff:
        raise HttpError(403, "Kein Zugriff auf diesen Essensplan")

    # Collect all MealItems
    meal_items = MealItem.objects.filter(
        meal__meal_day__meal_plan=meal_plan,
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
            # Scale factor: per 100g, then by item factor and meal plan scaling
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
    "/{meal_plan_id}/shopping-list/",
    response=list[ShoppingListItemOut],
)
def shopping_list(request, meal_plan_id: int):
    """Generate an aggregated shopping list for a meal plan."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)

    if meal_plan.created_by != request.user and not request.user.is_staff:
        raise HttpError(403, "Kein Zugriff auf diesen Essensplan")

    from idea.services.shopping_service import generate_shopping_list

    items = generate_shopping_list(meal_plan)
    return [
        ShoppingListItemOut(
            ingredient_name=item.ingredient_name,
            total_quantity_g=item.total_quantity_g,
            unit=item.unit,
            retail_section=item.retail_section,
            estimated_price_eur=item.estimated_price_eur,
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
