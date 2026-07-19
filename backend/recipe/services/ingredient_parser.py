"""Ingredient name parser — extracts quantity, unit, name, and note from raw strings.

Uses rule-based approach with cascading fallbacks: rule-based → Jaccard → Gemini.
"""

from __future__ import annotations

import re
from typing import TYPE_CHECKING

from ninja.errors import HttpError
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    pass


# ---------------------------------------------------------------------------
# Modifier word lists (task 2.1)
# ---------------------------------------------------------------------------

STATE_MODIFIERS: set[str] = {
    "frisch", "frische", "frischer", "frisches",
    "tk", "tiefgefroren", "tiefgefrorene",
    "getrocknet", "getrocknete", "getrockneter",
    "geräuchert", "geräucherte", "geräucherter",
    "eingelegt", "eingelegte", "eingelegter",
    "gemahlen", "gemahlene", "gemahlener",
    "gerieben", "geriebene", "geriebener",
    "geröstet", "geröstete", "gerösteter",
}

COLOR_MODIFIERS: set[str] = {
    "rot", "rote", "roter", "rotes",
    "grün", "grüne", "grüner", "grünes",
    "gelb", "gelbe", "gelber", "gelbes",
    "weiß", "weiße", "weißer", "weißes",
    "schwarz", "schwarze", "schwarzer", "schwarzes",
}

SIZE_MODIFIERS: set[str] = {
    "groß", "große", "großer", "großes",
    "klein", "kleine", "kleiner", "kleines",
    "dick", "dicke", "dicker", "dickes",
    "dünn", "dünne", "dünner", "dünnes",
    "mittelgroß", "mittelgroße",
}

PREP_MODIFIERS: set[str] = {
    "gehackt", "gehackte", "gehackter", "gehacktes",
    "gewürfelt", "gewürfelte", "gewürfelter",
    "geschnitten", "geschnittene", "geschnittener",
    "geschält", "geschälte", "geschälter",
    "gepresst", "gepresste", "gepresster",
}

ALL_MODIFIERS: set[str] = STATE_MODIFIERS | COLOR_MODIFIERS | SIZE_MODIFIERS | PREP_MODIFIERS

# Quantity/unit patterns for best-effort parsing
QUANTITY_UNIT_PATTERN = re.compile(
    r"^(?P<qty>\d+(?:[.,]\d+)?)\s*(?P<unit>g|kg|ml|l|EL|TL|Msp\.?|Pck\.?|Pkg\.?|Bd\.?|Stück|Dose|Glas|Bund|Prise|Schuss|cm|Scheibe[n]?|Zehe[n]?)?\s+",
    re.IGNORECASE,
)

UNIT_CANONICAL: dict[str, str] = {
    "g": "g", "kg": "kg", "ml": "ml", "l": "l",
    "el": "EL", "tl": "TL",
    "msp": "Messerspitze", "msp.": "Messerspitze",
    "pck": "Packung", "pck.": "Packung",
    "pkg": "Packung", "pkg.": "Packung",
    "bd": "Bund", "bd.": "Bund",
    "stück": "Stück",
    "dose": "Dose", "glas": "Glas",
    "bund": "Bund",
    "prise": "Prise", "schuss": "Schuss",
    "scheibe": "Scheibe", "scheiben": "Scheiben",
    "zehe": "Zehe", "zehen": "Zehen",
}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ParsedIngredient(BaseModel):
    quantity: float = Field(0, description="Numeric quantity")
    unit: str = Field("", description="Measuring unit (e.g. g, ml, EL, Stück)")
    name: str = Field(..., description="Clean ingredient name without modifiers")
    note: str = Field("", description="Extracted modifier as note")
    confidence: float = Field(1.0, description="Parser confidence in the result")


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------


