"""Tests for RefMeal (reference meals) functionality."""

import datetime

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from planner.models import Meal, MealItem, MealPlan, MealTypeChoices
from planner.tests import make_meal, make_meal_item, make_meal_plan

User = get_user_model()


def _make_ref_meal(meal_plan: MealPlan, meal_type: str = MealTypeChoices.BREAKFAST) -> Meal:
    return Meal.objects.create(
        meal_plan=meal_plan,
        meal_type=meal_type,
        day_part_factor=0.25,
        is_reference=True,
        start_datetime=None,
        end_datetime=None,
    )


@pytest.mark.django_db
class TestRefMealModel:
    def test_create_ref_meal(self):
        plan = make_meal_plan()
        ref = _make_ref_meal(plan)
        assert ref.is_reference is True
        assert ref.start_datetime is None
        assert ref.pk is not None

    def test_unique_constraint_per_plan_and_type(self):
        plan = make_meal_plan()
        _make_ref_meal(plan, MealTypeChoices.BREAKFAST)
        with pytest.raises(Exception):
            _make_ref_meal(plan, MealTypeChoices.BREAKFAST)

    def test_different_types_allowed(self):
        plan = make_meal_plan()
        ref1 = _make_ref_meal(plan, MealTypeChoices.BREAKFAST)
        ref2 = _make_ref_meal(plan, MealTypeChoices.SNACK)
        assert ref1.pk != ref2.pk

    def test_ref_meal_cannot_have_ref_meal(self):
        plan = make_meal_plan()
        ref = _make_ref_meal(plan)
        ref2 = Meal(
            meal_plan=plan,
            meal_type=MealTypeChoices.SNACK,
            day_part_factor=0.10,
            is_reference=True,
            ref_meal=ref,
        )
        with pytest.raises(ValidationError):
            ref2.clean()

    def test_is_synced_requires_ref_meal(self):
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        meal.is_synced = True
        meal.ref_meal = None
        with pytest.raises(ValidationError):
            meal.clean()

    def test_delete_ref_meal_unlinks(self):
        plan = make_meal_plan()
        ref = _make_ref_meal(plan)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        meal.ref_meal = ref
        meal.is_synced = True
        meal.save()

        ref.delete()
        meal.refresh_from_db()
        assert meal.ref_meal is None
        assert meal.is_synced is False


@pytest.mark.django_db
class TestRefMealSync:
    def test_sync_copies_items(self):
        plan = make_meal_plan()
        ref = _make_ref_meal(plan)
        from recipe.tests import make_recipe

        recipe = make_recipe()
        MealItem.objects.create(meal=ref, recipe=recipe, factor=1.5)

        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        meal.ref_meal = ref
        meal.is_synced = True
        meal.save()

        # Import sync function
        from planner.api.ref_meal import _sync_ref_meal_to_targets

        count = _sync_ref_meal_to_targets(ref)
        assert count == 1

        items = list(meal.items.all())
        assert len(items) == 1
        assert items[0].recipe == recipe
        assert items[0].factor == 1.5

    def test_sync_ignores_unsynced(self):
        plan = make_meal_plan()
        ref = _make_ref_meal(plan)
        from recipe.tests import make_recipe

        recipe = make_recipe()
        MealItem.objects.create(meal=ref, recipe=recipe, factor=1.0)

        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        meal.ref_meal = ref
        meal.is_synced = False
        meal.save()

        from planner.api.ref_meal import _sync_ref_meal_to_targets

        count = _sync_ref_meal_to_targets(ref)
        assert count == 0
        assert meal.items.count() == 0

    def test_sync_replaces_existing_items(self):
        plan = make_meal_plan()
        ref = _make_ref_meal(plan)
        from recipe.tests import make_recipe

        recipe1 = make_recipe()
        recipe2 = make_recipe()
        MealItem.objects.create(meal=ref, recipe=recipe1, factor=1.0)

        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST)
        meal.ref_meal = ref
        meal.is_synced = True
        meal.save()
        # Pre-existing item on meal
        MealItem.objects.create(meal=meal, recipe=recipe2, factor=2.0)

        from planner.api.ref_meal import _sync_ref_meal_to_targets

        _sync_ref_meal_to_targets(ref)

        items = list(meal.items.all())
        assert len(items) == 1
        assert items[0].recipe == recipe1


@pytest.mark.django_db
class TestRefMealAPI:
    def setup_method(self):
        self.user = baker.make(User)
        self.client = Client()
        self.client.force_login(self.user)
        self.plan = make_meal_plan(created_by=self.user)

    def test_create_ref_meal(self):
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/ref-meals/",
            data={"meal_type": "breakfast"},
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["meal_type"] == "breakfast"

    def test_create_duplicate_ref_meal_409(self):
        _make_ref_meal(self.plan)
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/ref-meals/",
            data={"meal_type": "breakfast"},
            content_type="application/json",
        )
        assert resp.status_code == 409

    def test_list_ref_meals(self):
        _make_ref_meal(self.plan)
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/ref-meals/")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_link_meal(self):
        ref = _make_ref_meal(self.plan)
        meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.BREAKFAST)
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{meal.id}/link",
            data={"ref_meal_id": ref.id},
            content_type="application/json",
        )
        assert resp.status_code == 200
        meal.refresh_from_db()
        assert meal.is_synced is True
        assert meal.ref_meal == ref

    def test_unlink_meal(self):
        ref = _make_ref_meal(self.plan)
        meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.BREAKFAST)
        meal.ref_meal = ref
        meal.is_synced = True
        meal.save()

        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/{meal.id}/unlink",
            content_type="application/json",
        )
        assert resp.status_code == 200
        meal.refresh_from_db()
        assert meal.is_synced is False

    def test_link_all(self):
        ref = _make_ref_meal(self.plan)
        today = datetime.date.today()
        for i in range(3):
            date = today + datetime.timedelta(days=i)
            Meal.objects.create(
                meal_plan=self.plan,
                meal_type=MealTypeChoices.BREAKFAST,
                day_part_factor=0.25,
                start_datetime=timezone.make_aware(datetime.datetime.combine(date, datetime.time(8, 0))),
                end_datetime=timezone.make_aware(datetime.datetime.combine(date, datetime.time(9, 0))),
            )

        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/meals/link-all?meal_type=breakfast",
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert Meal.objects.filter(meal_plan=self.plan, ref_meal=ref, is_synced=True).count() == 3

    def test_delete_ref_meal_unlinks_meals(self):
        ref = _make_ref_meal(self.plan)
        meal = make_meal(meal_plan=self.plan, meal_type=MealTypeChoices.BREAKFAST)
        meal.ref_meal = ref
        meal.is_synced = True
        meal.save()

        resp = self.client.delete(f"/api/meal-plans/{self.plan.id}/ref-meals/{ref.id}/")
        assert resp.status_code == 204
        meal.refresh_from_db()
        assert meal.ref_meal is None
        assert meal.is_synced is False
