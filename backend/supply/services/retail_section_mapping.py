"""Retail section mapping service.

Maps REWE product category strings (from ingredient descriptions) to RetailSection instances.
Used by the import command and batch-assignment command.
"""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from supply.models import RetailSection

# Mapping: keyword substring (uppercase) → RetailSection NAME
# We use names instead of IDs because IDs vary between environments.
# The name is resolved to a RetailSection object at runtime.

KEYWORD_TO_RETAIL_SECTION_NAME: dict[str, str] = {
    # Süßigkeiten / Süßwaren & Snacks
    "SCHOKOLADE": "Süßwaren & Snacks",
    "SCHOKORIEGEL": "Süßwaren & Snacks",
    "PRALIN": "Süßwaren & Snacks",
    "FRUCHTGUMMI": "Süßwaren & Snacks",
    "WAFFELN": "Süßwaren & Snacks",
    "BONBON": "Süßwaren & Snacks",
    "LAKRITZ": "Süßwaren & Snacks",
    "DRAGEE": "Süßwaren & Snacks",
    "KAUGUMMI": "Süßwaren & Snacks",
    "MARZIPAN": "Süßwaren & Snacks",
    "MONOPRALIN": "Süßwaren & Snacks",
    "SPEZIALI./KANDIERTE": "Süßwaren & Snacks",
    "TAFELSCHOKOLADE": "Süßwaren & Snacks",
    # Nudeln & Reis & Getreide
    "TEIGWAREN": "Nudeln & Reis & Getreide",
    "NUDEL": "Nudeln & Reis & Getreide",
    "PASTA": "Nudeln & Reis & Getreide",
    "REIS": "Nudeln & Reis & Getreide",
    "SPAGHETTI": "Nudeln & Reis & Getreide",
    "COUSCOUS": "Nudeln & Reis & Getreide",
    # Milchprodukte
    "JOGHURT": "Milchprodukte & Käse",
    "QUARK": "Milchprodukte & Käse",
    "PUDDING": "Milchprodukte & Käse",
    "MILCHREIS": "Milchprodukte & Käse",
    "MILCH": "Milchprodukte & Käse",
    "SAHNE": "Milchprodukte & Käse",
    "SCHMAND": "Milchprodukte & Käse",
    "BUTTERMILCH": "Milchprodukte & Käse",
    "SKYR": "Milchprodukte & Käse",
    "CREME FRAICHE": "Milchprodukte & Käse",
    "FRISCHKAESE": "Milchprodukte & Käse",
    "SCHAFSKAESE": "Milchprodukte & Käse",
    "SCHAFSKÄSE": "Milchprodukte & Käse",
    # Käse
    "KAESE": "Milchprodukte & Käse",
    "KÄSE": "Milchprodukte & Käse",
    "MOZZARELLA": "Milchprodukte & Käse",
    "PARMESAN": "Milchprodukte & Käse",
    "GOUDA": "Milchprodukte & Käse",
    # Tiefkühl
    "TK-": "Tiefkühl",
    "TIEFKUEHL": "Tiefkühl",
    "TIEFKÜHL": "Tiefkühl",
    # Kaffee und Tee
    "TEE BEUTEL": "Kaffee und Tee",
    "TEE ": "Kaffee und Tee",
    "KAFFEE": "Kaffee und Tee",
    "ESPRESSO": "Kaffee und Tee",
    "KAKAO": "Kaffee und Tee",
    # Backwaren
    "KEKS": "Brot & Backwaren",
    "KNÄCKEBROT": "Brot & Backwaren",
    "KNACKEBROT": "Brot & Backwaren",
    "LEBKUCHEN": "Brot & Backwaren",
    "ZWIEBACK": "Brot & Backwaren",
    "TOAST": "Brot & Backwaren",
    "BROT": "Brot & Backwaren",
    # Brotaufstriche
    "BROTAUFSTRICH": "Brot & Backwaren",
    "NUSS-SCHOKO-CREME": "Brot & Backwaren",
    "KONFITUER": "Brot & Backwaren",
    "KONFITÜR": "Brot & Backwaren",
    "MARMELADE": "Brot & Backwaren",
    "HONIG": "Brot & Backwaren",
    "NUTELLA": "Brot & Backwaren",
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
    "BACKZUTAT": "Brot & Backwaren",
    "BACKMISCHUNG": "Brot & Backwaren",
    "HEFE": "Brot & Backwaren",
    "BACKPULVER": "Brot & Backwaren",
    "VANILLEZUCKER": "Brot & Backwaren",
    "GELATINE": "Brot & Backwaren",
    "MEHL": "Brot & Backwaren",
    "ZUCKER": "Brot & Backwaren",
    "STAERKE": "Brot & Backwaren",
    "STÄRKE": "Brot & Backwaren",
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
    # Fleisch und Fisch
    "FLEISCH": "Fleisch & Fisch",
    "FISCH": "Fleisch & Fisch",
    "LACHS": "Fleisch & Fisch",
    "THUNFISCH": "Fleisch & Fisch",
    "HAEHNCHEN": "Fleisch & Fisch",
    "HÄHNCHEN": "Fleisch & Fisch",
    "HUHN": "Fleisch & Fisch",
    "RIND": "Fleisch & Fisch",
    "SCHWEIN": "Fleisch & Fisch",
    "GEFLÜGEL": "Fleisch & Fisch",
    "GEFLUEGEL": "Fleisch & Fisch",
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
    "CHIPS": "Süßwaren & Snacks",
    "CRACKER": "Süßwaren & Snacks",
    "SALZSTANGEN": "Süßwaren & Snacks",
    # Öl und Essig
    "OEL": "Öle & Soßen",
    "ÖL": "Öle & Soßen",
    "ESSIG": "Öle & Soßen",
    "OLIVENOEL": "Öle & Soßen",
    "OLIVENÖL": "Öle & Soßen",
    "PFLANZENOEL": "Öle & Soßen",
    "PFLANZENÖL": "Öle & Soßen",
    "BALSAMICO": "Öle & Soßen",
    "BALSAMIC": "Öle & Soßen",
    # Müsli und Cerealien
    "MUESLI": "Brot & Backwaren",
    "MÜSLI": "Brot & Backwaren",
    "CEREALIEN": "Brot & Backwaren",
    "HAFERFLOCKEN": "Brot & Backwaren",
    "CORNFLAKES": "Brot & Backwaren",
    # Kartoffelprodukte
    "KARTOFFEL": "Gemüse",
    "POMMES": "Tiefkühl",
    "KLOESSE": "Gemüse",
    "KLÖSSE": "Gemüse",
    # Getränke
    "SAFT": "Getränke ohne Alkohol",
    "WASSER": "Getränke ohne Alkohol",
    "LIMONADE": "Getränke ohne Alkohol",
    "EISTEE": "Getränke ohne Alkohol",
    "SOFTDRINK": "Getränke ohne Alkohol",
    "NEKTAR": "Getränke ohne Alkohol",
    # Alkoholische Getränke — separate Gruppe laut retail-sections-restructure Spec.
    # Bis die Spec vollständig umgesetzt ist (neue RetailSection + Seed), wird auf die
    # existierende Kategorie "Getränke" gemappt statt auf "Getränke ohne Alkohol".
    "BIER": "Getränke",
    "SPIRITUOSE": "Getränke",
    "SEKT": "Getränke",
    "LIKOER": "Getränke",
    "LIKÖR": "Getränke",
    # Fertiggerichte
    "FERTIGGERICHT": "Tiefkühl",
    "PIZZA": "Tiefkühl",
    "FLAMMKUCHEN": "Tiefkühl",
    # Eier
    "EIER": "Milchprodukte & Käse",
    "EI": "Milchprodukte & Käse",
    # Käse (Namen ohne "Käse")
    "CHEDDAR": "Milchprodukte & Käse",
    "EMMENTALER": "Milchprodukte & Käse",
    "FETA": "Milchprodukte & Käse",
    "HALLOUMI": "Milchprodukte & Käse",
    "MASCARPONE": "Milchprodukte & Käse",
    "RICOTTA": "Milchprodukte & Käse",
    "BUTTER": "Milchprodukte & Käse",
    # Fleischersatz
    "TOFU": "Fleisch & Fisch",
    "SEITAN": "Fleisch & Fisch",
    "TEMPEH": "Fleisch & Fisch",
    # Aufstriche/Dips
    "HUMMUS": "Öle & Soßen",
    "GUACAMOLE": "Öle & Soßen",
    # Sonstiges
    "INGWER": "Gemüse",
    "BACON": "Fleisch & Wurst",
    "BAMBUS": "Gemüse",
    "CAPPELLETTI": "Nudeln & Reis & Getreide",
    # Internationale Küche
    "ASIA": "Gewürze",
    "MEXIKAN": "Gewürze",
    "SUSHI": "Fleisch & Fisch",
    # Brotaufstriche (vegetarisch)
    "VEGETARI. AUFSTRICH": "Öle & Soßen",
    "FEINKOST BROTAUFSTRICH": "Öle & Soßen",
}

