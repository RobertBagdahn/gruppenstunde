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
from supply.services.portion_resolution import is_piece_like_name, resolve_trusted_weight
from supply.services.unit_resolution import resolve_canonical_unit

if TYPE_CHECKING:
    from supply.models import Ingredient, MeasuringUnit

GEMINI_MODEL = "gemini-3.1-flash-lite"
MIN_NEW_SUGGESTIONS = 4


class MagicSuggestion(BaseModel):
    operation: str = Field(description="replace, create or package")
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


PIECE_UNIT_ALIASES = {"stk", "stk.", "stück", "stueck", "zehe", "zehen"}
PACKAGE_UNIT_ALIASES = {"pck", "pck.", "pkg", "pkg.", "packung", "packungen"}


def _resolve_suggestion_unit(name: str) -> MeasuringUnit | None:
    """Resolve AI units while preserving named-piece calculation semantics."""
    unit = resolve_canonical_unit(name)
    if unit is not None:
        return unit
    if name.strip().casefold() in PIECE_UNIT_ALIASES | PACKAGE_UNIT_ALIASES:
        from supply.models import MeasuringUnit

        return MeasuringUnit.objects.filter(name__iexact="Gramm").first()
    return None


def _suggestion_prompt(context: dict, *, repair: bool = False) -> str:
    if repair:
        guidance = (
            "Dies ist eine Reparaturanfrage. Die vorherige Antwort hatte keine "
            "brauchbare positive Gewichtsschaetzung oder zu wenige neue Vorschlaege. "
            f"Liefere mindestens {MIN_NEW_SUGGESTIONS} neue, unterschiedliche "
            "praktische Portionen sowie passende Packungen mit positivem Gesamtgewicht in Gramm. Bei "
            "Stueckwaren muss mindestens eine Stueck-Portion enthalten sein. "
            "Verwende fuer neue Vorschlaege operation='create' und source_portion_id=null; "
            "verwende fuer Packungen operation='package'; "
            "verwende operation='replace' nur fuer eine explizit ungewichtete bestehende Portion. "
            "Nutze null nur fuer wirklich nicht bestimmbare Sonderfaelle."
        )
    else:
        guidance = (
            "Liefere 3 bis 6 neue, unterschiedliche praktische Portionsvorschlaege "
            "und 1 bis 3 Packungsvorschlaege, jeweils mit positivem Gesamtgewicht in Gramm. "
            "Bei Stueckwaren muss mindestens eine Stueck-Portion vorgeschlagen werden. Fuer ein normales "
            "Neue Vorschlaege muessen operation='create' und source_portion_id=null haben; "
            "bereits gewichtete Portionen duerfen nicht als neue Vorschlaege wiederholt werden. "
            "Bei zaehlbaren Lebensmitteln verwende fuer die Einzelportion den Namen 'Stück' "
            "statt 'Portion'. 'Portion' ist nur fuer nicht zaehlbare Serviermengen erlaubt. "
            "Packungen muessen operation='package' verwenden, quantity ist die Stueckzahl in der Packung "
            "und proposed_weight_g immer das Gesamtgewicht der ganzen Packung. "
            "Bereits vorhandene Packungen duerfen nicht dupliziert werden. "
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
        "Packungsvorschlaege werden spaeter als Package gespeichert und niemals als Portion. "
        "Gib ausschliesslich strukturiertes JSON zurueck. "
        + guidance
        + "\n"
        + json.dumps(context, ensure_ascii=False, default=str)
    )


def _existing_weight_note(ingredient_name: str, portion) -> str:
    """Explain obviously implausible existing piece weights without mutating them."""
    weight = portion.weight_g
    if weight is None or not is_piece_like_name(portion.name):
        return f"Aktuelles Gewicht: {weight:g} g." if weight is not None else "Gewicht unbekannt."
    ingredient = ingredient_name.casefold()
    if "hotdog" in ingredient or "brötchen" in ingredient or "broetchen" in ingredient:
        if 40 <= weight <= 80:
            return f"Aktuelles Gewicht: {weight:g} g. Das ist für ein Hotdog-Brötchen plausibel (etwa 50–60 g)."
        return f"Aktuelles Gewicht: {weight:g} g. Das wirkt für ein Hotdog-Brötchen unplausibel; typisch sind etwa 50–60 g."
    if weight <= 5:
        return f"Aktuelles Gewicht: {weight:g} g. Das wirkt für eine Stückportion sehr wahrscheinlich unplausibel."
    return f"Aktuelles Gewicht: {weight:g} g. Bitte auf Plausibilität prüfen."


