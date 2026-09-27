"""Status transitions for Ingredients (draft ↔ verified) including the visibility rule."""

from __future__ import annotations

from typing import Any, Final

from supply.choices import IngredientStatusChoices
from supply.models import Ingredient


class _SystemActor:
    """Marker for management commands that change status without a user."""

    def __repr__(self) -> str:
        return "SYSTEM"


SYSTEM: Final = _SystemActor()


class IngredientStatusPermissionError(PermissionError):
    """Raised when a non-staff actor tries to change an Ingredient status."""


def can_verify(user: Any) -> bool:
    """Whether ``user`` may set an Ingredient to verified or back to draft."""
    from content.services.food_access import _is_staff

    return _is_staff(user)


def set_ingredient_status(ingredient: Ingredient, status: str, *, actor: Any) -> Ingredient:
    """Set ``status`` and the dependent visibility, then save with ``update_fields``.

    - verified + owner → visibility ``public`` (owner is kept)
    - draft + visibility ``public`` → visibility ``private``

    ``actor`` must be a staff user or ``SYSTEM``. Saving via ``save(update_fields=…)``
    keeps the change audit log signal in play.
    """
    if status not in IngredientStatusChoices.values:
        raise ValueError(f"Ungültiger Zutat-Status: {status}")
    if actor is not SYSTEM and not can_verify(actor):
        raise IngredientStatusPermissionError("Nur Staff darf den Status einer Zutat ändern.")

    update_fields = ["status"]
    ingredient.status = status
    if status == IngredientStatusChoices.VERIFIED and ingredient.owner_id is not None:
        if ingredient.visibility != "public":
            ingredient.visibility = "public"
            update_fields.append("visibility")
    elif status == IngredientStatusChoices.DRAFT and ingredient.visibility == "public":
        ingredient.visibility = "private"
        update_fields.append("visibility")

    if actor is not SYSTEM:
        ingredient.updated_by = actor
        update_fields.append("updated_by")
    ingredient._changed_by = None if actor is SYSTEM else actor
    update_fields.append("updated_at")
    ingredient.save(update_fields=update_fields)
    return ingredient
