"""Fresh AI previews and atomic application of complete ingredient portions."""

from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone
from pydantic import BaseModel, Field

from core.services.gemini import GeminiUnavailableError, gemini_call
from supply.choices import PortionWeightSource, PortionWeightStatus
from supply.services.portion_integrity import validate_active_portion_weight

if TYPE_CHECKING:
    from supply.models import Ingredient

GEMINI_MODEL = "gemini-3.1-flash-lite"


class MagicSuggestion(BaseModel):
    operation: str = Field(description="replace or create")
    source_portion_id: int | None = None
    name: str
    quantity: float = 1.0
    measuring_unit_name: str
    rank: int = 1
    proposed_weight_g: float | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    rationale: str = ""


class MagicResponse(BaseModel):
    suggestions: list[MagicSuggestion] = Field(default_factory=list)


def _suggestion_prompt(context: dict, *, repair: bool = False) -> str:
    if repair:
        guidance = (
            "Dies ist eine Reparaturanfrage. Die vorherige Antwort hatte keine "
            "brauchbare positive Gewichtsschaetzung. Liefere mindestens eine "
            "praktische Portion mit positivem Gesamtgewicht in Gramm. Bei "
            "Stueckwaren muss mindestens eine Stueck-Portion enthalten sein. "
            "Nutze null nur fuer wirklich nicht bestimmbare Sonderfaelle."
        )
    else:
        guidance = (
            "Schaetze fuer jede gewoehnliche neue praktische Portion ein positives "
            "Gesamtgewicht in Gramm. Bei Stueckwaren muss mindestens eine "
            "Stueck-Portion vorgeschlagen werden. Fuer ein normales "
            "Hotdog-Broetchen liegt ein Stueck typischerweise bei etwa 50 bis 60 g; "
            "passe den Wert nur bei abweichender Produktgroesse an. Wenn eine "
            "typische Packung sinnvoll ist, gib Stueckzahl und Gesamtgewicht an. "
            "Nutze null nur fuer wirklich nicht bestimmbare Sonderfaelle."
        )
    return (
        "Schlage vollstaendige, typische Portionen fuer diese Zutat vor. "
        "Bereits gewichtete Portionen duerfen nicht ersetzt werden. "
        "Fuer ungewichtete bestehende Portionen nutze operation='replace' und "
        "source_portion_id. Zusaetzliche sinnvolle Portionen nutze mit "
        "operation='create'. Namen duerfen keine Ziffern enthalten. "
        "Gib ausschliesslich strukturiertes JSON zurueck. "
        + guidance
        + "\n"
        + json.dumps(context, ensure_ascii=False, default=str)
    )


def _has_positive_practical_suggestion(response: MagicResponse) -> bool:
    return any(
        suggestion.operation in {"replace", "create"}
        and suggestion.quantity > 0
        and suggestion.proposed_weight_g is not None
        and suggestion.proposed_weight_g > 0
        for suggestion in response.suggestions
    )


def _valid_suggestions(response: MagicResponse) -> list[MagicSuggestion]:
    from supply.models import MeasuringUnit

    unit_names = {name.casefold() for name in MeasuringUnit.objects.values_list("name", flat=True)}
    valid = []
    for suggestion in response.suggestions:
        if suggestion.operation not in {"replace", "create"}:
            continue
        if suggestion.quantity <= 0 or suggestion.measuring_unit_name.casefold() not in unit_names:
            continue
        valid.append(suggestion)

    piece_weights = [
        suggestion.proposed_weight_g
        for suggestion in valid
        if suggestion.proposed_weight_g and "stueck" in suggestion.name.casefold()
    ]
    if piece_weights:
        piece_weight = piece_weights[0]
        for suggestion in valid:
            if "packung" in suggestion.name.casefold() and suggestion.quantity > 1 and suggestion.proposed_weight_g:
                expected = piece_weight * suggestion.quantity
                if abs(suggestion.proposed_weight_g - expected) / expected > 0.3:
                    suggestion.proposed_weight_g = None
    return valid


