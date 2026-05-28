"""Django Ninja API routes for the MealPlan module."""

import datetime as dt

from django.db.models import Q
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
    MealPlanCreateIn,
    MealPlanDetailOut,
    MealPlanOut,
    MealPlanUpdateIn,
    MealItemCreateIn,
    MealItemOut,
    MealItemOverrideIn,
    MealItemOverrideOut,
    MealOut,
    MealUpdateIn,
    NutritionSummaryOut,
    ShoppingListItemOut,
    MealPlanCollaboratorOut,
    MealPlanCollaboratorCreateIn,
    MealPlanCollaboratorUpdateIn,
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

    data = payload.dict(exclude={"event_id", "start_date", "num_days"})
    meal_plan = MealPlan(created_by=request.user, **data)

    # Optional event binding
    if payload.event_id is not None:
        from event.models import Event

        event = get_object_or_404(Event, id=payload.event_id)
        meal_plan.event = event

    meal_plan.save()

    # Generate default meals for date range
    if meal_plan.event and meal_plan.event.start_date and meal_plan.event.end_date:
        start = meal_plan.event.start_date.date()
        end = meal_plan.event.end_date.date()
        current = start
        while current <= end:
            meal_plan.create_default_meals_for_date(current)
            current += dt.timedelta(days=1)
    elif payload.start_date:
        for i in range(max(1, payload.num_days)):
            day_date = payload.start_date + dt.timedelta(days=i)
            meal_plan.create_default_meals_for_date(day_date)

    return meal_plan


@meal_plan_router.get("/{meal_plan_id}/", response=MealPlanDetailOut)
def get_meal_plan(request, meal_plan_id: int):
    """Get a meal plan with all meals and items."""
    _require_auth(request)

    meal_plan = get_object_or_404(
        MealPlan.objects.select_related("event").prefetch_related(
            "meals__items__recipe",
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

    meal.save()
    return meal


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
def nutrition_summary(request, meal_plan_id: int):
    """Get aggregated nutritional values for the entire meal plan."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_access(meal_plan, request.user)

    # Collect all MealItems
    meal_items = MealItem.objects.filter(
        meal__meal_plan=meal_plan,
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

    # Calculate per-portion values
    norm_portions = meal_plan.norm_portions or 1
    per_portion = {f"per_portion_{field}": totals[field] / norm_portions for field in totals}

    return NutritionSummaryOut(
        **totals,
        **per_portion,
        norm_portions=meal_plan.norm_portions,
        activity_factor=meal_plan.activity_factor,
        reserve_factor=meal_plan.reserve_factor,
        scaling_factor=meal_plan.scaling_factor,
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
            sources=[
                {"recipe_id": s.recipe_id, "recipe_name": s.recipe_name, "recipe_slug": s.recipe_slug, "meal_label": s.meal_label, "quantity_g": s.quantity_g}
                for s in (item.sources or [])
            ],
        )
        for item in items
    ]


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

    recipes = list(qs.values("id", "title", "slug", "recipe_type")[:limit])

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
        portions = Portion.objects.filter(ingredient_id__in=ing_ids).select_related("measuring_unit")
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
