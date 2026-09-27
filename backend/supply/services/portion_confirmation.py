"""Business logic for confirming piece portion weights.

When a user confirms an AI weight proposal (or picks an existing portion
instead), this service either selects the known portion or creates a new
confirmed one. Referenced definitions are never mutated in place; a
materially different weight always yields a new, uniquely named portion.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.utils import timezone

from supply.choices import PortionWeightSource, PortionWeightStatus
from supply.services.portion_integrity import validate_active_portion_weight
from supply.services.portion_resolution import normalize_portion_name

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from supply.models import Ingredient, MeasuringUnit, Portion

logger = logging.getLogger(__name__)

WEIGHT_TOLERANCE = 0.01


def _next_free_rank(ingredient: Ingredient, desired_rank: int) -> int:
    taken = set(
        ingredient.portions.active().values_list("rank", flat=True),
    )
    if desired_rank not in taken:
        return desired_rank
    rank = 2
    while rank in taken:
        rank += 1
    return rank


def _unique_name(ingredient: Ingredient, name: str, weight_g: float | None) -> str:
    if not ingredient.portions.active().filter(name__iexact=name).exists():
        return name
    if weight_g is not None and weight_g > 0:
        return f"{name} ({weight_g:g} g)"
    return f"{name} (neu)"


def confirm_portion(
    ingredient: Ingredient,
    *,
    name: str,
    weight_g: float | None,
    quantity: float,
    measuring_unit: MeasuringUnit | None,
    rank: int,
    existing_portion_id: int | None,
    user: AbstractBaseUser | None,
) -> Portion:
    """Select an existing portion or create a new confirmed one.

    Safeguards:
    - an explicit `existing_portion_id` must belong to `ingredient` and be active
    - an identical active portion (normalized name + same weight) is reused
    - a name collision with a different weight creates a new portion with a
      unique name instead of mutating the existing definition
    """
    from supply.models import Portion

    if measuring_unit is None:
        from supply.models import MeasuringUnit

        measuring_unit = MeasuringUnit.objects.filter(name__iexact="Gramm").first()
        if measuring_unit is None:
            raise ValueError("Keine technische Maßeinheit verfügbar")

    name = (name or "").strip()
    if not name:
        raise ValueError("Portionsname fehlt")

    if existing_portion_id is not None:
        portion = (
            Portion.objects.active()
            .filter(id=existing_portion_id, ingredient=ingredient)
            .select_related("measuring_unit")
            .first()
        )
        if portion is None:
            raise ValueError("Gewählte Portion existiert nicht oder ist gelöscht")
        validate_active_portion_weight(portion)
        return portion

    normalized = normalize_portion_name(name)
    for candidate in ingredient.portions.active().select_related("measuring_unit"):
        if normalize_portion_name(candidate.name) != normalized:
            continue
        same_weight = candidate.weight_g is None and weight_g is None
        if candidate.weight_g is not None and weight_g is not None:
            same_weight = abs(candidate.weight_g - weight_g) <= WEIGHT_TOLERANCE
        if same_weight:
            validate_active_portion_weight(candidate)
            return candidate

    portion = Portion(
        ingredient=ingredient,
        name=_unique_name(ingredient, name, weight_g),
        quantity=quantity,
        measuring_unit=measuring_unit,
        rank=_next_free_rank(ingredient, rank),
        weight_g=weight_g,
        weight_status=PortionWeightStatus.CONFIRMED,
        weight_source=PortionWeightSource.MANUAL,
        weight_confirmed_at=timezone.now(),
        created_by=user if user is not None and user.is_authenticated else None,
        updated_by=user if user is not None and user.is_authenticated else None,
    )
    try:
        validate_active_portion_weight(portion)
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    portion.save()
    logger.info(
        "Confirmed piece portion %s (%s) for ingredient %s (%s)",
        portion.id,
        portion.name,
        ingredient.id,
        ingredient.name,
    )
    return portion
