"""Aggregate recipe materials into a material list (devices and consumables).

Consumables are summed over all recipes, devices take the maximum (they are used one
after another). Every entry names the recipes that need it.
"""

from __future__ import annotations

import math
from collections.abc import Iterable
from dataclasses import dataclass, field

from django.contrib.contenttypes.models import ContentType

from supply.models import ContentMaterialItem, Material


@dataclass
class MaterialRecipeRef:
    """Recipe that requires a material."""

    id: int
    title: str
    slug: str
    amount: float = 0


@dataclass
class MaterialRequirement:
    """One aggregated material entry."""

    material: Material
    amount: float
    recipes: list[MaterialRecipeRef] = field(default_factory=list)

    @property
    def price_per_piece(self) -> float | None:
        return self.material.price_per_piece

    @property
    def cost(self) -> float | None:
        price = self.price_per_piece
        if price is None or not self.material.is_consumable:
            return None
        return round(price * self.amount, 2)


@dataclass
class MaterialList:
    """Aggregated material list split into devices and consumables."""

    devices: list[MaterialRequirement] = field(default_factory=list)
    consumables: list[MaterialRequirement] = field(default_factory=list)

    @property
    def is_empty(self) -> bool:
        return not self.devices and not self.consumables

    @property
    def total_cost(self) -> float:
        return round(sum(req.cost or 0 for req in self.consumables), 2)


def scaled_amount(item: ContentMaterialItem, servings: float) -> float:
    """Scaled amount of a recipe material link, rounded up to whole pieces."""
    if item.quantity_mode == ContentMaterialItem.QuantityMode.PER_PORTION:
        raw = item.amount * servings
    else:
        raw = item.amount
    # Rounding first keeps floating point noise (e.g. 0.1 * 30) from pushing a whole number up.
    return float(math.ceil(round(raw, 6)))


def recipe_material_items(recipe_ids: Iterable[int]) -> dict[int, list[ContentMaterialItem]]:
    """Material links of the given recipes, grouped by recipe id."""
    from recipe.models import Recipe

    ct = ContentType.objects.get_for_model(Recipe, for_concrete_model=False)
    grouped: dict[int, list[ContentMaterialItem]] = {}
    items = (
        ContentMaterialItem.objects.filter(
            content_type=ct,
            object_id__in=list(recipe_ids),
            material__deleted_at__isnull=True,
        )
        .select_related("material")
        .order_by("sort_order")
    )
    for item in items:
        grouped.setdefault(item.object_id, []).append(item)
    return grouped


def aggregate_materials(entries: Iterable[tuple[object, float]]) -> MaterialList:
    """Aggregate materials for `(recipe, servings)` pairs.

    The same recipe may appear several times (e.g. in different meals); its consumable
    amounts are summed, device amounts take the maximum.
    """
    pairs = [(recipe, servings) for recipe, servings in entries if servings > 0]
    links = recipe_material_items({recipe.pk for recipe, _ in pairs})  # type: ignore[attr-defined]

    by_material: dict[int, MaterialRequirement] = {}
    for recipe, servings in pairs:
        for item in links.get(recipe.pk, []):  # type: ignore[attr-defined]
            amount = scaled_amount(item, servings)
            requirement = by_material.get(item.material_id)
            if requirement is None:
                requirement = MaterialRequirement(material=item.material, amount=0)
                by_material[item.material_id] = requirement
            if item.material.is_consumable:
                requirement.amount += amount
            else:
                requirement.amount = max(requirement.amount, amount)
            ref = next((r for r in requirement.recipes if r.id == recipe.pk), None)  # type: ignore[attr-defined]
            if ref is None:
                ref = MaterialRecipeRef(id=recipe.pk, title=recipe.title, slug=recipe.slug)  # type: ignore[attr-defined]
                requirement.recipes.append(ref)
            ref.amount = ref.amount + amount if item.material.is_consumable else max(ref.amount, amount)

    result = MaterialList()
    for requirement in sorted(by_material.values(), key=lambda r: r.material.name.lower()):
        (result.consumables if requirement.material.is_consumable else result.devices).append(requirement)
    return result


def per_portion_material_cost(recipe: object) -> float | None:
    """Cost of per-portion consumables for one serving; None when no priced consumable applies."""
    items = recipe_material_items([recipe.pk]).get(recipe.pk, [])  # type: ignore[attr-defined]
    costs = [
        item.material.price_per_piece * item.amount
        for item in items
        if item.material.is_consumable
        and item.quantity_mode == ContentMaterialItem.QuantityMode.PER_PORTION
        and item.material.price_per_piece is not None
    ]
    return sum(costs) if costs else None


def fixed_material_cost(recipe: object) -> float:
    """Cost of fixed-amount consumables of a recipe (independent of servings)."""
    items = recipe_material_items([recipe.pk]).get(recipe.pk, [])  # type: ignore[attr-defined]
    return sum(
        item.material.price_per_piece * item.amount
        for item in items
        if item.material.is_consumable
        and item.quantity_mode == ContentMaterialItem.QuantityMode.TOTAL
        and item.material.price_per_piece is not None
    )


def material_list_payload(title: str, material_list: MaterialList) -> dict:
    """Serialize a MaterialList for the API (see supply.schemas.material_list.MaterialListResultOut)."""

    def entry(req: MaterialRequirement) -> dict:
        return {
            "material_id": req.material.pk,
            "name": req.material.name,
            "slug": req.material.slug,
            "is_consumable": req.material.is_consumable,
            "amount": req.amount,
            "price_per_piece": req.price_per_piece,
            "cost": req.cost,
            "recipes": [{"id": r.id, "title": r.title, "slug": r.slug, "amount": r.amount} for r in req.recipes],
        }

    return {
        "title": title,
        "devices": [entry(req) for req in material_list.devices],
        "consumables": [entry(req) for req in material_list.consumables],
        "total_cost": material_list.total_cost,
    }


def meal_plan_material_entries(meal_plan: object) -> list[tuple[object, float]]:
    """`(recipe, servings)` pairs of all cooked recipes in a meal plan."""
    from planner.models import MealItem

    items = MealItem.objects.filter(
        meal__meal_plan=meal_plan,
        meal__is_reference=False,
        meal__is_external=False,
        recipe__isnull=False,
        recipe__deleted_at__isnull=True,
    ).select_related("recipe", "meal", "meal__meal_plan")
    return [(item.recipe, item.factor * item.meal.effective_portions) for item in items]
