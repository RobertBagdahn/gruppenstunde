"""Conservative matching of typed shopping-list quantities to ingredients."""

from __future__ import annotations

import re
from dataclasses import dataclass

from django.contrib.auth.models import AbstractBaseUser
from django.db.models import Q

from content.services.food_access import visible_ingredient_queryset
from supply.choices import IngredientStatusChoices
from supply.models import Ingredient

_QUANTITY_PREFIX = re.compile(
    r"^\s*(?P<amount>\d+(?:[,.]\d+)?)\s*(?P<unit>kilogramm|kg|g|milliliter|millilitre|ml|liter|litre|l)\s+(?P<name>.+?)\s*$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ParsedShoppingIngredient:
    ingredient: Ingredient
    quantity_g: float
    name: str


def parse_manual_ingredient_quantity(
    text: str,
    user: AbstractBaseUser,
) -> ParsedShoppingIngredient | None:
    """Match an exact public/visible ingredient in a typed mass or volume amount.

    Ambiguous names are deliberately left as free text. Volumes are converted
    to grams with the matched ingredient's density; mass units never use it.
    """
    match = _QUANTITY_PREFIX.fullmatch(text)
    if match is None:
        return None

    amount = float(match.group("amount").replace(",", "."))
    if amount <= 0:
        return None

    unit = match.group("unit").casefold()
    ingredient_name = match.group("name").strip(" \t.,;:")
    if not ingredient_name:
        return None

    ingredients = (
        visible_ingredient_queryset(user)
        .filter(status=IngredientStatusChoices.VERIFIED, deleted_at__isnull=True)
        .filter(Q(name__iexact=ingredient_name) | Q(aliases__name__iexact=ingredient_name))
        .distinct()
    )
    if ingredients.count() != 1:
        return None

    ingredient = ingredients.get()
    if unit in {"kg", "kilogramm"}:
        quantity_g = amount * 1000
    elif unit == "g":
        quantity_g = amount
    else:
        volume_ml = amount * (1000 if unit in {"l", "liter", "litre"} else 1)
        quantity_g = volume_ml * float(ingredient.physical_density or 1)

    return ParsedShoppingIngredient(
        ingredient=ingredient,
        quantity_g=round(quantity_g, 2),
        name=ingredient.name,
    )
