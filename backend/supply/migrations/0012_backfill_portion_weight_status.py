"""Backfill Portion.weight_status/source for existing data.

Marks only unambiguous existing portion weights as trusted; ambiguous rows
(piece-like names, 1-g placeholders) stay unresolved (NULL) so the separate
`repair-food-portion-data` change can propose repairs without breaking
gram-based calculations.

Frozen at migration time — do not import application services here.
"""

import re

from django.db import migrations

METRIC_BASE_UNIT_NAMES = frozenset({"g", "gramm", "kg", "kilogramm", "ml", "milliliter", "l", "liter"})
CANONICAL_KITCHEN_UNITS = frozenset(
    {"esslöffel", "el", "teelöffel", "tl", "prise", "messerspitze", "msp", "schuss", "tasse"}
)

PIECE_DESCRIPTORS = frozenset(
    {
        "stück",
        "stueck",
        "stücke",
        "stuecke",
        "stk",
        "stk.",
        "st.",
        "st",
        "zehe",
        "zehen",
        "scheibe",
        "scheiben",
        "knolle",
        "knollen",
        "blatt",
        "blätter",
        "blaetter",
        "kopf",
        "köpfe",
        "koepfe",
        "rispe",
        "rispen",
        "spritzer",
        "tropfen",
    }
)

SIZE_DESCRIPTORS = frozenset(
    {
        "klein",
        "kleine",
        "kleiner",
        "kleines",
        "kleinere",
        "kleineren",
        "mittel",
        "mittlere",
        "mittlerer",
        "mittleres",
        "mittelgroß",
        "mittelgross",
        "mittelgroße",
        "mittelgrosse",
        "groß",
        "gross",
        "große",
        "grosse",
        "großer",
        "grosser",
        "großes",
        "grosses",
        "großen",
        "grossen",
        "riesig",
        "riesige",
        "riesen",
        "mini",
        "maxi",
        "jung",
        "junge",
        "junger",
        "junges",
    }
)

_LEADING_NUMBER_RE = re.compile(r"^\d+(?:[.,]\d+)?\s*")


def _normalize(name: str) -> str:
    cleaned = _LEADING_NUMBER_RE.sub("", (name or "").strip()).strip()
    return re.sub(r"\s+", " ", cleaned).lower()


def _is_piece_like(name_norm: str) -> bool:
    if not name_norm:
        return False
    if name_norm in PIECE_DESCRIPTORS:
        return True
    tokens = name_norm.split()
    if tokens and tokens[0] in PIECE_DESCRIPTORS:
        return True
    return len(tokens) >= 2 and tokens[0] in SIZE_DESCRIPTORS


def _is_unit_like(name_norm: str) -> bool:
    if not name_norm:
        return False
    unit_names = METRIC_BASE_UNIT_NAMES | CANONICAL_KITCHEN_UNITS
    if name_norm in unit_names:
        return True
    tokens = name_norm.split()
    return bool(tokens) and tokens[0] in unit_names


def backfill_portion_weight_status(apps, schema_editor):
    Portion = apps.get_model("supply", "Portion")
    Ingredient = apps.get_model("supply", "Ingredient")

    ingredient_density = dict(Ingredient.objects.values_list("id", "physical_density"))

    for portion in Portion.objects.all().select_related("measuring_unit", "ingredient"):
        weight = portion.weight_g
        if weight is None or weight <= 0:
            continue

        name_norm = _normalize(portion.name)
        if _is_piece_like(name_norm):
            # Ambiguous piece rows stay unresolved for `repair-food-portion-data`.
            continue

        mu = portion.measuring_unit
        unit_name = _normalize(mu.name) if mu else ""
        mu_qty = float(mu.quantity or 0) if mu else 0.0

        # Definitionally derived weights (quantity × unit factor, with density
        # for volume units) are unambiguous.
        factor = 1.0
        if mu and mu.unit == "ml" and portion.ingredient_id:
            factor = float(ingredient_density.get(portion.ingredient_id) or 1.0)
        computed = float(portion.quantity or 0) * mu_qty * factor
        definitional = computed > 0 and abs(computed - float(weight)) <= 1e-6

        if (unit_name in METRIC_BASE_UNIT_NAMES and _is_unit_like(name_norm) and definitional) or (
            unit_name in CANONICAL_KITCHEN_UNITS and definitional
        ):
            portion.weight_status = "confirmed"
            portion.weight_source = "system"
            portion.save(update_fields=["weight_status", "weight_source"])
        elif weight > 1.0:
            # Named recipe portions with a plausible weight are treated as
            # trusted legacy/imported data.
            portion.weight_status = "imported"
            portion.weight_source = "import"
            portion.save(update_fields=["weight_status", "weight_source"])
        # else: weight <= 1.0 without a definitional base — unresolved.


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0011_portion_weight_provenance"),
    ]

    operations = [
        migrations.RunPython(backfill_portion_weight_status, migrations.RunPython.noop),
    ]
