"""filled_meals_count: meals with at least one item, in the plan list and on the plan detail."""

import datetime as dt

import pytest
from django.contrib.auth import get_user_model
from django.db import connection
from django.test import Client
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from model_bakery import baker

from planner.models import MealTypeChoices
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe

User = get_user_model()


@pytest.mark.django_db
class TestFilledMealsCount:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(created_by=self.user, norm_portions=10)
        now = timezone.now()
        for day in range(13):  # one lunch per day: a meal type may occur only once per day
            meal = make_meal(
                meal_plan=self.plan, meal_type=MealTypeChoices.LUNCH, start_datetime=now + dt.timedelta(days=day)
            )
            if day < 12:
                make_meal_item(meal=meal, recipe=make_recipe(portions=1), factor=1.0)

    def _plan_row(self):
        response = self.client.get("/api/meal-plans/", {"origin": "mine"})
        assert response.status_code == 200
        rows = response.json()
        rows = rows["items"] if isinstance(rows, dict) else rows
        return next(row for row in rows if row["id"] == self.plan.id)

    def test_list_counts_meals_with_items(self):
        row = self._plan_row()
        assert row["meals_count"] == 13
        assert row["filled_meals_count"] == 12

    def test_empty_plan_reports_zero(self):
        empty = make_meal_plan(created_by=self.user, norm_portions=10)
        make_meal(meal_plan=empty, meal_type=MealTypeChoices.DINNER, start_datetime=timezone.now())
        response = self.client.get("/api/meal-plans/", {"origin": "mine"})
        rows = response.json()
        rows = rows["items"] if isinstance(rows, dict) else rows
        row = next(r for r in rows if r["id"] == empty.id)
        assert row["filled_meals_count"] == 0

    def test_meal_item_queries_do_not_grow_with_plans(self):
        """The filled count is annotated: meal-item queries stay constant as plans are added.

        Other per-plan queries (group members, owner profile) exist before this change and are not covered here.
        """

        def item_queries():
            with CaptureQueriesContext(connection) as ctx:
                self.client.get("/api/meal-plans/", {"origin": "mine"})
            return [q["sql"] for q in ctx.captured_queries if "planner_mealitem" in q["sql"]]

        before = item_queries()
        for n in range(3):
            extra = make_meal_plan(created_by=self.user, norm_portions=10)
            meal = make_meal(
                meal_plan=extra, meal_type=MealTypeChoices.LUNCH, start_datetime=timezone.now() + dt.timedelta(days=n)
            )
            make_meal_item(meal=meal, recipe=make_recipe(portions=1), factor=1.0)
        assert len(item_queries()) == len(before)
