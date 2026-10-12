"""Detect ingredients whose nutrition data is missing.

Mirrors ``price_service.is_missing_price``: a missing value must be surfaced
instead of being silently counted as 0 kcal.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from supply.models import Ingredient

# Ingredients that legitimately have no energy; they never count as missing.
_ZERO_ENERGY_NAME_PARTS: tuple[str, ...] = ("wasser", "salz", "pfeffer", "tee", "kaffee", "essig")


def _is_zero_energy_by_nature(name: str | None) -> bool:
    lowered = (name or "").lower()
    return any(part in lowered for part in _ZERO_ENERGY_NAME_PARTS)


def is_missing_nutrition(ingredient: Ingredient | None) -> bool:
    """Whether the ingredient has no usable nutrition data.

    ``energy_kcal`` of ``None`` is always missing. An all-zero profile
    (energy, protein, fat, carbohydrate) is missing too, unless the
    ingredient is zero-energy by nature (water, salt, spices, tea, vinegar).
    """
    if ingredient is None:
        return False
    if ingredient.energy_kcal is None:
        return True
    values = (
        ingredient.energy_kcal,
        ingredient.protein_g,
        ingredient.fat_g,
        ingredient.carbohydrate_g,
    )
    if all(not value for value in values):
        return not _is_zero_energy_by_nature(ingredient.name)
    return False
