"""Zentrale Wissensbasis für KI-Portionsvorschläge.

Single Source of Truth für:
- Typische Einheiten-Gewichte (EL, TL, Prise, Ei, Schuss, ...), die zuvor in
  vier unabhängigen Prompt-Stellen dupliziert und leicht unterschiedlich
  formuliert waren (`ingredient_ai_suggest_service.py` x2,
  `recipe/services/url_import_service.py`, `recipe/services/ingredient_enrichment.py`).
- Das gemeinsame `PortionSuggestion`-Schema samt `PortionType`-Enum, das von
  allen KI-Portionsvorschlägen verwendet wird.

Namenskonvention: Portionsnamen dürfen KEINE Ziffern enthalten. Das Gewicht
steckt ausschließlich in `weight_g`/`quantity`, niemals im Namen (siehe
openspec/changes/rework-ingredient-portion-ai-suggestions/design.md).
"""

from __future__ import annotations

import re
from enum import Enum

from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Typische Einheiten-Gewichte (konsolidiert aus den 4 vormals unabhängigen
# Prompt-Stellen). Wird sowohl als Konstante für Berechnungen als auch als
# Text-Baustein für Gemini-Prompts genutzt.
# ---------------------------------------------------------------------------

TYPICAL_UNIT_WEIGHTS: dict[str, float] = {
    "Esslöffel": 15.0,
    "Teelöffel": 5.0,
    "Prise": 0.3,
    "Schuss": 10.0,
    "Ei": 60.0,
    "Zehe": 4.0,
    "Gramm": 1.0,
    "Milliliter": 1.0,
}

TYPICAL_UNIT_WEIGHTS_PROMPT_TEXT = (
    "Typische Einheiten-Gewichte zur Orientierung: 1 Esslöffel = 15g, 1 Teelöffel = 5g, "
    "1 Prise = 0,3g, 1 Schuss = 10g, 1 Ei = 60g, 1 Zehe (Knoblauch) = 4g, 1 Gramm = 1g, "
    "1 Milliliter = 1g (dichteabhängig)."
)

_DIGIT_RE = re.compile(r"\d")


class PortionType(str, Enum):
    """Kategorie eines Portionsvorschlags."""

    SYSTEM_GRAMM = "system_gramm"
    REZEPTPORTION = "rezeptportion"
    PACKUNG = "packung"
    BELAG = "belag"
    BACKMENGE = "backmenge"


class PortionSuggestion(BaseModel):
    """Ein einzelner KI-Portionsvorschlag.

    `name` darf KEINE Ziffern enthalten — Gewichtsangaben gehören
    ausschließlich in `weight_g`/`quantity` (siehe design.md Decision 2).
    Mehrere Packungsgrößen werden über deskriptive Adjektive unterschieden
    (z.B. "Packung", "Großpackung"), nicht über Zahlen (Decision 3).
    """

    name: str = Field(description="Name der Portion OHNE Ziffern, z.B. 'Packung', 'Esslöffel', 'Scheibe'")
    weight_g: float = Field(description="Gewicht dieser Portion in Gramm")
    quantity: float = Field(default=1.0, description="Menge in der angegebenen Maßeinheit")
    measuring_unit_name: str = Field(
        description="Maßeinheit, z.B. 'Gramm', 'Milliliter', 'Tasse', 'Esslöffel', 'Stück'"
    )
    rank: int = Field(default=1, description="Rang (Sortierung) innerhalb der Portionsliste")
    portion_type: PortionType = Field(description="Kategorie: system_gramm/rezeptportion/packung/belag/backmenge")

    @field_validator("name")
    @classmethod
    def _no_digits_in_name(cls, value: str) -> str:
        if _DIGIT_RE.search(value):
            raise ValueError(
                f"Portionsname darf keine Ziffern enthalten, erhalten: '{value}'. "
                "Gewicht gehört ausschließlich in weight_g/quantity."
            )
        return value


class IngredientPortionSuggestSchema(BaseModel):
    """Strukturierter Portions-Vorschlag für eine Zutat.

    Verpflichtende Mindestabdeckung: genau eine System-Gramm-Portion,
    mindestens eine Rezeptportion, mindestens eine Packungsgröße.
    `belag`/`backmengen` sind nur befüllt, wenn die Zutat den jeweiligen Tag trägt.
    """

    system_gramm: PortionSuggestion = Field(description="Immer: name='g', weight_g=1, portion_type=system_gramm")
    rezeptportionen: list[PortionSuggestion] = Field(
        min_length=1, description="Typische Menge pro Person in einem Standardrezept (rank=1 ist die Normalportion)"
    )
    packungen: list[PortionSuggestion] = Field(
        min_length=1, description="Typische(r) Packungsgröße(n) aus dem Supermarkt, ggf. mehrere"
    )
    belag: list[PortionSuggestion] = Field(
        default_factory=list, description="Nur befüllt bei Tag 'breakfast-topping': Belag knapp/normal/üppig"
    )
    backmengen: list[PortionSuggestion] = Field(
        default_factory=list, description="Nur befüllt bei Tag 'baking-ingredient': typische Backmengen"
    )

    def all_portions(self) -> list[PortionSuggestion]:
        """Flache Liste aller enthaltenen Portionsvorschläge."""
        return [self.system_gramm, *self.rezeptportionen, *self.packungen, *self.belag, *self.backmengen]


def build_portion_prompt_section(*, is_breakfast_topping: bool, is_baking_ingredient: bool) -> str:
    """Baut den Portions-Abschnitt des Gemini-Prompts, abhängig von Zutat-Tags.

    Wird von allen KI-Portions-Erzeugungsstellen genutzt, damit Beispiele und
    Regeln konsistent bleiben.
    """
    lines = [
        "Gib Portionsvorschläge als strukturiertes Objekt zurück:",
        "- system_gramm: IMMER genau ein Eintrag mit name='g', weight_g=1, portion_type='system_gramm'.",
        "- rezeptportionen: MINDESTENS 1 Eintrag — die typische Menge pro Person in einem Standardrezept "
        "(rank=1 ist die Normalportion). Z.B. für Nudeln: name='Portion', weight_g=80; "
        "für Butter: name='Portion', weight_g=10.",
        "- packungen: MINDESTENS 1 Eintrag — typische Packungsgröße(n) aus dem Supermarkt. "
        "Bei mehreren plausiblen Größen mehrere Einträge mit deskriptiven Namen wie "
        "'Packung', 'Großpackung', 'Kleine Packung' verwenden (NIEMALS Zahlen im Namen).",
        "",
        "WICHTIG: name darf NIEMALS Ziffern enthalten (kein '125g', kein '1 Packung'). "
        "Das Gewicht steckt ausschließlich in weight_g, die Menge in quantity.",
        "",
        TYPICAL_UNIT_WEIGHTS_PROMPT_TEXT,
    ]
    if is_breakfast_topping:
        lines.append(
            "- belag: Diese Zutat ist ein Frühstücks-Belag. Gib GENAU 3 Einträge zurück: "
            "name='Belag knapp' (rank=2), name='Belag normal' (rank=1, Normalmenge), "
            "name='Belag üppig' (rank=3), jeweils mit realistischem weight_g für eine Scheibe Brot."
        )
    if is_baking_ingredient:
        lines.append(
            "- backmengen: Diese Zutat ist eine Backzutat. Gib MINDESTENS 1 Eintrag mit einer "
            "typischen Backmenge zurück (z.B. für ein Standardrezept wie einen Kuchen oder Brot)."
        )
    return "\n".join(lines)
