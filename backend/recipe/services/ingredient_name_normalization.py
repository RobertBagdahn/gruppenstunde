"""Deterministic normalisation of raw ingredient names before matching.

Handles what recipe sources and AI extractions leave in the name: plural brackets
(``Ei(er)``, ``Prise(n)``), leading amount words (``Prise Salz``), size words and grades
(``große``, ``Größe L``) and trailing qualifiers (``Mineralwasser mit Kohlensäure``).
Pure functions, no database access.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from recipe.services.ingredient_parser import SIZE_MODIFIERS

# "Ei(er)", "Prise(n)", "Möhre(n)": the bracket only marks the plural.
_PLURAL_BRACKET = re.compile(r"(?<=\w)\((?:n|s|en|er|e|r|nen|se)\)", re.IGNORECASE)

# "Größe L", "Groesse XL": a grade, not part of the name.
_SIZE_GRADE = re.compile(r"\bgr(?:ö|oe)(?:ß|ss)e\s+[SMLX]{1,3}\b", re.IGNORECASE)

# Leading amount words that are no ingredient ("Prise Salz", "Bund Petersilie").
_LEADING_AMOUNT_WORD = re.compile(
    r"^(?:prisen?|messerspitzen?|handvoll|bund|bündel|zehen?|scheiben?|stücke?|dosen?|packungen?|päckchen|"
    r"becher|tassen?|schuss|el|tl)\s+(?=\S)",
    re.IGNORECASE,
)

# Qualifier introductions that split head noun and addition.
_QUALIFIER_SPLIT = re.compile(r"\s+(?=(?:mit|ohne)\s)", re.IGNORECASE)
_BRACKET_GROUP = re.compile(r"\s*\(([^)]*)\)")

_EMPTY_BRACKETS = re.compile(r"\s*\(\s*\)")

_SIZE_WORDS = {word.lower() for word in SIZE_MODIFIERS}


def _split_top_level(text: str, separator: str = ",") -> list[str]:
    """Split on ``separator`` outside of brackets ("Mehl (wer mag, kann X)" stays one part)."""
    parts: list[str] = []
    depth = 0
    current: list[str] = []
    for char in text:
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(0, depth - 1)
        if char == separator and depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(char)
    parts.append("".join(current))
    return parts


@dataclass(frozen=True)
class NormalizedName:
    """Result of :func:`normalize_ingredient_name`."""

    raw: str
    text: str
    """Name used for matching: plural brackets, amount words and size words removed."""
    head: str | None = None
    """Head noun before ``,``, `` mit``/`` ohne`` or brackets when it differs from ``text``."""
    qualifiers: list[str] = field(default_factory=list)
    """Everything moved out of the name (sizes, additions); kept as a note."""

    @property
    def changed(self) -> bool:
        return self.text != self.raw.strip()


def normalize_ingredient_name(raw: str) -> NormalizedName:
    """Normalise ``raw`` for matching; the raw name stays available on the result."""
    original = raw.strip()
    if not original:
        return NormalizedName(raw=raw, text="")

    qualifiers: list[str] = []
    text = _PLURAL_BRACKET.sub("", original)

    remainder = _LEADING_AMOUNT_WORD.sub("", text, count=1)
    if remainder.strip():
        text = remainder

    for grade in _SIZE_GRADE.findall(text):
        qualifiers.append(grade)
    text = _EMPTY_BRACKETS.sub("", _SIZE_GRADE.sub("", text))

    segments: list[str] = []
    for segment in _split_top_level(text):
        words = segment.split()
        kept = [word for word in words if word.lower().strip("()") not in _SIZE_WORDS]
        qualifiers.extend(word for word in words if word.lower().strip("()") in _SIZE_WORDS)
        cleaned = " ".join(kept).strip()
        if cleaned:
            segments.append(cleaned)

    text = ", ".join(segments)
    if not text:
        # Nothing but sizes/amount words: do not invent a name, keep the plain original.
        return NormalizedName(raw=raw, text=original)

    head, extra = _split_head(text)
    qualifiers.extend(extra)
    return NormalizedName(
        raw=raw,
        text=text,
        head=head if head and head.lower() != text.lower() else None,
        qualifiers=qualifiers,
    )


def _split_head(text: str) -> tuple[str, list[str]]:
    """Head noun of ``text`` and the additions that were cut off."""
    extra: list[str] = []
    head = text

    comma_parts = [part.strip() for part in _split_top_level(head) if part.strip()]
    if len(comma_parts) > 1:
        head = comma_parts[0]
        extra.extend(comma_parts[1:])

    for match in _BRACKET_GROUP.finditer(head):
        extra.append(match.group(1).strip())
    head = _BRACKET_GROUP.sub("", head).strip()

    parts = _QUALIFIER_SPLIT.split(head, maxsplit=1)
    if len(parts) == 2:
        head = parts[0].strip()
        extra.append(parts[1].strip())

    return head, [item for item in extra if item]
