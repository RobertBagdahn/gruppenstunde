"""Backward-compatibility shim — imports from planner.api.meal_plan."""

from planner.api.meal_plan import meal_plan_router

__all__ = ["meal_plan_router"]