def _has_positive_practical_suggestion(response: MagicResponse) -> bool:
    return any(
        suggestion.operation in {"replace", "create"}
        and suggestion.quantity > 0
        and suggestion.proposed_weight_g is not None
        and suggestion.proposed_weight_g > 0
        for suggestion in response.suggestions
    )


def _valid_suggestions(response: MagicResponse) -> list[MagicSuggestion]:
    valid = []
    seen: set[tuple[str, str, int | None]] = set()
    for suggestion in response.suggestions:
        if suggestion.operation not in {"replace", "create", "package"}:
            continue
        unit = _resolve_suggestion_unit(suggestion.measuring_unit_name)
        if suggestion.quantity <= 0 or unit is None:
            continue
        if suggestion.name.strip().casefold() == "portion":
            suggestion.name = "Stück"
        if suggestion.name.strip().casefold() in PACKAGE_UNIT_ALIASES or "packung" in suggestion.name.casefold():
            suggestion.operation = "package"
        suggestion.measuring_unit_name = unit.name
        key = (suggestion.operation, suggestion.name.strip().casefold(), suggestion.source_portion_id)
        if key in seen:
            continue
        seen.add(key)
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


def _actionable_suggestions(
    suggestions: list[MagicSuggestion],
    weighted_ids: set[int],
) -> list[MagicSuggestion]:
    return [suggestion for suggestion in suggestions if suggestion.source_portion_id not in weighted_ids]


def _has_enough_actionable_suggestions(
    suggestions: list[MagicSuggestion],
    weighted_ids: set[int],
) -> bool:
    actionable = _actionable_suggestions(suggestions, weighted_ids)
    return bool(actionable) and all(
        suggestion.proposed_weight_g is not None and suggestion.proposed_weight_g > 0 for suggestion in actionable
    )