def _context(ingredient: Ingredient) -> dict:
    portions = list(ingredient.portions.filter(deleted_at__isnull=True).select_related("measuring_unit"))
    packages = list(ingredient.packages.filter(deleted_at__isnull=True))
    from recipe.models import RecipeItem

    recipe_items = list(
        RecipeItem.objects.filter(portion__ingredient=ingredient)
        .select_related("recipe", "portion", "portion__measuring_unit")
        .order_by("-recipe__updated_at")[:50]
    )
    return {
        "ingredient": {
            "id": ingredient.id,
            "name": ingredient.name,
            "description": ingredient.description,
            "aliases": list(ingredient.aliases.values_list("name", flat=True)),
            "nutrition_per_100g": {
                "energy_kcal": ingredient.energy_kcal,
                "protein_g": ingredient.protein_g,
                "fat_g": ingredient.fat_g,
                "carbohydrate_g": ingredient.carbohydrate_g,
                "salt_g": ingredient.salt_g,
            },
            "physical_density": ingredient.physical_density,
            "physical_viscosity": ingredient.physical_viscosity,
            "retail_section": ingredient.retail_section.name if ingredient.retail_section else None,
            "groups": list(ingredient.groups.values_list("name", flat=True)),
        },
        "portions": [
            {
                "id": p.id,
                "name": p.name,
                "quantity": p.quantity,
                "unit": p.measuring_unit.name if p.measuring_unit else None,
                "weight_g": p.weight_g,
            }
            for p in portions
        ],
        "packages": [{"name": p.name, "weight_g": p.weight_g} for p in packages],
        "recipe_usage": [
            {"recipe": item.recipe.title, "quantity": item.quantity, "portion": item.portion.name}
            for item in recipe_items
        ],
    }


def _token(context: dict) -> str:
    return hashlib.sha256(json.dumps(context, sort_keys=True, default=str).encode()).hexdigest()


def preview_portions(ingredient: Ingredient, *, user) -> dict:
    context = _context(ingredient)
    from google.genai import types

    response, interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=_suggestion_prompt(context),
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=MagicResponse),
        context="portion_magic_wand",
    )
    if response is None:
        raise GeminiUnavailableError("KI nicht verfügbar")
    parsed = MagicResponse.model_validate_json(response.text)
    repaired = False
    if not _has_positive_practical_suggestion(parsed):
        repaired_response, repaired_interaction_id = gemini_call(
            user=user,
            model=GEMINI_MODEL,
            contents=_suggestion_prompt(context, repair=True),
            config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=MagicResponse),
            context="portion_magic_wand_repair",
        )
        if repaired_response is not None:
            parsed = MagicResponse.model_validate_json(repaired_response.text)
            repaired = True
            if repaired_interaction_id:
                interaction_id = repaired_interaction_id
    valid_suggestions = _valid_suggestions(parsed)
    weighted_ids = {p.id for p in ingredient.portions.filter(deleted_at__isnull=True) if p.weight_g and p.weight_g > 0}
    operations = []
    for portion in ingredient.portions.filter(deleted_at__isnull=True).select_related("measuring_unit"):
        if portion.weight_g and portion.weight_g > 0:
            operations.append(
                {
                    "operation_id": f"existing-{portion.id}",
                    "operation": "unchanged",
                    "source_portion_id": portion.id,
                    "name": portion.name,
                    "quantity": portion.quantity,
                    "measuring_unit_name": portion.measuring_unit.name,
                    "rank": portion.rank,
                    "proposed_weight_g": portion.weight_g,
                    "confidence": None,
                    "rationale": "Bereits gewichtete Portion bleibt unverändert.",
                    "selected": False,
                    "requires_manual_weight": False,
                    "delete_without_replacement": False,
                    "suggestion_provenance": "existing",
                }
            )
    for index, suggestion in enumerate(valid_suggestions):
        if suggestion.operation not in {"replace", "create"} or suggestion.quantity <= 0:
            continue
        if suggestion.source_portion_id in weighted_ids:
            continue
        operations.append(
            {
                "operation_id": f"operation-{index}",
                **suggestion.model_dump(),
                "selected": suggestion.operation == "replace" or suggestion.proposed_weight_g is None,
                "requires_manual_weight": suggestion.proposed_weight_g is None,
                "delete_without_replacement": False,
                "suggestion_provenance": "ai_repaired" if repaired else "ai_estimate",
            }
        )
    return {
        "preview_token": _token(context),
        "ai_interaction_id": str(interaction_id) if interaction_id else None,
        "operations": operations,
    }


