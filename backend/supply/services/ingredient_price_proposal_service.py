"""Service for AI-generated ingredient price proposals with user confirmation.

A proposal is a reviewable record (never applied automatically). Accepting a
proposal applies its price to the global Ingredient and invalidates dependent
recipe caches.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone
from ninja.errors import HttpError
from pydantic import BaseModel, Field

from core.services.gemini import GeminiUnavailableError, gemini_call
from supply.services.price_service import is_missing_price, price_or_none

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from supply.models import Ingredient, IngredientPriceProposal

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"

MAX_PROPOSED_PRICE_EUR = Decimal("1000.00")


class PriceProposalData(BaseModel):
    """Structured Gemini response for a price proposal."""

    proposed_price_per_kg: float = Field(gt=0, description="Geschätzter Supermarktpreis in EUR pro kg")
    confidence: float = Field(ge=0, le=1, description="Konfidenz der Schätzung (0-1)")
    rationale: str = Field(..., description="Begründung der Schätzung (deutsch)")
    source: str = Field(default="gemini", description="Quelle der Schätzung")


def _build_prompt(ingredient: Ingredient) -> str:
    context_lines = [f"Zutat: {ingredient.name}"]
    if ingredient.retail_section_id:
        context_lines.append(f"Supermarkt-Abteilung: {ingredient.retail_section.name}")
    if ingredient.energy_kcal:
        context_lines.append(f"Energie: {ingredient.energy_kcal} kcal/100g")
    if ingredient.description:
        context_lines.append(f"Beschreibung: {ingredient.description[:500]}")
    return (
        "Schätze einen realistischen Supermarktpreis in Deutschland für folgendes Lebensmittel:\n"
        + "\n".join(context_lines)
        + "\n\n"
        "Antworte mit einem strukturierten JSON-Objekt mit:\n"
        "- proposed_price_per_kg: Preis in EUR pro Kilogramm (größer 0, max 1000)\n"
        "- confidence: Deine Konfidenz als Zahl zwischen 0 und 1\n"
        "- rationale: Kurze deutsche Begründung der Schätzung\n"
        "- source: Immer 'gemini'"
    )


def create_price_proposal(ingredient: Ingredient, user: AbstractBaseUser) -> IngredientPriceProposal:
    """Create an AI price proposal for an ingredient with a missing price.

    Idempotent: if a pending proposal already exists for the ingredient, it is
    returned instead of creating a duplicate. Ingredients with a positive
    price are rejected (no automatic overwrite).
    """
    from google.genai import types

    from supply.models import IngredientPriceProposal

    current_price = price_or_none(ingredient.price_per_kg)
    if current_price is not None:
        raise HttpError(
            409, "Diese Zutat besitzt bereits einen Preis. Bestehende Preise werden nicht automatisch ersetzt."
        )

    existing = IngredientPriceProposal.objects.filter(
        ingredient=ingredient,
        status=IngredientPriceProposal.Status.PENDING,
    ).first()
    if existing is not None:
        return existing

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=PriceProposalData,
    )

    response, interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=_build_prompt(ingredient),
        config=config,
        context="ingredient_price_proposal",
    )

    if response is None:
        raise GeminiUnavailableError()

    try:
        validated = PriceProposalData.model_validate_json(response.text)
    except Exception:
        raise HttpError(422, "KI konnte keinen gültigen Preis vorschlagen. Bitte erneut versuchen.")
    proposed = Decimal(str(round(validated.proposed_price_per_kg, 2)))

    if is_missing_price(proposed):
        raise HttpError(422, "KI konnte keinen gültigen Preis vorschlagen. Bitte erneut versuchen.")
    if proposed > MAX_PROPOSED_PRICE_EUR:
        proposed = MAX_PROPOSED_PRICE_EUR

    return IngredientPriceProposal.objects.create(
        ingredient=ingredient,
        proposed_price_per_kg=proposed,
        confidence=round(validated.confidence, 3),
        rationale=validated.rationale,
        source=validated.source or "gemini",
        requested_by=user if user.is_authenticated else None,
        ai_interaction_id=str(interaction_id) if interaction_id else None,
    )


def accept_proposal(
    proposal: IngredientPriceProposal, user: AbstractBaseUser, *, replace: bool = False
) -> IngredientPriceProposal:
    """Apply a pending proposal's price to the ingredient and mark it accepted.

    - Locks the ingredient row to prevent races.
    - Verifies the proposal is still pending.
    - Existing positive prices cause a conflict unless ``replace=True``.
    """
    from supply.models import IngredientPriceProposal

    with transaction.atomic():
        locked = IngredientPriceProposal.objects.select_for_update().get(pk=proposal.pk)
        if locked.status != IngredientPriceProposal.Status.PENDING:
            raise HttpError(409, "Dieser Vorschlag wurde bereits bearbeitet.")

        ingredient = locked.ingredient
        current_price = price_or_none(ingredient.price_per_kg)
        if current_price is not None and not replace:
            raise HttpError(
                409,
                "Diese Zutat besitzt bereits einen Preis. Bestätige ausdrücklich, dass du ihn ersetzen möchtest.",
            )

        ingredient.price_per_kg = locked.proposed_price_per_kg
        ingredient.updated_by = user if user.is_authenticated else None
        ingredient.save(update_fields=["price_per_kg", "updated_by", "updated_at"])

        locked.status = IngredientPriceProposal.Status.ACCEPTED
        locked.reviewed_by = user if user.is_authenticated else None
        locked.reviewed_at = timezone.now()
        locked.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])

        invalidate_dependent_recipe_caches(ingredient)

    locked.refresh_from_db()
    return locked


def reject_proposal(proposal: IngredientPriceProposal, user: AbstractBaseUser) -> IngredientPriceProposal:
    """Mark a pending proposal as rejected without changing the ingredient."""
    from supply.models import IngredientPriceProposal

    with transaction.atomic():
        locked = IngredientPriceProposal.objects.select_for_update().get(pk=proposal.pk)
        if locked.status != IngredientPriceProposal.Status.PENDING:
            raise HttpError(409, "Dieser Vorschlag wurde bereits bearbeitet.")

        locked.status = IngredientPriceProposal.Status.REJECTED
        locked.reviewed_by = user if user.is_authenticated else None
        locked.reviewed_at = timezone.now()
        locked.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])

    locked.refresh_from_db()
    return locked


def invalidate_dependent_recipe_caches(ingredient: Ingredient) -> int:
    """Recalculate recipe caches for all active recipes using this ingredient.

    Returns the number of recipes whose cache was recalculated.
    """
    from recipe.models import RecipeItem
    from recipe.services.recipe_checks import recalculate_recipe_cache

    recipe_ids = list(
        RecipeItem.objects.filter(portion__ingredient=ingredient)
        .exclude(portion__deleted_at__isnull=False)
        .values_list("recipe_id", flat=True)
        .distinct()
    )

    count = 0
    from recipe.models import Recipe

    for recipe in Recipe.objects.filter(id__in=recipe_ids).exclude(deleted_at__isnull=False):
        try:
            recalculate_recipe_cache(recipe)
            count += 1
        except Exception:
            logger.exception("Failed to recalculate recipe cache for recipe %s", recipe.id)

    return count


def price_source_for(ingredient: Ingredient) -> str:
    """Derive provenance of the ingredient's current price.

    Returns ``ai_accepted`` when the current price matches the latest accepted
    AI proposal, ``manual`` for positive prices without such a proposal and
    ``missing`` when the price counts as missing.
    """
    price = price_or_none(getattr(ingredient, "price_per_kg", None))
    if price is None:
        return "missing"

    latest_accepted = ingredient.price_proposals.filter(status="accepted").order_by("-reviewed_at", "-id").first()
    if latest_accepted is not None and latest_accepted.proposed_price_per_kg == price:
        return "ai_accepted"
    return "manual"


def pending_proposal_for(ingredient: Ingredient) -> IngredientPriceProposal | None:
    """Return the pending proposal for an ingredient, if any."""
    from supply.models import IngredientPriceProposal

    return (
        IngredientPriceProposal.objects.filter(
            ingredient=ingredient,
            status=IngredientPriceProposal.Status.PENDING,
        )
        .order_by("-created_at")
        .first()
    )
