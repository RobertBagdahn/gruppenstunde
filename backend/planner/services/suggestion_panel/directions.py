"""Directions (themes) per meal type, defined as data.

Each direction has a predicate over a Candidate. Candidates are assigned to the first matching
direction in ``assign_order`` so that specific directions are filled before broad fallbacks;
the panel shows them in ``DIRECTIONS`` order.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from . import traits as t
from .traits import Candidate

CARDS_PER_DIRECTION = 4

MAIN_TYPES = ("warm_meal", "cold_meal")
BREAKFAST_WORDS_WARM = (
    "rührei",
    "spiegelei",
    "eierkuchen",
    "eiergericht",
    "pfannkuchen",
    "waffel",
    "omelett",
    "french toast",
    "pancake",
)
BREAKFAST_WORDS_MUESLI = ("müsli", "porridge", "brei", "haferflocken", "granola", "grieß", "overnight")
BREAKFAST_WORDS_FRUIT = ("joghurt", "quark", "skyr", "obst", "smoothie", "banane", "beeren", "frucht")
ONE_POT_WORDS = ("eintopf", "suppe", "one pot", "one-pot", "topf", "lagerfeuer", "auflauf", "gulasch", "chili", "curry")
CHEAP_PRICE_PP = 1.5


@dataclass(frozen=True)
class Direction:
    key: str
    label: str
    hint: str
    match: Callable[[Candidate], bool]
    kinds: tuple[str, ...] = ("recipe",)


def _has(c: Candidate, words: tuple[str, ...]) -> bool:
    return c.has_word(words)


def _is_dessert(c: Candidate) -> bool:
    return c.kind == "recipe" and c.recipe_type == "dessert"


def _main_candidate(c: Candidate) -> bool:
    return c.kind == "recipe" and c.recipe_type in MAIN_TYPES


MAIN_DIRECTIONS: tuple[Direction, ...] = (
    Direction("classic", "Klassiker", "Bewährte Gerichte", lambda c: _main_candidate(c)),
    Direction(
        "vegetarian",
        "Vegetarisch / Vegan",
        "Ohne Fleisch und Fisch",
        lambda c: _main_candidate(c) and t.is_vegetarian(c) is True,
    ),
    Direction(
        "one_pot",
        "One-Pot / Lagerfeuer",
        "Ein Topf, wenig Aufwand",
        lambda c: _main_candidate(c) and _has(c, ONE_POT_WORDS),
    ),
    Direction(
        "quick_cheap",
        "Schnell & günstig",
        "Wenig Geld, wenig Zeit",
        lambda c: _main_candidate(c) and c.price_pp is not None and c.price_pp <= CHEAP_PRICE_PP,
    ),
)
MAIN_ASSIGN_ORDER = ("one_pot", "vegetarian", "quick_cheap", "classic")
DESSERT_DIRECTION = Direction("dessert", "Nachtisch", "Süßer Abschluss", _is_dessert)

BREAKFAST_DIRECTIONS: tuple[Direction, ...] = (
    Direction(
        "bread",
        "Brot & Aufstrich",
        "Brot, Brötchen, Aufstriche",
        lambda c: c.recipe_type in ("breakfast", "cold_meal", "snack"),
    ),
    Direction(
        "muesli",
        "Müsli & Brei",
        "Müsli, Porridge, Haferbrei",
        lambda c: _has(c, BREAKFAST_WORDS_MUESLI) and c.recipe_type in ("breakfast", "dessert", "snack"),
    ),
    Direction(
        "warm",
        "Warm (Ei, Pfannkuchen)",
        "Warmes Frühstück",
        lambda c: _has(c, BREAKFAST_WORDS_WARM) and c.recipe_type in ("breakfast", "warm_meal", "snack"),
    ),
    Direction(
        "fruit_yogurt",
        "Obst & Joghurt",
        "Frisch und leicht",
        lambda c: _has(c, BREAKFAST_WORDS_FRUIT) and c.recipe_type in ("breakfast", "dessert", "snack"),
    ),
)
BREAKFAST_ASSIGN_ORDER = ("warm", "muesli", "fruit_yogurt", "bread")

SNACK_DIRECTIONS: tuple[Direction, ...] = (
    Direction("fruit_veg", "Obst & Gemüse", "Frisch und gesund", t.is_fruit_or_veg, ("recipe", "ingredient")),
    Direction(
        "sweet",
        "Süß",
        "Etwas Süßes",
        lambda c: t.is_sweet(c) is True and c.recipe_type != "drink",
        ("recipe", "ingredient"),
    ),
    Direction(
        "savory",
        "Herzhaft",
        "Etwas Herzhaftes",
        lambda c: t.is_sweet(c) is not True and c.recipe_type != "drink",
        ("recipe", "ingredient"),
    ),
    Direction(
        "homemade",
        "Selbstgemacht",
        "Zum Mitmachen und Zubereiten",
        lambda c: c.kind == "recipe" and t.preparation(c) == "some",
    ),
)
SNACK_ASSIGN_ORDER = ("fruit_veg", "homemade", "sweet", "savory")

DRINK_DIRECTIONS: tuple[Direction, ...] = (
    Direction("cold", "Kalt", "Erfrischend", lambda c: not t.is_warm_drink(c), ("recipe", "ingredient")),
    Direction("warm", "Warm", "Zum Aufwärmen", t.is_warm_drink, ("recipe", "ingredient")),
    Direction("mixed", "Selbstgemischt", "Schorle, Tee und Co.", t.is_mixed_drink),
    Direction(
        "ready",
        "Fertiggetränk",
        "Direkt trinkfertig",
        lambda c: c.kind == "ingredient",
        ("ingredient",),
    ),
)
DRINK_ASSIGN_ORDER = ("warm", "mixed", "ready", "cold")


@dataclass(frozen=True)
class MealTypeConfig:
    directions: tuple[Direction, ...]
    assign_order: tuple[str, ...]
    recipe_types: tuple[str, ...]
    ingredient_sections: tuple[str, ...]
    ingredient_ratio: float  # target share of ingredient cards, 0 = recipes only


MEAL_TYPE_CONFIG: dict[str, MealTypeConfig] = {
    "breakfast": MealTypeConfig(
        BREAKFAST_DIRECTIONS, BREAKFAST_ASSIGN_ORDER, ("breakfast", "dessert", "snack", "cold_meal"), (), 0.0
    ),
    "lunch": MealTypeConfig(MAIN_DIRECTIONS, MAIN_ASSIGN_ORDER, (*MAIN_TYPES, "dessert"), (), 0.0),
    "dinner": MealTypeConfig(MAIN_DIRECTIONS, MAIN_ASSIGN_ORDER, (*MAIN_TYPES, "dessert"), (), 0.0),
    "snack": MealTypeConfig(
        SNACK_DIRECTIONS,
        SNACK_ASSIGN_ORDER,
        ("snack", "dessert"),
        ("Obst", "Gemüse", "Milch & Pflanzendrinks"),
        0.5,
    ),
    "drinks": MealTypeConfig(
        DRINK_DIRECTIONS,
        DRINK_ASSIGN_ORDER,
        ("drink",),
        ("Wasser & Erfrischungsgetränke", "Milch & Pflanzendrinks"),
        0.5,
    ),
}


def directions_for(meal_type: str, with_dessert: bool) -> tuple[tuple[Direction, ...], tuple[str, ...]]:
    """Return (display order, assign order) for a meal type, adding dessert for main meals if requested."""
    config = MEAL_TYPE_CONFIG.get(meal_type, MEAL_TYPE_CONFIG["snack"])
    directions = config.directions
    assign_order = config.assign_order
    if with_dessert and meal_type in ("lunch", "dinner"):
        directions = (*directions, DESSERT_DIRECTION)
        assign_order = ("dessert", *assign_order)
    return directions, assign_order
