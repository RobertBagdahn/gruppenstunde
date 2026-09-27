"""Retail section mapping service.

Maps REWE product category strings (from ingredient descriptions) to RetailSection instances.
Used by the import command and batch-assignment command.
"""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from supply.data.retail_sections import resolve_section_name
from supply.services.retail_section_classifier import classify_retail_section

if TYPE_CHECKING:
    from supply.models import RetailSection

# Mapping: keyword substring (uppercase) → RetailSection NAME
# We use names instead of IDs because IDs vary between environments.
# The name is resolved to a RetailSection object at runtime.

KEYWORD_TO_RETAIL_SECTION_NAME: dict[str, str] = {
    # Süßigkeiten / Süßwaren
    "SCHOKOLADE": "Süßwaren",
    "SCHOKORIEGEL": "Süßwaren",
    "PRALIN": "Süßwaren",
    "FRUCHTGUMMI": "Süßwaren",
    "WAFFELN": "Süßwaren",
    "BONBON": "Süßwaren",
    "LAKRITZ": "Süßwaren",
    "DRAGEE": "Süßwaren",
    "KAUGUMMI": "Süßwaren",
    "MARZIPAN": "Süßwaren",
    "MONOPRALIN": "Süßwaren",
    "SPEZIALI./KANDIERTE": "Süßwaren",
    "TAFELSCHOKOLADE": "Süßwaren",
    # Nudeln & Reis & Getreide
    "TEIGWAREN": "Nudeln",
    "NUDEL": "Nudeln",
    "PASTA": "Nudeln",
    "REIS": "Nudeln & Reis & Getreide",
    "SPAGHETTI": "Nudeln",
    "COUSCOUS": "Nudeln & Reis & Getreide",
    # Milchprodukte
    "JOGHURT": "Joghurt, Quark & Desserts",
    "QUARK": "Joghurt, Quark & Desserts",
    "PUDDING": "Joghurt, Quark & Desserts",
    "MILCHREIS": "Joghurt, Quark & Desserts",
    "MILCH": "Milchprodukte & Käse",
    "SAHNE": "Milchprodukte & Käse",
    "SCHMAND": "Joghurt, Quark & Desserts",
    "BUTTERMILCH": "Milchprodukte & Käse",
    "SKYR": "Joghurt, Quark & Desserts",
    "CREME FRAICHE": "Joghurt, Quark & Desserts",
    "FRISCHKAESE": "Käse",
    "SCHAFSKAESE": "Käse",
    "SCHAFSKÄSE": "Käse",
    # Käse
    "KAESE": "Käse",
    "KÄSE": "Käse",
    "MOZZARELLA": "Käse",
    "PARMESAN": "Käse",
    "GOUDA": "Käse",
    # Tiefkühl (mehrdeutige Konvenienzprodukte -> eigene Gruppe statt Rateentscheidung, siehe D7)
    "TK-": "TK Fertiggerichte",
    "TIEFKUEHL": "TK Fertiggerichte",
    "TIEFKÜHL": "TK Fertiggerichte",
    # Kaffee und Tee
    "TEE BEUTEL": "Kaffee und Tee",
    "TEE ": "Kaffee und Tee",
    "KAFFEE": "Kaffee und Tee",
    "ESPRESSO": "Kaffee und Tee",
    "KAKAO": "Kaffee und Tee",
    # Backwaren
    "KEKS": "Süßwaren & Kekse",
    "KNÄCKEBROT": "Brot & Backwaren",
    "KNACKEBROT": "Brot & Backwaren",
    "LEBKUCHEN": "Süßwaren & Kekse",
    "ZWIEBACK": "Brot & Backwaren",
    "TOAST": "Brot & Backwaren",
    "BROT": "Brot & Backwaren",
    # Brotaufstriche
    "BROTAUFSTRICH": "Brotaufstriche",
    "NUSS-SCHOKO-CREME": "Brotaufstriche",
    "KONFITUER": "Brotaufstriche",
    "KONFITÜR": "Brotaufstriche",
    "MARMELADE": "Brotaufstriche",
    "HONIG": "Brotaufstriche",
    "NUTELLA": "Brotaufstriche",
    # Saucen und Dressings
    "SAUCE": "Öle & Soßen",
    "DRESSING": "Öle & Soßen",
    "KETCHUP": "Öle & Soßen",
    "SENF": "Öle & Soßen",
    "MAYONNAISE": "Öle & Soßen",
    "PESTO": "Öle & Soßen",
    "SOJASOSSE": "Öle & Soßen",
    "SOJASAUCE": "Öle & Soßen",
    # Gewürze
    "GEWUERZ": "Gewürze & Kräuter",
    "GEWÜRZ": "Gewürze & Kräuter",
    "KRAEUTER": "Gewürze & Kräuter",
    "KRÄUTER": "Gewürze & Kräuter",
    "PFEFFER": "Gewürze & Kräuter",
    "ZIMT": "Gewürze & Kräuter",
    "CURRY": "Gewürze & Kräuter",
    "PAPRIKA PULVER": "Gewürze & Kräuter",
    # Backzutaten
    "BACKZUTAT": "Mehl, Zucker & Backzutaten",
    "BACKMISCHUNG": "Mehl, Zucker & Backzutaten",
    "HEFE": "Mehl, Zucker & Backzutaten",
    "BACKPULVER": "Mehl, Zucker & Backzutaten",
    "VANILLEZUCKER": "Mehl, Zucker & Backzutaten",
    "GELATINE": "Mehl, Zucker & Backzutaten",
    "MEHL": "Mehl, Zucker & Backzutaten",
    "ZUCKER": "Mehl, Zucker & Backzutaten",
    "STAERKE": "Mehl, Zucker & Backzutaten",
    "STÄRKE": "Mehl, Zucker & Backzutaten",
    "SALZ": "Gewürze & Kräuter",
    # Konserven
    "DOSE": "Konserven & Gläser",
    "KONSERVEN": "Konserven & Gläser",
    "KONSERVE": "Konserven & Gläser",
    "DOSENOBST": "Konserven & Gläser",
    # Gemüse
    "GEMUESE": "Gemüse",
    "GEMÜSE": "Gemüse",
    "OLIVEN": "Gemüse",
    "GURKEN": "Gemüse",
    "GURKE": "Gemüse",
    "TOMATEN": "Gemüse",
    "TOMATE": "Gemüse",
    "SALAT": "Gemüse",
    "PILZE": "Gemüse",
    "PILZ": "Gemüse",
    "CHAMPIGNON": "Gemüse",
    "PAPRIKA": "Gemüse",
    "ZWIEBEL": "Gemüse",
    # Obst
    "OBST": "Obst",
    "TROCKENOBST": "Obst",
    "FRUCHT": "Obst",
    "BEEREN": "Obst",
    "APFEL": "Obst",
    "BANANE": "Obst",
    "ZITRONE": "Obst",
    "ORANGE": "Obst",
    "ANANAS": "Obst",
    # Fleisch und Fisch (getrennte Gruppen, D7)
    "FLEISCH": "Fleisch & Wurst",
    "FISCH": "Fisch",
    "LACHS": "Fisch",
    "THUNFISCH": "Fisch",
    "HAEHNCHEN": "Fleisch & Wurst",
    "HÄHNCHEN": "Fleisch & Wurst",
    "HUHN": "Fleisch & Wurst",
    "RIND": "Fleisch & Wurst",
    "SCHWEIN": "Fleisch & Wurst",
    "GEFLÜGEL": "Fleisch & Wurst",
    "GEFLUEGEL": "Fleisch & Wurst",
    # Wurst
    "WURST": "Fleisch & Wurst",
    "SALAMI": "Fleisch & Wurst",
    "SCHINKEN": "Fleisch & Wurst",
    "DAUERWURST": "Fleisch & Wurst",
    "AUFSCHNITT": "Fleisch & Wurst",
    # Nüsse / Hülsenfrüchte
    "KERNE": "Hülsenfrüchte & Nüsse",
    "NÜSSE": "Hülsenfrüchte & Nüsse",
    "NUESSE": "Hülsenfrüchte & Nüsse",
    "NUSS": "Hülsenfrüchte & Nüsse",
    "ERDNÜSSE": "Hülsenfrüchte & Nüsse",
    "ERDNUESSE": "Hülsenfrüchte & Nüsse",
    "MANDEL": "Hülsenfrüchte & Nüsse",
    "LINSEN": "Hülsenfrüchte & Nüsse",
    # Salzige Snacks
    "CHIPS": "Salzige Snacks",
    "CRACKER": "Salzige Snacks",
    "SALZSTANGEN": "Salzige Snacks",
    # Öl und Essig
    "OEL": "Öle & Essig",
    "ÖL": "Öle & Essig",
    "ESSIG": "Öle & Essig",
    "OLIVENOEL": "Öle & Essig",
    "OLIVENÖL": "Öle & Essig",
    "PFLANZENOEL": "Öle & Essig",
    "PFLANZENÖL": "Öle & Essig",
    "BALSAMICO": "Öle & Essig",
    "BALSAMIC": "Öle & Essig",
    # Müsli und Cerealien
    "MUESLI": "Brot & Backwaren",
    "MÜSLI": "Brot & Backwaren",
    "CEREALIEN": "Brot & Backwaren",
    "HAFERFLOCKEN": "Brot & Backwaren",
    "CORNFLAKES": "Brot & Backwaren",
    # Kartoffelprodukte
    "KARTOFFEL": "Gemüse",
    "POMMES": "TK Obst & Gemüse",
    "KLOESSE": "Gemüse",
    "KLÖSSE": "Gemüse",
    # Getränke
    "SAFT": "Alkoholfreie Getränke",
    "WASSER": "Alkoholfreie Getränke",
    "LIMONADE": "Alkoholfreie Getränke",
    "EISTEE": "Alkoholfreie Getränke",
    "SOFTDRINK": "Alkoholfreie Getränke",
    "NEKTAR": "Säfte & Smoothies",
    # Alkoholische Getränke — eigene Gruppe (retail-sections-restructure D3).
    "BIER": "Alkoholische Getränke",
    "SPIRITUOSE": "Alkoholische Getränke",
    "SEKT": "Alkoholische Getränke",
    "LIKOER": "Alkoholische Getränke",
    "LIKÖR": "Alkoholische Getränke",
    # Fertiggerichte (mehrdeutig zwischen TK Obst & Gemüse / TK Fleisch & Fisch -> eigene Gruppe, D7)
    "FERTIGGERICHT": "TK Fertiggerichte",
    "PIZZA": "TK Fertiggerichte",
    "FLAMMKUCHEN": "TK Fertiggerichte",
    # Eier
    "EIER": "Eier",
    "EI": "Eier",
    # Käse (Namen ohne "Käse")
    "CHEDDAR": "Käse",
    "EMMENTALER": "Käse",
    "FETA": "Käse",
    "HALLOUMI": "Käse",
    "MASCARPONE": "Käse",
    "RICOTTA": "Käse",
    "BUTTER": "Butter & Margarine",
    # Fleischersatz (eigene Gruppe statt Fleisch & Fisch, D7)
    "TOFU": "Fleischersatz",
    "SEITAN": "Fleischersatz",
    "TEMPEH": "Fleischersatz",
    # Aufstriche/Dips
    "HUMMUS": "Feinkost & Kühltheke",
    "GUACAMOLE": "Feinkost & Kühltheke",
    # Sonstiges
    "INGWER": "Gemüse",
    "BACON": "Wurst & Aufschnitt",
    "BAMBUS": "Gemüse",
    "CAPPELLETTI": "Nudeln",
    # Internationale Küche
    "ASIA": "Internationale Küche",
    "MEXIKAN": "Internationale Küche",
    "SUSHI": "Fisch & Meeresfrüchte",
    # Brotaufstriche (vegetarisch)
    "VEGETARI. AUFSTRICH": "Feinkost & Kühltheke",
    "FEINKOST BROTAUFSTRICH": "Feinkost & Kühltheke",
}


