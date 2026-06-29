"""Django Ninja API routes for the MealPlan module."""

import datetime as dt
import logging

from django.db import IntegrityError
from django.db.models import BooleanField, Case, Count, Prefetch, Q, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from planner.models import (
    MEAL_TYPE_DAY_FACTORS,
    Meal,
    MealItem,
    MealItemOverride,
    MealPlan,
    MealPlanCollaborator,
    MealPlanCollaboratorRole,
    MealPlanVisibility,
)
from planner.services.notification_service import notify_collaborator_added

from planner.schemas import (
    CalculateIngredientKcalIn,
    CalculateIngredientKcalOut,
    CookingScheduleOut,
    CopyItemsFromPlanIn,
    MealCreateIn,
    MealDayBulkCreateIn,
    MealItemBatchIn,
    MealItemCreateIn,
    MealItemOut,
    MealItemOverrideIn,
    MealItemOverrideOut,
    MealItemUpdateIn,
    MealItemVariantIn,
    MealOut,
    MealPlanCollaboratorCreateIn,
    MealPlanCollaboratorOut,
    MealPlanCollaboratorUpdateIn,
    MealPlanCostSummaryOut,
    MealPlanCreateIn,
    MealPlanDetailOut,
    MealPlanDuplicateIn,
    MealPlanOut,
    MealPlanUpdateIn,
    MealUpdateIn,
    NutritionalTagScanOut,
    NutritionSummaryOut,
    RecipeSuggestionOut,
    ShoppingListItemOut,
    WizardItemsIn,
    WizardItemsOut,
)
from recipe.models import Recipe, RecipeItem
from supply.data.dge_reference import NORM_PERSON_DAILY_KCAL

logger = logging.getLogger(__name__)

meal_plan_router = Router(tags=["meal-plans"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Sitzung nicht gefunden. Bitte erneut anmelden.")


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
# Duplicate validation helpers
# ==========================================================================


def raise_if_duplicate_meal_item(meal: Meal, recipe_id: int | None = None, ingredient_id: int | None = None):
    if recipe_id:
        if MealItem.objects.filter(meal=meal, recipe_id=recipe_id).exists():
            from recipe.models import Recipe
            recipe = Recipe.objects.get(id=recipe_id)
            raise HttpError(422, f"Rezept «{recipe.title}» ist bereits in dieser Mahlzeit enthalten")
    if ingredient_id:
        if MealItem.objects.filter(meal=meal, ingredient_id=ingredient_id).exists():
            from supply.models import Ingredient
            ingredient = Ingredient.objects.get(id=ingredient_id)
            raise HttpError(422, f"Zutat «{ingredient.name}» ist bereits in dieser Mahlzeit enthalten")


def _create_meal_item(**kwargs):
    """Create MealItem with IntegrityError handling for race conditions."""
    try:
        return MealItem.objects.create(**kwargs)
    except IntegrityError:
        raise HttpError(409, "Dieses Rezept oder diese Zutat ist bereits in dieser Mahlzeit enthalten")


def _derive_portion_weight_g(ingredient, measuring_unit) -> float:
    """Derive a sensible default weight_g for a Portion from ingredient data.

    Falls back to standard_recipe_weight_g for base ingredients,
    or 10g default if nothing available.
    """
    mu_name_lower = measuring_unit.name.lower()
    if mu_name_lower == "scheibe" and ingredient.standard_recipe_weight_g:
        return float(ingredient.standard_recipe_weight_g)
    if "tasse" in mu_name_lower:
        return 200.0
    if "schuss" in mu_name_lower:
        return 30.0
    if ingredient.standard_recipe_weight_g:
        return float(ingredient.standard_recipe_weight_g)
    return 10.0


def check_duplicates_in_input(items: list) -> dict[str, list[int]]:
    recipe_ids: list[int] = []
    ingredient_ids: list[int] = []
    for item in items:
        if item.recipe_id:
            if item.recipe_id in recipe_ids:
                from recipe.models import Recipe
                recipe = Recipe.objects.get(id=item.recipe_id)
                raise HttpError(422, f"Rezept «{recipe.title}» ist mehrfach angegeben")
            recipe_ids.append(item.recipe_id)
        if item.ingredient_id:
            if item.ingredient_id in ingredient_ids:
                from supply.models import Ingredient
                ingredient = Ingredient.objects.get(id=item.ingredient_id)
                raise HttpError(422, f"Zutat «{ingredient.name}» ist mehrfach angegeben")
            ingredient_ids.append(item.ingredient_id)
    return {"recipe_ids": recipe_ids, "ingredient_ids": ingredient_ids}


# ==========================================================================
# MealPlan CRUD
# ==========================================================================


@meal_plan_router.get("/", response=list[MealPlanOut])
def list_meal_plans(
    request,
    search: str | None = None,
    origin: str | None = None,
    sort: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
):
    """List meal plans the user has access to.

    Filters:
    - search: text search on name/description/event
    - origin: 'all' (default), 'mine', 'community', 'verified'
    - sort: 'date_newest' (default), 'date_oldest', 'name_asc', 'name_desc'
    - date_from/date_to: date range filter
    """
    _require_auth(request)

    qs = (
        MealPlan.objects.select_related("event", "owner")
        .prefetch_related("nutritional_tags")
        .annotate(
            meals_count_ann=Count("meals", distinct=True),
            collaborators_count_ann=Count("collaborators", distinct=True),
            is_owner_ann=Case(
                When(created_by=request.user, then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            ),
        )
    )

    if origin == "verified":
        qs = qs.filter(owner__isnull=True)
    elif origin == "template":
        # "Referenz-Vorlagen" tab: admin-marked templates visible to all
        qs = qs.filter(is_template=True)
    elif origin == "shared":
        # "Geteilt mit mir" tab: plans shared via collaborators where user is not owner
        qs = qs.filter(collaborators__user=request.user).exclude(created_by=request.user).distinct()
    elif origin == "community":
        qs = qs.filter(owner__isnull=False, visibility=MealPlanVisibility.PUBLIC)
    elif origin == "mine":
        if request.user.is_staff:
            qs = qs.all()
        else:
            qs = qs.filter(created_by=request.user)
    else:
        # "all" — show what user has access to
        if request.user.is_staff:
            qs = qs.all()
        else:
            own = Q(created_by=request.user)
            collab = Q(collaborators__user=request.user)
            public = Q(owner__isnull=False, visibility=MealPlanVisibility.PUBLIC)
            verified = Q(owner__isnull=True)
            qs = qs.filter(own | collab | public | verified)
            qs = qs.distinct()

    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search) | Q(event__name__icontains=search))

    if date_from:
        qs = qs.filter(end_datetime__date__gte=date_from)

    if date_to:
        qs = qs.filter(start_datetime__date__lte=date_to)

    # Sort
    sort_map = {
        "date_newest": "-start_datetime",
        "date_oldest": "start_datetime",
        "name_asc": "name",
        "name_desc": "-name",
    }
    if sort and sort in sort_map:
        qs = qs.order_by(sort_map[sort], "-created_at")
    else:
        qs = qs.order_by("-start_datetime", "-created_at")

    return qs


@meal_plan_router.post("/", response=MealPlanOut)
def create_meal_plan(request, payload: MealPlanCreateIn):
    """Create a new meal plan with auto-generated default meals."""
    _require_auth(request)

    nutritional_tags_to_set = None
    if payload.nutritional_tag_ids is not None:
        from supply.models.reference import NutritionalTag

        tags = list(NutritionalTag.objects.filter(id__in=payload.nutritional_tag_ids))
        if len(tags) != len(payload.nutritional_tag_ids):
            raise HttpError(422, "Einige der angegebenen Tags wurden nicht gefunden")
        nutritional_tags_to_set = tags

    data = payload.dict(
        exclude={
            "event_id",
            "start_datetime",
            "end_datetime",
            "day_part_factors",
            "nutritional_tag_ids",
            "meal_default_times",
        }
    )
    meal_plan = MealPlan(created_by=request.user, **data)

    if payload.day_part_factors is not None:
        meal_plan.day_part_factors = payload.day_part_factors

    if payload.meal_default_times is not None:
        meal_plan.meal_default_times = payload.meal_default_times

    # Optional event binding
    if payload.event_id is not None:
        from event.models import Event

        event = get_object_or_404(Event, id=payload.event_id)
        meal_plan.event = event

    # Set start/end datetime (make timezone-aware if naive)
    if payload.start_datetime and payload.end_datetime:
        meal_plan.start_datetime = (
            timezone.make_aware(payload.start_datetime)
            if timezone.is_naive(payload.start_datetime)
            else payload.start_datetime
        )
        meal_plan.end_datetime = (
            timezone.make_aware(payload.end_datetime)
            if timezone.is_naive(payload.end_datetime)
            else payload.end_datetime
        )
    elif meal_plan.event and meal_plan.event.start_date and meal_plan.event.end_date:
        meal_plan.start_datetime = timezone.make_aware(dt.datetime.combine(meal_plan.event.start_date, dt.time(0, 0)))
        meal_plan.end_datetime = timezone.make_aware(dt.datetime.combine(meal_plan.event.end_date, dt.time(0, 0)))

    meal_plan.save()

    if nutritional_tags_to_set is not None:
        meal_plan.nutritional_tags.set(nutritional_tags_to_set)

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
        MealPlan.objects.select_related("event", "owner").prefetch_related(
            Prefetch(
                "meals__items",
                queryset=MealItem.objects.select_related("recipe", "meal__meal_plan")
                .prefetch_related("recipe__recipe_items__portion__ingredient"),
            ),
            "meals__items__overrides",
            "nutritional_tags",
            "collaborators__user",
        ),
        id=meal_plan_id,
    )

    role = _require_access(meal_plan, request.user)
    meal_plan.can_edit = role in ("owner", MealPlanCollaboratorRole.ADMIN, MealPlanCollaboratorRole.EDITOR)
    meal_plan.is_owner = role == "owner"
    return meal_plan


