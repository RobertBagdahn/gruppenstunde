import logging

from supply.models import MeasuringUnit

logger = logging.getLogger(__name__)

SYNONYMS = {
    "g": "Gramm",
    "gramm": "Gramm",
    "kg": "Kilogramm",
    "kilogramm": "Kilogramm",
    "ml": "Milliliter",
    "milliliter": "Milliliter",
    "l": "Liter",
    "liter": "Liter",
    "stk": "Stück",
    "stk.": "Stück",
    "stück": "Stück",
    "tl": "Teelöffel",
    "teelöffel": "Teelöffel",
    "el": "Esslöffel",
    "esslöffel": "Esslöffel",
    "tasse": "Tasse",
    "tassen": "Tasse",
    "ta": "Tasse",
    "prise": "Prise",
    "prisen": "Prise",
    "pr": "Prise",
    "dose": "Dose",
    "dosen": "Dose",
    "becher": "Becher",
    "scheibe": "Scheibe",
    "scheiben": "Scheibe",
    "portion": "Portion",
    "portionen": "Portion",
    "glas": "Glas",
    "gläser": "Glas",
    "bund": "Bund",
    "msp": "Teelöffel",
    "n.b.": "Stück",
    "handvoll": "Stück",
    "tropfen": "Milliliter",
}


def resolve_canonical_unit(name: str) -> MeasuringUnit | None:
    """Resolve a measuring unit name to a canonical MeasuringUnit instance."""
    if not name:
        # Fallback to Gramm if empty
        return MeasuringUnit.objects.filter(name__iexact="Gramm").first()

    cleaned_name = name.strip().lower()
    canonical_name = SYNONYMS.get(cleaned_name)

    if canonical_name:
        unit = MeasuringUnit.objects.filter(name__iexact=canonical_name).first()
        if unit:
            return unit

    # Try exact match (case insensitive)
    unit = MeasuringUnit.objects.filter(name__iexact=name.strip()).first()
    if unit:
        return unit

    # Log warning and return Gramm as fallback
    logger.warning("Unbekannte Einheit '%s', fallback auf 'Gramm'", name)
    return MeasuringUnit.objects.filter(name__iexact="Gramm").first()
