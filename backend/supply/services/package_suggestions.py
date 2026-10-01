"""AI suggestions for standard packages and liquid data of ingredients.

Selects used ingredients (in a non-archived recipe or a meal plan, not
deleted) without a standard package (rank=1 ``Package``) and asks Gemini in
batches of ``PACKAGE_BATCH_SIZE`` for the usual German retail package plus
viscosity/density. Suggestions are only stored; staff accepts them in the
cockpit, which creates the package and sets viscosity/density unless those
were maintained manually.
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Literal

from django.contrib.auth.models import AbstractBaseUser, User
from django.db import transaction
from django.db.models import Exists, OuterRef, Q, QuerySet
from django.db.models.functions import Lower
from django.utils import timezone
from pydantic import BaseModel, Field

from core.services.gemini import DEFAULT_TEXT_MODEL, GeminiUnavailableError, gemini_call
from supply.choices import LIQUID_VISCOSITIES, PhysicalPropertiesSourceChoices

if TYPE_CHECKING:
    from supply.models import Ingredient, IngredientPackageSuggestion

logger = logging.getLogger(__name__)

PROMPT_VERSION = "2026-09-28.1"
PACKAGE_BATCH_SIZE = 15
# Gemini Flash-Lite, ~2k input / ~1.5k output tokens per batch (EUR).
ESTIMATED_EUR_PER_PACKAGE_BATCH = 0.003
MAX_PLAUSIBLE_PACKAGE_G = 50_000.0
MIN_DENSITY = 0.3
MAX_DENSITY = 2.5


class PackageProposal(BaseModel):
    """AI proposal for one ingredient."""

    id: int = Field(description="Die id aus der Eingabe, unverändert")
    package_name: str = Field(
        description="Übliche deutsche Handelspackung mit Größe, z. B. '500-g-Packung', '400-g-Dose', '1-l-Packung'"
    )
    weight_g: float | None = Field(None, description="Füllgewicht einer Packung in Gramm (bei festen Zutaten)")
    volume_ml: float | None = Field(None, description="Füllvolumen einer Packung in ml (bei Flüssigkeiten)")
    physical_viscosity: Literal["solid", "liquid", "beverage"] = Field(
        description="solid = fest/Pulver; liquid = flüssige Kochzutat (Öl, Essig, Sahne); beverage = Getränk"
    )
    physical_density: float | None = Field(None, description="Dichte in g/ml, nur bei liquid/beverage")
    confidence: float = Field(ge=0, le=1, description="Sicherheit 0–1, dass diese Packung im Handel üblich ist")
    reason: str = Field("", description="Kurze Begründung, höchstens ein Satz")


class PackageBatchSchema(BaseModel):
    items: list[PackageProposal]


@dataclass
class SuggestResult:
    suggested: int = 0
    skipped: int = 0
    calls: int = 0
    errors: list[str] = field(default_factory=list)


@dataclass
class DecisionResult:
    changed: int = 0
    skipped: int = 0
    messages: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Selection and cost estimate
# ---------------------------------------------------------------------------


def candidate_queryset() -> QuerySet[Ingredient]:
    """Used ingredients without a standard package and without an open or rejected suggestion.

    Used = in a non-archived, non-deleted recipe or directly in a meal plan.
    Ordered by usage so the most relevant ingredients are suggested first.
    """
    from content.choices import ContentStatus
    from supply.models import Ingredient, IngredientPackageSuggestion, Package

    in_recipe = Q(
        portions__recipe_items__recipe__deleted_at__isnull=True,
        portions__recipe_items__recipe__status__in=[s for s in ContentStatus.values if s != ContentStatus.ARCHIVED],
    )
    used_ids = Ingredient.objects.filter(in_recipe | Q(meal_items__isnull=False)).values("id")
    has_package = Package.objects.filter(ingredient=OuterRef("pk"), rank=1, deleted_at__isnull=True)
    has_suggestion = IngredientPackageSuggestion.objects.filter(
        ingredient=OuterRef("pk"),
        status__in=[IngredientPackageSuggestion.Status.PENDING, IngredientPackageSuggestion.Status.REJECTED],
    )
    return (
        Ingredient.objects.filter(id__in=used_ids, deleted_at__isnull=True)
        .exclude(Exists(has_package))
        .exclude(Exists(has_suggestion))
        .order_by("-usage_count", "name")
    )


def estimate(count: int) -> tuple[int, float]:
    """Number of AI calls and estimated cost (EUR) for ``count`` ingredients."""
    calls = math.ceil(count / PACKAGE_BATCH_SIZE) if count > 0 else 0
    return calls, round(calls * ESTIMATED_EUR_PER_PACKAGE_BATCH, 3)


# ---------------------------------------------------------------------------
# AI call
# ---------------------------------------------------------------------------


def build_prompt(ingredients: list[Ingredient]) -> str:
    lines = [
        "Du bist Einkaufsexperte für deutsche Supermärkte (REWE, Edeka, Aldi, Lidl).",
        "Nenne für jede Zutat die übliche Standardpackung im Handel für Privatkunden",
        "(keine Gastro-Großgebinde). Für feste Zutaten Gewicht in g, für Flüssigkeiten Volumen in ml",
        "und die Dichte in g/ml. Lose Ware (z. B. Obst, Gemüse) als typische Abpackung (z. B. '1-kg-Netz').",
        "Gib für jede Eingabe genau ein Element mit derselben id zurück.",
        "",
        "Zutaten:",
    ]
    for ingredient in ingredients:
        section = ingredient.retail_section.name if ingredient.retail_section else "unbekannt"
        lines.append(
            f"- id={ingredient.id}; Name: {ingredient.name}; Warengruppe: {section}; "
            f"Aggregatzustand aktuell: {ingredient.physical_viscosity}; Dichte aktuell: {ingredient.physical_density}"
        )
    return "\n".join(lines)


def request_package_batch(
    ingredients: list[Ingredient], *, user: AbstractBaseUser | None = None
) -> dict[int, PackageProposal]:
    """Run one Gemini call for up to ``PACKAGE_BATCH_SIZE`` ingredients."""
    from google.genai import types

    if not ingredients:
        return {}
    if len(ingredients) > PACKAGE_BATCH_SIZE:
        raise ValueError(f"Maximal {PACKAGE_BATCH_SIZE} Zutaten pro KI-Aufruf")

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=PackageBatchSchema,
        temperature=0.2,
    )
    response, _interaction_id = gemini_call(
        user=user,
        model=DEFAULT_TEXT_MODEL,
        contents=build_prompt(ingredients),
        config=config,
        context="ingredient_package_suggestions",
    )
    if response is None:
        raise GeminiUnavailableError("KI-Dienst nicht verfügbar")
    parsed = PackageBatchSchema.model_validate_json(response.text)
    batch_ids = {ingredient.id for ingredient in ingredients}
    return {item.id: item for item in parsed.items if item.id in batch_ids}


def _normalized(proposal: PackageProposal) -> dict[str, Any] | None:
    """Plausible suggestion fields, or ``None`` when the proposal is unusable."""
    name = proposal.package_name.strip()[:255]
    density = proposal.physical_density
    if density is not None and not (MIN_DENSITY <= density <= MAX_DENSITY):
        density = None
    is_liquid = proposal.physical_viscosity in LIQUID_VISCOSITIES
    weight_g = proposal.weight_g
    if (not weight_g or weight_g <= 0) and proposal.volume_ml and proposal.volume_ml > 0:
        weight_g = proposal.volume_ml * (density or 1.0)
    if not name or not weight_g or weight_g <= 0 or weight_g > MAX_PLAUSIBLE_PACKAGE_G:
        return None
    return {
        "package_name": name,
        "weight_g": round(weight_g, 1),
        "volume_ml": proposal.volume_ml if is_liquid and proposal.volume_ml and proposal.volume_ml > 0 else None,
        "physical_viscosity": proposal.physical_viscosity,
        "physical_density": density if is_liquid else None,
        "confidence": round(proposal.confidence, 2),
        "reason": proposal.reason.strip()[:500],
    }


def suggest_packages(*, ingredient_ids: list[int], user: AbstractBaseUser | None = None) -> SuggestResult:
    """Ask the AI for the given candidate ids (batched) and store pending suggestions.

    Ids that are no longer candidates (package or suggestion added meanwhile)
    are skipped, so repeated runs are idempotent.
    """
    from supply.models import IngredientPackageSuggestion

    result = SuggestResult()
    ingredients = list(candidate_queryset().filter(id__in=ingredient_ids).select_related("retail_section"))
    result.skipped = len(set(ingredient_ids)) - len(ingredients)
    for start in range(0, len(ingredients), PACKAGE_BATCH_SIZE):
        batch = ingredients[start : start + PACKAGE_BATCH_SIZE]
        result.calls += 1
        try:
            proposals = request_package_batch(batch, user=user)
        except Exception as exc:
            logger.warning("Package suggestion batch failed: %s", exc)
            result.errors.append(str(getattr(exc, "message", exc)))
            result.skipped += len(batch)
            continue
        for ingredient in batch:
            proposal = proposals.get(ingredient.id)
            data = _normalized(proposal) if proposal else None
            if data is None:
                result.skipped += 1
                continue
            IngredientPackageSuggestion.objects.create(
                ingredient=ingredient, model=DEFAULT_TEXT_MODEL, prompt_version=PROMPT_VERSION, **data
            )
            result.suggested += 1
    return result


# ---------------------------------------------------------------------------
# Decisions
# ---------------------------------------------------------------------------


def accept_suggestion(suggestion: IngredientPackageSuggestion, *, user: User | None) -> str | None:
    """Create the standard package and set viscosity/density. Returns an error message or ``None``."""
    from supply.models import IngredientPackageSuggestion, Package

    if suggestion.status != IngredientPackageSuggestion.Status.PENDING:
        return "Vorschlag ist bereits entschieden"
    ingredient = suggestion.ingredient
    with transaction.atomic():
        if Package.objects.filter(ingredient=ingredient, rank=1, deleted_at__isnull=True).exists():
            return f"{ingredient.name}: hat bereits eine Standardpackung"
        package = (
            Package.objects.filter(ingredient=ingredient, deleted_at__isnull=True)
            .annotate(lower_name=Lower("name"))
            .filter(lower_name=suggestion.package_name.lower())
            .first()
        )
        if package is None:
            Package.objects.create(
                ingredient=ingredient,
                name=suggestion.package_name,
                weight_g=suggestion.weight_g,
                rank=1,
                created_by=user,
                updated_by=user,
            )
        else:
            package.rank = 1
            package.weight_g = suggestion.weight_g
            package.updated_by = user
            package.save(update_fields=["rank", "weight_g", "updated_by", "updated_at"])

        if ingredient.viscosity_source != PhysicalPropertiesSourceChoices.MANUAL:
            update_fields = ["physical_viscosity", "viscosity_source"]
            ingredient.physical_viscosity = suggestion.physical_viscosity
            if suggestion.physical_density:
                ingredient.physical_density = suggestion.physical_density
                update_fields.append("physical_density")
            ingredient.viscosity_source = PhysicalPropertiesSourceChoices.AI
            ingredient.save(update_fields=update_fields)

        suggestion.status = IngredientPackageSuggestion.Status.ACCEPTED
        suggestion.decided_by = user
        suggestion.decided_at = timezone.now()
        suggestion.save(update_fields=["status", "decided_by", "decided_at", "updated_at"])
    return None


def accept_suggestions(suggestions: QuerySet[IngredientPackageSuggestion], *, user: User | None) -> DecisionResult:
    result = DecisionResult()
    for suggestion in suggestions.select_related("ingredient"):
        error = accept_suggestion(suggestion, user=user)
        if error:
            result.skipped += 1
            result.messages.append(error)
        else:
            result.changed += 1
    return result


def reject_suggestions(suggestions: QuerySet[IngredientPackageSuggestion], *, user: User | None) -> DecisionResult:
    from supply.models import IngredientPackageSuggestion

    pending = suggestions.filter(status=IngredientPackageSuggestion.Status.PENDING)
    changed = pending.update(
        status=IngredientPackageSuggestion.Status.REJECTED,
        decided_by=user,
        decided_at=timezone.now(),
        updated_at=timezone.now(),
    )
    return DecisionResult(changed=changed, skipped=suggestions.count() - changed)