def _catalog_target(keyword: str, legacy_target: str) -> str:
    """Prefer the compound-aware classifier; fall back to the legacy target."""
    classification = classify_retail_section(keyword)
    if classification is not None:
        return classification.section
    return resolve_section_name(legacy_target)


# Resolve every REWE keyword onto the v2 catalog.
KEYWORD_TO_RETAIL_SECTION_NAME = {
    keyword: _catalog_target(keyword, section) for keyword, section in KEYWORD_TO_RETAIL_SECTION_NAME.items()
}

# Sort by length descending so longer (more specific) keywords match first
_SORTED_KEYWORDS = sorted(KEYWORD_TO_RETAIL_SECTION_NAME.keys(), key=len, reverse=True)


@lru_cache(maxsize=1)
def _get_retail_section_by_name() -> dict[str, RetailSection]:
    """Load all RetailSections into a dict by name (cached)."""
    from supply.models import RetailSection

    return {rs.name: rs for rs in RetailSection.objects.all()}


def _section_by_name(section_name: str) -> RetailSection | None:
    return _get_retail_section_by_name().get(resolve_section_name(section_name))


def get_retail_section(name: str, description: str = "") -> RetailSection | None:
    """Determine retail section from ingredient name and/or description.

    The compound-aware name classifier is authoritative; the REWE category in
    the description is only a fallback for names the classifier cannot place.
    """
    result = get_retail_section_from_name(name)
    if result:
        return result
    return get_retail_section_from_description(description)


