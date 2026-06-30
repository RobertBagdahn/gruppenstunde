"""Unified improvement ranking for recipe detail page.

Merges two sources of improvement suggestions:

* Nutri-Score simulation (`nutri_improvement_service.calculate_nutri_improvements`)
* Configurable Rule rules (`recipe_checks.match_recipe_hints`)

Produces a single, deterministic Top-5 list. Each item carries a quantitative
``impact_score`` (0–100) used for ordering, plus a ``source`` tag
(``nutri_score`` | ``recipe_hint`` | ``merged``) that lets the UI decide
whether a details modal should be offered.

See ``openspec/changes/recipe-improvement-merge/design.md`` for the design
rationale and formula.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from recipe.models import Recipe

TOP_N = 5
ALL_GOOD_MESSAGE = "Dieses Rezept ist in allen bewerteten Dimensionen im grünen Bereich."
NOT_APPLICABLE_MESSAGE = (
    "Für diesen Rezepttyp werden Nährwert-Regeln im Essensplaner "
    "auf die gesamte Mahlzeit angewandt — nicht auf das Einzelrezept."
)
NO_NUTRITION_DATA_MESSAGE = (
    "Keine Nährwertdaten für die Zutaten hinterlegt – sobald Nährwerte erfasst sind, erscheinen hier Vorschläge."
)
NOTHING_ACTIONABLE_MESSAGE = (
    "Keine konkreten Verbesserungen gefunden – das Rezept liegt in allen bewerteten Dimensionen im Rahmen."
)

# Nutri-Score class boundaries (per-100g thresholds for a one-class improvement).
# Used only as a fallback when no Rule defines a threshold for a parameter.
# Values correspond to roughly the "good" end of the next-better class per the
# standard solid-food Nutri-Score scoring tables.
_NUTRI_FALLBACK_THRESHOLDS: dict[str, float] = {
    "energy_kcal": 80.0,
    "sugar_g": 4.5,
    "fat_sat_g": 1.0,
    "sodium_mg": 90.0,
    "salt_g": 0.225,
    "fibre_g": 3.0,
    "protein_g": 5.0,
}


def compute_improvement_ranking(recipe: Recipe) -> dict:
    """Compute ranked Top-N improvement list for a recipe.

    Returns a dict with ``items``, ``all_good``, ``is_applicable`` and ``message`` keys.
    ``items`` is a list of up to ``TOP_N`` entries ordered by ``impact_score`` desc.
    Each entry has:

    * ``parameter`` — dedup key (e.g. ``sugar_g``)
    * ``parameter_label`` — German label
    * ``current_value``, ``threshold_value``, ``delta``, ``unit``
    * ``direction`` — ``reduce`` | ``increase``
    * ``impact_score`` — 0–100
    * ``suggested_ingredients`` — up to three {id, name, contribution_g}
    * ``source`` — ``nutri_score`` | ``recipe_hint`` | ``merged``
    * ``recommendation_text`` — human-readable advice
    """
    from recipe.services.nutri_improvement_service import (
        _find_contributing_ingredients,
        calculate_nutri_improvements,
    )
    from recipe.services.recipe_checks import match_recipe_hints

    nutri_candidates = calculate_nutri_improvements(recipe)
    hint_matches = match_recipe_hints(recipe)

    is_nutri_a = recipe.cached_nutri_class == 1
    all_good = is_nutri_a and len(hint_matches) == 0

    if all_good:
        return {"items": [], "all_good": True, "is_applicable": True, "message": ALL_GOOD_MESSAGE}

    # Build intermediate per-parameter buckets keyed by parameter
    buckets: dict[str, dict] = {}

    # Seed from Nutri-Score candidates
    for cand in nutri_candidates:
        parameter = cand["parameter"]
        nutri_component = _score_nutri_candidate(cand)
        threshold = _NUTRI_FALLBACK_THRESHOLDS.get(parameter, cand["target_value"])
        current = cand["current_value"]
        direction = cand["direction"]
        delta = _compute_delta(current, threshold, direction)

        buckets[parameter] = {
            "parameter": parameter,
            "parameter_label": cand["parameter_label"],
            "current_value": current,
            "threshold_value": threshold,
            "delta": delta,
            "unit": _unit_for(parameter),
            "direction": direction,
            "nutri_component": nutri_component,
            "hint_component": 0.0,
            "suggested_ingredients": _format_ingredients(cand.get("affected_ingredients", []), parameter),
            "source": "nutri_score",
            "recommendation_text": _default_nutri_text(cand),
            "hint_level": "",
        }

    # Merge in Rule matches
    for match in hint_matches:
        hint = match["hint"]
        parameter = hint.parameter
        actual = match["actual_value"]
        hint_component = _score_recipe_hint(hint, actual)

        if hint.min_max == "max":
            threshold = hint.value
            direction = "reduce"
        elif hint.min_max == "min":
            threshold = hint.value
            direction = "increase"
        else:
            continue

        delta = _compute_delta(actual, threshold, direction)
        improvement_text = match.get("improvement_text") or hint.hint or hint.name

        if parameter in buckets:
            existing = buckets[parameter]
            # Threshold source from Rule takes precedence
            existing["threshold_value"] = threshold
            existing["direction"] = direction
            existing["delta"] = delta
            existing["hint_component"] = max(existing["hint_component"], hint_component)
            existing["source"] = "merged"
            existing["hint_level"] = hint.hint_level
            # Join recommendation texts
            if improvement_text and improvement_text not in existing["recommendation_text"]:
                existing["recommendation_text"] = (
                    existing["recommendation_text"].rstrip() + "\n\n" + improvement_text
                ).strip()
        else:
            buckets[parameter] = {
                "parameter": parameter,
                "parameter_label": _label_for(parameter),
                "current_value": actual,
                "threshold_value": threshold,
                "delta": delta,
                "unit": _unit_for(parameter),
                "direction": direction,
                "nutri_component": 0.0,
                "hint_component": hint_component,
                "suggested_ingredients": _format_ingredients(
                    _find_contributing_ingredients(recipe, parameter), parameter
                ),
                "source": "recipe_hint",
                "recommendation_text": improvement_text,
                "hint_level": hint.hint_level,
            }

    # Finalize impact_score and sort
    items: list[dict] = []
    for bucket in buckets.values():
        impact = 50.0 * bucket.pop("nutri_component") + 50.0 * bucket.pop("hint_component")
        bucket["impact_score"] = round(max(0.0, min(100.0, impact)), 1)
        items.append(bucket)

    items.sort(key=lambda b: b["impact_score"], reverse=True)
    items = items[:TOP_N]

    if not items:
        is_applicable, message = _classify_empty_reason(recipe, nutri_candidates, hint_matches)
        return {"items": [], "all_good": False, "is_applicable": is_applicable, "message": message}

    return {"items": items, "all_good": False, "is_applicable": True, "message": ""}


def _classify_empty_reason(
    recipe: Recipe,
    nutri_candidates: list,
    hint_matches: list,
) -> tuple[bool, str]:
    """Classify why the improvement list is empty.

    Returns ``(is_applicable, message)`` tuple distinguishing three cases:
    1. Recipe type not applicable (all cached nutrition ≤ 0, no rules)
    2. Missing nutrition data (values ≤ 0 but type is evaluable)
    3. Nothing actionable (data present but no candidates with impact)
    """
    has_no_nutri_candidates = len(nutri_candidates) == 0
    has_no_hints = len(hint_matches) == 0

    all_cached_zero = all(
        getattr(recipe, field, None) is None or getattr(recipe, field, 0) <= 0
        for field in [
            "cached_energy_kcal",
            "cached_protein_g",
            "cached_fat_g",
            "cached_carbohydrate_g",
            "cached_sugar_g",
            "cached_fibre_g",
            "cached_salt_g",
        ]
    )

    if has_no_nutri_candidates and has_no_hints and all_cached_zero:
        return False, NOT_APPLICABLE_MESSAGE

    if has_no_nutri_candidates and all_cached_zero:
        return True, NO_NUTRITION_DATA_MESSAGE

    return True, NOTHING_ACTIONABLE_MESSAGE


def _score_nutri_candidate(candidate: dict) -> float:
    """Normalised 0–1 impact contribution from a Nutri-Score simulation.

    Uses ``class_improvement / 4.0`` (max four classes better) clamped to 0–1.
    """
    class_improvement = candidate.get("class_improvement", 0) or 0
    if class_improvement <= 0:
        return 0.0
    return max(0.0, min(1.0, class_improvement / 4.0))


def _score_recipe_hint(hint, actual_value: float) -> float:
    """Normalised 0–1 impact contribution from a Rule match.

    For ``min_max='max'``: (current - value) / value, clamped 0–1.
    For ``min_max='min'``: (value - current) / value, clamped 0–1.
    """
    if hint.value <= 0:
        return 0.0
    if hint.min_max == "max":
        return max(0.0, min(1.0, (actual_value - hint.value) / hint.value))
    if hint.min_max == "min":
        return max(0.0, min(1.0, (hint.value - actual_value) / hint.value))
    return 0.0


def _compute_delta(current: float, threshold: float, direction: str) -> float:
    """Absolute difference between current and threshold in improvement direction."""
    if direction == "reduce":
        return round(max(0.0, current - threshold), 2)
    return round(max(0.0, threshold - current), 2)


def _format_ingredients(raw: list[dict], parameter: str) -> list[dict]:
    """Trim to top 3 and expose a stable shape for the schema."""
    unit = _UNIT_MAP.get(parameter, "g")
    out: list[dict] = []
    for entry in raw[:3]:
        out.append(
            {
                "id": entry.get("id", 0),
                "name": entry.get("name", ""),
                "contribution_g": entry.get("amount_g", 0.0),
                "unit": unit,
            }
        )
    return out


_UNIT_MAP = {
    "energy_kcal": "kcal",
    "sugar_g": "g",
    "fat_sat_g": "g",
    "fat_g": "g",
    "protein_g": "g",
    "fibre_g": "g",
    "carbohydrate_g": "g",
    "salt_g": "g",
    "sodium_mg": "mg",
    "weight_g": "g",
}

_LABEL_MAP = {
    "energy_kcal": "Energie",
    "sugar_g": "Zucker",
    "fat_sat_g": "Gesättigte Fettsäuren",
    "fat_g": "Fett",
    "protein_g": "Protein",
    "fibre_g": "Ballaststoffe",
    "carbohydrate_g": "Kohlenhydrate",
    "salt_g": "Salz",
    "sodium_mg": "Natrium",
    "weight_g": "Gesamtgewicht",
    "nutri_class": "Nutri-Score-Klasse",
}


def _unit_for(parameter: str) -> str:
    if parameter in _UNIT_MAP:
        return _UNIT_MAP[parameter]
    if parameter.endswith("_mg"):
        return "mg"
    if parameter.endswith("_ug"):
        return "µg"
    if parameter.endswith("_g"):
        return "g"
    return ""


def _label_for(parameter: str) -> str:
    return _LABEL_MAP.get(parameter, parameter)


def _default_nutri_text(candidate: dict) -> str:
    """Fallback recommendation text when only Nutri-Score source is available."""
    label = candidate["parameter_label"]
    direction = candidate["direction"]
    verb = "reduzieren" if direction == "reduce" else "erhöhen"
    return f"{label} {verb}, um den Nutri-Score zu verbessern."
