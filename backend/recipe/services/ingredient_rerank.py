"""One AI call per recipe that picks an ingredient for each still-open review row.

The algorithmic matcher leaves rows open when no candidate is safe ("Balsamico weiß",
"Agavensirup"). The model sees each open row with its candidate list and may choose
one candidate or none. Its choice is only a suggestion: the row stays "zu prüfen".
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from core.services.gemini import DEFAULT_TEXT_MODEL

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from recipe.services.ingredient_matcher import MatchResult

logger = logging.getLogger(__name__)

AI_RERANK_CONFIDENCE = 0.6


class RerankChoice(BaseModel):
    index: int = Field(description="Index [n] of the open row, echoed unchanged")
    ingredient_id: int | None = Field(description="ID of the chosen candidate, or null if none fits")
    reason: str = Field("", description="Short German reason (max. 15 words)")


class RerankResponse(BaseModel):
    choices: list[RerankChoice] = Field(default_factory=list)


def rerank_open_rows(rows: list[tuple[str, MatchResult]], user: AbstractBaseUser | None) -> None:
    """Fill a suggested ingredient into open matches, in place.

    ``rows`` holds (source line, match) pairs. Only matches without ingredient but
    with candidates are sent. Skipped for anonymous users and when Gemini is down.
    """
    if user is None or not user.is_authenticated:
        return
    open_rows = [(source, match) for source, match in rows if match.ingredient_id is None and match.candidates]
    if not open_rows:
        return

    from google.genai import types

    from core.services.gemini import gemini_call

    lines = []
    for index, (source, match) in enumerate(open_rows):
        options = "; ".join(f"{candidate.id}={candidate.name}" for candidate in match.candidates)
        lines.append(f"[{index}] Rezeptzeile: {source!r} | Kandidaten: {options}")
    prompt = (
        "Du ordnest Zutatenzeilen aus einem Rezept Zutaten aus unserem Katalog zu.\n"
        "Wähle pro Zeile genau den Kandidaten, der dieselbe Zutat bezeichnet (Synonyme, Sorten, "
        "Schreibweisen zählen). Wähle null, wenn kein Kandidat dieselbe Zutat ist – lieber null als "
        "eine ähnliche, aber andere Zutat (z. B. nicht Brustfilet für ein ganzes Hähnchen).\n\n" + "\n".join(lines)
    )
    try:
        response, _interaction_id = gemini_call(
            user=user,
            model=DEFAULT_TEXT_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=RerankResponse),
            context="import_ingredient_rerank",
        )
        if response is None:
            return
        parsed = RerankResponse.model_validate_json(response.text)
    except Exception:
        logger.warning("Ingredient rerank failed", exc_info=True)
        return

    for choice in parsed.choices:
        if not 0 <= choice.index < len(open_rows) or choice.ingredient_id is None:
            continue
        _source, match = open_rows[choice.index]
        candidate = next((c for c in match.candidates if c.id == choice.ingredient_id), None)
        if candidate is None:
            continue
        match.ingredient_id = candidate.id
        match.name = candidate.name
        match.matched_via = "ai"
        match.needs_review = True
        match.confidence = AI_RERANK_CONFIDENCE
        match.reason = f"KI-Vorschlag: {choice.reason}".strip() if choice.reason else "KI-Vorschlag – bitte prüfen."
        match.technical_details = {**match.technical_details, "stage": "ai_rerank"}
