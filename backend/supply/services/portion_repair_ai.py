"""AI-assisted evaluation of portion repair findings via Gemini.

Gemini receives the deterministic scanner context (ingredient, portion,
detection reason, recipe usage) and returns a structured proposal:
classification, proposed portion name/weight/quantity/unit, confidence and
rationale. Findings at or above the configurable high-confidence threshold
become READY for automatic application; everything below stays PENDING_REVIEW.
"""

from __future__ import annotations

import logging
import re
from enum import StrEnum
from typing import TYPE_CHECKING

from django.conf import settings
from pydantic import BaseModel, Field

from core.services.gemini import GeminiUnavailableError, gemini_call

if TYPE_CHECKING:
    from supply.models import PortionRepairFinding

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"
PROMPT_VERSION = "1"
_DIGIT_PATTERN = re.compile(r"\d")
_GRAM_UNITS = {"g", "gram", "gramm"}
_PIECE_UNITS = {"stk", "stk.", "stück", "stueck"}
_AMBIGUOUS_PIECE_NAMES = {"bund", "bünde", "handvoll", "packung", "dose", "glas", "becher", "beutel"}


class GeminiRepairClassification(StrEnum):
    """What the portion should actually represent."""

    PIECE = "piece"
    GRAM = "gram"
    NO_ACTION = "no_action"


class GeminiPortionRepairProposal(BaseModel):
    """Structured Gemini response for a single suspicious portion."""

    classification: GeminiRepairClassification = Field(
        description="Was die Portion fachlich darstellen sollte: 'piece' (Stück/Scheibe etc.), "
        "'gram' (Gramm-Portion) oder 'no_action' (Daten sind korrekt, nichts tun)."
    )
    proposed_name: str = Field(
        default="",
        description="Korrigierter Portionsname OHNE Ziffern, z.B. 'Stück' oder 'Gramm'. Leer bei no_action.",
    )
    proposed_weight_g: float | None = Field(
        default=None,
        description="Korrigiertes Gewicht einer Portion in Gramm (realistischer Durchschnittswert). "
        "Für eine Gramm-Portion = 1. Leer bei no_action.",
    )
    proposed_quantity: float = Field(
        default=1.0,
        description="Menge in der angegebenen Maßeinheit (fast immer 1).",
    )
    proposed_unit_name: str = Field(
        default="Gramm",
        description="Maßeinheit der korrigierten Portion, z.B. 'Gramm', 'Stück', 'Milliliter'.",
    )
    confidence: float = Field(ge=0.0, le=1.0, description="Konfidenz der Bewertung (0-1).")
    rationale: str = Field(
        default="",
        description="Kurze Begründung auf Deutsch, warum die Portion verdächtig ist und was korrigiert wird.",
    )


def _is_safe_for_automatic_application(finding: PortionRepairFinding, proposal: GeminiPortionRepairProposal) -> bool:
    """Reject plausible-but-ambiguous AI repairs before marking them READY."""
    if proposal.classification == GeminiRepairClassification.NO_ACTION:
        return True
    if not proposal.proposed_name.strip() or _DIGIT_PATTERN.search(proposal.proposed_name):
        return False
    if proposal.proposed_quantity <= 0 or proposal.proposed_weight_g is None or proposal.proposed_weight_g <= 0:
        return False

    unit = proposal.proposed_unit_name.strip().casefold()
    if proposal.classification == GeminiRepairClassification.GRAM:
        if unit not in _GRAM_UNITS or proposal.proposed_name.strip().casefold() not in _GRAM_UNITS:
            return False
        return abs(proposal.proposed_weight_g - 1.0) <= 1e-6

    if proposal.classification != GeminiRepairClassification.PIECE or unit not in _PIECE_UNITS:
        return False
    if proposal.proposed_name.strip().casefold() in _AMBIGUOUS_PIECE_NAMES:
        return False

    # Existing positive weights are not changed automatically merely because
    # the model prefers another average. Missing/placeholder weights are the
    # cases where an automatic estimate is justified.
    current_weight = (finding.before_snapshot or {}).get("weight_g")
    if current_weight is not None and current_weight > 1:
        return abs(float(current_weight) - proposal.proposed_weight_g) <= 1e-6
    return True


