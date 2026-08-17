import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone

from event.models import Event, EventMealPlanRelation
from planner.models import MealPlan

User = get_user_model()


@pytest.mark.django_db
def test_meal_plan_can_have_only_one_event_relation():
    user = User.objects.create_user(username="relation-owner")
    event_one = Event.objects.create(name="Event 1", created_by=user, start_date=timezone.now())
    event_two = Event.objects.create(name="Event 2", created_by=user, start_date=timezone.now())
    plan = MealPlan.objects.create(name="Plan", created_by=user, owner=user, start_datetime=timezone.now())

    EventMealPlanRelation.objects.create(event=event_one, meal_plan=plan)

    with pytest.raises(IntegrityError):
        EventMealPlanRelation.objects.create(event=event_two, meal_plan=plan)
