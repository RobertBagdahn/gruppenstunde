"""Effective suggestion context of a meal plan (explicit fields, derived values, missing fields)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from planner.models import MealPlan

# Context fields that matter per meal type; missing ones are asked once in the assistant.
RELEVANT_CONTEXT: dict[str, tuple[str, ...]] = {
    "breakfast": ("age_groups", "cooking_sources"),
    "lunch": ("age_groups", "cooking_sources", "cooling", "setting"),
    "dinner": ("age_groups", "cooking_sources", "cooling", "setting"),
    "snack": ("age_groups", "cooling"),
    "drinks": ("age_groups", "season_hint"),
}


def age_group_for_age(age: int) -> str:
    if age < 6:
        return "toddlers"
    if age < 12:
        return "children"
    if age < 18:
        return "teens"
    return "adults"


def season_for_month(month: int) -> str:
    if month in (6, 7, 8):
        return "hot"
    if month in (12, 1, 2):
        return "cold"
    return "mild"


@dataclass
class EffectiveContext:
    age_groups: list[str] = field(default_factory=list)
    age_derived: bool = False
    setting: str = ""
    cooking_sources: list[str] = field(default_factory=list)
    cooling: str = ""
    season_hint: str = "mild"
    season_derived: bool = True
    budget_per_person_per_day: float | None = None
    nutritional_tag_ids: set[int] = field(default_factory=set)
    missing: list[str] = field(default_factory=list)

    @property
    def child_focused(self) -> bool:
        return bool(self.age_groups) and set(self.age_groups) <= {"toddlers", "children"}


def build_context(meal_plan: MealPlan, meal_type: str) -> EffectiveContext:
    ctx = EffectiveContext(
        age_groups=list(meal_plan.age_groups or []),
        setting=meal_plan.setting or "",
        cooking_sources=list(meal_plan.cooking_sources or []),
        cooling=meal_plan.cooling or "",
        budget_per_person_per_day=(
            float(meal_plan.budget_per_person_per_day) if meal_plan.budget_per_person_per_day else None
        ),
        nutritional_tag_ids={t.id for t in meal_plan.nutritional_tags.all()},
    )

    if not ctx.age_groups:
        ages = list(meal_plan.group_members.values_list("age", flat=True))
        if ages:
            ctx.age_groups = sorted({age_group_for_age(a) for a in ages})
            ctx.age_derived = True

    if meal_plan.season_hint:
        ctx.season_hint = meal_plan.season_hint
        ctx.season_derived = False
    elif meal_plan.start_datetime:
        ctx.season_hint = season_for_month(meal_plan.start_datetime.month)

    for key in RELEVANT_CONTEXT.get(meal_type, ()):
        value = getattr(ctx, key, None)
        if key == "season_hint":
            if ctx.season_derived and not meal_plan.start_datetime:
                ctx.missing.append(key)
        elif not value:
            ctx.missing.append(key)
    return ctx
