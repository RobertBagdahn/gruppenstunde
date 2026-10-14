"""List meal plans, meals and items outside the allowed input ranges (read-only).

The ranges live in `planner/services/input_bounds.py`. Nothing is changed; calculations limit
such legacy values at runtime (openspec `meal-plan-input-guardrails`).
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand
from django.db.models import Count

from planner.services import input_bounds


def plan_findings(plan: Any) -> list[str]:
    findings: list[str] = []
    checks = (
        ("reserve_factor", plan.reserve_factor, input_bounds.check_reserve_factor),
        ("activity_factor", plan.activity_factor, input_bounds.check_activity_factor),
        ("norm_portions", plan.norm_portions, input_bounds.check_norm_portions),
    )
    for field, value, check in checks:
        try:
            check(value)
        except ValueError as exc:
            findings.append(f"{field}={value}: {exc}")
    try:
        input_bounds.check_day_part_factors(plan.day_part_factors or {})
    except ValueError as exc:
        findings.append(f"day_part_factors={plan.day_part_factors}: {exc}")
    try:
        input_bounds.check_plan_period(plan.start_datetime, plan.end_datetime)
    except ValueError as exc:
        findings.append(str(exc))
    return findings


class Command(BaseCommand):
    help = "Report meal plan values outside the allowed ranges (read-only)."

    def handle(self, *args: Any, **options: Any) -> None:
        from planner.models import Meal, MealItem, MealPlan

        total = 0
        for plan in MealPlan.objects.annotate(meal_count=Count("meals")).order_by("id"):
            findings = plan_findings(plan)
            if plan.meal_count > input_bounds.PLAN_MAX_MEALS:
                findings.append(f"{plan.meal_count} Mahlzeiten (Höchstzahl {input_bounds.PLAN_MAX_MEALS})")
            for finding in findings:
                total += 1
                self.stdout.write(f"Plan {plan.id} «{plan.name}»: {finding}")

        for meal in Meal.objects.all().order_by("id"):
            for field, value, check in (
                ("override_portions", meal.override_portions, input_bounds.check_override_portions),
                ("day_part_factor", meal.day_part_factor, input_bounds.check_day_part_factor),
            ):
                if value is None:
                    continue
                try:
                    check(value)
                except ValueError as exc:
                    total += 1
                    self.stdout.write(f"Mahlzeit {meal.id} (Plan {meal.meal_plan_id}): {field}={value}: {exc}")

        from planner.services.meal_item_helpers import _resolve_ingredient_weight_g

        for item in MealItem.objects.filter(ingredient__isnull=False).select_related(
            "ingredient", "portion", "measuring_unit"
        ):
            problems: list[str] = []
            if item.quantity is not None and item.quantity <= 0:
                problems.append(f"quantity={item.quantity}")
            try:
                input_bounds.check_quantity_grams(_resolve_ingredient_weight_g(item))
            except ValueError as exc:
                problems.append(str(exc))
            for problem in problems:
                total += 1
                self.stdout.write(f"Eintrag {item.id} (Mahlzeit {item.meal_id}): {problem}")

        self.stdout.write(self.style.WARNING(f"{total} Befunde (nur Report, keine Änderung)."))
