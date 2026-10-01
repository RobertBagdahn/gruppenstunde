"""Plan-Check: derive actionable alerts (Hinweise/Warnungen/Fehler) for a
MealPlan. One function per rule; `build_plan_check_alerts` runs them all and
returns a flat, severity-sorted list.

Split out of `planner.api.meal_plan.plan_check` (task group 3 of the
meal-plan-integrity-and-number-formatting OpenSpec change) so each rule is
independently testable.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from planner.models import Meal, MealPlanCollaboratorRole
from planner.schemas.meal_plan import MealOut, PlanCheckAlertOut

if TYPE_CHECKING:
    from planner.models import MealPlan
    from supply.models import NutritionalTag

# Recipe types a meal type can plausibly contain. Deliberately separate from
# `MEAL_TYPE_TO_RECIPE_TYPES` (which drives recipe *search* and intentionally
# excludes dessert from lunch/dinner): a dessert already *in* a lunch/dinner
# meal is plausible even though it isn't the first thing search suggests.
PLAUSIBLE_RECIPE_TYPES_BY_MEAL: dict[str, set[str]] = {
    "breakfast": {"breakfast", "drink", "snack"},
    "lunch": {"warm_meal", "cold_meal", "dessert", "drink"},
    "dinner": {"warm_meal", "cold_meal", "dessert", "drink"},
    "snack": {"snack", "dessert", "drink"},
    "drinks": {"drink"},
}
# Recipe types that are never flagged regardless of meal type: an empty type
# means the recipe hasn't been classified yet, and "recipe_part" is a
# building block (e.g. a sauce), not a standalone meal component.
_RECIPE_TYPE_MISMATCH_EXEMPT = {"", "recipe_part"}

_SEVERITY_ORDER = {"error": 0, "warning": 1, "info": 2}


def _meals_qs(meal_plan: MealPlan):
    return (
        Meal.objects.filter(meal_plan=meal_plan, is_reference=False)
        .prefetch_related(
            "items__recipe__nutritional_tags",
            "items__ingredient__nutritional_tags",
            "items__recipe__recipe_items__portion__ingredient",
            "items__ingredient__portions",
            "items__measuring_unit",
            "items__overrides",
        )
        .order_by("start_datetime")
    )


def _german_date(iso_date: str) -> str:
    """ "2026-12-12" -> "12.12.2026"."""
    year, month, day = iso_date.split("-")
    return f"{day}.{month}.{year}"


def _german_euro(value: float) -> str:
    """4.37 -> "4,37 €" (comma decimals; plain space before the sign)."""
    return f"{value:,.2f}".replace(",", "\u0000").replace(".", ",").replace("\u0000", ".") + " €"


def _check_empty_slots(meal_plan: MealPlan, meals: list[Meal]) -> list[PlanCheckAlertOut]:
    alerts: list[PlanCheckAlertOut] = []
    for meal in meals:
        if not meal.start_datetime:
            continue
        if not meal.is_external and meal.items.count() == 0:
            date_str = meal.start_datetime.strftime("%Y-%m-%d")
            alerts.append(
                PlanCheckAlertOut(
                    id=f"empty-slot-{meal.id}",
                    type="empty_slot",
                    severity="warning",
                    title=f"{meal.get_meal_type_display()} ist noch leer",
                    description=f"Am {meal.start_datetime.strftime('%d.%m.')} ist noch kein Gericht für {meal.get_meal_type_display()} hinterlegt.",
                    date=date_str,
                    meal_id=meal.id,
                    meal_type=meal.meal_type,
                    action_label="Gericht vorschlagen",
                    action_type="suggest_recipe",
                    action_payload={
                        "meal_id": meal.id,
                        "meal_type": meal.meal_type,
                        "date": date_str,
                    },
                )
            )
    return alerts


def _check_budget_excess(meal_plan: MealPlan, meals: list[Meal]) -> list[PlanCheckAlertOut]:
    alerts: list[PlanCheckAlertOut] = []
    if not (meal_plan.budget_per_person_per_day and meal_plan.budget_per_person_per_day > 0):
        return alerts
    budget_limit = meal_plan.budget_per_person_per_day
    day_totals: dict[str, float] = {}
    for meal in meals:
        if not meal.start_datetime:
            continue
        date_str = meal.start_datetime.strftime("%Y-%m-%d")
        eff = meal.effective_portions or 1.0
        cost_eur = MealOut.resolve_total_cost_eur(meal)
        cost_p = (cost_eur / eff) if eff > 0 else 0.0
        day_totals[date_str] = day_totals.get(date_str, 0.0) + cost_p

    for date_str, day_cost in sorted(day_totals.items()):
        if day_cost > float(budget_limit):
            excess = day_cost - float(budget_limit)
            alerts.append(
                PlanCheckAlertOut(
                    id=f"budget-excess-{date_str}",
                    type="budget_excess",
                    severity="warning",
                    title=f"Budget am {_german_date(date_str)} überschritten",
                    description=(
                        f"Geplant sind {_german_euro(day_cost)} / Person "
                        f"({_german_euro(excess)} über dem Budget von {_german_euro(float(budget_limit))})."
                    ),
                    date=date_str,
                    meal_id=None,
                    meal_type=None,
                    action_label="Budget ansehen",
                    action_type="open_budget",
                    action_payload={"date": date_str},
                )
            )
    return alerts


def _check_allergen_conflicts(meal_plan: MealPlan, meals: list[Meal]) -> list[PlanCheckAlertOut]:
    alerts: list[PlanCheckAlertOut] = []
    plan_tag_ids = {tag.id for tag in meal_plan.nutritional_tags.all()}
    if not plan_tag_ids:
        return alerts
    for meal in meals:
        if not meal.start_datetime:
            continue
        date_str = meal.start_datetime.strftime("%Y-%m-%d")
        for item in meal.items.all():
            item_tags: set[NutritionalTag] = set()
            if item.recipe:
                item_tags.update(item.recipe.nutritional_tags.all())
            if item.ingredient:
                item_tags.update(item.ingredient.nutritional_tags.all())

            for tag in item_tags:
                if tag.id in plan_tag_ids:
                    alerts.append(
                        PlanCheckAlertOut(
                            id=f"tag-conflict-{meal.id}-{item.id}-{tag.id}",
                            type="allergen_conflict",
                            severity="error",
                            title=f"Einschränkung verletzt bei {meal.get_meal_type_display()}",
                            description=f"«{item.recipe.title if item.recipe else (item.ingredient.name if item.ingredient else 'Unbekannt')}» enthält «{tag.name}».",
                            date=date_str,
                            meal_id=meal.id,
                            meal_type=meal.meal_type,
                            action_label="Gericht ansehen",
                            action_type="open_slot",
                            action_payload={"meal_id": meal.id},
                        )
                    )
    return alerts


def _check_recipe_type_mismatch(meal_plan: MealPlan, meals: list[Meal]) -> list[PlanCheckAlertOut]:
    alerts: list[PlanCheckAlertOut] = []
    for meal in meals:
        if not meal.start_datetime:
            continue
        plausible = PLAUSIBLE_RECIPE_TYPES_BY_MEAL.get(meal.meal_type)
        if plausible is None:
            continue
        date_str = meal.start_datetime.strftime("%Y-%m-%d")
        for item in meal.items.all():
            recipe = item.recipe
            if not recipe or recipe.recipe_type in _RECIPE_TYPE_MISMATCH_EXEMPT:
                continue
            if recipe.recipe_type not in plausible:
                alerts.append(
                    PlanCheckAlertOut(
                        id=f"type-mismatch-{meal.id}-{item.id}",
                        type="recipe_type_mismatch",
                        severity="info",
                        title=f"Rezepttyp passt nicht zu {meal.get_meal_type_display()}",
                        description=f"«{recipe.title}» ist als {recipe.get_recipe_type_display()} eingeordnet.",
                        date=date_str,
                        meal_id=meal.id,
                        meal_type=meal.meal_type,
                        action_label="Rezept tauschen",
                        action_type="open_slot",
                        action_payload={"meal_id": meal.id},
                    )
                )
    return alerts


def _item_has_missing_quantity(item, meal: Meal) -> bool:
    """An ingredient item without quantity, or one that yields 0 kcal."""
    from planner.services.meal_item_helpers import resolve_ingredient_energy_kcal

    if not item.quantity or float(item.quantity) <= 0:
        return True
    try:
        kcal = resolve_ingredient_energy_kcal(item, effective_portions=meal.effective_portions)
    except Exception:
        kcal = None
    return not kcal


def _check_missing_quantity(meal_plan: MealPlan, meals: list[Meal]) -> list[PlanCheckAlertOut]:
    alerts: list[PlanCheckAlertOut] = []
    for meal in meals:
        if not meal.start_datetime:
            continue
        date_str = meal.start_datetime.strftime("%Y-%m-%d")
        for item in meal.items.all():
            if not item.ingredient or not _item_has_missing_quantity(item, meal):
                continue
            alerts.append(
                PlanCheckAlertOut(
                    id=f"missing-quantity-{meal.id}-{item.id}",
                    type="missing_quantity",
                    severity="warning",
                    title=f"Menge fehlt bei {meal.get_meal_type_display()}",
                    description=f"«{item.ingredient.name}» hat keine gültige Menge und liefert 0 kcal.",
                    date=date_str,
                    meal_id=meal.id,
                    meal_type=meal.meal_type,
                    action_label="Menge setzen",
                    action_type="open_slot",
                    action_payload={"meal_id": meal.id, "item_id": item.id},
                )
            )

    # Reference meals are copied into every synced meal, so a missing quantity
    # there silently breaks all of them — check them as well.
    ref_meals = Meal.objects.filter(meal_plan=meal_plan, is_reference=True).prefetch_related(
        "items__ingredient__portions", "items__measuring_unit"
    )
    for ref_meal in ref_meals:
        for item in ref_meal.items.all():
            if not item.ingredient or not _item_has_missing_quantity(item, ref_meal):
                continue
            alerts.append(
                PlanCheckAlertOut(
                    id=f"missing-quantity-ref-{ref_meal.id}-{item.id}",
                    type="missing_quantity",
                    severity="warning",
                    title=f"Menge fehlt in der Referenz {ref_meal.get_meal_type_display()}",
                    description=(
                        f"«{item.ingredient.name}» hat keine gültige Menge; alle verknüpften Mahlzeiten "
                        "liefern dafür 0 kcal."
                    ),
                    date=None,
                    meal_id=ref_meal.id,
                    meal_type=ref_meal.meal_type,
                    action_label="Menge setzen",
                    action_type="open_ref_meal",
                    action_payload={"meal_type": ref_meal.meal_type, "item_id": item.id},
                )
            )
    return alerts


def _check_meal_outside_range(meal_plan: MealPlan, meals: list[Meal]) -> list[PlanCheckAlertOut]:
    alerts: list[PlanCheckAlertOut] = []
    if not meal_plan.start_datetime:
        return alerts
    plan_start = meal_plan.start_datetime.date()
    plan_end = meal_plan.end_datetime.date() if meal_plan.end_datetime else None
    for meal in meals:
        if not meal.start_datetime:
            continue
        meal_date = meal.start_datetime.date()
        if meal_date < plan_start or (plan_end and meal_date > plan_end):
            alerts.append(
                PlanCheckAlertOut(
                    id=f"outside-range-{meal.id}",
                    type="meal_outside_range",
                    severity="warning",
                    title=f"{meal.get_meal_type_display()} liegt außerhalb des Planzeitraums",
                    description=f"Geplant für {meal_date.strftime('%d.%m.%Y')}, der Plan läuft aber "
                    f"{'nur bis ' + plan_end.strftime('%d.%m.%Y') if plan_end and meal_date > plan_end else 'erst ab ' + plan_start.strftime('%d.%m.%Y')}.",
                    date=meal_date.strftime("%Y-%m-%d"),
                    meal_id=meal.id,
                    meal_type=meal.meal_type,
                    action_label="Mahlzeit verschieben",
                    action_type="open_slot",
                    action_payload={"meal_id": meal.id},
                )
            )
    return alerts


def _check_empty_days(meal_plan: MealPlan, meals: list[Meal]) -> list[PlanCheckAlertOut]:
    import datetime as dt

    alerts: list[PlanCheckAlertOut] = []
    if not (meal_plan.start_datetime and meal_plan.end_datetime):
        return alerts
    days_with_meals = {m.start_datetime.date() for m in meals if m.start_datetime}
    day = meal_plan.start_datetime.date()
    end = meal_plan.end_datetime.date()
    while day <= end:
        if day not in days_with_meals:
            date_str = day.strftime("%Y-%m-%d")
            alerts.append(
                PlanCheckAlertOut(
                    id=f"empty-day-{date_str}",
                    type="empty_day",
                    severity="info",
                    title=f"{day.strftime('%d.%m.%Y')} ist noch ohne Mahlzeiten",
                    description=f"Für den {day.strftime('%d.%m.%Y')} sind noch keine Mahlzeiten geplant.",
                    date=date_str,
                    meal_id=None,
                    meal_type=None,
                    action_label="Mahlzeiten anlegen",
                    action_type="open_day",
                    action_payload={"date": date_str},
                )
            )
        day += dt.timedelta(days=1)
    return alerts


_RULES = [
    _check_empty_slots,
    _check_budget_excess,
    _check_allergen_conflicts,
    _check_recipe_type_mismatch,
    _check_missing_quantity,
    _check_meal_outside_range,
    _check_empty_days,
]


def build_plan_check_alerts(meal_plan: MealPlan, role: str | None) -> list[PlanCheckAlertOut]:
    """Run every plan-check rule and return a severity-sorted alert list.

    Viewers see the same alerts as editors but without action buttons: a
    viewer cannot act on them, so offering "Gericht vorschlagen" etc. would
    be misleading.
    """
    meals = list(_meals_qs(meal_plan))
    alerts: list[PlanCheckAlertOut] = []
    for rule in _RULES:
        alerts.extend(rule(meal_plan, meals))
    alerts.sort(key=lambda a: _SEVERITY_ORDER.get(a.severity, 99))

    if role == MealPlanCollaboratorRole.VIEWER:
        for alert in alerts:
            alert.action_label = None
            alert.action_type = None
            alert.action_payload = None

    return alerts
