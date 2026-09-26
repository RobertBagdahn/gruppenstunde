"""Central piece-like portion classification and trusted-weight resolution.

Single source of truth for deciding whether a portion represents a countable
piece ("1 Zwiebel", "kleines Brötchen", "Stück") and whether its `weight_g`
may be used as the basis for gram-based calculations (nutrition, price,
meal-plan, shopping).

Rules (see openspec change `fix-food-piece-portion-mapping`):
- Piece semantics live in named portions; no `Stück` MeasuringUnit is needed.
- A weight is trusted when it is explicitly confirmed/imported, when it is
  definitionally derived from a metric base unit (g/kg/ml/l), or when it
  matches the measuring unit's canonical computation.
- Unknown or AI-proposed piece weights are NEVER silently used.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

METRIC_BASE_UNIT_NAMES = frozenset({"g", "gramm", "kg", "kilogramm", "ml", "milliliter", "l", "liter"})

# Measuring-unit names whose weight follows a canonical kitchen definition.
CANONICAL_UNIT_NAMES = frozenset(
    {"esslöffel", "el", "teelöffel", "tl", "prise", "messerspitze", "msp", "schuss", "tasse"}
)

TRUSTED_WEIGHT_STATUSES = frozenset({"confirmed", "imported"})


@dataclass(frozen=True)
class TrustedWeightResult:
    """Explain whether a portion can safely participate in gram calculations."""

    weight_g: float | None
    is_trusted: bool
    reason: str


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
        "kleinerer",
        "mittel",
        "mittlere",
        "mittlerer",
        "mittleres",
        "mittelgroß",
        "mittelgross",
        "mittelgroße",
        "mittelgrosse",
        "mittelgroßer",
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
        "riesiger",
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
_WHITESPACE_RE = re.compile(r"\s+")

# Words that mark a leading-quantity phrase as unit-based instead of a bare
# countable noun ("100g Zucker" = unit-based, "1 Zwiebel" = piece-like).
_QUANTITY_UNIT_WORDS = frozenset(
    {
        "g",
        "gramm",
        "kg",
        "kilogramm",
        "ml",
        "milliliter",
        "l",
        "liter",
        "el",
        "esslöffel",
        "tl",
        "teelöffel",
        "prise",
        "msp",
        "messerspitze",
        "schuss",
        "tasse",
        "dose",
        "dosen",
        "glas",
        "gläser",
        "bund",
        "bünde",
        "packung",
        "packungen",
        "becher",
        "beutel",
        "portion",
        "portionen",
    }
)


# ---------------------------------------------------------------------------
# Name normalization and classification
# ---------------------------------------------------------------------------


def normalize_portion_name(name: str | None) -> str:
    """Normalize a portion name for comparisons.

    Lowercases, trims, collapses whitespace and strips a leading quantity
    (legacy names like "1 Zwiebel" or "100g Zucker").
    """
    if not name:
        return ""
    cleaned = _LEADING_NUMBER_RE.sub("", name.strip()).strip()
    cleaned = _WHITESPACE_RE.sub(" ", cleaned)
    return cleaned.lower()


def is_piece_like_name(name: str | None) -> bool:
    """Return True if `name` looks like a countable piece description.

    Matches piece descriptors ("Stück", "Zehe", "Scheibe"), size-descriptor
    phrases ("kleines Brötchen", "große Zwiebel") and bare countable nouns
    with a leading quantity ("1 Zwiebel", "1 Lauch" — unlike unit-based
    names such as "100g Zucker" or "1 TL Salz").
    """
    if not name:
        return False
    normalized = normalize_portion_name(name)
    if not normalized:
        return False
    if normalized in PIECE_DESCRIPTORS:
        return True
    tokens = normalized.split()
    if tokens and tokens[0] in PIECE_DESCRIPTORS:
        return True
    if len(tokens) >= 2 and tokens[0] in SIZE_DESCRIPTORS:
        return True
    # Leading-quantity phrase without a unit word is a countable item.
    raw = (name or "").strip()
    quantity_match = _LEADING_NUMBER_RE.match(raw)
    if quantity_match:
        remainder = raw[quantity_match.end() :].strip().lower()
        first_word = remainder.split()[0].rstrip(".,") if remainder else ""
        if remainder and first_word not in _QUANTITY_UNIT_WORDS:
            return True
    return False


def is_piece_like_unit_name(unit_name: str | None) -> bool:
    """Return True if a source unit string is piece-like (e.g. 'Stück', 'Zehen')."""
    normalized = normalize_portion_name(unit_name)
    if not normalized:
        return False
    tokens = normalized.split()
    return bool(tokens) and (normalized in PIECE_DESCRIPTORS or tokens[0] in PIECE_DESCRIPTORS)


def classify_portion_name(name: str | None, unit_name: str | None = None) -> str:
    """Classify a portion identity.

    Returns one of: "piece_like", "metric_base", "canonical_unit", "other".
    """
    if is_piece_like_name(name):
        return "piece_like"
    unit = normalize_portion_name(unit_name)
    if unit in METRIC_BASE_UNIT_NAMES:
        return "metric_base"
    if unit in CANONICAL_UNIT_NAMES:
        return "canonical_unit"
    return "other"


def build_suggested_portion_name(unit_name: str | None, note: str | None, ingredient_name: str | None) -> str:
    """Build the suggested name for a size-specific piece portion.

    Uses a size-descriptor note ("klein") combined with the ingredient name
    ("kleine Brötchen") when available, otherwise falls back to the unit name
    ("Stück") or a plain descriptor.
    """
    unit_norm = normalize_portion_name(unit_name)
    note_norm = normalize_portion_name(note)
    ingredient_norm = normalize_portion_name(ingredient_name)

    note_is_size = bool(note_norm and note_norm.split()[0] in SIZE_DESCRIPTORS)

    if note_is_size and ingredient_norm:
        size_word = note_norm.split()[0]
        return f"{size_word} {ingredient_norm}"
    if note_norm and ingredient_norm:
        return f"{note_norm} {ingredient_norm}"
    if unit_norm:
        return unit_norm
    if note_norm:
        return note_norm
    return "stück"


def _same_size_descriptor(left: str, right: str) -> bool:
    families = {
        "klein": "klein",
        "kleine": "klein",
        "kleiner": "klein",
        "kleines": "klein",
        "kleinere": "klein",
        "kleineren": "klein",
        "mittlere": "mittel",
        "mittlerer": "mittel",
        "mittleres": "mittel",
        "mittelgroß": "mittel",
        "mittelgross": "mittel",
        "mittelgroße": "mittel",
        "mittelgrosse": "mittel",
        "große": "groß",
        "grosse": "groß",
        "großer": "groß",
        "grosser": "groß",
        "großes": "groß",
        "grosses": "groß",
    }
    return families.get(left, left) == families.get(right, right)


# ---------------------------------------------------------------------------
# Trusted-weight resolution
# ---------------------------------------------------------------------------


def _unit_name_lower(portion) -> str:
    measuring_unit = getattr(portion, "measuring_unit", None)
    if measuring_unit is None:
        return ""
    return (getattr(measuring_unit, "name", "") or "").strip().lower()


METRIC_UNIT_GRAMS = {
    "g": 1.0,
    "gramm": 1.0,
    "ml": 1.0,
    "milliliter": 1.0,
    "kg": 1000.0,
    "kilogramm": 1000.0,
    "l": 1000.0,
    "liter": 1000.0,
}


def is_direct_metric_portion(portion) -> bool:
    """Return True when a RecipeItem quantity on `portion` is a plain metric amount.

    Only a single (quantity == 1), non-piece portion whose weight equals one
    metric unit qualifies ("Gramm" = 1 g, "Liter" = 1000 g). Pre-weighed
    portions that merely use a gram unit ("100g Reis", "Dose 400g", "EL 15g":
    quantity=1, unit=Gramm, weight_g != 1) are counts of that portion.
    """
    if portion is None:
        return False
    if getattr(portion, "quantity", 1) != 1:
        return False
    if is_piece_like_name(getattr(portion, "name", None)):
        return False
    unit_grams = METRIC_UNIT_GRAMS.get(_unit_name_lower(portion))
    if unit_grams is None:
        return False
    weight = getattr(portion, "weight_g", None)
    return weight is None or abs(float(weight) - unit_grams) <= 1e-6


def is_pre_weighed_metric_portion(portion) -> bool:
    """Return True for gram/ml-unit portions that are counts ("100g Reis")."""
    return (
        portion is not None
        and _unit_name_lower(portion) in METRIC_UNIT_GRAMS
        and not is_piece_like_name(getattr(portion, "name", None))
        and not is_direct_metric_portion(portion)
    )


def resolve_trusted_weight(portion) -> float | None:
    """Return `portion.weight_g` when it may be used for gram calculations.

    Returns None for missing, fabricated or unconfirmed weights:
    - missing/non-positive weights are never trusted
    - confirmed/imported weights are trusted
    - metric base units (g/kg/ml/l) are definitionally trusted
    - weights matching the measuring unit's canonical computation are trusted
    - piece-like names require an explicit trusted status (confirmed/imported)
      — unknown/AI-proposed piece weights resolve to None
    - other named portions without status keep their legacy trust
    """
    weight = getattr(portion, "weight_g", None)
    if weight is None or weight <= 0:
        return None

    status = getattr(portion, "weight_status", None)
    if status in TRUSTED_WEIGHT_STATUSES:
        return float(weight)

    # Piece-like names require an explicit trusted status — even with a
    # fallback Gramm measuring unit (the legacy "1 Zwiebel = 1 g" corruption).
    if is_piece_like_name(getattr(portion, "name", None)):
        return None

    if _unit_name_lower(portion) in METRIC_BASE_UNIT_NAMES:
        return float(weight)

    try:
        computed = portion.compute_weight_g(None)
    except Exception:
        computed = None
    if computed is not None and abs(float(computed) - float(weight)) <= 1e-6:
        return float(weight)

    # Legacy named portions (e.g. "Portion" with a curated weight) without
    # provenance remain trusted to avoid regressions; the backfill and the
    # `repair-food-portion-data` change refine ambiguous rows.
    return float(weight)


def resolve_trusted_weight_result(portion) -> TrustedWeightResult:
    """Return the trusted weight together with an actionable resolution reason."""
    weight = getattr(portion, "weight_g", None)
    if weight is None or weight <= 0:
        return TrustedWeightResult(None, False, "missing_weight")

    status = getattr(portion, "weight_status", None)
    if status in TRUSTED_WEIGHT_STATUSES:
        return TrustedWeightResult(float(weight), True, "trusted_status")

    if is_piece_like_name(getattr(portion, "name", None)):
        return TrustedWeightResult(None, False, "unconfirmed_piece_weight")

    if _unit_name_lower(portion) in METRIC_BASE_UNIT_NAMES:
        return TrustedWeightResult(float(weight), True, "metric_base_unit")

    try:
        computed = portion.compute_weight_g(None)
    except Exception:
        computed = None
    if computed is not None and abs(float(computed) - float(weight)) <= 1e-6:
        return TrustedWeightResult(float(weight), True, "canonical_unit")

    return TrustedWeightResult(float(weight), True, "legacy_named_portion")


def find_matching_piece_portion(ingredient, name: str):
    """Find an existing active portion for a piece-like request.

    Matches by normalized name (first the exact normalized name, then a
    size-descriptor match ignoring the size word). Returns the best matching
    active portion or None.
    """
    normalized = normalize_portion_name(name)
    if not normalized:
        return None

    qs = ingredient.portions.active().order_by("rank", "id")
    for portion in qs:
        candidate = normalize_portion_name(portion.name)
        if not candidate:
            continue
        if candidate == normalized:
            return portion
        candidate_tokens = candidate.split()
        request_tokens = normalized.split()
        if (
            len(candidate_tokens) >= 2
            and len(request_tokens) >= 1
            and candidate_tokens[0] in SIZE_DESCRIPTORS
            and (
                candidate_tokens[1:] == request_tokens
                or (
                    len(request_tokens) >= 2
                    and request_tokens[0] in SIZE_DESCRIPTORS
                    and _same_size_descriptor(candidate_tokens[0], request_tokens[0])
                    and candidate_tokens[1:] == request_tokens[1:]
                )
            )
        ):
            return portion
    return None
