"""Learned ingredient mappings: confirmed review choices feed the next import."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# Confirmations from this many different people turn a suggestion into a match.
TRUSTED_CONFIRMATIONS = 2


def query_key(query: str) -> str:
    """'  Feta-Käse ' → 'feta-käse'."""
    return " ".join(query.lower().split())


@dataclass(frozen=True)
class LearnedMatch:
    ingredient_id: int
    name: str
    slug: str
    confirmations: int
    is_trusted: bool


def lookup(query: str, allowed_ids: set[int]) -> LearnedMatch | None:
    """Learned ingredient for ``query`` if it is still matchable for the caller."""
    from supply.models import LearnedIngredientMapping

    key = query_key(query)
    if not key:
        return None
    mapping = (
        LearnedIngredientMapping.objects.filter(query_key=key, ingredient__deleted_at__isnull=True)
        .select_related("ingredient")
        .first()
    )
    if mapping is None or mapping.ingredient_id not in allowed_ids:
        return None
    distinct_people = mapping.confirmed_by.count()
    return LearnedMatch(
        ingredient_id=mapping.ingredient_id,
        name=mapping.ingredient.name,
        slug=mapping.ingredient.slug,
        confirmations=mapping.confirmations,
        is_trusted=distinct_people >= TRUSTED_CONFIRMATIONS,
    )


def record_confirmation(query: str, ingredient_id: int, user: Any) -> None:
    """Store that ``user`` confirmed ``ingredient_id`` for ``query``.

    A confirmation of a different ingredient replaces the mapping: the latest
    human decision wins. Anonymous users never teach the matcher.
    """
    from supply.models import LearnedIngredientMapping

    key = query_key(query)
    if not key or user is None or not user.is_authenticated:
        return
    mapping, created = LearnedIngredientMapping.objects.get_or_create(
        query_key=key, defaults={"ingredient_id": ingredient_id}
    )
    if not created and mapping.ingredient_id != ingredient_id:
        mapping.ingredient_id = ingredient_id
        mapping.confirmations = 0
        mapping.save(update_fields=["ingredient", "confirmations", "updated_at"])
        mapping.confirmed_by.clear()
    mapping.confirmations += 1
    mapping.save(update_fields=["confirmations", "updated_at"])
    mapping.confirmed_by.add(user)
