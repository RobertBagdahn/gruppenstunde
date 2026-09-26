"""Unit → gram conversion for imported ingredient quantities.

Direct conversion for metric units (g/kg/ml/l — Liter via physical density),
fixed standard measures (EL, TL, Tasse, Prise, Msp), and Gemini estimation
for container units (Dose, Glas, Becher, Packung, …). The gram amount is
converted to a portion count via the ingredient's trusted rank-1 portion.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from supply.models import Ingredient

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"

# Container units without a fixed gram equivalent — resolved via Gemini.
CONTAINER_UNITS: set[str] = {
    "dose",
    "glas",
    "gläser",
    "becher",
    "packung",
    "päckchen",
    "handvoll",
    "bund",
    "scheibe",
    "zehe",
    "schuss",
    "stück",
    "cm",
}

# Standard kitchen measures from the fixed catalog (volume in ml, scaled by
# the ingredient's density; Prise/Msp are fixed gram amounts).
STANDARD_MEASURE_KEYS: dict[str, str] = {
    "el": "el",
    "tl": "tl",
    "tasse": "tasse",
    "tassen": "tasse",
    "prise": "prise",
    "prisen": "prise",
    "msp": "msp",
    "messerspitze": "msp",
}

METRIC_GRAMS_PER_UNIT: dict[str, float] = {
    "g": 1.0,
    "kg": 1000.0,
    "ml": 1.0,
    "l": 1000.0,
    "liter": 1000.0,
}


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
    ) -> float | None:
        """Convert `quantity` × `unit` into a portion count for `ingredient`.

        Uses the ingredient's active rank-1 portion's trusted weight as the
        conversion base. Returns None when no conversion or no trusted portion
        is available.
        """
        if quantity <= 0:
            return None

        total_grams = cls.convert_to_grams(quantity, unit, ingredient, user=user, _memo=_memo)
        if total_grams is None:
            return None

        portion = _get_rank1_portion(ingredient)
        if portion is None:
            return None
        weight_g = _trusted_weight(portion)
        if weight_g is None or weight_g <= 0:
            return None

        return max(round(total_grams / weight_g, 2), 0.01)

    @classmethod
    def convert_to_grams(
        cls,
        quantity: float,
        unit: str,
        ingredient: Ingredient,
        user: AbstractBaseUser | None = None,
        _memo: dict[tuple[str, int], float] | None = None,
    ) -> float | None:
        """Convert `quantity` × `unit` to grams for `ingredient`.

        Metric units and standard measures resolve directly; container units
        are estimated via Gemini (memoized per (unit, ingredient)).
        Returns None when the unit is unknown and Gemini fails.
        """
        unit_key = (unit or "").strip().lower()
        if not unit_key:
            return None

        metric_factor = METRIC_GRAMS_PER_UNIT.get(unit_key)
        if metric_factor is not None:
            return quantity * metric_factor * _density(ingredient)

        standard_key = STANDARD_MEASURE_KEYS.get(unit_key)
        if standard_key is not None:
            return cls._standard_measure_grams(quantity, standard_key, ingredient)

        if unit_key not in CONTAINER_UNITS:
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
        return quantity * measure.volume_ml * _density(ingredient)

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
    """Physical density in g/ml; a stored 1.0 is treated as unset default."""
    density = getattr(ingredient, "physical_density", None)
    return float(density) if density and float(density) > 0 else 1.0


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