def get_retail_section_from_name(name: str) -> RetailSection | None:
    """Classify an ingredient name into a retail section."""
    if not name:
        return None

    classification = classify_retail_section(name)
    if classification is not None:
        return _section_by_name(classification.section)

    section_name = _match_keywords(name.upper().strip())
    if section_name is None:
        return None
    return _section_by_name(section_name)


def get_retail_section_from_description(description: str) -> RetailSection | None:
    """Extract retail section from a REWE-style ingredient description.

    The description typically follows the pattern:
        "Product Name - BRAND - ProductLine - CATEGORY"

    We extract the last segment and match against known keywords.
    """
    if not description:
        return None

    # Extract last segment after " - "
    parts = description.split(" - ")
    if len(parts) < 2:
        # Try matching full description
        search_text = description.upper().strip()
    else:
        # Use last segment as primary, but also check second-to-last
        search_text = parts[-1].upper().strip()

    # Match keywords
    section_name = _match_keywords(search_text)

    # If no match on last segment, try second-to-last
    if section_name is None and len(parts) >= 3:
        search_text = parts[-2].upper().strip()
        section_name = _match_keywords(search_text)

    if section_name is None:
        return None

    return _section_by_name(section_name)


def _match_keywords(text: str) -> str | None:
    """Match text against keyword mapping, return RetailSection name or None."""
    for keyword in _SORTED_KEYWORDS:
        if keyword in text:
            return KEYWORD_TO_RETAIL_SECTION_NAME[keyword]
    return None
