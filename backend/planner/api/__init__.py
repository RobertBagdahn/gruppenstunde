"""Planner API package — re-exports router for backward compatibility."""

from .meal_plan import meal_plan_router
from .planner import router
from .ref_meal import ref_meal_router

__all__ = [
    "meal_plan_router",
    "ref_meal_router",
    "router",
]