class IngredientNameParser:
    """Parse raw ingredient strings into structured components."""

    @classmethod
    def parse(cls, raw_name: str) -> ParsedIngredient:
        """Main entry point — cascading parse through rule-based → Jaccard → Gemini."""
        raw = raw_name.strip()

        result = cls._parse_rule_based(raw)
        if result is not None and result.confidence >= 0.9:
            return result

        result = cls._parse_jaccard(raw)
        if result is not None and result.confidence >= 0.5:
            return result

        result = cls._parse_gemini(raw)
        if result is not None:
            return result

        return ParsedIngredient(name=raw, quantity=0, unit="", note="", confidence=0.0)

    # -------------------------------------------------------------------
    # Step 1: Rule-based parsing
    # -------------------------------------------------------------------

    @classmethod
    def _parse_rule_based(cls, raw: str) -> ParsedIngredient | None:
        quantity, unit, rest = cls._extract_quantity_unit(raw)

        name_part = rest.strip()
        if not name_part:
            return None

        name, note = cls._split_name_note(name_part)

        if not name:
            return None

        exists = cls._ingredient_exists(name)
        confidence = 1.0 if exists else 0.5

        return ParsedIngredient(
            quantity=quantity,
            unit=unit,
            name=name,
            note=note,
            confidence=confidence,
        )

    @classmethod
    def _extract_quantity_unit(cls, raw: str) -> tuple[float, str, str]:
        m = QUANTITY_UNIT_PATTERN.match(raw)
        if m:
            qty_str = m.group("qty").replace(",", ".")
            quantity = float(qty_str)
            unit_raw = (m.group("unit") or "").strip().rstrip(".")
            unit = UNIT_CANONICAL.get(unit_raw.lower(), unit_raw)
            rest = raw[m.end():].strip()
            return quantity, unit, rest
        return 0, "", raw

    @classmethod
    def _split_name_note(cls, name_part: str) -> tuple[str, str]:
        words = name_part.split()
        if len(words) <= 1:
            return name_part, ""

        # Try removing trailing modifiers one at a time
        for i in range(min(3, len(words)), 0, -1):
            potential_modifiers = words[-i:]
            modifier_str = " ".join(potential_modifiers).lower()
            if modifier_str in ALL_MODIFIERS:
                base_words = words[:-i]
                base_name = " ".join(base_words)
                note = " ".join(potential_modifiers)
                if cls._ingredient_exists(base_name):
                    return base_name, note
                # Even if not in DB, still split if modifier is known
                return base_name, note

        # Try removing leading modifiers
        for i in range(min(2, len(words)), 0, -1):
            potential_modifiers = words[:i]
            modifier_str = " ".join(potential_modifiers).lower()
            if modifier_str in ALL_MODIFIERS:
                base_words = words[i:]
                base_name = " ".join(base_words)
                note = " ".join(potential_modifiers)
                if cls._ingredient_exists(base_name):
                    return base_name, note

        return name_part, ""

    @classmethod
    def _ingredient_exists(cls, name: str) -> bool:
        from supply.models import Ingredient, IngredientAlias

        if Ingredient.objects.filter(name__iexact=name).exists():
            return True
        if IngredientAlias.objects.filter(name__iexact=name).exists():
            return True
        return False

    # -------------------------------------------------------------------
    # Step 2: Jaccard fallback
    # -------------------------------------------------------------------

    @classmethod
    def _parse_jaccard(cls, raw: str) -> ParsedIngredient | None:
        from supply.models import Ingredient, IngredientAlias

        # Build candidate list: ingredient names + aliases
        candidates: list[tuple[str, str]] = []  # (name, type: "name"|"alias")
        seen: set[str] = set()

        for ing_name in Ingredient.objects.values_list("name", flat=True):
            lower = ing_name.lower()
            if lower not in seen:
                seen.add(lower)
                candidates.append((ing_name, "name"))

        for alias_name in IngredientAlias.objects.values_list("name", flat=True):
            lower = alias_name.lower()
            if lower not in seen:
                seen.add(lower)
                candidates.append((alias_name, "alias"))

        query_words = set(raw.lower().split())

        best_score = 0.0
        best_match = ""
        best_note_words: list[str] = []

        for cand_name, _ in candidates:
            cand_words = set(cand_name.lower().split())
            intersection = query_words & cand_words
            union = query_words | cand_words
            if not union:
                continue
            score = len(intersection) / len(union)
            if score > best_score:
                best_score = score
                best_match = cand_name
                best_note_words = list(query_words - cand_words)

        if best_score < 0.3 or not best_match:
            return None

        note = " ".join(w for w in best_note_words if w not in {"für", "mit", "und", "oder", "ca", "etwa", "nach", "geschmack"})
        return ParsedIngredient(
            quantity=0,
            unit="",
            name=best_match,
            note=note,
            confidence=best_score,
        )

    # -------------------------------------------------------------------
    # Step 3: Gemini fallback
    # -------------------------------------------------------------------

    @classmethod
    def _parse_gemini(cls, raw: str) -> ParsedIngredient | None:
        from core.services.gemini import gemini_call
        from pydantic import BaseModel as _BaseModel, Field as _Field

        class _GeminiParseResult(_BaseModel):
            name: str = _Field(description="Reiner Zutat-Name ohne Modifikatoren")
            note: str = _Field("", description="Modifikator wie frisch, gehackt, rot")
            quantity: float = _Field(0, description="Numerische Menge")
            unit: str = _Field("", description="Einheit")

        try:
            from google.genai import types

            response, _ = gemini_call(
                user=None,
                model="gemini-3.1-flash-lite",
                contents=f"Parse diese Zutatenangabe in Name, Note (Modifikator), Menge und Einheit:\n{raw}",
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=_GeminiParseResult,
                ),
                bypass_limits=True,
                is_background=True,
                context="ingredient_parser",
            )
            if response is None:
                return None

            result = _GeminiParseResult.model_validate_json(response.text)
            return ParsedIngredient(
                quantity=result.quantity,
                unit=result.unit,
                name=result.name,
                note=result.note,
                confidence=0.8,
            )
        except HttpError:
            raise
        except Exception:
            return None