def _context(ingredient: Ingredient) -> dict:
    portions = list(ingredient.portions.active().select_related("measuring_unit"))
    packages = list(ingredient.packages.filter(deleted_at__isnull=True))
    from recipe.models import RecipeItem
    from supply.models import MeasuringUnit

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
        "available_measuring_units": [
            {"name": unit.name, "unit": unit.unit, "quantity": unit.quantity}
            for unit in MeasuringUnit.objects.order_by("name")
        ],
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
    weighted_ids = {p.id for p in ingredient.portions.active() if resolve_trusted_weight(p) is not None}
    valid_suggestions = _valid_suggestions(parsed)
    repaired = False
    if not _has_enough_actionable_suggestions(valid_suggestions, weighted_ids):
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
    operations = []
    replacement_source_ids = {
        suggestion.source_portion_id
        for suggestion in valid_suggestions
        if suggestion.operation == "replace" and suggestion.source_portion_id is not None
    }
    for portion in ingredient.portions.active().select_related("measuring_unit"):
        if resolve_trusted_weight(portion) is not None:
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
                    "rationale": _existing_weight_note(ingredient.name, portion),
                    "selected": False,
                    "requires_manual_weight": False,
                    "delete_without_replacement": False,
                    "suggestion_provenance": "existing",
                }
            )
        elif portion.id not in replacement_source_ids:
            operations.append(
                {
                    "operation_id": f"delete-unweighted-{portion.id}",
                    "operation": "replace",
                    "source_portion_id": portion.id,
                    "name": portion.name,
                    "quantity": portion.quantity,
                    "measuring_unit_name": portion.measuring_unit.name if portion.measuring_unit else "Gramm",
                    "rank": portion.rank,
                    "proposed_weight_g": None,
                    "confidence": None,
                    "rationale": "Aktive Portion ohne positives Grammgewicht wird entfernt.",
                    "selected": False,
                    "requires_manual_weight": False,
                    "delete_without_replacement": True,
                    "suggestion_provenance": "existing",
                }
            )
    for index, suggestion in enumerate(valid_suggestions):
        if suggestion.operation not in {"replace", "create", "package"} or suggestion.quantity <= 0:
            continue
        if suggestion.operation != "package" and suggestion.source_portion_id in weighted_ids:
            continue
        operations.append(
            {
                "operation_id": f"operation-{index}",
                **suggestion.model_dump(),
                "selected": suggestion.operation == "replace" or suggestion.proposed_weight_g is None,
                "requires_manual_weight": suggestion.proposed_weight_g is None,
                "delete_without_replacement": False,
                "suggestion_provenance": "ai_repaired" if repaired else "ai_estimate",
                "validation_message": (
                    "Bitte ein positives Gewicht eintragen." if suggestion.proposed_weight_g is None else None
                ),
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
    active = {p.id: p for p in ingredient.portions.select_for_update().active().select_related("measuring_unit")}
    from supply.models import Package, Portion

    replaced: list[int] = []
    created: list[int] = []
    deleted: list[int] = []
    created_packages: list[int] = []
    names = {p.name.casefold() for p in active.values()}
    for operation in payload["operations"]:
        if operation.get("operation") == "unchanged":
            continue
        if operation.get("operation") == "package":
            if not operation.get("selected"):
                continue
            weight = operation.get("proposed_weight_g")
            if weight is None or weight <= 0:
                raise ValueError(f"Packung '{operation.get('name', '')}' benötigt ein positives Gewicht.")
            if ingredient.packages.filter(name__iexact=operation["name"].strip(), deleted_at__isnull=True).exists():
                raise ValueError(f"Packung '{operation['name']}' existiert bereits.")
            package = Package(
                ingredient=ingredient,
                name=operation["name"].strip(),
                weight_g=weight,
                rank=operation.get("rank") or 1,
            )
            package.save()
            created_packages.append(package.id)
            continue
        source = active.get(operation.get("source_portion_id"))
        if operation.get("source_portion_id") is not None and source is None:
            raise ValueError("Die Quellportion existiert nicht mehr oder gehört nicht zu dieser Zutat.")
        if source is None and not operation.get("selected"):
            continue
        weight = operation.get("proposed_weight_g")
        if operation.get("delete_without_replacement"):
            if source is None:
                raise ValueError("Zum Löschen wurde keine gültige Quellportion angegeben.")
            if resolve_trusted_weight(source) is not None:
                raise ValueError("Eine gewichtete Portion darf nicht ohne Ersatz gelöscht werden.")
            source.deleted_at = timezone.now()
            source.save(update_fields=["deleted_at"])
            deleted.append(source.id)
            names.discard(source.name.casefold())
            continue
        if source is not None and not operation.get("selected") and (weight is None or weight <= 0):
            raise ValueError(f"Portion '{operation.get('name', '')}' benötigt ein positives Gewicht.")
        if not operation.get("selected") and source is not None:
            source.weight_g = weight
            source.weight_status = PortionWeightStatus.CONFIRMED
            source.weight_source = PortionWeightSource.MANUAL
            validate_active_portion_weight(source)
            source.save(update_fields=["weight_g", "weight_status", "weight_source", "updated_at"])
            continue
        if weight is None or weight <= 0:
            raise ValueError(f"Portion '{operation.get('name', '')}' benötigt ein positives Gewicht.")
        if source is not None:
            if resolve_trusted_weight(source) is not None:
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
        unit = _resolve_suggestion_unit(operation["measuring_unit_name"])
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
    portions = list(ingredient.portions.active().select_related("measuring_unit").order_by("rank", "id"))
    return {
        "portions": portions,
        "replaced_portion_ids": replaced,
        "created_portion_ids": created,
        "deleted_portion_ids": deleted,
        "created_package_ids": created_packages,
    }
