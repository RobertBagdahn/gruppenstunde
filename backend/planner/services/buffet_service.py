"""Buffet quantities: the only place where buffet amounts are computed.

All amounts are per person. Ingredients are stored in grams (drinks in
milliliters) with ``factor=1``; recipes are stored with a ``factor`` relative
to one serving. The meal's portions are applied downstream like for every
other meal item and never go into ``quantity``.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from decimal import Decimal
from typing import Any

from django.db import transaction

from planner.models import BuffetTemplate, BuffetUnitChoices, Meal, MealItem
from planner.services.quantity_plausibility import QuantityWarning, check
from supply.data.dge_reference import NORM_PERSON_DAILY_KCAL
from supply.services.buffet_catalog import recipe_weight_per_serving_g


class BuffetError(ValueError):
    """Invalid buffet selection (answered with 422)."""


@dataclass
class BuffetSelection:
    role_slug: str
    ingredient: Any | None = None
    recipe: Any | None = None


@dataclass
class BuffetResultItem:
    role_slug: str
    kind: str
    id: int
    name: str
    amount_per_person: float
    unit: str
    total_amount: float
    factor: float
    energy_kcal_per_person: float | None
    cost_per_person: float | None
    cost_total: float | None


@dataclass
class BuffetWarning:
    code: str
    message: str
    ingredient_name: str | None = None
    meal_item_id: int | None = None
    meal_id: int | None = None
    per_person_value: float | None = None
    per_person_unit: str | None = None
    total_value: float | None = None
    total_unit: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class BuffetResult:
    portions: float
    items: list[BuffetResultItem] = field(default_factory=list)
    energy_kcal_per_person: float | None = 0.0
    target_kcal_per_person: float = 0.0
    cost_per_person: float | None = 0.0
    cost_total: float | None = 0.0
    warnings: list[BuffetWarning] = field(default_factory=list)


def _unit_by_name(name: str) -> Any:
    from supply.models import MeasuringUnit

    return MeasuringUnit.objects.filter(name__iexact=name).order_by("id").first()


def gram_unit() -> Any:
    return _unit_by_name("Gramm")


def milliliter_unit() -> Any:
    return _unit_by_name("Milliliter")


def _float(value: Any) -> float | None:
    return float(value) if value is not None else None


def _ingredient_values(ingredient: Any, amount: float, unit: str) -> tuple[float | None, float | None]:
    """kcal and cost per person for ``amount`` g/ml of an ingredient."""
    from supply.services.price_service import price_or_none

    grams = amount * (ingredient.physical_density or 1.0) if unit == BuffetUnitChoices.MILLILITER else amount
    kcal = grams * ingredient.energy_kcal / 100 if ingredient.energy_kcal is not None else None
    price = price_or_none(ingredient.price_per_kg)
    cost = grams / 1000 * float(price) if price is not None else None
    return kcal, cost


def _recipe_values(recipe: Any, factor: float) -> tuple[float | None, float | None]:
    """kcal and cost per person for ``factor`` servings of a recipe."""
    servings = max(recipe.portions or 1, 1)
    kcal = recipe.cached_energy_total_kcal / servings * factor if recipe.cached_energy_total_kcal is not None else None
    cost = float(recipe.cached_price_total) / servings * factor if recipe.cached_price_total is not None else None
    return kcal, cost


def validate_selections(template: BuffetTemplate, selections: list[BuffetSelection]) -> None:
    """Roles must belong to the template; visible items may be assigned freely once."""
    role_slugs = set(template.roles.values_list("role__slug", flat=True))
    seen: set[tuple[str, int]] = set()
    for selection in selections:
        if selection.role_slug not in role_slugs:
            raise BuffetError(f"Die Rolle {selection.role_slug} gehört nicht zur Vorlage {template.name}.")
        obj = selection.ingredient or selection.recipe
        kind = "ingredient" if selection.ingredient is not None else "recipe"
        name = obj.name if kind == "ingredient" else obj.title
        if (kind, obj.id) in seen:
            raise BuffetError(f"{name} ist mehrfach ausgewählt.")
        seen.add((kind, obj.id))


def _selection_name(selection: BuffetSelection) -> str:
    item = selection.ingredient if selection.ingredient is not None else selection.recipe
    return item.name if selection.ingredient is not None else item.title


def _missing_data_warnings(selections: list[BuffetSelection]) -> list[BuffetWarning]:
    from supply.services.price_service import price_or_none

    warnings: list[BuffetWarning] = []
    for selection in selections:
        name = _selection_name(selection)
        if selection.ingredient is not None:
            ingredient = selection.ingredient
            if ingredient.energy_kcal is None:
                warnings.append(BuffetWarning("missing_energy", f"{name}: Nährwertangabe fehlt.", name))
            if price_or_none(ingredient.price_per_kg) is None:
                warnings.append(BuffetWarning("missing_price", f"{name}: Preisangabe fehlt.", name))
            continue

        recipe = selection.recipe
        if recipe.cached_energy_total_kcal is None:
            warnings.append(BuffetWarning("missing_energy", f"{name}: Nährwertangabe fehlt.", name))
        if recipe.cached_price_total is None:
            warnings.append(BuffetWarning("missing_price", f"{name}: Preisangabe fehlt.", name))
        if recipe_weight_per_serving_g(recipe) is None:
            warnings.append(
                BuffetWarning(
                    "missing_recipe_weight",
                    f"{name}: Portionsgewicht fehlt; es wird eine gleichmäßige Ersatzmenge verwendet.",
                    name,
                )
            )
    return warnings


def _buffet_quantity_warning(warning: QuantityWarning) -> BuffetWarning:
    return BuffetWarning(
        code="quantity_plausibility",
        message=warning.message,
        ingredient_name=warning.ingredient_name,
        meal_item_id=warning.meal_item_id,
        meal_id=warning.meal_id,
        per_person_value=warning.per_person_value,
        per_person_unit=warning.per_person_unit,
        total_value=warning.total_value,
        total_unit=warning.total_unit,
    )


def _sum_if_complete(values: list[float | None]) -> float | None:
    if any(value is None for value in values):
        return None
    return sum(value for value in values if value is not None)


def compute_buffet(
    template: BuffetTemplate,
    selections: list[BuffetSelection],
    role_amounts: dict[str, float] | None,
    meal: Meal,
) -> BuffetResult:
    """Per-person amounts, totals, kcal, costs and warnings for a selection."""
    validate_selections(template, selections)
    role_amounts = role_amounts or {}
    portions = float(meal.effective_portions or 1)
    result = BuffetResult(
        portions=portions,
        target_kcal_per_person=NORM_PERSON_DAILY_KCAL * meal.day_part_factor,
        warnings=_missing_data_warnings(selections),
    )
    kcal_values: list[float | None] = []
    cost_values: list[float | None] = []

    template_roles = {role.role.slug: role for role in template.roles.select_related("role")}
    by_role: dict[str, list[BuffetSelection]] = {}
    for selection in selections:
        by_role.setdefault(selection.role_slug, []).append(selection)

    grams_unit, ml_unit = gram_unit(), milliliter_unit()
    preview_items: list[MealItem] = []
    for role_slug, role_selections in by_role.items():
        template_role = template_roles[role_slug]
        amount = float(role_amounts.get(role_slug, template_role.amount_per_person))
        share = amount / len(role_selections)
        for selection in role_selections:
            if selection.ingredient is not None:
                ingredient = selection.ingredient
                kcal, cost = _ingredient_values(ingredient, share, template_role.unit)
                item = BuffetResultItem(
                    role_slug=role_slug,
                    kind="ingredient",
                    id=ingredient.id,
                    name=ingredient.name,
                    amount_per_person=share,
                    unit=template_role.unit,
                    total_amount=share * portions,
                    factor=1.0,
                    energy_kcal_per_person=kcal,
                    cost_per_person=cost,
                    cost_total=cost * portions if cost is not None else None,
                )
                preview_items.append(
                    MealItem(
                        meal=meal,
                        ingredient=ingredient,
                        quantity=Decimal(str(round(share, 2))),
                        measuring_unit=ml_unit if template_role.unit == BuffetUnitChoices.MILLILITER else grams_unit,
                    )
                )
            else:
                recipe = selection.recipe
                serving_g = recipe_weight_per_serving_g(recipe)
                factor = share / serving_g if serving_g else 1 / len(role_selections)
                kcal, cost = _recipe_values(recipe, factor)
                item = BuffetResultItem(
                    role_slug=role_slug,
                    kind="recipe",
                    id=recipe.id,
                    name=recipe.title,
                    amount_per_person=share,
                    unit=template_role.unit,
                    total_amount=share * portions,
                    factor=round(factor, 4),
                    energy_kcal_per_person=kcal,
                    cost_per_person=cost,
                    cost_total=cost * portions if cost is not None else None,
                )
            result.items.append(item)
            kcal_values.append(item.energy_kcal_per_person)
            cost_values.append(item.cost_per_person)

    result.energy_kcal_per_person = _sum_if_complete(kcal_values)
    result.cost_per_person = _sum_if_complete(cost_values)
    result.cost_total = result.cost_per_person * portions if result.cost_per_person is not None else None
    result.warnings.extend(_buffet_quantity_warning(warning) for warning in check(preview_items, portions))
    return result


def save_buffet(
    meal: Meal,
    template: BuffetTemplate,
    selections: list[BuffetSelection],
    role_amounts: dict[str, float] | None,
) -> BuffetResult:
    """Replace the meal's buffet items; other items stay untouched."""
    result = compute_buffet(template, selections, role_amounts, meal)
    grams_unit, ml_unit = gram_unit(), milliliter_unit()
    selection_by_key = {
        ("ingredient" if s.ingredient is not None else "recipe", (s.ingredient or s.recipe).id): s for s in selections
    }

    with transaction.atomic():
        meal.items.exclude(buffet_role="").delete()
        manual_ingredient_ids = set(meal.items.filter(ingredient__isnull=False).values_list("ingredient_id", flat=True))
        for item in result.items:
            selection = selection_by_key[(item.kind, item.id)]
            if item.kind == "ingredient":
                if item.id in manual_ingredient_ids:
                    raise BuffetError(f"{item.name} ist bereits als eigener Eintrag in dieser Mahlzeit enthalten.")
                MealItem.objects.create(
                    meal=meal,
                    ingredient=selection.ingredient,
                    quantity=Decimal(str(round(item.amount_per_person, 2))),
                    measuring_unit=ml_unit if item.unit == BuffetUnitChoices.MILLILITER else grams_unit,
                    factor=1.0,
                    buffet_role=item.role_slug,
                )
            else:
                MealItem.objects.create(
                    meal=meal,
                    recipe=selection.recipe,
                    factor=item.factor,
                    buffet_role=item.role_slug,
                )
        meal.buffet_template = template
        meal.buffet_role_amounts = {slug: float(value) for slug, value in (role_amounts or {}).items()}
        meal.save(update_fields=["buffet_template", "buffet_role_amounts"])

    saved_items = (
        meal.items.exclude(buffet_role="")
        .filter(ingredient__isnull=False)
        .select_related("ingredient", "measuring_unit")
    )
    result.warnings = [warning for warning in result.warnings if warning.code != "quantity_plausibility"]
    result.warnings.extend(_buffet_quantity_warning(warning) for warning in check(saved_items, result.portions))
    return result