@meal_plan_router.patch("/{meal_plan_id}/", response=MealPlanOut)
def update_meal_plan(request, meal_plan_id: int, payload: MealPlanUpdateIn):
    """Update a meal plan (owner/staff only)."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    nutritional_tags_to_set = None
    if payload.nutritional_tag_ids is not None:
        from supply.models.reference import NutritionalTag

        tags = list(NutritionalTag.objects.filter(id__in=payload.nutritional_tag_ids))
        if len(tags) != len(payload.nutritional_tag_ids):
            raise HttpError(422, "Einige der angegebenen Tags wurden nicht gefunden")
        nutritional_tags_to_set = tags

    exclude_fields = {"nutritional_tag_ids"}
    if "is_template" in payload.dict(exclude_unset=True) and not request.user.is_staff:
        exclude_fields.add("is_template")

    patch_data = payload.dict(exclude_unset=True, exclude=exclude_fields)
    has_range_change = False
    new_start = None
    new_end = None

    if "start_datetime" in patch_data or "end_datetime" in patch_data:
        old_start = meal_plan.start_datetime
        old_end = meal_plan.end_datetime
        new_start_raw = patch_data.get("start_datetime", old_start)
        new_end_raw = patch_data.get("end_datetime", old_end)
        new_start = timezone.make_aware(new_start_raw) if timezone.is_naive(new_start_raw) else new_start_raw
        new_end = timezone.make_aware(new_end_raw) if timezone.is_naive(new_end_raw) else new_end_raw
        if old_start != new_start or old_end != new_end:
            has_range_change = True

    if has_range_change and new_start and new_end:
        from planner.services.contiguity import smart_merge_days, validate_meal_plan_contiguity

        smart_merge_days(meal_plan, new_start, new_end)
    else:
        for field, value in patch_data.items():
            if field in ("start_datetime", "end_datetime") and value is not None and timezone.is_naive(value):
                value = timezone.make_aware(value)
            setattr(meal_plan, field, value)
        meal_plan.save()

    if nutritional_tags_to_set is not None:
        meal_plan.nutritional_tags.set(nutritional_tags_to_set)

    if has_range_change:
        from planner.services.contiguity import validate_meal_plan_contiguity

        validate_meal_plan_contiguity(meal_plan)

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

    start_dt = (
        timezone.make_aware(payload.start_datetime)
        if timezone.is_naive(payload.start_datetime)
        else payload.start_datetime
    )
    offset = start_dt - source.start_datetime

    # Prefetch items + overrides to avoid N+1 during clone
    source_with_data = get_object_or_404(
        MealPlan.objects.prefetch_related(
            "meals__items__overrides",
            "nutritional_tags",
        ),
        id=meal_plan_id,
    )

    with transaction.atomic():
        new_plan = MealPlan(
            name=payload.name,
            description=source_with_data.description,
            norm_portions=payload.norm_portions,
            reserve_factor=source_with_data.reserve_factor,
            # Carry over metadata from source
            visibility=source_with_data.visibility,
            day_part_factors=source_with_data.day_part_factors,
            meal_default_times=source_with_data.meal_default_times,
            start_datetime=start_dt,
            end_datetime=source_with_data.end_datetime + offset if source_with_data.end_datetime else None,
            created_by=request.user,
        )
        new_plan.save()

        # Copy nutritional tags
        new_plan.nutritional_tags.set(source_with_data.nutritional_tags.all())

        # Only clone regular meals (skip RefMeals which have null datetimes)
        for meal in source_with_data.meals.filter(is_reference=False):
            if meal.start_datetime is None or meal.end_datetime is None:
                continue

            new_meal = Meal(
                meal_plan=new_plan,
                start_datetime=meal.start_datetime + offset,
                end_datetime=meal.end_datetime + offset,
                meal_type=meal.meal_type,
                day_part_factor=meal.day_part_factor,
                display_name=meal.display_name,
                override_portions=meal.override_portions,
            )
            new_meal.save()

            for item in meal.items.all():
                new_item = MealItem.objects.create(
                    meal=new_meal,
                    recipe=item.recipe,
                    ingredient=item.ingredient,
                    quantity=item.quantity,
                    measuring_unit=item.measuring_unit,
                    display_name=item.display_name,
                    factor=item.factor,
                )
                # Clone MealItemOverrides for each item
                for override in item.overrides.all():
                    MealItemOverride.objects.create(
                        meal_item=new_item,
                        recipe_item=override.recipe_item,
                        quantity_override=override.quantity_override,
                        excluded=override.excluded,
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

    # Auto-extend range if date is outside current range
    if meal_plan.start_datetime and meal_plan.end_datetime:
        if payload.date < meal_plan.start_datetime.date():
            meal_plan.start_datetime = dt.datetime.combine(
                payload.date, dt.time(0, 0)
            ).replace(tzinfo=dt.timezone.utc)
            meal_plan.save(update_fields=["start_datetime", "updated_at"])
        elif payload.date > meal_plan.end_datetime.date():
            meal_plan.end_datetime = dt.datetime.combine(
                payload.date, dt.time(23, 59)
            ).replace(tzinfo=dt.timezone.utc)
            meal_plan.save(update_fields=["end_datetime", "updated_at"])

    meals = meal_plan.create_default_meals_for_date(payload.date)

    from planner.services.contiguity import validate_meal_plan_contiguity

    validate_meal_plan_contiguity(meal_plan)
    return meals


@meal_plan_router.delete("/{meal_plan_id}/days/")
def remove_day(request, meal_plan_id: int, date: dt.date):
    """Remove all meals for a specific date. Only edge days (first or last) can be deleted."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    meals = Meal.objects.filter(meal_plan=meal_plan, start_datetime__date=date)
    if not meals.exists():
        raise HttpError(404, "Keine Mahlzeiten für dieses Datum gefunden")

    # Check if date is an edge day (first or last with meals)
    if meal_plan.start_datetime and meal_plan.end_datetime:
        existing_dates = list(
            Meal.objects.filter(meal_plan=meal_plan)
            .values_list("start_datetime__date", flat=True)
            .distinct()
            .order_by("start_datetime__date")
        )
        if date not in (existing_dates[0], existing_dates[-1]):
            raise HttpError(
                400,
                "Dieser Tag liegt in der Mitte des Essensplans und kann nicht gelöscht werden",
            )

    meals.delete()

    from planner.services.contiguity import shrink_range_on_delete, validate_meal_plan_contiguity

    shrink_range_on_delete(meal_plan, date)
    validate_meal_plan_contiguity(meal_plan)
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
    # Only enforce uniqueness for non-snack meal types (snack can have multiple per day)
    if payload.meal_type != "snack":
        if Meal.objects.filter(
            meal_plan=meal_plan,
            start_datetime__date=meal_date,
            meal_type=payload.meal_type,
        ).exists():
            raise HttpError(400, "Diese Mahlzeit existiert bereits für diesen Tag")

    day_part_factor = payload.day_part_factor
    if day_part_factor is None:
        day_part_factor = MEAL_TYPE_DAY_FACTORS.get(payload.meal_type, 0.0)

    start_dt = (
        timezone.make_aware(payload.start_datetime)
        if timezone.is_naive(payload.start_datetime)
        else payload.start_datetime
    )
    end_dt = (
        timezone.make_aware(payload.end_datetime) if timezone.is_naive(payload.end_datetime) else payload.end_datetime
    )

    meal = Meal.objects.create(
        meal_plan=meal_plan,
        start_datetime=start_dt,
        end_datetime=end_dt,
        meal_type=payload.meal_type,
        day_part_factor=day_part_factor,
        display_name=payload.display_name or "",
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

    raise_if_duplicate_meal_item(meal, recipe_id=payload.recipe_id, ingredient_id=payload.ingredient_id)

    recipe = None
    ingredient = None
    if payload.recipe_id:
        recipe = get_object_or_404(Recipe, id=payload.recipe_id)
    if payload.ingredient_id:
        from supply.models import Ingredient

        ingredient = get_object_or_404(Ingredient, id=payload.ingredient_id)

    item = _create_meal_item(
        meal=meal,
        recipe=recipe,
        ingredient=ingredient,
        quantity=payload.quantity,
        measuring_unit_id=payload.measuring_unit_id,
        display_name=payload.display_name,
        factor=payload.factor,
    )
    return item


@meal_plan_router.post("/{meal_plan_id}/meals/{meal_id}/wizard-items/", response=WizardItemsOut)
def set_wizard_items(request, meal_plan_id: int, meal_id: int, payload: WizardItemsIn):
    """Atomically replace all items in a meal with wizard-generated items.

    Deletes all existing items for this meal and creates new ones in a single
    transaction. Returns the updated item list with computed energy/cost values.
    """
    from django.db import transaction

    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    meal = get_object_or_404(Meal, id=meal_id, meal_plan=meal_plan)

    check_duplicates_in_input(payload.items)

    with transaction.atomic():
        meal.items.all().delete()

        created_items = []
        for item_in in payload.items:
            recipe = None
            ingredient = None
            if item_in.recipe_id and item_in.ingredient_id:
                raise HttpError(422, "Entweder Rezept oder Zutat angeben, nicht beides")
            if not item_in.recipe_id and not item_in.ingredient_id and not item_in.display_name:
                raise HttpError(422, "Rezept, Zutat oder Anzeigename muss angegeben werden")

            if item_in.recipe_id:
                recipe = get_object_or_404(Recipe, id=item_in.recipe_id)
            if item_in.ingredient_id:
                from supply.models import Ingredient

                ingredient = get_object_or_404(Ingredient, id=item_in.ingredient_id)

            # Auto-create Portion if it doesn't exist for this ingredient + measuring_unit
            if ingredient and item_in.measuring_unit_id:
                from supply.models import MeasuringUnit as MU
                mu = MU.objects.filter(id=item_in.measuring_unit_id).first()
                if mu and not ingredient.portions.filter(measuring_unit=mu).exists():
                    weight_g = _derive_portion_weight_g(ingredient, mu)
                    from supply.models import Portion as PT
                    PT.objects.get_or_create(
                        ingredient=ingredient,
                        measuring_unit=mu,
                        defaults={
                            "name": mu.name,
                            "quantity": 1,
                            "weight_g": weight_g,
                        },
                    )

            created_items.append(
                _create_meal_item(
                    meal=meal,
                    recipe=recipe,
                    ingredient=ingredient,
                    quantity=item_in.quantity,
                    measuring_unit_id=item_in.measuring_unit_id,
                    display_name=item_in.display_name,
                    factor=item_in.factor,
                )
            )

    return WizardItemsOut(
        meal_id=meal.id,
        items=list(meal.items.select_related("recipe", "ingredient", "measuring_unit").all()),
    )


@meal_plan_router.post(
    "/{meal_plan_id}/meals/{meal_id}/items/batch/",
    response=list[MealItemOut],
)
def batch_create_meal_items(request, meal_plan_id: int, meal_id: int, payload: MealItemBatchIn):
    """Create multiple meal items atomically (for variant items)."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)
    meal = get_object_or_404(Meal, id=meal_id, meal_plan=meal_plan)

    if not payload.items:
        raise HttpError(422, "Mindestens ein Item erforderlich.")

    import uuid

    variant_group_id = uuid.uuid4()

    from django.db import transaction

    created = []
    with transaction.atomic():
        recipe = get_object_or_404(Recipe, id=payload.items[0].recipe_id)
        # Delete original parent items (without variant_group_id) for this meal + recipe
        MealItem.objects.filter(meal=meal, recipe=recipe, variant_group_id__isnull=True).delete()

        for variant in payload.items:
            if variant.factor < 0.01:
                raise HttpError(422, f"Der Faktor muss mindestens 0,01 betragen: {variant.display_name or variant.recipe_id}")
            item = MealItem.objects.create(
                meal=meal,
                recipe=recipe,
                factor=variant.factor,
                display_name=variant.display_name or "",
                active_recipe_item_ids=variant.active_recipe_item_ids,
                variant_group_id=variant_group_id,
            )
            created.append(item)

    return created


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
    if payload.quantity is not None:
        item.quantity = payload.quantity
        item.save(update_fields=["quantity"])
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
    if payload.display_name is not None:
        meal.display_name = payload.display_name
    if payload.is_external is not None:
        meal.is_external = payload.is_external
    if "external_energy_kcal" in payload.dict(exclude_unset=True):
        if payload.external_energy_kcal is not None:
            meal.external_energy_kcal = payload.external_energy_kcal
        else:
            meal.external_energy_kcal = None
    if "external_cost_per_person" in payload.dict(exclude_unset=True):
        meal.external_cost_per_person = payload.external_cost_per_person

    payload_fields = payload.dict(exclude_unset=True)
    if "start_datetime" in payload_fields and payload.start_datetime is not None:
        meal.start_datetime = payload.start_datetime
    if "end_datetime" in payload_fields and payload.end_datetime is not None:
        meal.end_datetime = payload.end_datetime
    if meal.start_datetime is not None and meal.end_datetime is not None and meal.end_datetime <= meal.start_datetime:
        raise HttpError(400, "Die Endzeit muss nach der Startzeit liegen.")

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

    portions = meal.effective_portions

    current_energy_kcal = MealOut.resolve_total_energy_kcal(meal)
    current_kcal = current_energy_kcal / portions

    if current_kcal <= 0:
        raise HttpError(400, "Mahlzeit enthält keine Kalorien, Skalierung nicht möglich.")

    target_kcal = NORM_PERSON_DAILY_KCAL * meal.day_part_factor
    scale = target_kcal / current_kcal

    from django.db import transaction

    with transaction.atomic():
        for item in meal.items.all():
            item.factor = round(item.factor * scale, 1)
            item.save()

    meal.refresh_from_db()
    return meal


# ==========================================================================
# Copy items from another plan
# ==========================================================================


@meal_plan_router.post(
    "/{meal_plan_id}/meals/{meal_id}/copy-items-from/",
    response=list[MealItemOut],
)
def copy_items_from_plan(request, meal_plan_id: int, meal_id: int, payload: CopyItemsFromPlanIn):
    """Copy all items from a source plan's meal into the target meal."""
    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, request.user)

    target_meal = get_object_or_404(Meal, id=meal_id, meal_plan=meal_plan)
    if target_meal.is_synced:
        raise HttpError(400, "Einträge können nicht in synchronisierte Mahlzeiten kopiert werden.")

    source_plan = get_object_or_404(MealPlan, id=payload.source_plan_id)
    _require_access(source_plan, request.user)

    source_meal = get_object_or_404(Meal, id=payload.source_meal_id, meal_plan=source_plan)

    items_to_copy = source_meal.items.all()

    # Check source items for duplicates within themselves
    source_recipe_ids = []
    source_ingredient_ids = []
    for src in items_to_copy:
        if src.recipe_id:
            if src.recipe_id in source_recipe_ids:
                raise HttpError(422, f"Rezept «{src.recipe.title}» ist mehrfach in der Quell-Mahlzeit enthalten")
            source_recipe_ids.append(src.recipe_id)
        if src.ingredient_id:
            if src.ingredient_id in source_ingredient_ids:
                raise HttpError(422, f"Zutat «{src.ingredient.name}» ist mehrfach in der Quell-Mahlzeit enthalten")
            source_ingredient_ids.append(src.ingredient_id)

    # Check source items don't conflict with existing target items
    for src in items_to_copy:
        raise_if_duplicate_meal_item(target_meal, recipe_id=src.recipe_id, ingredient_id=src.ingredient_id)

    copied_items = []
    for item in items_to_copy:
        copied = _create_meal_item(
            meal=target_meal,
            recipe=item.recipe,
            ingredient=item.ingredient,
            quantity=item.quantity,
            measuring_unit=item.measuring_unit,
            display_name=item.display_name,
            factor=item.factor,
        )
        copied_items.append(copied)

    if payload.note:
        existing = target_meal.note or ""
        note_prefix = f"Importiert aus «{payload.note}»"
        if existing:
            target_meal.note = f"{note_prefix}\n{existing}"
        else:
            target_meal.note = note_prefix
        target_meal.save(update_fields=["note"])

    return copied_items


