"""Typical weights for piece and container units, used before asking the AI.

Keys are matched as substrings against the lowercased ingredient name and the
import query ("tk blätterteig"); the longest matching key wins. The "" key is the
unit's fallback. All values in grams (liquids at ~1 g/ml).
"""

from __future__ import annotations

import re

# Size classes from the line parser → factor on a medium piece.
SIZE_FACTORS: dict[str, float] = {"small": 0.5, "medium": 1.0, "large": 1.5}

# One medium piece of a countable ingredient.
PIECE_WEIGHTS_G: dict[str, float] = {
    "zwiebel": 100,
    "schalotte": 30,
    "frühlingszwiebel": 15,
    "lauchzwiebel": 15,
    "knoblauchzehe": 5,
    "knoblauch": 5,
    "tomate": 120,
    "kirschtomate": 15,
    "cherrytomate": 15,
    "cocktailtomate": 15,
    "strauchtomate": 90,
    "fleischtomate": 250,
    "paprika": 180,
    "paprikaschote": 180,
    "karotte": 80,
    "möhre": 80,
    "kartoffel": 100,
    "süßkartoffel": 300,
    "gurke": 400,
    "zucchini": 250,
    "aubergine": 300,
    "champignon": 20,
    "olive": 4,
    "ei": 60,
    "eier": 60,
    "hühnerei": 60,
    "apfel": 150,
    "birne": 150,
    "banane": 120,
    "zitrone": 100,
    "limette": 60,
    "orange": 200,
    "avocado": 200,
    "chili": 10,
    "chilischote": 10,
    "peperoni": 10,
    "radieschen": 15,
    "brötchen": 60,
    "toast": 25,
    "toastbrot": 25,
    "tortilla": 40,
    "wrap": 60,
    "fenchel": 250,
    "kohlrabi": 300,
    "mango": 300,
    "pfirsich": 150,
    "aprikose": 50,
    "pflaume": 40,
    "kiwi": 80,
    "hähnchenbrustfilet": 150,
    "hähnchenschenkel": 250,
    "würstchen": 50,
    "bratwurst": 120,
    "lorbeerblatt": 0.2,
    "nelke": 0.1,
    "wacholderbeere": 0.1,
    "mozzarella": 125,
}

# Container and bunch units: unit key → {keyword: grams}; "" is the unit fallback.
UNIT_WEIGHTS_G: dict[str, dict[str, float]] = {
    "packung": {
        "": 250,
        "backpulver": 16,
        "vanillezucker": 8,
        "vanillinzucker": 8,
        "puddingpulver": 37,
        "sahnesteif": 8,
        "gelatine": 9,
        "trockenhefe": 7,
        "hefe": 7,
        "blätterteig": 275,
        "tk blätterteig": 450,
        "feta": 200,
        "mozzarella": 125,
        "schafskäse": 200,
        "frischkäse": 200,
        "quark": 250,
        "butter": 250,
        "spätzle": 500,
        "nudeln": 500,
        "spaghetti": 500,
        "reis": 500,
        "tortellini": 250,
        "gnocchi": 400,
        "speck": 125,
        "schinken": 100,
        "lachs": 200,
        "spinat": 450,
        "erbsen": 450,
    },
    "dose": {"": 400, "tomaten": 400, "mais": 285, "kokosmilch": 400, "thunfisch": 150, "kichererbsen": 400},
    "glas": {"": 350, "wein": 150, "weißwein": 150, "rotwein": 150, "wasser": 200, "milch": 200, "saft": 200},
    "flasche": {"": 500, "wein": 750, "bier": 500},
    "becher": {"": 200, "sahne": 200, "schmand": 200, "joghurt": 150, "crème fraîche": 200, "quark": 250},
    "bund": {
        "": 20,
        "petersilie": 30,
        "schnittlauch": 30,
        "dill": 20,
        "basilikum": 20,
        "rosmarin": 20,
        "thymian": 15,
        "koriander": 25,
        "minze": 20,
        "lauchzwiebel": 100,
        "frühlingszwiebel": 100,
        "radieschen": 150,
        "suppengrün": 300,
        "möhre": 500,
        "karotte": 500,
    },
    "topf": {"": 25, "basilikum": 25},
    "zweig": {"": 1, "rosmarin": 1, "thymian": 0.5},
    "stiel": {"": 1},
    "stängel": {"": 2, "sellerie": 40},
    "blatt": {"": 0.4, "lorbeer": 0.2, "salbei": 0.5, "gelatine": 1.7, "kohl": 30, "salat": 15},
    "stange": {"": 100, "lauch": 200, "porree": 200, "zimt": 3, "vanille": 3, "sellerie": 60, "staudensellerie": 60},
    "knolle": {"": 300, "sellerie": 700, "knoblauch": 50, "fenchel": 250, "ingwer": 50},
    "zehe": {"": 5},
    "scheibe": {"": 20, "toast": 25, "brot": 40, "käse": 20, "schinken": 15, "zitrone": 10, "speck": 10},
    "würfel": {"": 10, "hefe": 42, "brühe": 10},
    "handvoll": {"": 30},
    "schuss": {"": 10},
    "tropfen": {"": 0.05},
    "kopf": {"": 300, "salat": 300, "knoblauch": 50, "kohl": 1000, "brokkoli": 400, "blumenkohl": 800},
    "kugel": {"": 125, "mozzarella": 125, "eis": 60},
    "rolle": {"": 275, "blätterteig": 275, "pizzateig": 400, "keks": 200},
    "beutel": {"": 125, "reis": 125, "tee": 2},
    "pfund": {"": 500},
}

