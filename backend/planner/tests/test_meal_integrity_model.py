from datetime import timedelta

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone

from planner.models import Meal, MealPlan


@pytest.fixture
def plan(db, django_user_model):
    user = django_user_model.objects.create_user(username="planowner", password="x")
    now = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return MealPlan.objects.create(
        name="Testplan",
        created_by=user,
        start_datetime=now,
        end_datetime=now + timedelta(days=2),
    )


@pytest.mark.django_db
class TestMealReferenceWithoutDatetime:
    def test_reference_meal_with_datetime_raises_on_save(self, plan):
        meal = Meal(meal_plan=plan, meal_type="breakfast", is_reference=True, start_datetime=timezone.now())
        with pytest.raises(ValidationError):
            meal.save()

    def test_reference_meal_without_datetime_saves(self, plan):
        meal = Meal.objects.create(meal_plan=plan, meal_type="breakfast", is_reference=True)
        assert meal.start_datetime is None

    def test_check_constraint_rejects_bypassing_clean(self, plan):
        # bulk_create / update() bypass clean(); the DB-level constraint must still catch it.
        with pytest.raises(IntegrityError), transaction.atomic():
            Meal.objects.bulk_create(
                [Meal(meal_plan=plan, meal_type="breakfast", is_reference=True, start_datetime=timezone.now())]
            )


@pytest.mark.django_db
class TestUniqueRegularMealPerDayAndType:
    def test_second_breakfast_same_day_raises(self, plan):
        Meal.objects.create(meal_plan=plan, meal_type="breakfast", start_datetime=plan.start_datetime)
        with pytest.raises(ValidationError):
            Meal(meal_plan=plan, meal_type="breakfast", start_datetime=plan.start_datetime).save()

    def test_second_snack_same_day_allowed(self, plan):
        Meal.objects.create(meal_plan=plan, meal_type="snack", start_datetime=plan.start_datetime)
        second = Meal.objects.create(meal_plan=plan, meal_type="snack", start_datetime=plan.start_datetime)
        assert second.pk is not None

    def test_db_constraint_rejects_bypassing_clean(self, plan):
        Meal.objects.create(meal_plan=plan, meal_type="lunch", start_datetime=plan.start_datetime)
        with pytest.raises(IntegrityError), transaction.atomic():
            Meal.objects.bulk_create([Meal(meal_plan=plan, meal_type="lunch", start_datetime=plan.start_datetime)])


@pytest.mark.django_db
class TestMealPlanRangeValidation:
    def test_new_meal_outside_range_raises(self, plan):
        outside = plan.start_datetime - timedelta(days=10)
        with pytest.raises(ValidationError, match="außerhalb des Planzeitraums"):
            Meal(meal_plan=plan, meal_type="dinner", start_datetime=outside).save()

    def test_existing_meal_outside_range_stays_editable(self, plan):
        meal = Meal.objects.create(meal_plan=plan, meal_type="dinner", start_datetime=plan.start_datetime)
        # Move the meal itself out of range directly in the DB, bypassing clean(),
        # to simulate a pre-existing out-of-range row (as on prod today).
        Meal.objects.filter(pk=meal.pk).update(start_datetime=plan.start_datetime - timedelta(days=10))
        meal.refresh_from_db()
        meal.note = "updated without touching the date"
        meal.save()  # must not raise even though start_datetime is out of range
        meal.refresh_from_db()
        assert meal.note == "updated without touching the date"

    def test_moving_existing_meal_further_outside_raises(self, plan):
        meal = Meal.objects.create(meal_plan=plan, meal_type="dinner", start_datetime=plan.start_datetime)
        meal.start_datetime = plan.start_datetime - timedelta(days=10)
        with pytest.raises(ValidationError, match="außerhalb des Planzeitraums"):
            meal.save()

    def test_meal_within_range_saves(self, plan):
        meal = Meal.objects.create(meal_plan=plan, meal_type="lunch", start_datetime=plan.end_datetime)
        assert meal.pk is not None

    def test_plan_without_end_datetime_only_checks_start(self, db, django_user_model):
        user = django_user_model.objects.create_user(username="noendplan", password="x")
        now = timezone.now()
        open_plan = MealPlan.objects.create(name="Offen", created_by=user, start_datetime=now, end_datetime=None)
        meal = Meal.objects.create(meal_plan=open_plan, meal_type="lunch", start_datetime=now + timedelta(days=30))
        assert meal.pk is not None
