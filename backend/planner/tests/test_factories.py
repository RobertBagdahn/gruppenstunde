"""Tests to validate that all planner app factories produce valid model instances."""

import pytest

from planner.tests import (
    make_meal,
    make_meal_day,
    make_meal_item,
    make_meal_plan,
    make_planner,
    make_planner_collaborator,
    make_planner_entry,
)


@pytest.mark.django_db
class TestPlannerFactories:
    def test_make_planner(self):
        planner = make_planner()
        assert planner.pk is not None
        assert planner.owner is not None
        assert planner.weekday == 4  # Friday

    def test_make_planner_entry(self):
        entry = make_planner_entry()
        assert entry.pk is not None
        assert entry.planner is not None
        assert entry.status == "planned"

    def test_make_planner_entry_with_idea(self):
        from idea.tests import make_idea

        idea = make_idea()
        entry = make_planner_entry(idea=idea)
        assert entry.idea == idea

    def test_make_planner_collaborator(self):
        collab = make_planner_collaborator()
        assert collab.pk is not None
        assert collab.planner is not None
        assert collab.user is not None
        assert collab.role == "editor"

    def test_make_meal_plan(self):
        plan = make_meal_plan()
        assert plan.pk is not None
        assert plan.slug
        assert plan.norm_portions == 10
        assert plan.scaling_factor == 10 * 1.5 * 1.1

    def test_make_meal_day(self):
        day = make_meal_day()
        assert day.pk is not None
        assert day.meal_plan is not None
        assert day.date is not None

    def test_make_meal(self):
        meal = make_meal()
        assert meal.pk is not None
        assert meal.meal_day is not None
        assert meal.meal_type == "lunch"

    def test_make_meal_item(self):
        item = make_meal_item()
        assert item.pk is not None
        assert item.meal is not None
        assert item.recipe is not None
        assert item.factor == 1.0