# Sort by length descending so longer (more specific) keywords match first
_SORTED_KEYWORDS = sorted(KEYWORD_TO_RETAIL_SECTION_NAME.keys(), key=len, reverse=True)


@lru_cache(maxsize=1)
def _get_retail_section_by_name() -> dict[str, RetailSection]:
    """Load all RetailSections into a dict by name (cached)."""
    from supply.models import RetailSection

    return {rs.name: rs for rs in RetailSection.objects.all()}


def get_retail_section(name: str, description: str = "") -> RetailSection | None:
    """Determine retail section from ingredient name and/or description.

    Tries description first (REWE category), then falls back to name-based matching.
    """
    result = get_retail_section_from_description(description)
    if result:
        return result
    return get_retail_section_from_name(name)


def get_retail_section_from_name(name: str) -> RetailSection | None:
    """Match retail section from ingredient name using keywords."""
    if not name:
        return None

    text = name.upper().strip()
    section_name = _match_keywords(text)
    if section_name is None:
        return None

    rs_map = _get_retail_section_by_name()
    return rs_map.get(section_name)


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

    rs_map = _get_retail_section_by_name()
    return rs_map.get(section_name)


def _match_keywords(text: str) -> str | None:
    """Match text against keyword mapping, return RetailSection name or None."""
    for keyword in _SORTED_KEYWORDS:
        if keyword in text:
            return KEYWORD_TO_RETAIL_SECTION_NAME[keyword]
    return None