# ==========================================================================
# MealItem Overrides
# ==========================================================================


@meal_plan_router.patch(
    "/{meal_plan_id}/meal-items/{item_id}/overrides/",
    response=list[MealItemOverrideOut],
)
def set_meal_item_overrides(request, meal_plan_id: int, item_id: int, payload: list[MealItemOverrideIn]):
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
        recipe_item = get_object_or_404(RecipeItem, id=override_in.recipe_item_id, recipe=item.recipe)
        # Overrides are not allowed on optional or exchange-group ingredients —
        # those are configured via active_recipe_item_ids on variant items instead.
        if recipe_item.is_optional or recipe_item.exchange_group_id is not None:
            raise HttpError(
                400,
                "Für Varianten- oder optionale Zutaten kann kein Override gesetzt werden.",
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
    from planner.models import MealItemOverride
    from planner.services.meal_item_helpers import _resolve_ingredient_weight_g

    _require_auth(request)
    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_access(meal_plan, request.user)

    # Collect all MealItems — prefetch recipe items, ingredient, and overrides to avoid N+1
    meal_items_qs = MealItem.objects.filter(
        meal__meal_plan=meal_plan,
    )
    if date:
        meal_items_qs = meal_items_qs.filter(meal__start_datetime__date=date)
    meal_items = list(
        meal_items_qs.select_related(
            "recipe", "meal", "meal__meal_plan",
            "ingredient", "measuring_unit",
        ).prefetch_related(
            "recipe__recipe_items__portion__ingredient",
            "ingredient__portions",
            "overrides",
        )
    )

    fields = (
        "energy_kcal",
        "protein_g",
        "fat_g",
        "carbohydrate_g",
        "sugar_g",
        "fibre_g",
        "salt_g",
    )
    totals = {field: 0.0 for field in fields}
    # Per-person values are aggregated per meal (total / effective_portions) and
    # then summed, so meals with differing effective_portions are handled correctly.
    per_portion_totals = {field: 0.0 for field in fields}

    for mi in meal_items:
        effective_portions = mi.meal.effective_portions

        if mi.recipe:
            if not mi.recipe.portions:
                logger.warning(
                    "Recipe %s '%s' has portions=0 or None, skipping in nutrition_summary",
                    mi.recipe.id, mi.recipe.title,
                )
                continue
            recipe_items = list(mi.recipe.recipe_items.all())
            recipe_servings = mi.recipe.portions
            active_ids = set(mi.active_recipe_item_ids or [])

            # Build override lookup for O(1) access per recipe item
            overrides_map = {o.recipe_item_id: o for o in mi.overrides.all()}

            for ri in recipe_items:
                if not ri.portion or not ri.portion.ingredient:
                    continue

                # Base items (not exchange, not optional) are always included.
                # Exchange members and optional items are included only if in active_ids.
                if ri.exchange_group_id is not None or ri.is_optional:
                    if ri.id not in active_ids:
                        continue

                # Apply MealItemOverride: excluded items are skipped entirely
                override = overrides_map.get(ri.id)
                if override and override.excluded:
                    continue

                # quantity_override replaces the recipe item quantity (same unit: portion count)
                effective_quantity = float(override.quantity_override) if (override and override.quantity_override is not None) else float(ri.quantity)

                ing = ri.portion.ingredient
                weight_g = effective_quantity * float(ri.portion.weight_g) if ri.portion.weight_g else 0
                scale = (weight_g / 100.0) * mi.factor * (effective_portions / recipe_servings)

                for field in fields:
                    ing_val = getattr(ing, field, None)
                    if ing_val is not None:
                        contribution = float(ing_val) * scale
                        totals[field] += contribution
                        per_portion_totals[field] += contribution / effective_portions

        elif mi.ingredient:
            # Direct ingredient (e.g. from Breakfast Wizard) — use same weight resolution as meal_item_helpers
            weight_g = _resolve_ingredient_weight_g(mi)
            if weight_g <= 0:
                continue

            scale = (weight_g / 100.0) * mi.factor * effective_portions

            for field in fields:
                ing_val = getattr(mi.ingredient, field, None)
                if ing_val is not None:
                    contribution = float(ing_val) * scale
                    totals[field] += contribution
                    per_portion_totals[field] += contribution / effective_portions

    per_portion = {f"per_portion_{field}": per_portion_totals[field] for field in fields}

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

    from planner.services.meal_item_helpers import _resolve_ingredient_weight_g
    from supply.services.price_service import get_portion_price

    meals = Meal.objects.filter(meal_plan=meal_plan).prefetch_related(
        "items__recipe__recipe_items__portion__ingredient",
        "items__ingredient",
        "items__ingredient__portions",
        "items__measuring_unit",
        "items__overrides",
    )

    norm_portions = meal_plan.norm_portions or 1
    total_ingredients = 0
    priced_ingredients = 0

    # Aggregate costs per day and meal. ``per_person`` sums the per-meal
    # cost_per_person values so meals with differing effective_portions
    # (e.g. day guests) aggregate correctly.
    day_costs: dict[str, dict] = defaultdict(lambda: {"total": Decimal("0"), "per_person": Decimal("0"), "meals": []})

    # Aggregate costs per recipe:
    # total_cost   = sum of scaled cost across all meals this recipe appears in
    # total_person_portions = sum of effective_portions across all meals (for weighted avg cost_per_person)
    recipe_costs: dict[int, dict] = {}

    for meal in meals:
        if not meal.start_datetime:
            continue
        meal_date = meal.start_datetime.date()
        effective_portions = meal.effective_portions
        meal_cost = Decimal("0")

        for item in meal.items.all():
            if item.recipe:
                if not item.recipe.portions:
                    logger.warning(
                        "Recipe %s '%s' has portions=0 or None, skipping in cost_summary",
                        item.recipe.id, item.recipe.title,
                    )
                    continue
                recipe_servings = item.recipe.portions
                recipe_items = list(item.recipe.recipe_items.all())
                active_ids = set(item.active_recipe_item_ids or [])
                recipe_item_cost = Decimal("0")
                rid = item.recipe.id
                if rid not in recipe_costs:
                    recipe_costs[rid] = {
                        "recipe_id": rid,
                        "recipe_title": item.recipe.title,
                        "recipe_slug": item.recipe.slug,
                        "total_cost": Decimal("0"),
                        # For weighted cost_per_person: accumulate (cost, portions) per meal
                        "weighted_cost_sum": Decimal("0"),
                        "weighted_portions_sum": 0,
                        "priced_ingredients": 0,
                        "total_ingredients": 0,
                    }

                # Build override lookup for this meal item
                overrides_map = {o.recipe_item_id: o for o in item.overrides.all()}

                for ri in recipe_items:
                    if not ri.portion or not ri.portion.ingredient:
                        continue
                    if ri.exchange_group_id is not None or ri.is_optional:
                        if ri.id not in active_ids:
                            continue

                    # MealItemOverride: excluded items are skipped
                    override = overrides_map.get(ri.id)
                    if override and override.excluded:
                        continue

                    # quantity_override replaces recipe item quantity
                    effective_quantity = float(override.quantity_override) if (override and override.quantity_override is not None) else float(ri.quantity)

                    total_ingredients += 1
                    recipe_costs[rid]["total_ingredients"] += 1
                    ing = ri.portion.ingredient
                    weight_g = effective_quantity * float(ri.portion.weight_g) if ri.portion.weight_g else 0
                    scaled_weight_g = weight_g * item.factor * (effective_portions / recipe_servings)
                    price = get_portion_price(ing, scaled_weight_g)
                    if price is not None:
                        priced_ingredients += 1
                        recipe_costs[rid]["priced_ingredients"] += 1
                        meal_cost += price
                        recipe_item_cost += price

                recipe_costs[rid]["total_cost"] += recipe_item_cost
                # Accumulate weighted data for cost_per_person calculation
                recipe_costs[rid]["weighted_cost_sum"] += recipe_item_cost
                recipe_costs[rid]["weighted_portions_sum"] += effective_portions

            elif item.ingredient:
                # Standalone ingredient — use canonical helper (portions prefetched above)
                ing = item.ingredient
                total_ingredients += 1

                base_weight_g = _resolve_ingredient_weight_g(item)
                weight_g = base_weight_g * item.factor * float(effective_portions)

                price = get_portion_price(ing, weight_g)
                if price is not None:
                    priced_ingredients += 1
                    meal_cost += price

        cost_per_person = meal_cost / effective_portions if effective_portions > 0 else Decimal("0")

        day_costs[str(meal_date)]["total"] += meal_cost
        day_costs[str(meal_date)]["per_person"] += cost_per_person
        day_costs[str(meal_date)]["meals"].append(
            {
                "meal_id": meal.id,
                "meal_type": meal.meal_type,
                "date": meal_date,
                "cost": meal_cost,
                "cost_per_person": cost_per_person,
            }
        )

    # Build response
    total_cost = sum(d["total"] for d in day_costs.values())
    # Sum per-meal cost_per_person values (handles differing effective_portions)
    cost_per_person = sum(d["per_person"] for d in day_costs.values())
    reserve_factor = meal_plan.reserve_factor or 1.0
    total_cost_with_reserve = total_cost * Decimal(str(reserve_factor))

    days = []
    for date_str in sorted(day_costs.keys()):
        d = day_costs[date_str]
        days.append(
            {
                "date": date_str,
                "total_cost": d["total"],
                "cost_per_person": d["per_person"],
                "meals": d["meals"],
            }
        )

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
                # Weighted cost_per_person: total_cost / total_person_portions across all meals
                # This correctly handles meals with different effective_portions (override_portions).
                "cost_per_person": (
                    rc["weighted_cost_sum"] / rc["weighted_portions_sum"]
                    if rc["weighted_portions_sum"] > 0
                    else Decimal("0")
                ),
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
                {
                    "recipe_id": s.recipe_id,
                    "recipe_name": s.recipe_name,
                    "recipe_slug": s.recipe_slug,
                    "meal_label": s.meal_label,
                    "quantity_g": s.quantity_g,
                }
                for s in (item.sources or [])
            ],
        )
        for item in items
    ]