# Density for ingredients without an own value (stored 1.0): keyword → g/ml.
# Dry, light categories also override a stored near-water default (powders are never ~1 g/ml).
LIGHT_DRY_KEYWORDS: tuple[str, ...] = ("pulver", "flocken", "getrocknet", "gerebelt", "gemahlen")
CATEGORY_DENSITIES: dict[str, float] = {
    "pulver": 0.5,
    "flocken": 0.4,
    "getrocknet": 0.3,
    "gerebelt": 0.3,
    "gemahlen": 0.5,
    "pfeffer": 0.5,
    "zimt": 0.5,
    "paprika edelsüß": 0.5,
    "curry": 0.5,
    "kakao": 0.5,
    "oregano": 0.25,
    "majoran": 0.25,
    "öl": 0.92,
    "honig": 1.4,
    "sirup": 1.35,
    "zucker": 0.85,
    "puderzucker": 0.6,
    "mehl": 0.55,
    "stärke": 0.6,
    "salz": 1.2,
    "reis": 0.85,
    "haferflocken": 0.4,
    "grieß": 0.65,
    "sesam": 0.6,
    "kerne": 0.55,
    "semmelbrösel": 0.45,
    "paniermehl": 0.45,
    "joghurt": 1.05,
    "quark": 1.05,
}


def lookup_by_keyword(table: dict[str, float], *texts: str) -> float | None:
    """Value of the longest key contained in any of ``texts`` (lowercased); the "" key last."""
    haystacks = [text.lower() for text in texts if text]
    best_key: str | None = None
    for key in table:
        if key and any(key in haystack for haystack in haystacks) and (best_key is None or len(key) > len(best_key)):
            best_key = key
    if best_key is not None:
        return table[best_key]
    return table.get("")


def lookup_piece_weight(*texts: str) -> float | None:
    """Typical piece weight for an ingredient name, matched word by word.

    A word matches a key exactly, as plural ("Zwiebeln") or as compound head
    ("Hühnerei"); short keys like "ei" only match whole words.
    """
    best: tuple[int, float] | None = None
    for text in texts:
        for word in re.findall(r"[^\W\d_]+", (text or "").lower()):
            for key, grams in PIECE_WEIGHTS_G.items():
                forms = {key, f"{key}n", f"{key}en", f"{key}s", f"{key}er", f"{key}e"}
                hit = word in forms or (len(key) >= 4 and any(word.endswith(form) for form in forms))
                if hit and (best is None or len(key) > best[0]):
                    best = (len(key), grams)
    return best[1] if best else None
