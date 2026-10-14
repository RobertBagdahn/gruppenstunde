"""Vocabulary for parsing recipe ingredient lines ("2 Pck. Blätterteig (TK)").

Units map every spelling found on recipe sites (Chefkoch plural notations like
"Zehe/n", "Stange/n", "Prise(n)") to one canonical unit key. The canonical keys
are the ones `recipe.services.unit_gram_conversion` understands.
"""

from __future__ import annotations

# Canonical unit → spellings (matched case-insensitively, longest first).
UNIT_SPELLINGS: dict[str, tuple[str, ...]] = {
    "kg": ("kg", "kilogramm", "kilo"),
    "g": ("g", "gr.", "gr", "gramm"),
    "ml": ("ml", "milliliter"),
    "cl": ("cl",),
    "l": ("l", "liter", "ltr."),
    "el": ("el", "esslöffel", "eßlöffel", "essl."),
    "tl": ("tl", "teelöffel", "teel."),
    "msp": ("msp.", "msp", "messerspitze", "messerspitzen", "messerspitze/n"),
    "prise": ("prise", "prisen", "prise(n)", "prise/n"),
    "packung": ("pck.", "pck", "pk.", "päckchen", "päckchen/n", "packung", "packungen", "packung/en", "pkg."),
    "dose": ("dose", "dosen", "dose/n", "dose(n)"),
    "glas": ("glas", "gläser", "glas/gläser"),
    "becher": ("becher",),
    "flasche": ("flasche", "flaschen", "flasche/n"),
    "tasse": ("tasse", "tassen", "tasse/n"),
    "bund": ("bund", "bd.", "bunde", "bündel"),
    "zehe": ("zehe", "zehen", "zehe/n", "zehe(n)"),
    "zweig": ("zweig", "zweige", "zweig/e", "zweig(e)"),
    "stange": ("stange", "stangen", "stange/n", "stange(n)"),
    "knolle": ("knolle", "knollen", "knolle/n"),
    "stiel": ("stiel", "stiele", "stiel/e", "stiel(e)"),
    "stängel": ("stängel",),
    "blatt": ("blatt", "blätter", "blatt/blätter"),
    "topf": ("topf", "töpfe"),
    "scheibe": ("scheibe", "scheiben", "scheibe/n", "scheibe(n)"),
    "würfel": ("würfel",),
    "handvoll": ("handvoll", "hand voll"),
    "schuss": ("schuss", "schuß", "spritzer"),
    "tropfen": ("tropfen",),
    "kopf": ("kopf", "köpfe"),
    "stück": ("stück", "stk.", "stk", "st."),
    "rolle": ("rolle", "rollen", "rolle/n"),
    "beutel": ("beutel", "tüte", "tüten"),
    "pfund": ("pfund",),
    "kugel": ("kugel", "kugeln", "kugel/n"),
}

# Display spelling of each canonical unit (recipe items, AI prompts).
UNIT_DISPLAY: dict[str, str] = {
    "kg": "kg",
    "g": "g",
    "ml": "ml",
    "cl": "cl",
    "l": "l",
    "el": "EL",
    "tl": "TL",
    "msp": "Msp.",
}


def canonical_unit(unit: str) -> str:
    """'Esslöffel' → 'el', 'Pck.' → 'packung'; unknown spellings are lowercased."""
    key = (unit or "").strip().lower()
    for canonical, spellings in UNIT_SPELLINGS.items():
        if key == canonical or key in spellings:
            return canonical
    return key


def unit_display(unit: str) -> str:
    """'el' → 'EL', 'packung' → 'Packung'."""
    return UNIT_DISPLAY.get(unit, unit[:1].upper() + unit[1:])


# Spoon units may carry a level marker: "TL, gehäuft", "EL, gestr.".
SPOON_MODIFIERS: dict[str, float] = {
    "gehäuft": 1.5,
    "gehäufte": 1.5,
    "gehäufter": 1.5,
    "gestr.": 1.0,
    "gestrichen": 1.0,
    "gestrichene": 1.0,
    "gestrichener": 1.0,
}

# Amount words without a number: the amount is "nach Belieben".
TO_TASTE_PHRASES: tuple[str, ...] = (
    "nach belieben",
    "n. b.",
    "n.b.",
    "nb",
    "etwas",
    "einige",
    "evtl.",
    "eventuell",
    "wenig",
    "reichlich",
    "ein paar",
    "optional",
    "zum bestreuen",
    "zum garnieren",
    "zum braten",
    "zum frittieren",
)

# Size words → size class.
SIZE_WORDS: dict[str, str] = {
    "klein": "small",
    "kleine": "small",
    "kleiner": "small",
    "kleines": "small",
    "kleinen": "small",
    "m.-groß": "medium",
    "m.-große": "medium",
    "m.-großer": "medium",
    "m.-großes": "medium",
    "mittelgroß": "medium",
    "mittelgroße": "medium",
    "mittelgroßer": "medium",
    "mittelgroßes": "medium",
    "groß": "large",
    "große": "large",
    "großer": "large",
    "großes": "large",
    "großen": "large",
    "dicke": "large",
    "dicker": "large",
    "dünne": "small",
}