# ==========================================================================
# Recipe Suggestions
# ==========================================================================


def _resolve_recipe_badge(recipe, user):
    """Resolve recipe reliability badge: verified, community, or draft."""
    if recipe.owner_id is None:
        return "verified"
    if recipe.visibility == "public" and recipe.status == "approved":
        return "community"
    if recipe.owner_id == user.id:
        return "draft"
    return "community"


# Map meal_type to recipe_type values
MEAL_TYPE_TO_RECIPE_TYPES: dict[str, list[str]] = {
    "breakfast": ["breakfast", "drink"],
    "lunch": ["warm_meal", "cold_meal", "drink"],
    "dinner": ["warm_meal", "cold_meal", "drink"],
    "snack": ["snack", "drink"],
    "drinks": ["drink"],
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
    nutritional_tag_ids: str | None = None,
    require_nutritional_tags: bool = True,
    random: bool = False,
    recipe_types: str | None = None,
):
    """Return recipe suggestions sorted by usage frequency, then price."""
    import random as _random

    from django.db.models import Count, Q

    limit = min(limit, 20)

    base_filter = Q(recipe__isnull=False)

    # Include own drafts
    if request.user.is_authenticated:
        base_filter &= Q(Q(recipe__status="approved") | Q(recipe__owner=request.user))
    else:
        base_filter &= Q(recipe__status="approved")

    # Hard dietary filter
    if nutritional_tag_ids and require_nutritional_tags:
        tag_ids = [int(t) for t in nutritional_tag_ids.split(",") if t.strip().isdigit()]
        for tag_id in tag_ids:
            base_filter &= Q(recipe__nutritional_tags__id=tag_id)

    # Text search filter
    text_filter = Q()
    if q and len(q) >= 1:
        text_filter = Q(recipe__title__icontains=q)

    # recipe_type-specific results: explicit list > meal_type mapping
    resolved_recipe_types: list[str] = []
    if recipe_types:
        resolved_recipe_types = [t.strip() for t in recipe_types.split(",") if t.strip()]
    elif meal_type and meal_type in MEAL_TYPE_TO_RECIPE_TYPES:
        resolved_recipe_types = MEAL_TYPE_TO_RECIPE_TYPES[meal_type]

    recipe_type_filter = Q()
    if resolved_recipe_types:
        recipe_type_filter = Q(recipe__recipe_type__in=resolved_recipe_types)

    # Primary: recipes matching recipe_type, sorted by usage count
    results = []
    seen_ids: set[int] = set()

    if resolved_recipe_types:
        type_qs = (
            MealItem.objects.filter(base_filter & recipe_type_filter & text_filter)
            .values("recipe_id")
            .annotate(count=Count("id"))
            .order_by("-count")[:limit]
        )
        recipe_ids = [entry["recipe_id"] for entry in type_qs]
        if recipe_ids:
            recipes_map = {r.id: r for r in Recipe.objects.filter(id__in=recipe_ids)}
            counts_map = {entry["recipe_id"]: entry["count"] for entry in type_qs}
            for rid in recipe_ids:
                r = recipes_map.get(rid)
                if r:
                    price = float(r.cached_price_total) if r.cached_price_total else None
                    badge = _resolve_recipe_badge(r, request.user)
                    price_per_serving = (
                        round(float(r.cached_price_total) / r.portions, 2)
                        if r.cached_price_total and r.portions and r.portions > 0
                        else None
                    )
                    results.append((r, counts_map[rid], badge, price_per_serving, price))
                    seen_ids.add(r.id)

    # Fallback: fill up with global usage (excluding already seen, still filtered by recipe_type)
    remaining = limit - len(results)
    if remaining > 0:
        exclude_filter = Q()
        if seen_ids:
            exclude_filter = ~Q(recipe_id__in=seen_ids)

        global_qs = (
            MealItem.objects.filter(base_filter & recipe_type_filter & text_filter & exclude_filter)
            .values("recipe_id")
            .annotate(count=Count("id"))
            .order_by("-count")[:remaining]
        )
        recipe_ids = [entry["recipe_id"] for entry in global_qs]
        if recipe_ids:
            recipes_map = {r.id: r for r in Recipe.objects.filter(id__in=recipe_ids)}
            counts_map = {entry["recipe_id"]: entry["count"] for entry in global_qs}
            for rid in recipe_ids:
                r = recipes_map.get(rid)
                if r:
                    price = float(r.cached_price_total) if r.cached_price_total else None
                    badge = _resolve_recipe_badge(r, request.user)
                    price_per_serving = (
                        round(float(r.cached_price_total) / r.portions, 2)
                        if r.cached_price_total and r.portions and r.portions > 0
                        else None
                    )
                    results.append((r, counts_map[rid], badge, price_per_serving, price))
                    seen_ids.add(r.id)

    # Sort: usage_count DESC, price ASC NULLS LAST
    results.sort(key=lambda x: (-x[1], x[4] if x[4] is not None else 1e9))

    # Own recipes (even with 0 usage): always include, ranked first
    if request.user.is_authenticated:
        own_filter = Q(owner=request.user)
        if resolved_recipe_types:
            own_filter &= Q(recipe_type__in=resolved_recipe_types)
        if q and len(q) >= 1:
            own_filter &= Q(title__icontains=q)
        if seen_ids:
            own_filter &= ~Q(id__in=seen_ids)
        own_qs = Recipe.objects.filter(own_filter).order_by("-usage_count", "cached_price_total")[:limit]
        own_entries = []
        for r in own_qs:
            price = float(r.cached_price_total) if r.cached_price_total else None
            badge = _resolve_recipe_badge(r, request.user)
            price_per_serving = (
                round(float(r.cached_price_total) / r.portions, 2)
                if r.cached_price_total and r.portions and r.portions > 0
                else None
            )
            own_entries.append((r, 0, badge, price_per_serving, price))
            seen_ids.add(r.id)
        if own_entries:
            results = own_entries + results[: limit - len(own_entries)]

    if random and results:
        top_n = results[: min(20, len(results))]
        chosen = _random.choice(top_n)
        r, count, badge, pps, _ = chosen
        return [
            RecipeSuggestionOut(
                id=r.id,
                title=r.title,
                usage_count=count,
                image_thumbnail=r.image.url if r.image else None,
                recipe_badge=badge,
                price_per_serving=pps,
                recipe_type=r.recipe_type,
            )
        ]

    return [
        RecipeSuggestionOut(
            id=r.id,
            title=r.title,
            usage_count=count,
            image_thumbnail=r.image.url if r.image else None,
            recipe_badge=badge,
            price_per_serving=pps,
            recipe_type=r.recipe_type,
        )
        for r, count, badge, pps, _ in results
    ]


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

    # Base filter — include own drafts
    recipe_filter = Q(usage_count__gt=0)
    if request.user.is_authenticated:
        recipe_filter &= Q(Q(status="approved") | Q(owner=request.user))
    else:
        recipe_filter &= Q(status="approved")
    if meal_type and meal_type in MEAL_TYPE_TO_RECIPE_TYPES:
        recipe_filter &= Q(recipe_type__in=MEAL_TYPE_TO_RECIPE_TYPES[meal_type])

    # Community: top by usage_count, then price
    community_qs = Recipe.objects.filter(recipe_filter).order_by("-usage_count", "cached_price_total")[:limit]
    community = [
        {
            "id": r.id,
            "title": r.title,
            "recipe_type": r.recipe_type,
            "image": r.image.url if r.image else None,
            "usage_count": r.usage_count,
            "recipe_badge": _resolve_recipe_badge(r, request.user),
            "price_per_serving": (
                round(float(r.cached_price_total) / r.portions, 2)
                if r.cached_price_total and r.portions and r.portions > 0
                else None
            ),
        }
        for r in community_qs
    ]

    # Personal: aggregate MealItems for current user
    personal = []
    if request.user.is_authenticated:
        personal_qs = MealItem.objects.filter(
            recipe__isnull=False,
            meal__meal_plan__created_by=request.user,
        )
        if meal_type and meal_type in MEAL_TYPE_TO_RECIPE_TYPES:
            personal_qs = personal_qs.filter(meal__meal_type=meal_type)

        personal_agg = personal_qs.values("recipe_id").annotate(count=Count("id")).order_by("-count")[:limit]
        recipe_ids = [entry["recipe_id"] for entry in personal_agg]
        if recipe_ids:
            recipes_map = {r.id: r for r in Recipe.objects.filter(id__in=recipe_ids)}
            counts_map = {entry["recipe_id"]: entry["count"] for entry in personal_agg}
            for rid in recipe_ids:
                r = recipes_map.get(rid)
                if r:
                    badge = _resolve_recipe_badge(r, request.user)
                    pps = (
                        round(float(r.cached_price_total) / r.portions, 2)
                        if r.cached_price_total and r.portions and r.portions > 0
                        else None
                    )
                    personal.append(
                        {
                            "id": r.id,
                            "title": r.title,
                            "recipe_type": r.recipe_type,
                            "image": r.image.url if r.image else None,
                            "usage_count": counts_map[rid],
                            "recipe_badge": badge,
                            "price_per_serving": pps,
                        }
                    )

    return {"personal": personal, "community": community}


