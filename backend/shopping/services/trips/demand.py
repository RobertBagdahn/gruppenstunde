"""Demand of an event: what the meal plans need, per meal, with the time it is needed."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field

from supply.services.material_aggregation import (
    MaterialRequirement,
    aggregate_materials,
    meal_plan_material_entries_by_meal,
    recipe_material_items,
)
from supply.services.shopping_service import IngredientContribution, collect_ingredient_contributions

SubjectKey = tuple[str, int]  # ("ingredient" | "material", id)


@dataclass
class DemandUnit:
    """One ingredient or consumable material needed by one meal."""

    plan_id: int
    meal_id: int
    meal_label: str
    need_at: dt.datetime | None
    kind: str
    subject_id: int
    name: str
    quantity: float
    contributions: list[IngredientContribution] = field(default_factory=list)
    requirement: MaterialRequirement | None = None

    @property
    def subject(self) -> SubjectKey:
        return (self.kind, self.subject_id)

    @property
    def key(self) -> tuple[int, str, int]:
        return (self.meal_id, self.kind, self.subject_id)


def build_demand(plans: list) -> list[DemandUnit]:
    """DemandUnits of all given meal plans; external and reference meals are left out.

    Quantities follow the shopping tab of each plan, because both use the same collectors.
    """
    units: list[DemandUnit] = []
    for plan in plans:
        units.extend(_ingredient_units(plan))
        units.extend(_material_units(plan))
    return units


def _ingredient_units(plan) -> list[DemandUnit]:
    collected = collect_ingredient_contributions(plan)
    grouped: dict[tuple[int, int], DemandUnit] = {}
    for contribution in collected.contributions:
        meal = contribution.meal_item.meal
        key = (meal.id, contribution.ingredient.id)
        unit = grouped.get(key)
        if unit is None:
            unit = DemandUnit(
                plan_id=plan.id,
                meal_id=meal.id,
                meal_label=str(meal),
                need_at=meal.start_datetime,
                kind="ingredient",
                subject_id=contribution.ingredient.id,
                name=contribution.ingredient.name,
                quantity=0.0,
            )
            grouped[key] = unit
        # Lines without a trusted gram weight carry a count instead; it still has to weigh in so they are not dropped
        unit.quantity += contribution.weight_g if contribution.weight_g > 0 else (contribution.raw_quantity or 0.0)
        unit.contributions.append(contribution)
    return list(grouped.values())


def _material_units(plan) -> list[DemandUnit]:
    by_meal = meal_plan_material_entries_by_meal(plan)
    recipe_ids = {recipe.pk for pairs in by_meal.values() for recipe, _ in pairs}  # type: ignore[attr-defined]
    links = recipe_material_items(recipe_ids) if recipe_ids else {}
    units: list[DemandUnit] = []
    for meal, pairs in by_meal.items():
        for requirement in aggregate_materials(pairs, links=links).consumables:
            units.append(
                DemandUnit(
                    plan_id=plan.id,
                    meal_id=meal.id,  # type: ignore[attr-defined]
                    meal_label=str(meal),
                    need_at=meal.start_datetime,  # type: ignore[attr-defined]
                    kind="material",
                    subject_id=requirement.material.pk,
                    name=requirement.material.name,
                    quantity=requirement.amount,
                    requirement=requirement,
                )
            )
    return units


def event_meal_plans(event) -> list:
    """Meal plans linked to the event, oldest relation first (stable order for the cache stamp)."""
    from event.models import EventMealPlanRelation

    relations = EventMealPlanRelation.objects.filter(event=event).select_related("meal_plan").order_by("id")
    return [relation.meal_plan for relation in relations]


def build_event_demand(event) -> list[DemandUnit]:
    return build_demand(event_meal_plans(event))
