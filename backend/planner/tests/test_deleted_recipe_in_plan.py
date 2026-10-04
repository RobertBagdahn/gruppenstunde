"""Soft-deleted recipes in legacy plans are ignored in totals and copies; cleanup command."""

import datetime
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from planner.models import MealItem
from planner.schemas.meal_plan import MealOut
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe


def _priced_recipe(**kwargs):
    recipe = make_recipe(portions=1, **kwargs)
    recipe.cached_price_total = 1.29
    recipe.cached_energy_total_kcal = 800.0
    recipe.save(update_fields=["cached_price_total", "cached_energy_total_kcal"])
    return recipe


@pytest.mark.django_db
class TestDeletedRecipeIgnored:
    def test_totals_ignore_soft_deleted_recipe(self):
        recipe = _priced_recipe()
        meal = make_meal(meal_plan=make_meal_plan())
        make_meal_item(meal=meal, recipe=recipe)
        assert MealOut.resolve_total_cost_eur(meal) > 0

        recipe.soft_delete()
        meal = type(meal).objects.prefetch_related("items__recipe").get(pk=meal.pk)

        assert MealOut.resolve_total_cost_eur(meal) == 0
        assert MealOut.resolve_total_energy_kcal(meal) == 0

    def test_duplicate_skips_deleted_recipe(self, auth_client):
        user = auth_client._user
        today = datetime.date.today()
        start = timezone.make_aware(datetime.datetime.combine(today, datetime.time(10, 0)))
        end = timezone.make_aware(datetime.datetime.combine(today + datetime.timedelta(days=2), datetime.time(14, 0)))
        plan = make_meal_plan(created_by=user, start_datetime=start, end_datetime=end)
        meal = make_meal(meal_plan=plan)
        live = _priced_recipe(title="Lebt")
        gone = _priced_recipe(title="Weg")
        make_meal_item(meal=meal, recipe=live)
        make_meal_item(meal=meal, recipe=gone)
        gone.soft_delete()

        resp = auth_client.post(
            f"/api/meal-plans/{plan.id}/duplicate/",
            data={
                "name": "Kopie",
                "start_datetime": start.isoformat(),
                "end_datetime": end.isoformat(),
                "norm_portions": 10,
            },
            content_type="application/json",
        )

        assert resp.status_code == 200, resp.content
        new_id = resp.json()["id"]
        titles = list(MealItem.objects.filter(meal__meal_plan_id=new_id).values_list("recipe__title", flat=True))
        assert titles == ["Lebt"]


@pytest.mark.django_db
class TestCleanupCommand:
    def test_dry_run_keeps_items(self):
        recipe = _priced_recipe()
        item = make_meal_item(meal=make_meal(meal_plan=make_meal_plan()), recipe=recipe)
        recipe.soft_delete()
        out = StringIO()

        call_command("cleanup_deleted_recipe_meal_items", stdout=out)

        assert MealItem.objects.filter(pk=item.pk).exists()
        assert "Dry-run: 1 item(s)" in out.getvalue()

    def test_apply_removes_only_deleted_recipe_items(self):
        deleted = _priced_recipe()
        live = _priced_recipe()
        meal = make_meal(meal_plan=make_meal_plan())
        gone_item = make_meal_item(meal=meal, recipe=deleted)
        kept_item = make_meal_item(meal=meal, recipe=live)
        deleted.soft_delete()

        call_command("cleanup_deleted_recipe_meal_items", "--apply", stdout=StringIO())

        assert not MealItem.objects.filter(pk=gone_item.pk).exists()
        assert MealItem.objects.filter(pk=kept_item.pk).exists()
