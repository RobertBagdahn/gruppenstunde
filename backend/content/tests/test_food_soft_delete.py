import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from content.services.food_access import visible_recipe_queryset
from planner.models import Meal, MealItem, MealPlan
from recipe.models import Recipe
from recipe.tests import make_recipe

User = get_user_model()


@pytest.mark.django_db
def test_soft_deleted_recipe_stays_referenced_but_leaves_visible_queryset():
    owner = User.objects.create_user(username="soft-delete-owner")
    plan = MealPlan.objects.create(
        name="Plan",
        created_by=owner,
        owner=owner,
        start_datetime=timezone.now(),
    )
    meal = Meal.objects.create(meal_plan=plan, meal_type="breakfast", day_part_factor=0.25)
    recipe = make_recipe(owner=owner, created_by=owner, visibility="private", status="draft")
    item = MealItem.objects.create(meal=meal, recipe=recipe)

    recipe.soft_delete()

    assert MealItem.objects.filter(pk=item.pk, recipe=recipe).exists()
    assert not visible_recipe_queryset(owner).filter(pk=recipe.pk).exists()
