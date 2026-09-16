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
    prompt = (
        "Schlage vollständige, typische Portionen für diese Zutat vor. "
        "Bereits gewichtete Portionen dürfen nicht ersetzt werden. "
        "Für ungewichtete bestehende Portionen nutze operation='replace' und source_portion_id. "
        "Zusätzliche sinnvolle Portionen nutze mit operation='create'. "
        "Jede sinnvolle Portion braucht ein positives Gewicht; wenn es nicht bestimmbar ist, gib null zurück. "
        "Namen dürfen keine Ziffern enthalten. Gib ausschließlich strukturiertes JSON zurück.\n\n"
        + json.dumps(context, ensure_ascii=False, default=str)
    )
    from google.genai import types

    response, interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=MagicResponse),
        context="portion_magic_wand",
    )
    if response is None:
        raise GeminiUnavailableError("KI nicht verfügbar")
    parsed = MagicResponse.model_validate_json(response.text)
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
                }
            )
    for index, suggestion in enumerate(parsed.suggestions):
        if suggestion.operation not in {"replace", "create"}:
            continue
        if suggestion.source_portion_id in weighted_ids:
            continue
        operations.append(
            {
                "operation_id": f"operation-{index}",
                **suggestion.model_dump(),
                "selected": suggestion.operation == "replace",
                "requires_manual_weight": suggestion.proposed_weight_g is None,
                "delete_without_replacement": False,
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
