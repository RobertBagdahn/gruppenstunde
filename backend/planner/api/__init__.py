"""Planner API package — re-exports router for backward compatibility."""

from .planner import router  # noqa: F401
from .meal_plan import meal_plan_router  # noqa: F401

__all__ = [
    "meal_plan_router",
    "router",
]
