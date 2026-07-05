"""Generic ingredient term detection and lookup.

The set of generic ingredient terms (e.g. "Salz", "Pfeffer", "Nudeln") is
derived from `IngredientAlias` rows with `is_generic=True` — this is the
single source of truth used both for the "too generic" name warning and
for import-time concretization.
"""

from __future__ import annotations


def get_generic_terms() -> set[str]:
    """Return the distinct set of generic alias names (case-insensitive, lowercased)."""
    from supply.models import IngredientAlias

    names = IngredientAlias.objects.filter(is_generic=True).values_list("name", flat=True)
    return {name.strip().lower() for name in names}


def is_generic_name(name: str) -> bool:
    """Check whether `name` (trimmed, case-insensitive) exactly matches a generic term."""
    if not name:
        return False
    return name.strip().lower() in get_generic_terms()


def generic_name_warning(name: str) -> str | None:
    """Return a German warning text if `name` is too generic, else `None`."""
    if not is_generic_name(name):
        return None
    return f"„{name.strip()}“ ist zu generisch — bitte konkretisieren, z.B. mit Zustandsform (z.B. „Fusilli trocken“)."