# Specifiers change WHICH ingredient is meant; stored in base form.
SPECIFIER_FORMS: dict[str, str] = {}
for _base, _forms in {
    "rot": ("rot", "rote", "roter", "rotes", "roten"),
    "weiß": ("weiß", "weiße", "weißer", "weißes", "weißen"),
    "gelb": ("gelb", "gelbe", "gelber", "gelbes"),
    "grün": ("grün", "grüne", "grüner", "grünes", "grünen"),
    "schwarz": ("schwarz", "schwarze", "schwarzer", "schwarzes"),
    "braun": ("braun", "braune", "brauner", "braunes"),
    "dunkel": ("dunkel", "dunkle", "dunkler", "dunkles"),
    "hell": ("hell", "helle", "heller", "helles"),
    "frisch": ("frisch", "frische", "frischer", "frisches", "frischen"),
    "getrocknet": ("getrocknet", "getrocknete", "getrockneter", "getrocknetes", "trocken"),
    "gemahlen": ("gemahlen", "gemahlene", "gemahlener", "gemahlenes"),
    "gerieben": ("gerieben", "geriebene", "geriebener", "geriebenes"),
    "gehackt": ("gehackt", "gehackte", "gehackter", "gehacktes"),
    "passiert": ("passiert", "passierte", "passierter"),
    "stückig": ("stückig", "stückige", "stückiger"),
    "geräuchert": ("geräuchert", "geräucherte", "geräucherter", "geräuchertes"),
    "tk": ("tk", "tiefgekühlt", "tiefgekühlte", "tiefkühl", "gefroren", "gefrorene"),
    "edelsüß": ("edelsüß", "edelsüße", "edelsüßes", "edelsüßer"),
    "rosenscharf": ("rosenscharf", "rosenscharfe", "rosenscharfes"),
    "scharf": ("scharf", "scharfe", "scharfer", "scharfes"),
    "mittelscharf": ("mittelscharf", "mittelscharfe", "mittelscharfer"),
    "süß": ("süß", "süße", "süßer", "süßes"),
    "mild": ("mild", "milde", "milder", "mildes"),
    "gemischt": ("gemischt", "gemischte", "gemischtes", "gemischter"),
    "mager": ("mager", "magere", "magerer"),
    "vollkorn": ("vollkorn",),
    "gesalzen": ("gesalzen", "gesalzene", "gesalzener"),
    "ungesalzen": ("ungesalzen", "ungesalzene"),
    "gekocht": ("gekocht", "gekochte", "gekochter", "gekochtes", "hart gekocht"),
    "geschält": ("geschält", "geschälte"),
    "flüssig": ("flüssig", "flüssige", "flüssiger"),
    "entsteint": ("entsteint", "entsteinte", "ohne stein"),
    "geschnitten": ("geschnitten", "geschnittene", "geschnittener"),
    "gewürfelt": ("gewürfelt", "gewürfelte", "gewürfelter"),
    "gerebelt": ("gerebelt", "gerebelte", "gerebelter"),
    "reif": ("reif", "reife", "reifer", "reifes"),
    "bunt": ("bunt", "bunte", "bunter", "buntes"),
    "trüb": ("trüb", "trübe", "trüber", "trübes", "naturtrüb", "naturtrübe", "naturtrüber"),
    "klar": ("klar", "klare", "klarer", "klares"),
    "extra virgin": ("extra virgin", "extra vergine", "nativ extra"),
}.items():
    for _form in _forms:
        SPECIFIER_FORMS[_form] = _base

# Specifiers that do not change the ingredient choice: kept as note only.
NOTE_ONLY_SPECIFIERS: frozenset[str] = frozenset({"geschält", "gekocht", "gehackt", "flüssig"})

# A qualifier starting with one of these words is an addition, never a specifier.
NOTE_LEADING_WORDS: tuple[str, ...] = (
    "für",
    "zum",
    "zur",
    "nach",
    "aus",
    "vom",
    "von",
    "mit",
    "ohne",
    "oder",
    "und",
    "alternativ",
    "z.",
    "z.b.",
    "evtl.",
    "ca.",
    "etwa",
    "je",
    "à",
    "a",
    "am",
    "wer",
    "bei",
    "in",
)

# Heads seasoned "nach Belieben" get 1 Prise.
SEASONING_HEADS: tuple[str, ...] = (
    "salz",
    "pfeffer",
    "cayennepfeffer",
    "paprikapulver",
    "paprika edelsüß",
    "chili",
    "chilipulver",
    "chiliflocken",
    "muskat",
    "muskatnuss",
    "zimt",
    "curry",
    "currypulver",
    "kreuzkümmel",
    "kümmel",
    "oregano",
    "majoran",
    "thymian getrocknet",
    "zucker",
    "kurkuma",
    "knoblauchpulver",
    "zwiebelpulver",
    "gewürz",
    "gewürze",
    "kräuter der provence",
    "italienische kräuter",
    "piment",
    "nelken",
    "ingwerpulver",
)

# Heads that get 1 EL "nach Belieben".
FAT_HEADS: tuple[str, ...] = (
    "öl",
    "olivenöl",
    "rapsöl",
    "sonnenblumenöl",
    "pflanzenöl",
    "speiseöl",
    "butter",
    "margarine",
    "fett",
    "butterschmalz",
    "schmalz",
    "kokosöl",
    "sesamöl",
)

# Fresh herbs that get 1 EL gehackt "nach Belieben".
HERB_HEADS: tuple[str, ...] = (
    "petersilie",
    "schnittlauch",
    "basilikum",
    "dill",
    "koriander",
    "minze",
    "kräuter",
    "gartenkräuter",
    "frische kräuter",
    "kerbel",
    "rosmarin",
    "thymian",
    "salbei",
    "estragon",
    "bärlauch",
)

# Rough grams for 1 EL of chopped fresh herbs.
CHOPPED_HERB_EL_GRAMS = 3.0
