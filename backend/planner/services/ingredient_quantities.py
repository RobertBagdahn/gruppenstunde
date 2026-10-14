"""Plan-wide ingredient quantity overview and adjustment.

Built on the same contributions as the shopping list so both always show
identical totals. Adjustments are stored as ``MealItemOverride`` rows; the
recipe itself is never changed.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from decimal import Decimal
from typing import TYPE_CHECKING, Literal

from django.db import transaction
from django.utils import timezone
from ninja.errors import HttpError

from planner.models import MealItem, MealItemOverride
from recipe.services.recipe_item_helpers import get_recipe_item_ingredient, recipe_item_unit_label
from supply.services.portion_resolution import is_direct_metric_portion, resolve_trusted_weight
from supply.services.quantity_units import resolve_unit
from supply.services.shopping_service import (
    IngredientContribution,
    aggregate_contributions,
    collect_ingredient_contributions,
)

if TYPE_CHECKING:
    from planner.models import Meal, MealPlan
    from recipe.models import RecipeItem
    from supply.models import Ingredient

LineKind = Literal["recipe", "direct"]
AdjustMode = Literal["target_total", "percent", "reset", "restore"]

MIN_QUANTITY_OVERRIDE = 0.001
QUANTITY_DECIMALS = 4
_WEEKDAYS = ("Mo", "Di", "Mi", "Do", "Fr", "Sa", "So")

REASON_SYNCED = "Mahlzeit ist mit einer Vorlage verknüpft – bitte die Vorlage bearbeiten."
REASON_VARIANT = "Varianten- oder optionale Zutat – Auswahl am Rezept-Eintrag ändern."


@dataclass
class UnitOption:
    name: str
    weight_g: float
    is_default: bool


@dataclass
class QuantityLine:
    kind: LineKind
    meal_item_id: int
    recipe_item_id: int | None
    meal_id: int
    meal_type: str
    meal_start_datetime: dt.datetime | None
    meal_label: str
    recipe_id: int | None
    recipe_title: str
    quantity_per_person: float
    original_quantity_per_person: float
    unit_label: str
    factor: float
    effective_portions: float
    net_quantity_g: float
    excluded: bool
    is_overridden: bool
    editable: bool
    not_editable_reason: str | None


@dataclass
class IngredientQuantity:
    ingredient_id: int
    ingredient_name: str
    ingredient_slug: str
    retail_section: str
    net_quantity_g: float
    total_quantity_g: float
    quantity: float
    unit: str
    start_unit: dict | None
    has_trusted_weight: bool
    is_adjusted: bool
    # Amount text for items without a trusted gram weight (e.g. "2,5 Stück").
    display_text: str = ""
    unit_options: list[UnitOption] = field(default_factory=list)
    lines: list[QuantityLine] = field(default_factory=list)


@dataclass
class OverrideSnapshot:
    meal_item_id: int
    recipe_item_id: int
    quantity_override: float | None


@dataclass
class AdjustResult:
    item: IngredientQuantity | None
    changed_lines: int
    skipped_lines: int
    previous: list[OverrideSnapshot]


# --------------------------------------------------------------------------
# Overview
# --------------------------------------------------------------------------


def meal_label(meal: Meal) -> str:
    """German label like "Sa, 10.10. · Mittagessen"."""
    type_label = meal.get_meal_type_display()
    if not meal.start_datetime:
        return str(type_label)
    local = timezone.localtime(meal.start_datetime)
    return f"{_WEEKDAYS[local.weekday()]}, {local:%d.%m.} · {type_label}"


def _line_block_reason(meal_item: MealItem, recipe_item: RecipeItem | None) -> str | None:
    if meal_item.meal.is_synced:
        return REASON_SYNCED
    if recipe_item is not None and (recipe_item.is_optional or recipe_item.exchange_group_id is not None):
        return REASON_VARIANT
    return None


def _override_map(meal_item: MealItem) -> dict[int, MealItemOverride]:
    return {override.recipe_item_id: override for override in meal_item.overrides.all()}


def _line_from_contribution(contribution: IngredientContribution, reserve_factor: float) -> QuantityLine:
    mi = contribution.meal_item
    ri = contribution.recipe_item
    reason = _line_block_reason(mi, ri)
    if ri is not None:
        override = _override_map(mi).get(ri.id)
        return QuantityLine(
            kind="recipe",
            meal_item_id=mi.id,
            recipe_item_id=ri.id,
            meal_id=mi.meal_id,
            meal_type=mi.meal.meal_type,
            meal_start_datetime=mi.meal.start_datetime,
            meal_label=meal_label(mi.meal),
            recipe_id=mi.recipe_id,
            recipe_title=mi.recipe.title,
            quantity_per_person=round(contribution.quantity, 4),
            original_quantity_per_person=round(float(ri.quantity), 4),
            unit_label=recipe_item_unit_label(ri),
            factor=mi.factor,
            effective_portions=contribution.effective_portions,
            net_quantity_g=round(contribution.weight_g / reserve_factor, 2),
            excluded=False,
            is_overridden=bool(override and override.quantity_override is not None),
            editable=reason is None,
            not_editable_reason=reason,
        )
    unit = resolve_unit(
        portion=mi.portion,
        standard_measure_key=mi.standard_measure_key,
        measuring_unit=mi.measuring_unit,
    )
    return QuantityLine(
        kind="direct",
        meal_item_id=mi.id,
        recipe_item_id=None,
        meal_id=mi.meal_id,
        meal_type=mi.meal.meal_type,
        meal_start_datetime=mi.meal.start_datetime,
        meal_label=meal_label(mi.meal),
        recipe_id=None,
        recipe_title=mi.display_name or "Direkte Zutat",
        quantity_per_person=contribution.quantity,
        original_quantity_per_person=contribution.quantity,
        unit_label=unit.label,
        factor=mi.factor,
        effective_portions=contribution.effective_portions,
        net_quantity_g=round(contribution.weight_g / reserve_factor, 2),
        excluded=False,
        is_overridden=False,
        editable=reason is None,
        not_editable_reason=reason,
    )


def _excluded_overrides(meal_plan: MealPlan) -> list[MealItemOverride]:
    return list(
        MealItemOverride.objects.filter(
            meal_item__meal__meal_plan=meal_plan,
            meal_item__meal__is_reference=False,
            meal_item__meal__is_external=False,
            meal_item__recipe__deleted_at__isnull=True,
            excluded=True,
        ).select_related(
            "meal_item__meal",
            "meal_item__recipe",
            "recipe_item__portion__ingredient__retail_section",
            "recipe_item__portion__measuring_unit",
            "recipe_item__ingredient__retail_section",
        )
    )


def _excluded_line(override: MealItemOverride) -> QuantityLine:
    mi = override.meal_item
    ri = override.recipe_item
    reason = _line_block_reason(mi, ri)
    original = round(float(ri.quantity), 4)
    stored = override.quantity_override if override.quantity_override is not None else ri.quantity
    return QuantityLine(
        kind="recipe",
        meal_item_id=mi.id,
        recipe_item_id=ri.id,
        meal_id=mi.meal_id,
        meal_type=mi.meal.meal_type,
        meal_start_datetime=mi.meal.start_datetime,
        meal_label=meal_label(mi.meal),
        recipe_id=mi.recipe_id,
        recipe_title=mi.recipe.title if mi.recipe else "",
        quantity_per_person=round(float(stored), 4),
        original_quantity_per_person=original,
        unit_label=recipe_item_unit_label(ri),
        factor=mi.factor,
        effective_portions=mi.meal.effective_portions,
        net_quantity_g=0.0,
        excluded=True,
        is_overridden=override.quantity_override is not None,
        editable=reason is None,
        not_editable_reason=reason,
    )


def _unit_options(ingredient_ids: set[int]) -> dict[int, list[UnitOption]]:
    from supply.models import Portion

    options: dict[int, list[UnitOption]] = {}
    portions = (
        Portion.objects.active()
        .filter(ingredient_id__in=ingredient_ids)
        .select_related("measuring_unit")
        .order_by("rank", "name")
    )
    for portion in portions:
        if is_direct_metric_portion(portion):
            continue
        weight = resolve_trusted_weight(portion)
        if weight is None or weight <= 0:
            continue
        options.setdefault(portion.ingredient_id, []).append(
            UnitOption(name=portion.name or "Portion", weight_g=float(weight), is_default=portion.rank == 1)
        )
    return options


def _line_sort_key(line: QuantityLine) -> tuple:
    start = line.meal_start_datetime or dt.datetime.max.replace(tzinfo=dt.UTC)
    return (start, line.meal_id, line.recipe_title, line.meal_item_id)


def build_ingredient_quantities(meal_plan: MealPlan, ingredient_id: int | None = None) -> list[IngredientQuantity]:
    """All ingredients of a plan with totals and per-meal contributions."""
    collected = collect_ingredient_contributions(meal_plan)
    reserve_factor = collected.reserve_factor
    if ingredient_id is not None:
        collected.contributions = [c for c in collected.contributions if c.ingredient.id == ingredient_id]
    shopping_items = aggregate_contributions(collected)

    lines: dict[int, list[QuantityLine]] = {}
    has_raw: set[int] = set()
    for contribution in collected.contributions:
        lines.setdefault(contribution.ingredient.id, []).append(_line_from_contribution(contribution, reserve_factor))
        if contribution.raw_quantity is not None:
            has_raw.add(contribution.ingredient.id)

    excluded_ingredients: dict[int, Ingredient] = {}
    for override in _excluded_overrides(meal_plan):
        ingredient = get_recipe_item_ingredient(override.recipe_item)
        if ingredient is None or (ingredient_id is not None and ingredient.id != ingredient_id):
            continue
        lines.setdefault(ingredient.id, []).append(_excluded_line(override))
        excluded_ingredients[ingredient.id] = ingredient

    result: list[IngredientQuantity] = []
    for item in shopping_items:
        result.append(
            IngredientQuantity(
                ingredient_id=item.ingredient_id,
                ingredient_name=item.ingredient_name,
                ingredient_slug=item.ingredient_slug,
                retail_section=item.retail_section,
                net_quantity_g=item.net_quantity_g,
                total_quantity_g=item.total_quantity_g,
                quantity=item.quantity,
                unit=item.unit,
                start_unit=item.start_unit,
                display_text=item.display_text,
                has_trusted_weight=item.ingredient_id not in has_raw,
                is_adjusted=False,
            )
        )
    known = {entry.ingredient_id for entry in result}
    fully_excluded = sorted(
        (ing for ing_id, ing in excluded_ingredients.items() if ing_id not in known),
        key=lambda ing: ing.name,
    )
    for ingredient in fully_excluded:
        result.append(
            IngredientQuantity(
                ingredient_id=ingredient.id,
                ingredient_name=ingredient.name,
                ingredient_slug=getattr(ingredient, "slug", ""),
                retail_section=ingredient.retail_section.name if ingredient.retail_section else "",
                net_quantity_g=0.0,
                total_quantity_g=0.0,
                quantity=0.0,
                unit="g",
                start_unit=None,
                has_trusted_weight=True,
                is_adjusted=True,
            )
        )

    options = _unit_options({entry.ingredient_id for entry in result})
    for entry in result:
        entry.lines = sorted(lines.get(entry.ingredient_id, []), key=_line_sort_key)
        entry.is_adjusted = any(line.is_overridden or line.excluded for line in entry.lines)
        entry.unit_options = options.get(entry.ingredient_id, [])
    return result


# --------------------------------------------------------------------------
# Single line
# --------------------------------------------------------------------------


def _quantize(value: float) -> Decimal:
    return Decimal(str(round(value, QUANTITY_DECIMALS)))


def _store_quantity_override(meal_item: MealItem, recipe_item: RecipeItem, value: float | None) -> None:
    """Upsert only the quantity of one override row; other rows stay untouched."""
    override = MealItemOverride.objects.filter(meal_item=meal_item, recipe_item=recipe_item).first()
    if value is None:
        if override is None:
            return
        if override.excluded:
            override.quantity_override = None
            override.save(update_fields=["quantity_override"])
        else:
            override.delete()
        return
    if override is None:
        MealItemOverride.objects.create(
            meal_item=meal_item, recipe_item=recipe_item, quantity_override=_quantize(value)
        )
    else:
        override.quantity_override = _quantize(value)
        override.save(update_fields=["quantity_override"])


def _require_line_editable(meal_item: MealItem, recipe_item: RecipeItem) -> None:
    if meal_item.meal.is_synced or meal_item.meal.is_external:
        raise HttpError(422, "Mengen dieser Mahlzeit können hier nicht angepasst werden.")
    if recipe_item.is_optional or recipe_item.exchange_group_id is not None:
        raise HttpError(400, "Für Varianten- oder optionale Zutaten kann kein Override gesetzt werden.")


def get_line_targets(meal_plan: MealPlan, item_id: int, recipe_item_id: int) -> tuple[MealItem, RecipeItem]:
    from django.shortcuts import get_object_or_404

    from recipe.models import RecipeItem

    meal_item = get_object_or_404(
        MealItem.objects.select_related("meal", "recipe"),
        id=item_id,
        meal__meal_plan=meal_plan,
    )
    if not meal_item.recipe:
        raise HttpError(422, "Overrides nur für Rezept-Einträge möglich")
    recipe_item = get_object_or_404(RecipeItem, id=recipe_item_id, recipe=meal_item.recipe)
    return meal_item, recipe_item


@transaction.atomic
def set_line_override(
    meal_item: MealItem,
    recipe_item: RecipeItem,
    *,
    quantity_override: float | None,
    excluded: bool,
) -> None:
    """Set quantity (per stored recipe unit) and exclusion of one recipe line."""
    _require_line_editable(meal_item, recipe_item)
    if quantity_override is None and not excluded:
        MealItemOverride.objects.filter(meal_item=meal_item, recipe_item=recipe_item).delete()
        return
    MealItemOverride.objects.update_or_create(
        meal_item=meal_item,
        recipe_item=recipe_item,
        defaults={
            "quantity_override": _quantize(quantity_override) if quantity_override is not None else None,
            "excluded": excluded,
        },
    )


@transaction.atomic
def reset_line_override(meal_item: MealItem, recipe_item: RecipeItem) -> None:
    _require_line_editable(meal_item, recipe_item)
    MealItemOverride.objects.filter(meal_item=meal_item, recipe_item=recipe_item).delete()


# --------------------------------------------------------------------------
# Plan-wide adjustment
# --------------------------------------------------------------------------


def _snapshot(meal_item: MealItem, recipe_item: RecipeItem) -> OverrideSnapshot:
    override = _override_map(meal_item).get(recipe_item.id)
    value = float(override.quantity_override) if override and override.quantity_override is not None else None
    return OverrideSnapshot(meal_item_id=meal_item.id, recipe_item_id=recipe_item.id, quantity_override=value)


def _recipe_item(contribution: IngredientContribution) -> RecipeItem:
    recipe_item = contribution.recipe_item
    if recipe_item is None:
        raise ValueError("contribution has no recipe item")
    return recipe_item


def _is_adjustable(contribution: IngredientContribution) -> bool:
    return (
        contribution.recipe_item is not None
        and _line_block_reason(contribution.meal_item, contribution.recipe_item) is None
    )


def _new_quantity(recipe_item: RecipeItem, ratio: float) -> float | None:
    """Scaled stored quantity, or None when it equals the recipe value."""
    original = float(recipe_item.quantity)
    value = round(original * ratio, QUANTITY_DECIMALS)
    if value < MIN_QUANTITY_OVERRIDE:
        raise HttpError(422, "Zielmenge zu klein – schließe die Zutat stattdessen in einzelnen Mahlzeiten aus.")
    if abs(value - original) < 0.5 * 10**-QUANTITY_DECIMALS:
        return None
    return value


def _apply(
    changes: list[tuple[IngredientContribution, float | None]],
) -> tuple[int, list[OverrideSnapshot]]:
    previous: list[OverrideSnapshot] = []
    changed = 0
    for contribution, value in changes:
        mi = contribution.meal_item
        ri = _recipe_item(contribution)
        snapshot = _snapshot(mi, ri)
        if snapshot.quantity_override == value:
            continue
        previous.append(snapshot)
        _store_quantity_override(mi, ri, value)
        changed += 1
    return changed, previous


def _adjust_target(contributions: list[IngredientContribution], reserve_factor: float, target_net_g: float):
    adjustable = [c for c in contributions if _is_adjustable(c) and c.weight_g > 0 and c.quantity > 0]
    if not adjustable:
        raise HttpError(422, "Diese Zutat kann im Plan nicht auf eine Gesamtmenge angepasst werden.")
    total_net = sum(c.weight_g for c in contributions) / reserve_factor
    adjustable_current = sum(c.weight_g for c in adjustable) / reserve_factor
    fixed_net = total_net - adjustable_current
    original_net = sum(c.weight_g * float(_recipe_item(c).quantity) / c.quantity for c in adjustable) / reserve_factor
    if target_net_g <= fixed_net + 1e-6:
        raise HttpError(
            422,
            f"Die Zielmenge ist kleiner als der nicht anpassbare Anteil ({round(fixed_net)} g).",
        )
    ratio = (target_net_g - fixed_net) / original_net
    changes = [(c, _new_quantity(_recipe_item(c), ratio)) for c in adjustable]
    return changes, len(contributions) - len(adjustable)


def _adjust_percent(contributions: list[IngredientContribution], percent: float):
    adjustable = [c for c in contributions if _is_adjustable(c) and c.quantity > 0]
    if not adjustable:
        raise HttpError(422, "Diese Zutat kann im Plan nicht angepasst werden.")
    factor = 1 + percent / 100
    changes: list[tuple[IngredientContribution, float | None]] = []
    for c in adjustable:
        recipe_item = _recipe_item(c)
        stored = float(recipe_item.quantity)
        ratio = c.quantity * factor / stored if stored else factor
        changes.append((c, _new_quantity(recipe_item, ratio)))
    return changes, len(contributions) - len(adjustable)


def _reset_ingredient(meal_plan: MealPlan, ingredient_id: int) -> tuple[int, list[OverrideSnapshot]]:
    previous: list[OverrideSnapshot] = []
    overrides = MealItemOverride.objects.filter(
        meal_item__meal__meal_plan=meal_plan,
        quantity_override__isnull=False,
    ).select_related("recipe_item__portion")
    for override in overrides:
        ingredient = get_recipe_item_ingredient(override.recipe_item)
        if ingredient is None or ingredient.id != ingredient_id:
            continue
        previous.append(
            OverrideSnapshot(
                meal_item_id=override.meal_item_id,
                recipe_item_id=override.recipe_item_id,
                quantity_override=float(override.quantity_override or 0),
            )
        )
        if override.excluded:
            override.quantity_override = None
            override.save(update_fields=["quantity_override"])
        else:
            override.delete()
    return len(previous), previous


def _restore(
    meal_plan: MealPlan, ingredient_id: int, snapshots: list[OverrideSnapshot]
) -> tuple[int, list[OverrideSnapshot]]:
    previous: list[OverrideSnapshot] = []
    for snapshot in snapshots:
        meal_item, recipe_item = get_line_targets(meal_plan, snapshot.meal_item_id, snapshot.recipe_item_id)
        ingredient = get_recipe_item_ingredient(recipe_item)
        if ingredient is None or ingredient.id != ingredient_id:
            raise HttpError(422, "Die Wiederherstellung passt nicht zu dieser Zutat.")
        _require_line_editable(meal_item, recipe_item)
        if snapshot.quantity_override is not None and snapshot.quantity_override < MIN_QUANTITY_OVERRIDE:
            raise HttpError(422, "Ungültige Menge in der Wiederherstellung.")
        previous.append(_snapshot(meal_item, recipe_item))
        _store_quantity_override(meal_item, recipe_item, snapshot.quantity_override)
    return len(previous), previous


@transaction.atomic
def adjust_ingredient_quantity(
    meal_plan: MealPlan,
    ingredient_id: int,
    *,
    mode: AdjustMode,
    target_total_g: float | None = None,
    percent: float | None = None,
    restore: list[OverrideSnapshot] | None = None,
) -> AdjustResult:
    """Adjust one ingredient across the whole plan via quantity overrides."""
    collected = collect_ingredient_contributions(meal_plan)
    contributions = [c for c in collected.contributions if c.ingredient.id == ingredient_id]

    skipped = 0
    if mode == "reset":
        changed, previous = _reset_ingredient(meal_plan, ingredient_id)
    elif mode == "restore":
        changed, previous = _restore(meal_plan, ingredient_id, restore or [])
    else:
        if not contributions:
            raise HttpError(404, "Zutat ist in diesem Essensplan nicht enthalten.")
        if mode == "target_total":
            if target_total_g is None:
                raise HttpError(422, "Zielmenge fehlt.")
            changes, skipped = _adjust_target(contributions, collected.reserve_factor, target_total_g)
        else:
            if percent is None:
                raise HttpError(422, "Prozentwert fehlt.")
            changes, skipped = _adjust_percent(contributions, percent)
        changed, previous = _apply(changes)

    items = build_ingredient_quantities(meal_plan, ingredient_id=ingredient_id)
    return AdjustResult(
        item=items[0] if items else None,
        changed_lines=changed,
        skipped_lines=skipped,
        previous=previous,
    )