# ==========================================================================
# Recently Used Recipes
# ==========================================================================


@meal_plan_router.get("/recipes/recently-used/", response=dict)
def recently_used_recipes(
    request,
    limit: int = 5,
):
    """Return user's last 5 distinct recipes used across all meal plans."""
    _require_auth(request)
    limit = min(limit, 10)

    recipe_ids = (
        MealItem.objects.filter(
            recipe__isnull=False,
            meal__meal_plan__created_by=request.user,
        )
        .order_by("-id")
        .values_list("recipe_id", flat=True)
        .distinct()[:limit]
    )

    recipes = []
    if recipe_ids:
        recipes_map = {r.id: r for r in Recipe.objects.filter(id__in=list(recipe_ids))}
        for rid in recipe_ids:
            r = recipes_map.get(rid)
            if r:
                badge = _resolve_recipe_badge(r, request.user)
                pps = (
                    round(float(r.cached_price_total) / r.portions, 2)
                    if r.cached_price_total and r.portions and r.portions > 0
                    else None
                )
                tags = [{"id": t.id, "name": t.name} for t in r.nutritional_tags.all()]
                recipes.append(
                    {
                        "id": r.id,
                        "title": r.title,
                        "slug": r.slug,
                        "recipe_type": r.recipe_type,
                        "image": r.image.url if r.image else None,
                        "usage_count": r.usage_count,
                        "recipe_badge": badge,
                        "price_per_serving": pps,
                        "nutritional_tags": tags,
                    }
                )

    return {"recipes": recipes}


