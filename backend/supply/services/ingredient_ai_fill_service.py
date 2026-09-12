"""Service to fill missing ingredient master data (Stammdaten) with AI without overwriting existing data.

Only empty/missing fields (None, blank, or zero) are requested from Gemini via dynamic schemas.
Existing valid data is strictly preserved.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from django.contrib.auth.models import AbstractBaseUser
from pydantic import Field, create_model

from core.services.gemini import GeminiUnavailableError, gemini_call
from supply.services.quality_score import calculate_ingredient_quality_score

if TYPE_CHECKING:
    from supply.models import Ingredient

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"

# Field specifications for ingredient master data (Stammdaten)
# Tuple: (type_annotation, description, category_label, field_label)
STAMMDATEN_SPECS: dict[str, tuple[Any, str, str, str]] = {
    # Nutrition per 100g
    "energy_kcal": (float | None, "Energie in kcal pro 100g", "Nährwerte", "Energie (kcal)"),
    "protein_g": (float | None, "Eiweiß in g pro 100g", "Nährwerte", "Protein (g)"),
    "fat_g": (float | None, "Fett in g pro 100g (Gesamtfett)", "Nährwerte", "Fett (g)"),
    "fat_sat_g": (
        float | None,
        "Gesättigte Fettsäuren in g pro 100g (muss <= Fett sein)",
        "Nährwerte",
        "Gesättigte Fettsäuren (g)",
    ),
    "carbohydrate_g": (
        float | None,
        "Kohlenhydrate in g pro 100g (muss >= Zucker sein)",
        "Nährwerte",
        "Kohlenhydrate (g)",
    ),
    "sugar_g": (float | None, "Zucker in g pro 100g (muss <= Kohlenhydrate sein)", "Nährwerte", "Zucker (g)"),
    "fibre_g": (float | None, "Ballaststoffe in g pro 100g", "Nährwerte", "Ballaststoffe (g)"),
    "salt_g": (float | None, "Salz in g pro 100g", "Nährwerte", "Salz (g)"),
    "sodium_mg": (float | None, "Natrium in mg pro 100g", "Nährwerte", "Natrium (mg)"),
    "fructose_g": (float | None, "Fructose in g pro 100g", "Nährwerte", "Fructose (g)"),
    "lactose_g": (float | None, "Laktose in g pro 100g", "Nährwerte", "Laktose (g)"),
    # Description
    "description": (
        str | None,
        "Ausführliche, informative Beschreibung (Geschmack, Textur, Verwendung, Herkunft)",
        "Basis",
        "Beschreibung",
    ),
    # Price
    "price_per_kg": (
        float | None,
        "Geschätzter typischer Supermarktpreis in EUR pro kg in Deutschland",
        "Preis",
        "Preis pro kg (€)",
    ),
    # Storage & Camp
    "storage_type": (
        str | None,
        "Lagerungsart: 'dry' (Trockenlagerung), 'refrigerated' (Kühlschrank), 'frozen' (TK), oder 'ambient' (Raumtemperatur)",
        "Lagerung",
        "Lagerungsart",
    ),
    "cooking_factor": (
        float | None,
        "Multiplikator Roh→Gekocht (z.B. 2.5 für Nudeln, 1.0 wenn kein Aufquellen)",
        "Lagerung",
        "Kochfaktor",
    ),
    "camp_suitable": (
        bool | None,
        "Fürs Zeltlager geeignet (haltbar ohne ständige Kühlung)",
        "Lagerung",
        "Camp-geeignet",
    ),
    "preparation_time_min": (
        int | None,
        "Zubereitungsdauer in Minuten (Koch-/Backzeit, 0 wenn direkt essbar)",
        "Lagerung",
        "Zubereitungsdauer (Min.)",
    ),
    "season_start": (
        int | None,
        "Saisonbeginn (Monat 1-12) oder null für ganzjährig",
        "Lagerung",
        "Saison von",
    ),
    "season_end": (
        int | None,
        "Saisonende (Monat 1-12) oder null für ganzjährig",
        "Lagerung",
        "Saison bis",
    ),
    # Physics
    "physical_density": (
        float | None,
        "Dichte in g/ml (z.B. 1.0 für Wasser/Milch, 0.92 für Speiseöl, 0.6 für Mehl)",
        "Physik",
        "Dichte (g/ml)",
    ),
    "physical_viscosity": (
        str | None,
        "Aggregatzustand: 'solid', 'beverage' oder 'powder'",
        "Physik",
        "Viskosität",
    ),
    "durability_in_days": (
        int | None,
        "Typische ungeöffnete Haltbarkeit in Tagen",
        "Physik",
        "Haltbarkeit (Tage)",
    ),
    "max_storage_temperature": (
        int | None,
        "Maximale empfohlene Lagertemperatur in °C",
        "Physik",
        "Max. Lagertemperatur (°C)",
    ),
    # Scores
    "nutri_score": (int | None, "Nutri-Score Punkte (-15 bis 40)", "Bewertungen", "Nutri-Score"),
    "nova_score": (int | None, "NOVA-Score Verarbeitungsgrad (1-4)", "Bewertungen", "NOVA-Score"),
    "child_score": (int | None, "Kinderfreundlichkeit (1-10)", "Bewertungen", "Kinder-Score"),
    "scout_score": (int | None, "Pfadfindereignung (1-10)", "Bewertungen", "Pfadfinder-Score"),
    "environmental_score": (int | None, "Umwelt-Score (1-10)", "Bewertungen", "Umwelt-Score"),
    "fruit_factor": (float | None, "Obst-/Gemüse-/Nuss-Anteil (0.0-1.0)", "Bewertungen", "Fruchtfaktor"),
}


def get_missing_field_names(ingredient: Ingredient) -> list[str]:
    """Identify which master data fields are empty (None/blank/zero) on an ingredient.

    Numeric fields with a value of ``0`` are treated as missing so that the AI
    re-estimates them, since ``0`` is generally a placeholder rather than a
    meaningful measurement.
    """
    missing: list[str] = []

    for field_name in STAMMDATEN_SPECS:
        val = getattr(ingredient, field_name, None)

        if val is None:
            missing.append(field_name)
            continue

        if isinstance(val, str):
            if not val.strip():
                missing.append(field_name)
            continue

        if isinstance(val, int | float) and not isinstance(val, bool) and val == 0:
            missing.append(field_name)
            continue

    return missing


def fill_missing_ingredient_fields(
    ingredient: Ingredient,
    user: AbstractBaseUser | None = None,
) -> dict[str, Any]:
    """Fill only the missing master data fields of an ingredient using Gemini.

    - Existing fields are NEVER overwritten.
    - Gemini is instructed to return ONLY the missing fields.
    - A dynamic Pydantic schema is generated containing only the needed fields.
    """
    from google.genai import types

    missing_fields = get_missing_field_names(ingredient)

    if not missing_fields:
        return {
            "id": ingredient.id,
            "name": ingredient.name,
            "slug": ingredient.slug,
            "filled_fields": [],
            "quality_score": ingredient.quality_score,
            "message": "Alle Stammdaten sind bereits vollständig erfasst.",
        }

    # Format existing fields as context for Gemini
    known_lines: list[str] = []
    for f in STAMMDATEN_SPECS:
        if f not in missing_fields:
            val = getattr(ingredient, f, None)
            if val is not None and val != "":
                label = STAMMDATEN_SPECS[f][3]
                known_lines.append(f"- {label} ({f}): {val}")

    known_context = "\n".join(known_lines) if known_lines else "(keine bestehenden Daten vorhanden)"

    # Build dynamic Pydantic schema with ONLY missing fields
    schema_fields: dict[str, Any] = {}
    missing_desc_lines: list[str] = []
    for f in missing_fields:
        type_ann, desc, _cat, label = STAMMDATEN_SPECS[f]
        schema_fields[f] = (type_ann, Field(None, description=desc))
        missing_desc_lines.append(f"- {f} ({label}): {desc}")

    DynamicMissingSchema = create_model("DynamicIngredientMissingDataSchema", **schema_fields)

    prompt = (
        f"Recherchiere die fehlenden Stammdaten für das Lebensmittel '{ingredient.name}'.\n\n"
        f"Bereits verifizierte und bekannte Daten (diese NICHT verändern oder widersprechen):\n"
        f"{known_context}\n\n"
        f"Aufgabe: Schlage NUR Werte für die folgenden {len(missing_fields)} fehlenden Felder vor:\n"
        + "\n".join(missing_desc_lines)
        + "\n\n"
        "Plausibilitätsregeln:\n"
        "1. Zucker (sugar_g) darf nicht größer als Kohlenhydrate (carbohydrate_g) sein.\n"
        "2. Gesättigte Fettsäuren (fat_sat_g) dürfen nicht größer als Gesamtfett (fat_g) sein.\n"
        "3. Die Summe aus Protein, Fett und Kohlenhydraten darf 100g nicht überschreiten.\n"
        "4. Kalorien müssen zu den Makronährstoffen passen: ~ 4*Protein + 4*Kohlenhydrate + 9*Fett + 2*Ballaststoffe.\n"
        "5. Reine Speiseöle haben ~900 kcal, Wasser 0 kcal. Keine Werte über 900 kcal.\n"
        "6. Wenn du ein Feld nicht sicher bestimmen kannst, setze es auf null."
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=DynamicMissingSchema,
    )

    response, interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="ingredient_ai_fill_missing",
    )

    if response is None:
        raise GeminiUnavailableError("KI-Dienst nicht verfügbar")

    validated = DynamicMissingSchema.model_validate_json(response.text)
    data = validated.model_dump()

    filled_fields: list[dict[str, Any]] = []
    update_fields: list[str] = []

    for f, val in data.items():
        if val is None:
            continue

        # Strict safety check: Never replace existing valid data
        current_val = getattr(ingredient, f, None)
        if current_val is not None and current_val != "" and f not in missing_fields:
            continue

        # Enforce consistency constraints
        if f == "carbohydrate_g" and (ingredient.sugar_g or 0) > float(val):
            # Carbs cannot be less than known sugar
            val = float(ingredient.sugar_g)
        elif f == "fat_g" and (ingredient.fat_sat_g or 0) > float(val):
            # Fat cannot be less than known sat fat
            val = float(ingredient.fat_sat_g)
        elif f == "sugar_g" and ingredient.carbohydrate_g is not None and float(val) > float(ingredient.carbohydrate_g):
            val = float(ingredient.carbohydrate_g)
        elif f == "fat_sat_g" and ingredient.fat_g is not None and float(val) > float(ingredient.fat_g):
            val = float(ingredient.fat_g)

        # Type normalization for Django model fields
        if f == "price_per_kg" and val is not None:
            from decimal import Decimal

            val = Decimal(str(round(float(val), 2)))
        elif (
            f
            in [
                "durability_in_days",
                "max_storage_temperature",
                "preparation_time_min",
                "season_start",
                "season_end",
                "nutri_score",
                "nova_score",
                "child_score",
                "scout_score",
                "environmental_score",
            ]
            and val is not None
        ):
            val = round(float(val))
        elif f == "camp_suitable" and val is not None:
            val = bool(val)

        setattr(ingredient, f, val)
        update_fields.append(f)
        filled_fields.append(
            {
                "field": f,
                "label": STAMMDATEN_SPECS[f][3],
                "value": val,
            }
        )

    if update_fields:
        # Recompute quality score
        new_score = calculate_ingredient_quality_score(ingredient)
        ingredient.quality_score = new_score
        update_fields.append("quality_score")
        ingredient.save(update_fields=update_fields)

    return {
        "id": ingredient.id,
        "name": ingredient.name,
        "slug": ingredient.slug,
        "filled_fields": filled_fields,
        "quality_score": ingredient.quality_score,
        "ai_interaction_id": str(interaction_id) if interaction_id else None,
    }
