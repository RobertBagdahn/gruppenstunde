"""Contiguity validation and day-range management for MealPlans."""

import datetime as dt

from ninja.errors import HttpError

from planner.models import Meal, MealPlan


def validate_meal_plan_contiguity(meal_plan: MealPlan) -> None:
    if not meal_plan.start_datetime or not meal_plan.end_datetime:
        return

    start_date = meal_plan.start_datetime.date()
    end_date = meal_plan.end_datetime.date()

    existing_dates = set(
        Meal.objects.filter(meal_plan=meal_plan)
        .values_list("start_datetime__date", flat=True)
        .distinct()
    )

    current = start_date
    while current <= end_date:
        if current not in existing_dates:
            raise HttpError(
                400,
                f"Essensplan hat eine Lücke: {current.strftime('%d.%m.%Y')} hat keine Mahlzeiten",
            )
        current += dt.timedelta(days=1)


def smart_merge_days(meal_plan: MealPlan, new_start: dt.datetime, new_end: dt.datetime) -> None:
    from planner.models import Meal

    new_start_date = new_start.date()
    new_end_date = new_end.date()

    # Delete meals outside new range
    Meal.objects.filter(meal_plan=meal_plan, start_datetime__date__lt=new_start_date).delete()
    Meal.objects.filter(meal_plan=meal_plan, start_datetime__date__gt=new_end_date).delete()

    # Update plan range
    meal_plan.start_datetime = new_start
    meal_plan.end_datetime = new_end
    meal_plan.save(update_fields=["start_datetime", "end_datetime", "updated_at"])

    # Get existing dates in new range
    existing_dates = set(
        Meal.objects.filter(meal_plan=meal_plan)
        .filter(
            start_datetime__date__gte=new_start_date,
            start_datetime__date__lte=new_end_date,
        )
        .values_list("start_datetime__date", flat=True)
        .distinct()
    )

    # Create meals for missing dates
    current = new_start_date
    while current <= new_end_date:
        if current not in existing_dates:
            is_first = current == new_start_date
            is_last = current == new_end_date
            meal_plan.create_meals_for_date_timeaware(current, is_first=is_first, is_last=is_last)
        current += dt.timedelta(days=1)


def shrink_range_on_delete(meal_plan: MealPlan, deleted_date: dt.date) -> None:
    if not meal_plan.start_datetime or not meal_plan.end_datetime:
        meal_plan.start_datetime = None
        meal_plan.end_datetime = None
        meal_plan.save(update_fields=["start_datetime", "end_datetime", "updated_at"])
        return

    start_date = meal_plan.start_datetime.date()
    end_date = meal_plan.end_datetime.date()

    if deleted_date == start_date:
        # Find next day with meals
        next_date = _next_date_with_meals(meal_plan, start_date, end_date)
        if next_date is None:
            meal_plan.start_datetime = None
            meal_plan.end_datetime = None
        else:
            meal_plan.start_datetime = dt.datetime.combine(next_date, dt.time(0, 0)).replace(
                tzinfo=dt.timezone.utc
            )
    elif deleted_date == end_date:
        # Find previous day with meals
        prev_date = _prev_date_with_meals(meal_plan, end_date, start_date)
        if prev_date is None:
            meal_plan.start_datetime = None
            meal_plan.end_datetime = None
        else:
            meal_plan.end_datetime = dt.datetime.combine(prev_date, dt.time(23, 59)).replace(
                tzinfo=dt.timezone.utc
            )

    meal_plan.save(update_fields=["start_datetime", "end_datetime", "updated_at"])


def _next_date_with_meals(meal_plan: MealPlan, after: dt.date, up_to: dt.date) -> dt.date | None:
    dates = (
        Meal.objects.filter(meal_plan=meal_plan, start_datetime__date__gt=after)
        .values_list("start_datetime__date", flat=True)
        .distinct()
        .order_by("start_datetime__date")[:1]
    )
    return dates[0] if dates else None


def _prev_date_with_meals(meal_plan: MealPlan, before: dt.date, down_to: dt.date) -> dt.date | None:
    dates = (
        Meal.objects.filter(meal_plan=meal_plan, start_datetime__date__lt=before)
        .values_list("start_datetime__date", flat=True)
        .distinct()
        .order_by("-start_datetime__date")[:1]
    )
    return dates[0] if dates else None