@transaction.atomic
def apply_portions(ingredient: Ingredient, *, payload: dict, user) -> dict:
    if payload["preview_token"] != _token(_context(ingredient)):
        raise ValueError("Die Vorschau ist veraltet. Bitte starte den Portions-Zauberstab erneut.")
    active = {
        p.id: p
        for p in ingredient.portions.select_for_update()
        .filter(deleted_at__isnull=True)
        .select_related("measuring_unit")
    }
    from supply.models import MeasuringUnit, Portion

    replaced: list[int] = []
    created: list[int] = []
    deleted: list[int] = []
    names = {p.name.casefold() for p in active.values()}
    for operation in payload["operations"]:
        if operation.get("operation") == "unchanged":
            continue
        source = active.get(operation.get("source_portion_id"))
        if not operation.get("selected") and source is None:
            continue
        weight = operation.get("proposed_weight_g")
        if operation.get("delete_without_replacement"):
            weight = None
        elif weight is None or weight <= 0:
            raise ValueError(f"Portion '{operation.get('name', '')}' benötigt ein positives Gewicht.")
        if not operation.get("selected") and source is not None:
            if operation.get("delete_without_replacement"):
                source.deleted_at = timezone.now()
                source.save(update_fields=["deleted_at"])
                deleted.append(source.id)
                continue
            source.weight_g = weight
            source.weight_status = PortionWeightStatus.CONFIRMED
            source.weight_source = PortionWeightSource.MANUAL
            validate_active_portion_weight(source)
            source.save(update_fields=["weight_g", "weight_status", "weight_source", "updated_at"])
            continue
        if source is not None:
            if source.weight_g and source.weight_g > 0:
                raise ValueError("Eine bereits gewichtete Portion darf nicht ersetzt werden.")
            source.deleted_at = timezone.now()
            source.save(update_fields=["deleted_at"])
            deleted.append(source.id)
            names.discard(source.name.casefold())
            replaced.append(source.id)
            if operation.get("delete_without_replacement"):
                continue
        name = operation["name"].strip()
        if not name or name.casefold() in names:
            raise ValueError(f"Portionsname '{name}' existiert bereits.")
        unit = MeasuringUnit.objects.filter(name__iexact=operation["measuring_unit_name"].strip()).first()
        if unit is None:
            raise ValueError(f"Maßeinheit '{operation['measuring_unit_name']}' ist unbekannt.")
        portion = Portion(
            ingredient=ingredient,
            name=name,
            quantity=operation.get("quantity") or 1,
            measuring_unit=unit,
            weight_g=weight,
            rank=operation.get("rank") or 1,
            created_by=user,
            weight_status=PortionWeightStatus.CONFIRMED,
            weight_source=PortionWeightSource.AI,
            weight_confirmed_at=timezone.now(),
        )
        validate_active_portion_weight(portion)
        portion.save()
        names.add(name.casefold())
        created.append(portion.id)
    portions = list(
        ingredient.portions.filter(deleted_at__isnull=True).select_related("measuring_unit").order_by("rank", "id")
    )
    return {
        "portions": portions,
        "replaced_portion_ids": replaced,
        "created_portion_ids": created,
        "deleted_portion_ids": deleted,
    }
