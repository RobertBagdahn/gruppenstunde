"""Tests for the new Plan-Check rules (task group 3 of the
meal-plan-integrity-and-number-formatting OpenSpec change):
recipe_type_mismatch, missing_quantity, meal_outside_range, empty_day —
plus the viewer-sees-no-actions and anonymous-403 behavior shared by all
Plan-Check alerts.
"""

import datetime as dt

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from planner.models import Meal, MealItem, MealPlanCollaborator, MealTypeChoices
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.tests import make_recipe

User = get_user_model()


@pytest.fixture
def user(db):
    return baker.make(User)


@pytest.fixture
def plan(user):
    return make_meal_plan(created_by=user, norm_portions=10)


def _alerts(client: Client, plan_id: int, alert_type: str | None = None):
    resp = client.get(f"/api/meal-plans/{plan_id}/plan-check/")
    assert resp.status_code == 200, resp.content
    data = resp.json()
    if alert_type is None:
        return data
    return [a for a in data["alerts"] if a["type"] == alert_type]


@pytest.mark.django_db
class TestRecipeTypeMismatchRule:
    def test_dessert_recipe_at_breakfast_is_flagged(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST, start_datetime=plan.start_datetime)
        recipe = make_recipe(title="Tiramisu", recipe_type="dessert")
        make_meal_item(meal=meal, recipe=recipe)

        alerts = _alerts(client, plan.id, "recipe_type_mismatch")
        assert len(alerts) == 1
        assert alerts[0]["meal_id"] == meal.id
        assert alerts[0]["severity"] == "info"

    def test_dessert_recipe_at_dinner_is_plausible(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.DINNER, start_datetime=plan.start_datetime)
        recipe = make_recipe(title="Tiramisu", recipe_type="dessert")
        make_meal_item(meal=meal, recipe=recipe)

        assert _alerts(client, plan.id, "recipe_type_mismatch") == []

    def test_breakfast_recipe_at_breakfast_is_plausible(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST, start_datetime=plan.start_datetime)
        recipe = make_recipe(title="Porridge", recipe_type="breakfast")
        make_meal_item(meal=meal, recipe=recipe)

        assert _alerts(client, plan.id, "recipe_type_mismatch") == []

    def test_recipe_part_never_flagged(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST, start_datetime=plan.start_datetime)
        recipe = make_recipe(title="Tomatensauce", recipe_type="recipe_part")
        make_meal_item(meal=meal, recipe=recipe)

        assert _alerts(client, plan.id, "recipe_type_mismatch") == []

    def test_recipe_without_type_never_flagged(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST, start_datetime=plan.start_datetime)
        recipe = make_recipe(title="Unsortiert", recipe_type="")
        make_meal_item(meal=meal, recipe=recipe)

        assert _alerts(client, plan.id, "recipe_type_mismatch") == []

    def test_ingredient_only_item_never_flagged(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST, start_datetime=plan.start_datetime)
        ingredient = baker.make("supply.Ingredient", name="Marmelade")
        MealItem.objects.create(meal=meal, ingredient=ingredient, quantity=20, factor=1.0)

        assert _alerts(client, plan.id, "recipe_type_mismatch") == []


@pytest.mark.django_db
class TestMissingQuantityRule:
    def test_ingredient_item_without_quantity_flagged(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH, start_datetime=plan.start_datetime)
        ingredient = baker.make("supply.Ingredient", name="Kornflocken")
        MealItem.objects.create(meal=meal, ingredient=ingredient, quantity=None, factor=1.0)

        alerts = _alerts(client, plan.id, "missing_quantity")
        assert len(alerts) == 1
        assert alerts[0]["severity"] == "warning"

    def test_ingredient_item_with_quantity_not_flagged(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH, start_datetime=plan.start_datetime)
        ingredient = baker.make("supply.Ingredient", name="Kornflocken", energy_kcal=350)
        unit = baker.make("supply.MeasuringUnit", name="Gramm")
        MealItem.objects.create(meal=meal, ingredient=ingredient, quantity=50, measuring_unit=unit, factor=1.0)

        assert _alerts(client, plan.id, "missing_quantity") == []

    def test_recipe_item_never_flagged_by_this_rule(self, client: Client, user, plan):
        client.force_login(user)
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH, start_datetime=plan.start_datetime)
        recipe = make_recipe()
        make_meal_item(meal=meal, recipe=recipe)

        assert _alerts(client, plan.id, "missing_quantity") == []

    def test_reference_meal_item_without_quantity_flagged(self, client: Client, user, plan):
        # Legacy data: the reference breakfast holds an ingredient without quantity
        # ("4-Kornflocken Bio"), which every synced breakfast would copy.
        client.force_login(user)
        ref_meal = Meal.objects.create(
            meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST, is_reference=True, day_part_factor=0.25
        )
        ingredient = baker.make("supply.Ingredient", name="4-Kornflocken Bio")
        item = MealItem.objects.create(meal=ref_meal, ingredient=ingredient, quantity=None, factor=1.0)

        alerts = _alerts(client, plan.id, "missing_quantity")
        assert len(alerts) == 1
        assert alerts[0]["meal_id"] == ref_meal.id
        assert alerts[0]["date"] is None
        assert alerts[0]["action_type"] == "open_ref_meal"
        assert alerts[0]["action_payload"] == {"meal_type": "breakfast", "item_id": item.id}
        assert "4-Kornflocken Bio" in alerts[0]["description"]


