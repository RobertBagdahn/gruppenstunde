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
    "msp": "Messerspitze",
    "messerspitze": "Messerspitze",
    "schuss": "Schuss",
    "schüsse": "Schuss",
    "stk": "Stück",
    "stk.": "Stück",
    "stück": "Stück",
    "stueck": "Stück",
    "zehe": "Stück",
    "zehen": "Stück",
    "dose": "Dose",
    "dosen": "Dose",
    "glas": "Glas",
    "gläser": "Glas",
    "bund": "Bund",
    "bünde": "Bund",
    "pck": "Packung",
    "pck.": "Packung",
    "pkg": "Packung",
    "pkg.": "Packung",
    "packung": "Packung",
    "packungen": "Packung",
}


def resolve_canonical_unit(name: str) -> MeasuringUnit | None:
    """Resolve a measuring unit name to a canonical MeasuringUnit instance.

    Returns None for empty, unknown or piece-like names (e.g. "Stück",
    "Zehen", "Packung" — units that were deliberately removed from the
    MeasuringUnit catalog). Callers MUST treat None as a clarification state
    instead of silently falling back to Gramm.
    """
    if not name:
        return None

    cleaned_name = name.strip().lower()
    canonical_name = SYNONYMS.get(cleaned_name)

    if canonical_name:
        unit = MeasuringUnit.objects.filter(name__iexact=canonical_name).first()
        if unit:
            return unit
        # Piece-like synonyms resolve to catalog entries that no longer exist
        # (e.g. "Stück") — clarification required, no Gramm fallback.
        logger.warning("Einheit '%s' verweist auf '%s', aber die Maßeinheit existiert nicht", name, canonical_name)
        return None

    # Try exact match (case insensitive)
    unit = MeasuringUnit.objects.filter(name__iexact=name.strip()).first()
    if unit:
        return unit

    # Log warning — unknown units stay unresolved instead of silently
    # becoming Gramm.
    logger.warning("Unbekannte Einheit '%s' – Klärung erforderlich", name)
    return None
