"""Candidate model and derived traits (sweet, vegetarian, kid friendly, preparation, heat source).

Every trait returns True, False or None (unknown). Unknown never excludes a candidate unless the
matching filter is active.
"""

from __future__ import annotations

from dataclasses import dataclass, field

SWEET_SUGAR_PER_100G = 10.0
SWEET_DRINK_SUGAR_PER_100G = 5.0
MEAT_WORDS = (
    "fleisch",
    "hack",
    "wurst",
    "fisch",
    "lachs",
    "schinken",
    "speck",
    "huhn",
    "hähnchen",
    "rind",
    "schwein",
    "thunfisch",
    "salami",
    "gelatine",
)
MEAT_SECTIONS = ("Fleisch", "Fisch & Meeresfrüchte", "Wurst & Aufschnitt")

SPICY_OR_ADULT = ("chili", "scharf", "curry", "pfeffer", "wein", "bier", "alkohol", "kaffee", "espresso", "glühwein")
COOKING_WORDS = (
    "backen",
    "gebacken",
    "braten",
    "gebraten",
    "kochen",
    "gekocht",
    "auflauf",
    "überbacken",
    "grill",
    "frittiert",
    "pfanne",
    "suppe",
    "eintopf",
    "nudel",
    "reis",
    "kartoffel",
    "pfannkuchen",
    "rührei",
    "spiegelei",
    "waffel",
    "omelett",
    "bratwurst",
    "stockbrot",
    "punsch",
    "tee",
    "kakao",
    "porridge",
)
OVEN_WORDS = ("backofen", "ofen", "gebacken", "auflauf", "überbacken", "kuchen", "muffin", "lasagne", "pizza")
GRILL_WORDS = ("grill", "bratwurst")
CAMPFIRE_WORDS = ("stockbrot", "lagerfeuer", "knüppel", "schlangenbrot")
PERISHABLE_WORDS = ("hack", "frischkäse", "quark", "joghurt", "sahne", "fisch", "fleisch", "wurst", "ei ", "eier")
WARM_DRINK_WORDS = ("tee", "kakao", "punsch", "heiß", "glühwein", "warm", "kaffee", "milch heiß")
MIXED_DRINK_WORDS = ("schorle", "limonade", "eistee", "sirup", "mix", "bowle", "smoothie", "saftschorle", "shake")
FRUIT_VEG_WORDS = ("obst", "gemüse", "apfel", "banane", "beeren", "karotte", "gurke", "möhre", "rohkost", "salat")
DAIRY_DRINK_ALLOW = ("h-milch", "hafer", "soja", "mandel", "pflanzen")


@dataclass
class Candidate:
    kind: str  # "recipe" | "ingredient"
    id: int
    title: str
    slug: str = ""
    recipe_type: str = ""
    section: str = ""
    description: str = ""
    sugar_per_100g: float | None = None
    price_pp: float | None = None
    tag_ids: set[int] = field(default_factory=set)
    tag_names: set[str] = field(default_factory=set)
    embedding: list[float] | None = None
    usage_count: int = 0
    quality: float = 0.0
    item_count: int = 0
    child_score: int | None = None
    ingredient_names: str = ""
    ingredient_sections: set[str] = field(default_factory=set)
    badge: str = "community"
    is_new: bool = False
    portion_id: int | None = None
    measuring_unit_id: int | None = None
    quantity: float | None = None
    score: float = 0.0
    direction: str = ""

    @property
    def text(self) -> str:
        return f"{self.title} {self.description}".lower()

    def has_word(self, words: tuple[str, ...]) -> bool:
        text = self.text
        return any(w in text for w in words)


def is_sweet(c: Candidate) -> bool | None:
    if c.sugar_per_100g is None:
        return None
    is_drink = c.recipe_type == "drink" or c.section == "Wasser & Erfrischungsgetränke"
    return c.sugar_per_100g >= (SWEET_DRINK_SUGAR_PER_100G if is_drink else SWEET_SUGAR_PER_100G)


def is_vegetarian(c: Candidate) -> bool | None:
    """Tags win; otherwise infer from ingredient sections and meat words (needs known ingredients)."""
    if "Vegetarisch" in c.tag_names or "Vegan" in c.tag_names:
        return True
    if c.kind == "ingredient":
        if c.section in MEAT_SECTIONS or c.has_word(MEAT_WORDS):
            return False
        if c.section in ("Obst", "Gemüse", "Wasser & Erfrischungsgetränke"):
            return True
        return None
    if (
        c.has_word(MEAT_WORDS)
        or any(w in c.ingredient_names for w in MEAT_WORDS)
        or c.ingredient_sections & set(MEAT_SECTIONS)
    ):
        return False
    if c.item_count > 0 and c.ingredient_names:
        return True
    return None


def is_kid_friendly(c: Candidate) -> bool | None:
    """Kid friendliness is derived, not read from the placeholder child_score of 1."""
    if c.has_word(SPICY_OR_ADULT):
        return False
    if c.kind == "ingredient":
        if c.child_score is not None and c.child_score > 1:
            return True
        if c.section in ("Obst", "Milch & Pflanzendrinks", "Wasser & Erfrischungsgetränke"):
            return True
        return None
    if c.sugar_per_100g is None:
        return None
    return True


def preparation(c: Candidate) -> str | None:
    """'none' = ready to eat, 'some' = needs preparation, None = unknown."""
    if c.kind == "ingredient":
        return "none"
    if c.item_count == 0:
        return None
    if c.recipe_type in ("cold_meal", "snack", "drink", "dessert", "breakfast") and not c.has_word(COOKING_WORDS):
        return "none" if c.item_count <= 5 else "some"
    return "some"


def required_heat_sources(c: Candidate) -> set[str]:
    """Heat sources of which at least one is needed; empty set = no cooking needed."""
    if c.kind == "ingredient":
        return set()
    text_oven = c.has_word(OVEN_WORDS)
    if text_oven:
        return {"stove_oven"}
    if c.has_word(CAMPFIRE_WORDS):
        return {"campfire"}
    if c.has_word(GRILL_WORDS):
        return {"grill", "campfire"}
    if c.recipe_type == "warm_meal" or c.has_word(COOKING_WORDS):
        return {"stove_oven", "gas_burner", "campfire", "grill"}
    return set()


def needs_cooling(c: Candidate) -> bool:
    if c.kind == "ingredient":
        if c.section != "Milch & Pflanzendrinks":
            return False
        return not any(w in c.title.lower() for w in DAIRY_DRINK_ALLOW)
    return c.has_word(PERISHABLE_WORDS)


def is_warm_drink(c: Candidate) -> bool:
    return c.has_word(WARM_DRINK_WORDS)


def is_mixed_drink(c: Candidate) -> bool:
    return c.kind == "recipe" and (c.has_word(MIXED_DRINK_WORDS) or c.item_count >= 2)


def is_fruit_or_veg(c: Candidate) -> bool:
    if c.kind == "ingredient":
        return c.section in ("Obst", "Gemüse")
    return c.has_word(FRUIT_VEG_WORDS)


def trait_labels(c: Candidate) -> list[str]:
    """Short reason chips shown on a card."""
    labels: list[str] = []
    sweet = is_sweet(c)
    if sweet is True:
        labels.append("süß")
    elif sweet is False:
        labels.append("herzhaft")
    if preparation(c) == "none":
        labels.append("ohne Vorbereitung")
    if is_kid_friendly(c) is True:
        labels.append("kinderfreundlich")
    if is_vegetarian(c) is True:
        labels.append("vegetarisch")
    return labels