def build_repair_prompt(finding: PortionRepairFinding) -> str:
    """Build the Gemini prompt for a single finding."""
    snapshot = finding.before_snapshot or {}
    ingredient_name = finding.ingredient.name if finding.ingredient_id else "Unbekannt"
    return (
        "Du prüfst Portionsdaten einer Zutatendatenbank auf Fehler aus Bestandsimporten.\n\n"
        f"Zutat: {ingredient_name}\n"
        f"Portion: Name='{snapshot.get('name', '')}', Gewicht={snapshot.get('weight_g')} g, "
        f"Menge={snapshot.get('quantity')}, Maßeinheit='{snapshot.get('measuring_unit_name', '')}' "
        f"(Einheitstyp '{snapshot.get('measuring_unit_unit', '')}'), Rang={snapshot.get('rank')}\n"
        f"Erkennungsgrund: {finding.detection_reason}\n"
        f"Verwendung: {len(finding.recipe_item_ids or [])} RecipeItem(s) referenzieren diese Portion.\n\n"
        "Bekannte Fehlerklassen:\n"
        "- Portionsname sagt Stück (z.B. 'Stück', 'Scheibe'), aber Gewicht ist 1 g oder fehlt.\n"
        "- '1 g'-Platzhalter statt eines realistischen Gewichts.\n"
        "- Rank-1-Normalportion mit unplausiblem Gewicht.\n\n"
        "Bewerte, ob die Portion korrigiert werden muss:\n"
        "- 'piece': Die Portion ist wirklich ein Stück/Scheibe etc. → schlage realistisches "
        "Durchschnittsgewicht vor (z.B. Ei=60, Scheibe Brot=45, Zehe Knoblauch=5).\n"
        "- 'gram': Die Portion sollte eine Gramm-Portion sein → name='Gramm', weight_g=1, Einheit 'Gramm'.\n"
        "- 'no_action': Die Daten sind korrekt (z.B. echte Gramm-Portion mit Gewicht 1).\n\n"
        "Regeln:\n"
        "- name darf KEINE Ziffern enthalten.\n"
        "- confidence: 0.95+ nur bei sehr klaren Fällen, 0.70-0.90 bei plausiblen Annahmen, "
        "< 0.70 bei Raten.\n"
        "- Gib die Antwort als strukturiertes JSON-Objekt zurück."
    )


def evaluate_finding(finding: PortionRepairFinding, *, min_confidence: float | None = None) -> PortionRepairFinding:
    """Ask Gemini to evaluate a candidate finding and persist the proposal.

    Sets the finding status: READY (>= threshold), PENDING_REVIEW (< threshold)
    or SKIPPED (no_action). The threshold and prompt version are stored with
    the finding. Raises GeminiUnavailableError when Gemini is unreachable.
    """
    from google.genai import types

    from supply.choices import PortionRepairStatus

    threshold = min_confidence if min_confidence is not None else settings.PORTION_REPAIR_MIN_CONFIDENCE

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=GeminiPortionRepairProposal,
    )
    response, interaction_id = gemini_call(
        model=GEMINI_MODEL,
        contents=build_repair_prompt(finding),
        config=config,
        bypass_limits=True,
        is_background=True,
        context="portion_repair",
    )
    if response is None:
        raise GeminiUnavailableError("KI nicht verfügbar")

    proposal = GeminiPortionRepairProposal.model_validate_json(response.text)
    proposal_dict = proposal.model_dump()

    if proposal.classification == GeminiRepairClassification.NO_ACTION:
        status = PortionRepairStatus.SKIPPED
    elif proposal.confidence >= threshold and _is_safe_for_automatic_application(finding, proposal):
        status = PortionRepairStatus.READY
    else:
        status = PortionRepairStatus.PENDING_REVIEW

    finding.ai_proposal = proposal_dict
    finding.confidence = proposal.confidence
    finding.prompt_version = PROMPT_VERSION
    finding.threshold = threshold
    finding.ai_interaction_id = interaction_id
    finding.status = status
    finding.save(
        update_fields=[
            "ai_proposal",
            "confidence",
            "prompt_version",
            "threshold",
            "ai_interaction_id",
            "status",
            "updated_at",
        ],
    )
    logger.info(
        "Evaluated portion repair finding %s: %s (confidence %.2f) → %s",
        finding.id,
        proposal.classification,
        proposal.confidence,
        status,
    )
    return finding