# ==========================================================================
# Recipe Search (standalone recipe model)
# ==========================================================================


@meal_plan_router.get("/recipes/search/", response=dict)
def search_recipes(
    request,
    q: str = "",
    meal_type: str | None = None,
    recipe_types: str | None = None,
    recipe_badge: str | None = None,
    nutritional_tag_ids: str | None = None,
    exclude_nutritional_tag_ids: str | None = None,
    tag_ids: str | None = None,
    limit: int = 8,
):
    """Search for recipes and standalone ingredients to add to meals.

    recipe_types: kommaseparierte Liste von recipe_type Werten, z.B. 'warm_meal,cold_meal'.
                  'ingredient' als einziger Wert gibt nur eigenständig konsumierbare Zutaten zurück.
                  Überschreibt das automatische meal_type-Mapping.
    """
    _require_auth(request)

    limit = min(limit, 50)
    fallback_applied = False

    # Parse recipe_types early
    parsed_types: list[str] = []
    if recipe_types:
        parsed_types = [t.strip() for t in recipe_types.split(",") if t.strip()]

    # 'ingredient' mode: only standalone ingredients, no recipes
    if parsed_types == ["ingredient"]:
        recipes_data: list[dict] = []
        from supply.models import Ingredient, Portion
        from supply.models.reference import NutritionalTag

        ing_qs = Ingredient.objects.filter(is_standalone_food=True)

        if q and len(q) >= 2:
            ing_qs = ing_qs.filter(name__icontains=q)

        if nutritional_tag_ids:
            tag_ids = [int(t) for t in nutritional_tag_ids.split(",") if t.strip().isdigit()]
            for tag_id in tag_ids:
                ing_qs = ing_qs.filter(nutritional_tags__id=tag_id)

        if exclude_nutritional_tag_ids:
            exclude_tag_ids = [int(t) for t in exclude_nutritional_tag_ids.split(",") if t.strip().isdigit()]
            if exclude_tag_ids:
                ing_qs = ing_qs.exclude(nutritional_tags__id__in=exclude_tag_ids)

        ing_qs = ing_qs.annotate(usage_count=Count("portions__recipe_items", distinct=True))

        ing_list = list(
            ing_qs.values(
                "id",
                "name",
                "slug",
                "energy_kcal",
                "protein_g",
                "fat_g",
                "carbohydrate_g",
                "nutri_class",
                "price_per_kg",
                "usage_count",
                "description",
                "status",
            )[:limit]
        )

        if ing_list:
            ing_ids = [i["id"] for i in ing_list]

            # Nutritional tags
            through_model = Ingredient.nutritional_tags.through
            through_rows = through_model.objects.filter(ingredient_id__in=ing_ids).values_list(
                "ingredient_id", "nutritionaltag_id"
            )
            tag_ids_all = set(tid for _, tid in through_rows)
            tags_map: dict[int, str] = {}
            if tag_ids_all:
                for tag in NutritionalTag.objects.filter(id__in=tag_ids_all).values("id", "name"):
                    tags_map[tag["id"]] = tag["name"]
            nutritional_tags_by_ing: dict[int, list[dict]] = {}
            for iid, tid in through_rows:
                nutritional_tags_by_ing.setdefault(iid, []).append({"id": tid, "name": tags_map.get(tid, "")})

            portions = Portion.objects.filter(ingredient_id__in=ing_ids, deleted_at__isnull=True).select_related(
                "measuring_unit"
            )
            portions_by_ing: dict[int, list[dict]] = {}
            for p in portions:
                portions_by_ing.setdefault(p.ingredient_id, []).append(
                    {
                        "id": p.id,
                        "name": p.name,
                        "measuring_unit": p.measuring_unit.name if p.measuring_unit else None,
                        "measuring_unit_id": p.measuring_unit_id,
                        "quantity": float(p.quantity) if p.quantity else None,
                        "weight_g": float(p.weight_g) if p.weight_g else None,
                    }
                )
            for ing in ing_list:
                ing["portions"] = portions_by_ing.get(ing["id"], [])
                ing["nutritional_tags"] = nutritional_tags_by_ing.get(ing["id"], [])

        return {"recipes": recipes_data, "ingredients": ing_list, "fallback_applied": False}

    # --- Recipes ---
    qs = Recipe.objects.filter(Q(status="approved") | Q(owner=request.user))

    # Badge filter: 'verified' = owner is None, 'community' = public approved with owner
    if recipe_badge == "verified":
        qs = qs.filter(owner__isnull=True)
    elif recipe_badge == "community":
        qs = qs.filter(owner__isnull=False, status="approved")

    if q and len(q) >= 2:
        from django.contrib.postgres.search import SearchQuery, SearchRank

        search_query = SearchQuery(q, config="german")
        qs_fts = qs.filter(search_vector=search_query).annotate(rank=SearchRank("search_vector", search_query))
        if qs_fts.exists():
            qs = qs_fts.order_by("-rank")
        else:
            qs = qs.filter(title__icontains=q)

    # Determine recipe_type filter: explicit list > meal_type mapping > all
    if recipe_types:
        type_filter = [t.strip() for t in recipe_types.split(",") if t.strip()]
    elif meal_type and meal_type in MEAL_TYPE_TO_RECIPE_TYPES:
        type_filter = MEAL_TYPE_TO_RECIPE_TYPES[meal_type]
    else:
        type_filter = []

    qs = qs.annotate(is_own=Case(When(owner=request.user, then=1), default=0))

    # Apply nutritional tag filters as SQL before the limit slice
    if nutritional_tag_ids:
        tag_ids_include = [int(t) for t in nutritional_tag_ids.split(",") if t.strip().isdigit()]
        for tag_id in tag_ids_include:
            qs = qs.filter(nutritional_tags__id=tag_id)

    if exclude_nutritional_tag_ids:
        exclude_tag_ids = [int(t) for t in exclude_nutritional_tag_ids.split(",") if t.strip().isdigit()]
        if exclude_tag_ids:
            qs = qs.exclude(nutritional_tags__id__in=exclude_tag_ids)

    # Filter by content tags (e.g., breakfast day tags)
    if tag_ids:
        parsed_tag_ids = [int(t) for t in tag_ids.split(",") if t.strip().isdigit()]
        for tid in parsed_tag_ids:
            qs = qs.filter(tags=tid)

    if type_filter:
        primary_qs = qs.filter(recipe_type__in=type_filter)
        primary_recipes = list(primary_qs.order_by("-is_own", "-usage_count", "cached_price_total")[:limit])
        if len(primary_recipes) < limit:
            fallback_applied = True
            seen_ids = {r.id for r in primary_recipes}
            remaining = limit - len(primary_recipes)
            fallback_qs = qs.exclude(id__in=seen_ids).order_by("-is_own", "-usage_count", "cached_price_total")[
                :remaining
            ]
            recipes_qs = primary_recipes + list(fallback_qs)
        else:
            recipes_qs = primary_recipes
    else:
        recipes_qs = list(qs.order_by("-is_own", "-usage_count", "cached_price_total")[:limit])

    # Fetch related data
    recipe_ids = [r.id for r in recipes_qs]
    # Prefetch nutritional_tags for all recipes
    nutritional_tags_map: dict[int, list] = {}
    # Prefetch recipe_items for ingredients_preview
    ingredients_map: dict[int, list[str]] = {}
    if recipe_ids:
        from supply.models.reference import NutritionalTag

        through_model = Recipe.nutritional_tags.through
        through_rows = through_model.objects.filter(recipe_id__in=recipe_ids).values_list(
            "recipe_id", "nutritionaltag_id"
        )
        tag_ids_all = set(tid for _, tid in through_rows)
        tags_map: dict[int, str] = {}
        if tag_ids_all:
            for tag in NutritionalTag.objects.filter(id__in=tag_ids_all).values("id", "name"):
                tags_map[tag["id"]] = tag["name"]
        for rid, tid in through_rows:
            nutritional_tags_map.setdefault(rid, []).append({"id": tid, "name": tags_map.get(tid, "")})

        # Fetch recipe items for preview
        from recipe.models import RecipeItem

        for item in (
            RecipeItem.objects.filter(recipe_id__in=recipe_ids)
            .select_related("portion__ingredient")
            .order_by("sort_order")
        ):
            if hasattr(item, "portion") and item.portion and item.portion.ingredient:
                ingredients_map.setdefault(item.recipe_id, []).append(item.portion.ingredient.name)

    recipes = []
    for r in recipes_qs:
        tags = nutritional_tags_map.get(r.id, [])
        description = (r.description or "")[:200] if r.description else None
        badge = _resolve_recipe_badge(r, request.user)
        price_per_serving = (
            round(float(r.cached_price_total) / r.portions, 2)
            if r.cached_price_total and r.portions and r.portions > 0
            else None
        )
        recipes.append(
            {
                "id": r.id,
                "title": r.title,
                "slug": r.slug,
                "recipe_type": r.recipe_type,
                "image": r.image.url if r.image else None,
                "portions": r.portions,
                "cached_energy_kcal": r.cached_energy_kcal,
                "cached_protein_g": r.cached_protein_g,
                "cached_fat_g": r.cached_fat_g,
                "cached_carbohydrate_g": r.cached_carbohydrate_g,
                "cached_price_total": float(r.cached_price_total) if r.cached_price_total else None,
                "cached_nutri_class": r.cached_nutri_class,
                "nutritional_tags": tags,
                "usage_count": r.usage_count,
                "description": description,
                "ingredients_preview": ingredients_map.get(r.id, [])[:8],
                "recipe_badge": badge,
                "price_per_serving": price_per_serving,
            }
        )

    # --- Standalone Ingredients ---
    from supply.models import Ingredient, Portion

    ing_qs = Ingredient.objects.filter(is_standalone_food=True)

    if q and len(q) >= 2:
        ing_qs = ing_qs.filter(name__icontains=q)

    if nutritional_tag_ids:
        tag_ids = [int(t) for t in nutritional_tag_ids.split(",") if t.strip().isdigit()]
        for tag_id in tag_ids:
            ing_qs = ing_qs.filter(nutritional_tags__id=tag_id)

    if exclude_nutritional_tag_ids:
        exclude_tag_ids = [int(t) for t in exclude_nutritional_tag_ids.split(",") if t.strip().isdigit()]
        if exclude_tag_ids:
            ing_qs = ing_qs.exclude(nutritional_tags__id__in=exclude_tag_ids)

    ing_qs = ing_qs.annotate(usage_count=Count("portions__recipe_items", distinct=True))

    ing_list = list(
        ing_qs.values(
            "id",
            "name",
            "slug",
            "energy_kcal",
            "protein_g",
            "fat_g",
            "carbohydrate_g",
            "nutri_class",
            "price_per_kg",
            "usage_count",
            "description",
            "status",
        )[:limit]
    )

    # Attach portions + nutritional tags to each ingredient
    if ing_list:
        ing_ids = [i["id"] for i in ing_list]

        # Nutritional tags (same approach as recipes above)
        from supply.models.reference import NutritionalTag

        through_model = Ingredient.nutritional_tags.through
        through_rows = through_model.objects.filter(ingredient_id__in=ing_ids).values_list(
            "ingredient_id", "nutritionaltag_id"
        )
        tag_ids_all = set(tid for _, tid in through_rows)
        tags_map: dict[int, str] = {}
        if tag_ids_all:
            for tag in NutritionalTag.objects.filter(id__in=tag_ids_all).values("id", "name"):
                tags_map[tag["id"]] = tag["name"]
        nutritional_tags_by_ing: dict[int, list[dict]] = {}
        for iid, tid in through_rows:
            nutritional_tags_by_ing.setdefault(iid, []).append({"id": tid, "name": tags_map.get(tid, "")})

        # Portions
        portions = Portion.objects.filter(ingredient_id__in=ing_ids, deleted_at__isnull=True).select_related(
            "measuring_unit"
        )
        portions_by_ing: dict[int, list[dict]] = {}
        for p in portions:
            portions_by_ing.setdefault(p.ingredient_id, []).append(
                {
                    "id": p.id,
                    "name": p.name,
                    "measuring_unit": p.measuring_unit.name if p.measuring_unit else None,
                    "measuring_unit_id": p.measuring_unit_id,
                    "quantity": float(p.quantity) if p.quantity else None,
                    "weight_g": float(p.weight_g) if p.weight_g else None,
                }
            )
        for ing in ing_list:
            ing["portions"] = portions_by_ing.get(ing["id"], [])
            ing["nutritional_tags"] = nutritional_tags_by_ing.get(ing["id"], [])

    return {"recipes": recipes, "ingredients": ing_list, "fallback_applied": fallback_applied}


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

    # Send email notification (best-effort)
    try:
        notify_collaborator_added(meal_plan, user, request.user, payload.role)
    except Exception:
        logger.exception("Failed to send collaborator notification email")

    return 201, collab


