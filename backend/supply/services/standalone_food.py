"""Rules deciding which ingredients can be suggested as standalone food (snack or drink).

The retail section alone is too coarse (butter, flour, ginger, wine), so each section
has an allow list of name keywords plus an explicit deny list.
"""

from __future__ import annotations

from typing import Final

STANDALONE_SECTION_RULES: Final[dict[str, dict[str, tuple[str, ...]]]] = {
    "Obst": {
        "allow": ("",),
        "deny": ("zitrone", "limette", "avocado"),
    },
    "Gemüse": {
        "allow": ("gurke", "karotte", "möhre", "kohlrabi", "paprika", "radieschen", "tomate", "zuckerschote"),
        "deny": ("geraspelt", "gehackt", "gepresst", "gewürfelt", "entkernt"),
    },
    "Wasser & Erfrischungsgetränke": {
        "allow": ("wasser", "saft", "schorle", "limonade", "tee", "cola"),
        "deny": (
            "zitronensaft",
            "limettensaft",
            "bier",
            "wein",
            "sekt",
            "kochwasser",
            "gurkenwasser",
            "heiß",
            "lauwarm",
        ),
    },
    "Milch & Pflanzendrinks": {
        "allow": ("milch", "drink", "joghurt", "skyr", "quark", "gouda", "emmentaler", "cheddar", "käse (gouda)"),
        "deny": (
            "butter",
            "mascarpone",
            "ricotta",
            "sahne",
            "schmand",
            "creme",
            "frischkäse",
            "buttermilch",
            "schokolade",
            "ausgedrückt",
            "lauwarm",
        ),
    },
}


def is_standalone_candidate(name: str, section_name: str | None) -> bool:
    """Return True if an ingredient with this name and retail section is a standalone-food candidate."""
    if not section_name:
        return False
    rule = STANDALONE_SECTION_RULES.get(section_name)
    if rule is None:
        return False
    lowered = name.lower()
    if any(word in lowered for word in rule["deny"]):
        return False
    return any(word in lowered for word in rule["allow"])