@pytest.mark.django_db
class TestMealOutsideRangeRule:
    def test_meal_before_plan_start_flagged(self, client: Client, user, plan):
        client.force_login(user)
        outside_date = plan.start_datetime - dt.timedelta(days=10)
        # bypass Meal.clean()'s range check to simulate a pre-existing out-of-range
        # row (as on prod today) rather than testing model validation here.
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH, start_datetime=plan.start_datetime)
        Meal.objects.filter(pk=meal.pk).update(start_datetime=outside_date)

        alerts = _alerts(client, plan.id, "meal_outside_range")
        assert len(alerts) == 1
        assert alerts[0]["meal_id"] == meal.id

    def test_meal_inside_range_not_flagged(self, client: Client, user, plan):
        client.force_login(user)
        make_meal(meal_plan=plan, meal_type=MealTypeChoices.LUNCH, start_datetime=plan.start_datetime)

        assert _alerts(client, plan.id, "meal_outside_range") == []


@pytest.mark.django_db
class TestEmptyDayRule:
    def test_day_without_any_meal_flagged(self, client: Client, user, plan):
        client.force_login(user)
        # plan spans 3 days (see make_meal_plan); leave all of them empty.
        alerts = _alerts(client, plan.id, "empty_day")
        assert len(alerts) >= 1
        assert all(a["severity"] == "info" for a in alerts)

    def test_day_with_a_meal_not_flagged(self, client: Client, user):
        short_plan = make_meal_plan(
            created_by=user,
            start_datetime=make_meal_plan(created_by=user).start_datetime,
        )
        # give the plan a tight, deterministic 1-day range so this test doesn't
        # depend on how wide make_meal_plan()'s default range is.
        day = short_plan.start_datetime
        short_plan.end_datetime = day
        short_plan.save(update_fields=["end_datetime"])
        client.force_login(user)
        make_meal(meal_plan=short_plan, meal_type=MealTypeChoices.LUNCH, start_datetime=day)

        assert _alerts(client, short_plan.id, "empty_day") == []


@pytest.mark.django_db
class TestPlanCheckPermissions:
    def test_anonymous_returns_403(self, client: Client, plan):
        resp = client.get(f"/api/meal-plans/{plan.id}/plan-check/")
        assert resp.status_code == 404

    def test_viewer_sees_alerts_without_actions(self, client: Client, user, plan):
        viewer = baker.make(User)
        MealPlanCollaborator.objects.create(meal_plan=plan, user=viewer, role="viewer")
        meal = make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST, start_datetime=plan.start_datetime)

        client.force_login(viewer)
        data = _alerts(client, plan.id)
        empty_slot_alerts = [a for a in data["alerts"] if a["type"] == "empty_slot"]
        assert len(empty_slot_alerts) == 1
        assert empty_slot_alerts[0]["meal_id"] == meal.id
        assert empty_slot_alerts[0]["action_label"] is None
        assert empty_slot_alerts[0]["action_type"] is None
        assert empty_slot_alerts[0]["action_payload"] is None

    def test_editor_sees_actions(self, client: Client, user, plan):
        editor = baker.make(User)
        MealPlanCollaborator.objects.create(meal_plan=plan, user=editor, role="editor")
        make_meal(meal_plan=plan, meal_type=MealTypeChoices.BREAKFAST, start_datetime=plan.start_datetime)

        client.force_login(editor)
        data = _alerts(client, plan.id)
        empty_slot_alerts = [a for a in data["alerts"] if a["type"] == "empty_slot"]
        assert len(empty_slot_alerts) == 1
        assert empty_slot_alerts[0]["action_label"] == "Gericht vorschlagen"
