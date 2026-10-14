"""Structured parsing of recipe ingredient lines.

Turns "2 Pck. Blätterteig (TK)", "15 Zehe/n Knoblauch", "Frischer Ingwer: ca. 60–80 g"
or "Tomaten, passierte" into quantity, canonical unit, size, name, specifiers and note.
Specifiers ("rot", "passiert", "edelsüß") change which ingredient is meant and become
part of the matcher query; everything else ("lauwarm", "für die Form") is a note.
Pure functions, no database access.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from typing import Literal

from pydantic import BaseModel, Field

from recipe.data.ingredient_line_vocabulary import (
    CHOPPED_HERB_EL_GRAMS,
    FAT_HEADS,
    HERB_HEADS,
    NOTE_LEADING_WORDS,
    NOTE_ONLY_SPECIFIERS,
    SEASONING_HEADS,
    SIZE_WORDS,
    SPECIFIER_FORMS,
    SPOON_MODIFIERS,
    TO_TASTE_PHRASES,
    UNIT_SPELLINGS,
)

QuantityKind = Literal["exact", "range", "to_taste", "none"]
SizeClass = Literal["small", "medium", "large"]


class ParsedLine(BaseModel):
    """One recipe ingredient line split into its parts."""

    source_line: str
    quantity: float | None = None
    unit: str = ""
    quantity_kind: QuantityKind = "none"
    size: SizeClass | None = None
    name: str = ""
    specifiers: list[str] = Field(default_factory=list)
    note: str = ""
    # Size as written ("große"), kept for the note.
    size_word: str = ""
    # Weight of one unit stated in the line: "1 Dose Tomaten (425 g)", "Lammkeule (ca. 2 kg)".
    unit_weight_g: float | None = None

    @property
    def query(self) -> str:
        """Matcher query: the specifiers that select an ingredient, then the name."""
        relevant = [spec for spec in self.specifiers if spec not in NOTE_ONLY_SPECIFIERS]
        return " ".join([*relevant, self.name]).strip()

    @property
    def has_amount(self) -> bool:
        return self.quantity_kind in ("exact", "range") and bool(self.quantity)


# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

_UNICODE_FRACTIONS = {"½": " 1/2", "¼": " 1/4", "¾": " 3/4", "⅓": " 1/3", "⅔": " 2/3", "⅛": " 1/8"}
_NUMBER = r"\d+(?:[.,]\d+)?(?:\s+\d+/\d+)?|\d+/\d+"
_QUANTITY = re.compile(
    rf"^(?:(?:ca\.?|circa|etwa|ungefähr|rund)\s*)?(?P<a>{_NUMBER})"
    rf"(?:\s*(?:-|bis)\s*(?P<b>{_NUMBER}))?(?=\s|[^\W\d_]|$)",
    re.IGNORECASE,
)
_COLON_FORMAT = re.compile(r"^(?P<name>[^:\d]{2,}?)\s*:\s*(?P<amount>(?:ca\.?|circa|etwa|\d|n\.\s*b\.).*)$", re.I)
_PLURAL_MARKER = re.compile(r"(?<=[^\W\d_])(?:\((?:n|s|en|er|e|r|nen|se)\)|/(?:n|e|en|s|er|nen))(?=[\s,()]|$)")
_WEIGHT_QUALIFIER = re.compile(
    r"^(?:(?:ca\.?|circa|etwa|je|à|a)\s*)?(?P<value>\d+(?:[.,]\d+)?)\s*(?P<unit>kg|g|ml|l)\b\.?"
    r"(?:\s*(?:pro|je|das)\s+stück)?$",
    re.IGNORECASE,
)
_ORIGIN = re.compile(r"^(?:vom|von\s+(?:der|dem)?|aus\s+dem)\s*(?P<noun>[^\W\d_][\w-]*)$", re.IGNORECASE)
_ADJECTIVE = re.compile(r"^[a-zäöüß][a-zäöüß-]{2,}(?:e|er|es|en)$")
_PERCENT = re.compile(r"^(?P<value>\d+(?:[.,]\d+)?)\s*%(?:\s*fett(?:\s*i\.\s*tr\.)?)?$", re.IGNORECASE)
_SIZE_GRADE = re.compile(r"^gr(?:ö|oe)(?:ß|ss)e\s+[smlx]{1,3}$", re.IGNORECASE)
_COMPOUND_PREFIX = re.compile(r"^[^\W\d_][\w]*-$")
_SPLIT_CONJUNCTION = re.compile(r"\s+(?:und|&)\s+", re.IGNORECASE)

_UNIT_LOOKUP: list[tuple[str, str]] = sorted(
    ((spelling, unit) for unit, spellings in UNIT_SPELLINGS.items() for spelling in spellings),
    key=lambda pair: len(pair[0]),
    reverse=True,
)
_SIZE_LOOKUP = sorted(SIZE_WORDS, key=len, reverse=True)
_TO_TASTE_LOOKUP = sorted(TO_TASTE_PHRASES, key=len, reverse=True)
_UNIT_UNITS_FOR_WEIGHT = {"kg": 1000.0, "g": 1.0, "ml": 1.0, "l": 1000.0}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def parse_line(text: str) -> ParsedLine:
    """Parse a free-text ingredient line."""
    source = " ".join(text.split())
    working = _clean(source)
    working = _reorder_colon_format(working)

    parsed = ParsedLine(source_line=source)
    working = _take_quantity(working, parsed)
    if parsed.quantity is None:
        working = _take_to_taste(working, parsed)
    working = _take_size(working, parsed)
    working = _take_unit(working, parsed)
    working = _take_size(working, parsed)
    _take_name(working, parsed)
    return parsed


def parse_cells(amount: str, name: str, properties: str = "") -> ParsedLine:
    """Parse a structured row (Chefkoch ingredient table): amount cell, name, properties."""
    text = " ".join(part for part in (amount.strip(), name.strip()) if part)
    if properties.strip():
        text = f"{text} ({properties.strip()})"
    return parse_line(text)


def split_compound(parsed: ParsedLine, is_known: Callable[[str], bool]) -> list[ParsedLine]:
    """Split "Salz und Pfeffer" into one line per ingredient when both parts are known.

    Specifiers and note stay with the last part ("Salz und Pfeffer (schwarzer)"),
    the amount is shared.
    """
    parts = _SPLIT_CONJUNCTION.split(parsed.name)
    if len(parts) < 2 or not all(part.strip() and is_known(part.strip()) for part in parts):
        return [parsed]
    lines: list[ParsedLine] = []
    for index, part in enumerate(parts):
        is_last = index == len(parts) - 1
        lines.append(
            parsed.model_copy(
                update={
                    "name": part.strip(),
                    "specifiers": list(parsed.specifiers) if is_last else [],
                    "note": parsed.note if is_last else "",
                }
            )
        )
    return lines


def to_taste_default(parsed: ParsedLine) -> tuple[float, str, str] | None:
    """Default amount for a line without amount: (quantity, unit, note) or None.

    Seasonings get 1 Prise, oil and fat 1 EL, fresh herbs 1 EL chopped (as grams).
    """
    if parsed.has_amount:
        return None
    head = parsed.name.lower()
    words = head.split()
    last = words[-1] if words else ""
    is_dried = "getrocknet" in parsed.specifiers
    if any(head == seasoning or last == seasoning for seasoning in SEASONING_HEADS) or last.endswith(
        ("pfeffer", "salz", "pulver", "gewürz")
    ):
        return 1.0, "prise", ""
    if any(head == fat or last == fat for fat in FAT_HEADS) or last.endswith("öl"):
        return 1.0, "el", ""
    if any(head == herb or last == herb for herb in HERB_HEADS) or last.endswith("kräuter"):
        if is_dried:
            return 1.0, "prise", ""
        return CHOPPED_HERB_EL_GRAMS, "g", "1 EL gehackt"
    return None


# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------


def _clean(text: str) -> str:
    for char, replacement in _UNICODE_FRACTIONS.items():
        text = text.replace(char, replacement)
    text = re.sub(r"[–—‒]", "-", text).replace(" ", " ")
    return " ".join(text.split())


def _reorder_colon_format(text: str) -> str:
    """'Frischer Ingwer: ca. 60-80 g' → 'ca. 60-80 g Frischer Ingwer'."""
    match = _COLON_FORMAT.match(text)
    if not match:
        return text
    return f"{match.group('amount').strip()} {match.group('name').strip()}"


def _to_number(value: str) -> float:
    total = 0.0
    for part in value.replace(",", ".").split():
        if "/" in part:
            numerator, denominator = part.split("/", 1)
            total += float(numerator) / float(denominator) if float(denominator) else 0.0
        else:
            total += float(part)
    return total


def _take_quantity(text: str, parsed: ParsedLine) -> str:
    match = _QUANTITY.match(text)
    if not match:
        return text
    low = _to_number(match.group("a"))
    if match.group("b"):
        high = _to_number(match.group("b"))
        parsed.quantity = round((low + high) / 2, 3)
        parsed.quantity_kind = "range"
    else:
        parsed.quantity = low
        parsed.quantity_kind = "exact"
    return text[match.end() :].strip()


def _starts_with_phrase(text: str, phrase: str) -> bool:
    lowered = text.lower()
    if not lowered.startswith(phrase):
        return False
    rest = lowered[len(phrase) :]
    return not rest or not (rest[0].isalnum()) or phrase.endswith(".")


def _take_to_taste(text: str, parsed: ParsedLine) -> str:
    for phrase in _TO_TASTE_LOOKUP:
        if _starts_with_phrase(text, phrase):
            parsed.quantity_kind = "to_taste"
            return text[len(phrase) :].strip()
    return text


def _take_size(text: str, parsed: ParsedLine) -> str:
    for word in _SIZE_LOOKUP:
        if _starts_with_phrase(text, word) and len(text) > len(word):
            parsed.size = SIZE_WORDS[word]  # type: ignore[assignment]
            parsed.size_word = text[: len(word)]
            return text[len(word) :].strip()
    return text


def _take_unit(text: str, parsed: ParsedLine) -> str:
    lowered = text.lower()
    for spelling, unit in _UNIT_LOOKUP:
        if not lowered.startswith(spelling):
            continue
        rest = text[len(spelling) :]
        # A unit is a whole word: "Glas Wein", not "Glasnudeln"; "g" needs a following space.
        if rest and (rest[0].isalnum() or rest[0] in "-"):
            continue
        if not rest.strip():
            # Only the unit is left ("1 Bund") — it is the name, not a unit.
            return text
        parsed.unit = unit
        rest = rest.strip()
        # "TL, gehäuft Naturjoghurt": the level marker belongs to the spoon.
        modifier = re.match(r"^,?\s*(gehäuft\w*|gestr\.|gestrichen\w*)\s*", rest, re.IGNORECASE)
        if modifier and unit in ("el", "tl"):
            factor = SPOON_MODIFIERS.get(modifier.group(1).lower(), 1.0)
            if parsed.quantity:
                parsed.quantity = round(parsed.quantity * factor, 3)
            rest = rest[modifier.end() :]
        if parsed.quantity is None and parsed.quantity_kind == "none":
            # "Prise(n) Salz" without a number means one of that unit.
            parsed.quantity = 1.0
            parsed.quantity_kind = "exact"
        return rest.strip()
    return text


def _flatten_qualifiers(text: str) -> list[str]:
    """Split bracket content and comma tails into single qualifiers, recursively."""
    qualifiers: list[str] = []
    for part in _split_top_level(text, ","):
        part = part.strip()
        if not part:
            continue
        outer, groups = _extract_brackets(part)
        if outer.strip():
            qualifiers.append(outer.strip())
        for group in groups:
            qualifiers.extend(_flatten_qualifiers(group))
    return qualifiers


def _take_name(text: str, parsed: ParsedLine) -> None:
    text = _PLURAL_MARKER.sub("", text)
    head_part, groups = _extract_brackets(text)
    comma_parts = _split_top_level(head_part, ",")
    name = comma_parts[0].strip()
    qualifiers = [(part.strip(), True) for part in comma_parts[1:] if part.strip()]
    for group in groups:
        qualifiers.extend((qualifier, False) for qualifier in _flatten_qualifiers(group))

    # Trailing "nach Belieben" inside the name: "Salz nach Belieben".
    lowered = name.lower()
    for phrase in _TO_TASTE_LOOKUP:
        if lowered.endswith(" " + phrase):
            name = name[: -len(phrase)].strip()
            if parsed.quantity is None:
                parsed.quantity_kind = "to_taste"
            break

    name = _take_name_adjectives(name, parsed)
    notes: list[str] = []
    for qualifier, from_comma in qualifiers:
        name = _classify_qualifier(qualifier, name, parsed, notes, from_comma=from_comma)
    parsed.name = name.strip(" ,;-")
    if parsed.size_word:
        notes.insert(0, parsed.size_word)
    parsed.note = ", ".join(dict.fromkeys(notes))


def _take_name_adjectives(name: str, parsed: ParsedLine) -> str:
    """Move specifier and size adjectives out of the name ("Frischer Ingwer", "Balsamico weiß")."""
    words = name.split()
    if len(words) < 2:
        return name
    # Leading adjectives ("Frischer Ingwer", "große rote Zwiebel").
    while len(words) > 1 and (words[0].lower() in SPECIFIER_FORMS or words[0].lower() in SIZE_WORDS):
        lowered = words.pop(0).lower()
        if lowered in SIZE_WORDS:
            parsed.size = SIZE_WORDS[lowered]  # type: ignore[assignment]
            parsed.size_word = lowered
        else:
            parsed.specifiers.append(SPECIFIER_FORMS[lowered])
    # Trailing adjectives ("Balsamico weiß", "Pesto grün").
    while len(words) > 1 and words[-1].lower() in SPECIFIER_FORMS:
        parsed.specifiers.append(SPECIFIER_FORMS[words.pop().lower()])
    return " ".join(words)


def _classify_qualifier(
    qualifier: str, name: str, parsed: ParsedLine, notes: list[str], from_comma: bool = False
) -> str:
    """Sort one qualifier into specifier, unit weight, compound prefix, name replacement or note."""
    text = qualifier.strip().strip(".").strip()
    lowered = text.lower()
    if not lowered:
        return name

    weight = _WEIGHT_QUALIFIER.match(lowered)
    if weight:
        grams = _to_number(weight.group("value")) * _UNIT_UNITS_FOR_WEIGHT[weight.group("unit").lower()]
        parsed.unit_weight_g = grams
        return name

    if {lowered, qualifier.strip().lower()} & {*TO_TASTE_PHRASES, "nach geschmack", "nach bedarf"}:
        if parsed.quantity is None:
            parsed.quantity_kind = "to_taste"
        return name

    percent = _PERCENT.match(lowered)
    if percent:
        parsed.specifiers.append(f"{percent.group('value').replace('.', ',')} %")
        return name

    if _SIZE_GRADE.match(lowered):
        notes.append(text)
        return name

    if lowered in SPECIFIER_FORMS:
        parsed.specifiers.append(SPECIFIER_FORMS[lowered])
        return name

    # "Steak (vom Schwertfisch)": the animal or plant decides the ingredient.
    origin = _ORIGIN.match(text)
    if origin:
        parsed.specifiers.append(origin.group("noun"))
        return name

    words = lowered.split()
    if words and words[0] in NOTE_LEADING_WORDS:
        notes.append(text)
        return name

    # "Reismehl (Kleb-)", "Bohnen (Mungo-)": the qualifier completes a compound.
    if _COMPOUND_PREFIX.match(text) and name:
        return f"{text[:-1]}{name.lower()}"

    # "Hefe (Trockenhefe)", "Essig (Weißweinessig)": a more specific compound of the head.
    head = name.split()[-1].lower() if name else ""
    if len(words) == 1 and head and len(head) >= 3 and lowered.endswith(head) and lowered != head:
        return text[:1].upper() + text[1:]

    if all(word in SPECIFIER_FORMS for word in words):
        parsed.specifiers.extend(SPECIFIER_FORMS[word] for word in words)
        return name

    # "Kräuter, italienische": an inflected adjective after the comma names the variety.
    if from_comma and len(words) == 1 and _ADJECTIVE.match(text):
        parsed.specifiers.append(lowered)
        return name

    notes.append(text)
    return name


# ---------------------------------------------------------------------------
# Bracket helpers
# ---------------------------------------------------------------------------


def _split_top_level(text: str, separator: str) -> list[str]:
    parts: list[str] = []
    depth = 0
    current: list[str] = []
    for index, char in enumerate(text):
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(0, depth - 1)
        # "3,5 % Fett" is a decimal comma, not a separator.
        is_decimal = 0 < index < len(text) - 1 and text[index - 1].isdigit() and text[index + 1].isdigit()
        if char == separator and depth == 0 and not is_decimal:
            parts.append("".join(current))
            current = []
        else:
            current.append(char)
    parts.append("".join(current))
    return parts


def _extract_brackets(text: str) -> tuple[str, list[str]]:
    """Return text outside top-level brackets and the content of each group."""
    outside: list[str] = []
    groups: list[str] = []
    depth = 0
    current: list[str] = []
    for char in text:
        if char == "(":
            if depth > 0:
                current.append(char)
            depth += 1
            continue
        if char == ")" and depth > 0:
            depth -= 1
            if depth == 0:
                groups.append("".join(current))
                current = []
            else:
                current.append(char)
            continue
        (current if depth > 0 else outside).append(char)
    if current:
        groups.append("".join(current))
    return " ".join("".join(outside).split()), groups