@meal_plan_router.patch(
    "/{meal_plan_id}/collaborators/{collaborator_id}/",
    response=MealPlanCollaboratorOut,
)
def update_collaborator(request, meal_plan_id: int, collaborator_id: int, payload: MealPlanCollaboratorUpdateIn):
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


# --- Ingredient Scanner ---


@meal_plan_router.get(
    "/{meal_plan_id}/ingredient-scan/",
    response=NutritionalTagScanOut,
    summary="Check all ingredients against plan nutritional tag restrictions",
)
def get_ingredient_scan(request, meal_plan_id: int):
    """Scan the meal plan for nutritional tag violations at ingredient level.
    Checks both recipe-level tags (after full sync) and standalone ingredient tags.
    """
    _require_auth(request)

    try:
        meal_plan = MealPlan.objects.prefetch_related(
            Prefetch(
                "meals",
                queryset=(
                    Meal.objects.filter(is_reference=False)
                    .order_by("start_datetime")
                    .prefetch_related(
                        Prefetch(
                            "items",
                            queryset=MealItem.objects.select_related("recipe", "ingredient").prefetch_related(
                                "recipe__nutritional_tags", "ingredient__nutritional_tags"
                            ),
                        )
                    )
                    if hasattr(Meal, "is_reference")
                    else Meal.objects.order_by("start_datetime").prefetch_related(
                        Prefetch(
                            "items",
                            queryset=MealItem.objects.select_related("recipe", "ingredient").prefetch_related(
                                "recipe__nutritional_tags", "ingredient__nutritional_tags"
                            ),
                        )
                    )
                ),
            ),
            "nutritional_tags",
        ).get(id=meal_plan_id)
    except MealPlan.DoesNotExist:
        raise HttpError(404, "Essensplan nicht gefunden")

    _require_access(meal_plan, request.user)

    plan_tag_ids = {tag.id for tag in meal_plan.nutritional_tags.all()}
    violations = []
    affected_meal_ids = set()
    unique_tag_ids = set()

    for meal in meal_plan.meals.all():
        meal_date = meal.start_datetime.date() if meal.start_datetime else dt.date.today()
        for item in meal.items.all():
            tags_to_check = set()

            if item.recipe:
                for tag in item.recipe.nutritional_tags.all():
                    tags_to_check.add(tag.id)

            if item.ingredient:
                for tag in item.ingredient.nutritional_tags.all():
                    tags_to_check.add(tag.id)

            for tag_id in tags_to_check:
                if tag_id in plan_tag_ids:
                    tag = next(
                        (
                            t
                            for t in meal_plan.nutritional_tags.all()
                            if t.id == tag_id
                        ),
                        None,
                    )
                    if tag:
                        violations.append(
                            {
                                "meal_id": meal.id,
                                "meal_type": meal.meal_type,
                                "date": meal_date,
                                "recipe_id": item.recipe.id if item.recipe else None,
                                "recipe_title": item.recipe.title if item.recipe else (item.ingredient.name if item.ingredient else "Unbekannt"),
                                "recipe_slug": item.recipe.slug if item.recipe else "",
                                "nutritional_tag": tag,
                                "source": "recipe_tag" if item.recipe else "ingredient_tag",
                            }
                        )
                        affected_meal_ids.add(meal.id)
                        unique_tag_ids.add(tag.id)

    summary = {
        "total_violations": len(violations),
        "affected_meals": len(affected_meal_ids),
        "unique_tags": len(unique_tag_ids),
    }

    return {
        "nutritional_tags": list(meal_plan.nutritional_tags.all()),
        "violations": violations,
        "summary": summary,
    }


