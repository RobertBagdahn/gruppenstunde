"""Unit → gram conversion for imported ingredient quantities.

Direct conversion for mass units (g/kg, never density-scaled) and volume units
(ml/l via physical density),
fixed standard measures (EL, TL, Tasse, Prise, Msp), and Gemini estimation
for container units (Dose, Glas, Becher, Packung, …). The gram amount is
converted to a portion count via the ingredient's trusted rank-1 portion.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field

from core.services.gemini import DEFAULT_TEXT_MODEL
from recipe.data.ingredient_line_vocabulary import canonical_unit
from recipe.data.standard_unit_weights import (
    CATEGORY_DENSITIES,
    LIGHT_DRY_KEYWORDS,
    SIZE_FACTORS,
    UNIT_WEIGHTS_G,
    lookup_by_keyword,
    lookup_piece_weight,
)

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from supply.models import Ingredient, Portion

logger = logging.getLogger(__name__)

GEMINI_MODEL = DEFAULT_TEXT_MODEL

# Container units whose weight depends strongly on the product: keyword table, then
# Gemini, never a blind fallback.
AI_ESTIMATED_UNITS: set[str] = {
    "dose",
    "glas",
    "becher",
    "packung",
    "flasche",
    "beutel",
    "rolle",
    "kugel",
    "würfel",
    "kopf",
    "knolle",
    "stange",
    "scheibe",
    "cm",
}

# Standard kitchen measures from the fixed catalog (volume in ml, scaled by
# the ingredient's density; Prise/Msp are fixed gram amounts).
STANDARD_MEASURE_KEYS: dict[str, str] = {
    "el": "el",
    "tl": "tl",
    "tasse": "tasse",
    "prise": "prise",
    "msp": "msp",
}

# Fixed tiny amounts: an own "Prise" portion only counts within a realistic range.
FIXED_GRAM_UNITS = frozenset({"prise", "msp"})
PINCH_PORTION_RANGE_G: dict[str, tuple[float, float]] = {"prise": (0.2, 0.8), "msp": (0.1, 0.5)}

# Names under which an ingredient's own portion can stand for a recipe unit
# ("2 EL Olivenöl" ↔ portion "Esslöffel" or "1 EL (10ml)").
PORTION_NAMES_FOR_UNIT: dict[str, frozenset[str]] = {
    "prise": frozenset({"prise"}),
    "msp": frozenset({"msp", "msp.", "messerspitze"}),
    "el": frozenset({"el", "esslöffel"}),
    "tl": frozenset({"tl", "teelöffel"}),
    "tasse": frozenset({"tasse"}),
    "bund": frozenset({"bund"}),
    "dose": frozenset({"dose"}),
    "glas": frozenset({"glas", "glas/gläser"}),
    "becher": frozenset({"becher"}),
    "packung": frozenset({"packung", "päckchen", "pck.", "pck", "pk.", "tüte", "beutel", "standardbeutel"}),
    "zehe": frozenset({"zehe"}),
    "scheibe": frozenset({"scheibe"}),
    "blatt": frozenset({"blatt"}),
    "zweig": frozenset({"zweig", "zweige"}),
    "stange": frozenset({"stange"}),
    "knolle": frozenset({"knolle"}),
    "würfel": frozenset({"würfel"}),
    "handvoll": frozenset({"handvoll"}),
    "kugel": frozenset({"kugel"}),
    "flasche": frozenset({"flasche"}),
    "topf": frozenset({"topf"}),
}
PIECE_UNITS: frozenset[str] = frozenset({"", "stück"})

# A portion named after another unit ("200 ml") never stands for EL via its measuring unit.
_PORTION_UNIT_TOKENS = frozenset(
    {"g", "gramm", "kg", "ml", "l", "liter", "el", "tl", "esslöffel", "teelöffel", "tasse", "prise", "msp"}
)
_FRACTION_PORTION = re.compile(r"^\s*(?:1/2|½|halbe?)\b", re.IGNORECASE)
# Own spoon portions further than this factor from the standard measure are not trusted.
SPOON_PLAUSIBILITY_FACTOR = 2.5
# A count below this is shown with a smaller portion ("0,5 × g" instead of "0,01 × 100 g").
MIN_READABLE_COUNT = 0.25

# Mass units are already grams — density must never be applied to them.
MASS_GRAMS_PER_UNIT: dict[str, float] = {
    "g": 1.0,
    "kg": 1000.0,
    "pfund": 500.0,
}

# Volume units are converted to grams via the ingredient's density.
VOLUME_ML_PER_UNIT: dict[str, float] = {
    "ml": 1.0,
    "cl": 10.0,
    "l": 1000.0,
}


@dataclass(frozen=True)
class PortionCount:
    """An imported amount expressed as `count` × `portion`."""

    count: float
    portion: Portion


class UnitGramEstimate(BaseModel):
    """Gemini estimate: typical gram weight of one unit for an ingredient."""

    grams_per_unit: float = Field(
        gt=0, description="Geschätztes Gewicht in Gramm für EINE Einheit (z. B. 1 Dose = 350 g)"
    )


class UnitGramConverter:
    """Stateless unit → gram converter. All methods @classmethod."""

    # -------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------

    @classmethod
    def convert_to_portion_count(
        cls,
        quantity: float,
        unit: str,
        ingredient: Ingredient,
        user: AbstractBaseUser | None = None,
        _memo: dict[tuple[str, int], float] | None = None,
        allow_ai_estimate: bool = True,
    ) -> float | None:
        """Convert `quantity` × `unit` into a portion count for `ingredient`.

        The count refers to the portion returned by `convert_to_portion`.
        """
        result = cls.convert_to_portion(
            quantity, unit, ingredient, user=user, _memo=_memo, allow_ai_estimate=allow_ai_estimate
        )
        return result.count if result is not None else None

    @classmethod
    def convert_to_portion(
        cls,
        quantity: float,
        unit: str,
        ingredient: Ingredient,
        user: AbstractBaseUser | None = None,
        _memo: dict[tuple[str, int], float] | None = None,
        allow_ai_estimate: bool = True,
        size: str | None = None,
        hint: str = "",
    ) -> PortionCount | None:
        """Convert `quantity` × `unit` into a count of one of the ingredient's portions.

        A unit that names one of the ingredient's own portions ("2 EL" with a
        portion "Esslöffel") counts that portion. Otherwise the amount is
        converted to grams and expressed in a readable trusted portion.
        `size` ("small"/"medium"/"large") and `hint` (the import query, e.g.
        "tk blätterteig") refine piece and container weights.
        Returns None when no conversion or no trusted portion is available.
        """
        if quantity <= 0:
            return None
        unit_key = canonical_unit(unit)

        direct = cls._direct_portion_count(quantity, unit_key, ingredient, size)
        if direct is not None:
            return direct

        total_grams = cls.convert_to_grams(
            quantity,
            unit_key,
            ingredient,
            user=user,
            _memo=_memo,
            allow_ai_estimate=allow_ai_estimate,
            size=size,
            hint=hint,
        )
        if total_grams is None:
            return None
        return cls._count_for_grams(total_grams, ingredient)

    @classmethod
    def _count_for_grams(cls, total_grams: float, ingredient: Ingredient) -> PortionCount | None:
        """Express grams in the rank-1 portion, or a smaller one when the count would be tiny."""
        from supply.models import Portion

        weighted = [
            (portion, weight)
            for portion in Portion.objects.active()
            .filter(ingredient_id=ingredient.id)
            .select_related("measuring_unit")
            .order_by("rank", "id")
            if (weight := _trusted_weight(portion)) is not None and weight > 0
        ]
        if not weighted:
            return None
        portion, weight = weighted[0]
        if total_grams / weight < MIN_READABLE_COUNT:
            # Largest portion that still fits at least once, else the smallest one.
            fitting = [pair for pair in weighted if total_grams / pair[1] >= 1]
            portion, weight = (
                max(fitting, key=lambda pair: pair[1]) if fitting else min(weighted, key=lambda pair: pair[1])
            )
        return PortionCount(count=max(round(total_grams / weight, 2), 0.01), portion=portion)

    @classmethod
    def _direct_portion_count(
        cls, quantity: float, unit_key: str, ingredient: Ingredient, size: str | None = None
    ) -> PortionCount | None:
        """Portion count when the recipe unit *is* one of the ingredient's own portions.

        "2 EL Olivenöl" with a portion "Esslöffel" is 2 portions; going through grams
        and the density would turn it into 1,84. A piece unit ("Stück" or none) maps to a
        piece-like portion of the requested size. Only portions with a trusted weight count.
        """
        from supply.models import Portion

        if unit_key in MASS_GRAMS_PER_UNIT or unit_key in VOLUME_ML_PER_UNIT:
            return None
        portions = [
            (portion, weight)
            for portion in Portion.objects.active()
            .filter(ingredient_id=ingredient.id)
            .select_related("measuring_unit")
            .order_by("rank", "id")
            if (weight := _trusted_weight(portion)) is not None and weight > 0
        ]
        if unit_key in PIECE_UNITS:
            return cls._piece_portion_count(quantity, ingredient, portions, size)
        wanted = PORTION_NAMES_FOR_UNIT.get(unit_key)
        if wanted is None:
            return None
        for portion, weight in portions:
            if not _portion_stands_for_unit(portion, wanted):
                continue
            if unit_key in FIXED_GRAM_UNITS:
                low, high = PINCH_PORTION_RANGE_G[unit_key]
                if not low <= weight / _units_per_portion(portion, wanted) <= high:
                    continue
            elif unit_key in STANDARD_MEASURE_KEYS and not cls._plausible_spoon(portion, weight, unit_key, ingredient):
                continue
            per_portion = _units_per_portion(portion, wanted)
            return PortionCount(count=max(round(quantity / per_portion, 2), 0.01), portion=portion)
        return None

    @classmethod
    def _plausible_spoon(cls, portion: Portion, weight: float, unit_key: str, ingredient: Ingredient) -> bool:
        """An own EL/TL portion far off the standard measure ("1 EL Honig" = 10 g) is data noise."""
        per_portion = _units_per_portion(portion, PORTION_NAMES_FOR_UNIT[unit_key])
        standard = cls._standard_measure_grams(1, STANDARD_MEASURE_KEYS[unit_key], ingredient)
        if standard <= 0:
            return True
        ratio = (weight / per_portion) / standard
        return 1 / SPOON_PLAUSIBILITY_FACTOR <= ratio <= SPOON_PLAUSIBILITY_FACTOR

    @classmethod
    def _piece_portion_count(
        cls, quantity: float, ingredient: Ingredient, portions: list[tuple[Any, float]], size: str | None
    ) -> PortionCount | None:
        """Count of a piece-like portion, honouring the requested size."""
        from supply.services.portion_resolution import is_piece_like_name

        pieces = [
            (portion, _portion_size(portion.name))
            for portion, _weight in portions
            if is_piece_like_name(portion.name) and not _FRACTION_PORTION.match(portion.name or "")
        ]
        if not pieces:
            return None
        wanted = size or "medium"
        exact = next((portion for portion, portion_size in pieces if portion_size == wanted), None)
        if exact is not None:
            return PortionCount(count=max(round(quantity, 2), 0.01), portion=exact)
        medium = next((portion for portion, portion_size in pieces if portion_size == "medium"), None)
        if medium is None and lookup_piece_weight(ingredient.name) is not None:
            # Only an off-size portion ("kleines Stück"): the typical piece weight is closer.
            return None
        base_portion, base_size = (medium, "medium") if medium is not None else pieces[0]
        factor = SIZE_FACTORS.get(wanted, 1.0) / SIZE_FACTORS.get(base_size, 1.0)
        return PortionCount(count=max(round(quantity * factor, 2), 0.01), portion=base_portion)

    @classmethod
    def convert_to_grams(
        cls,
        quantity: float,
        unit: str,
        ingredient: Ingredient,
        user: AbstractBaseUser | None = None,
        _memo: dict[tuple[str, int], float] | None = None,
        allow_ai_estimate: bool = True,
        size: str | None = None,
        hint: str = "",
    ) -> float | None:
        """Convert `quantity` × `unit` to grams for `ingredient`.

        Metric units and standard measures resolve directly; pieces and containers
        use the standard weight tables; product-dependent containers without a table
        entry are estimated via Gemini (memoized per (unit, ingredient)) unless
        `allow_ai_estimate` is False (anonymous previews).
        Returns None when the unit is unknown and no estimate is available.
        """
        unit_key = canonical_unit(unit)

        mass_factor = MASS_GRAMS_PER_UNIT.get(unit_key)
        if mass_factor is not None:
            return quantity * mass_factor

        volume_factor = VOLUME_ML_PER_UNIT.get(unit_key)
        if volume_factor is not None:
            return quantity * volume_factor * _density(ingredient)

        standard_key = STANDARD_MEASURE_KEYS.get(unit_key)
        if standard_key is not None:
            return cls._standard_measure_grams(quantity, standard_key, ingredient)

        if unit_key in PIECE_UNITS:
            piece = lookup_piece_weight(ingredient.name, hint)
            if piece is None:
                return None
            return quantity * piece * SIZE_FACTORS.get(size or "medium", 1.0)

        table = UNIT_WEIGHTS_G.get(unit_key)
        if table is not None:
            keyword_grams = lookup_by_keyword(
                {key: value for key, value in table.items() if key}, ingredient.name, hint
            )
            if keyword_grams is not None:
                return quantity * keyword_grams
            if unit_key not in AI_ESTIMATED_UNITS and "" in table:
                return quantity * table[""]

        if unit_key not in AI_ESTIMATED_UNITS or not allow_ai_estimate:
            return None

        if _memo is not None:
            cache_key = (unit_key, ingredient.id)
            if cache_key in _memo:
                return _memo[cache_key] * quantity
        grams_per_unit = cls._estimate_container_unit(unit, ingredient, user)
        if grams_per_unit is None:
            return None
        if _memo is not None:
            _memo[cache_key] = grams_per_unit
        return grams_per_unit * quantity

    # -------------------------------------------------------------------
    # Direct conversions
    # -------------------------------------------------------------------

    @classmethod
    def _standard_measure_grams(cls, quantity: float, standard_key: str, ingredient: Ingredient) -> float:
        from supply.data.standard_measures import STANDARD_MEASURES

        measure = next((m for m in STANDARD_MEASURES if m.key == standard_key), None)
        if measure is None:
            return quantity
        if measure.grams is not None:
            return quantity * measure.grams
        return quantity * (measure.volume_ml or 0.0) * _density(ingredient)

    @classmethod
    def _estimate_container_unit(
        cls,
        unit: str,
        ingredient: Ingredient,
        user: AbstractBaseUser | None,
    ) -> float | None:
        """Ask Gemini how many grams one unit of the ingredient weighs."""
        from ninja.errors import HttpError

        from core.services.gemini import gemini_call

        prompt = (
            "Du bist ein erfahrener Koch und kennst typische Verpackungsgrößen im "
            "deutschen Lebensmittelhandel.\n"
            f"Wie viele Gramm wiegt EINE Einheit '{unit}' von der Zutat "
            f"'{ingredient.name}'? Beispiele: 1 Dose Ananas = 350 g (Abtropfgewicht), "
            "1 Glas Kirschen = 370 g, 1 Bund Petersilie = 50 g.\n"
            "Schätze das typische Gewicht in Gramm für eine handelsübliche Einheit."
        )
        try:
            from google.genai import types

            response, _ = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=UnitGramEstimate,
                ),
                context="unit_gram_conversion",
            )
            if response is None:
                return None
            estimate = UnitGramEstimate.model_validate_json(response.text)
            if estimate.grams_per_unit <= 0:
                return None
            logger.info(
                "Unit conversion estimate: 1 %s %s ≈ %s g",
                unit,
                ingredient.name,
                estimate.grams_per_unit,
            )
            return estimate.grams_per_unit
        except HttpError:
            raise
        except Exception:
            logger.warning("Unit conversion estimate failed for '%s' (%s)", ingredient.name, unit, exc_info=True)
            return None


def _density(ingredient: Ingredient) -> float:
    """Physical density in g/ml; a stored 1.0 is the unset default and falls back to the category."""
    density = getattr(ingredient, "physical_density", None)
    category = lookup_by_keyword({key: value for key, value in CATEGORY_DENSITIES.items() if key}, ingredient.name)
    name = (ingredient.name or "").lower()
    is_light_dry = any(keyword in name for keyword in LIGHT_DRY_KEYWORDS)
    if density and float(density) > 0 and float(density) != 1.0:
        if is_light_dry and category is not None and float(density) >= 0.9:
            return category
        return float(density)
    return category or 1.0


def _units_per_portion(portion: Any, wanted: frozenset[str]) -> float:
    """How many recipe units one portion holds.

    `Portion.quantity` counts the portion's measuring unit: "Esslöffel" with unit EL holds
    1 EL, but "Knoblauchzehe" with unit Gramm stores 4 (grams) and is still one clove.
    """
    quantity = float(portion.quantity or 1) or 1.0
    # quantity == weight means it counts grams ("Knoblauchzehe": 4 / 4 g), not units.
    if portion.weight_g and abs(quantity - float(portion.weight_g)) < 1e-9:
        return 1.0
    return quantity


def _portion_size(name: str | None) -> str:
    """Size class of a piece portion name ("kleines Stück" → small)."""
    words = (name or "").lower().split()
    for word in words:
        if word.startswith("klein") or word == "mini":
            return "small"
        if word.startswith(("groß", "gross")) or word == "maxi":
            return "large"
    return "medium"


def _portion_stands_for_unit(portion: Any, wanted: frozenset[str]) -> bool:
    """The portion is the recipe unit by name ("Esslöffel", "1 EL (10ml)", "Knoblauchzehe")
    or, when its name names no other unit, by measuring unit."""
    from supply.services.portion_resolution import normalize_portion_name

    tokens = normalize_portion_name(portion.name).replace("(", " ").split()
    if tokens and tokens[0] in wanted:
        return True
    if any(len(word) >= 4 and any(token.endswith(word) for token in tokens) for word in wanted):
        return True
    if tokens and tokens[0] in _PORTION_UNIT_TOKENS:
        return False
    unit_name = portion.measuring_unit.name if portion.measuring_unit else ""
    return normalize_portion_name(unit_name) in wanted


def _get_rank1_portion(ingredient: Ingredient) -> Any | None:
    """Active rank-1 portion of an ingredient, or the first active one."""
    from supply.models import Portion

    portion = (
        Portion.objects.active().filter(ingredient_id=ingredient.id, rank=1).select_related("measuring_unit").first()
    )
    if portion is None:
        portion = (
            Portion.objects.active()
            .filter(ingredient_id=ingredient.id)
            .select_related("measuring_unit")
            .order_by("rank")
            .first()
        )
    return portion


def _trusted_weight(portion: Any) -> float | None:
    """Trusted gram weight of a portion via the shared resolution service."""
    from supply.services.portion_resolution import resolve_trusted_weight

    return resolve_trusted_weight(portion)