@meal_plan_router.get("/{meal_plan_id}/cooking-schedule/", response=CookingScheduleOut)
def get_cooking_schedule(request, meal_plan_id: int):
    """Chronologische Kochplan-Übersicht für einen Essensplan.

    Liefert pro Tag eine nach Startzeit sortierte Liste aller zu kochenden Rezepte.
    Startzeit = Servierzeit − (Vorbereitungszeit + Kochzeit) als Bucket-Obergrenzen.
    """
    from planner.services.cooking_schedule_service import build_cooking_schedule

    _require_auth(request)
    try:
        meal_plan = MealPlan.objects.get(pk=meal_plan_id)
    except MealPlan.DoesNotExist:
        raise HttpError(404, "Essensplan nicht gefunden")

    _require_access(meal_plan, request.user)

    result = build_cooking_schedule(meal_plan)
    return result


@meal_plan_router.post("/{meal_plan_id}/calculate-ingredient-kcal/", response=CalculateIngredientKcalOut)
def calculate_ingredient_kcal(request, meal_plan_id: int, payload: CalculateIngredientKcalIn):
    """Calculate energy (kcal) for a list of ingredients by quantity in grams.

    Accepts an array of {ingredient_id, quantity_g} and returns {ingredient_id, energy_kcal}.
    Used by the breakfast wizard to calculate extra ingredient kcal.
    """
    from supply.models import Ingredient

    _require_auth(request)

    # Check meal plan exists and user has access
    try:
        meal_plan = MealPlan.objects.get(pk=meal_plan_id)
    except MealPlan.DoesNotExist:
        raise HttpError(404, "Essensplan nicht gefunden")

    _require_access(meal_plan, request.user)

    # Collect all requested ingredient IDs
    ingredient_ids = [item.get("ingredient_id") for item in payload.items]
    if not ingredient_ids:
        return {"items": []}

    # Fetch all ingredients at once
    ingredients = {
        ing.id: ing
        for ing in Ingredient.objects.filter(id__in=ingredient_ids).only("id", "energy_kcal")
    }

    # Calculate kcal for each item
    result_items = []
    for item in payload.items:
        ingredient_id = item.get("ingredient_id")
        quantity_g = item.get("quantity_g", 0)

        if not ingredient_id:
            continue

        ingredient = ingredients.get(ingredient_id)
        if not ingredient:
            result_items.append({"ingredient_id": ingredient_id, "energy_kcal": None})
            continue

        # energy_kcal is per 100g, so multiply by quantity_g / 100
        energy_kcal = None
        if ingredient.energy_kcal is not None:
            energy_kcal = round((ingredient.energy_kcal * quantity_g) / 100, 2)

        result_items.append({"ingredient_id": ingredient_id, "energy_kcal": energy_kcal})

    return {"items": result_items}
