"""Single source of truth for the RetailSection catalog (name, rank).

Used by seed_all, import_legacy_food, the retail section classifier and the
``0016_retail_sections_v2`` data migration. Ranks follow a supermarket
walk-through order (Laden-Rundgang) so shopping lists can be sorted by aisle.

Catalog v2 (food-data-offensive) splits the former coarse groups such as
"Milchprodukte & Käse" or "Fleisch & Fisch" into aisles a shopper actually
walks past. Legacy names are kept resolvable via ``LEGACY_SECTION_ALIASES`` so
older seed data and imports keep working.
"""

from __future__ import annotations

from typing import TypedDict


class _RetailSectionEntry(TypedDict):
    name: str
    rank: int
    description: str


RETAIL_SECTIONS: list[_RetailSectionEntry] = [
    {"name": "Obst", "rank": 1, "description": "Frisches Obst, Beeren, Zitrusfrüchte"},
    {"name": "Gemüse", "rank": 2, "description": "Frisches Gemüse, Kartoffeln, Zwiebeln, Pilze"},
    {"name": "Salate & frische Kräuter", "rank": 3, "description": "Blattsalate, Sprossen, frische Kräuter"},
    {"name": "Brot & Backwaren", "rank": 4, "description": "Brot, Brötchen, Toast, Wraps, Kuchen vom Bäcker"},
    {"name": "Fleisch", "rank": 5, "description": "Frisches Fleisch und Geflügel"},
    {"name": "Wurst & Aufschnitt", "rank": 6, "description": "Wurst, Schinken, Salami, Würstchen"},
    {"name": "Fisch & Meeresfrüchte", "rank": 7, "description": "Frischer, geräucherter und konservierter Fisch"},
    {"name": "Milch & Pflanzendrinks", "rank": 8, "description": "Milch, Sahne, Buttermilch, Hafer-/Sojadrinks"},
    {"name": "Joghurt, Quark & Desserts", "rank": 9, "description": "Joghurt, Quark, Skyr, Pudding, Kühldesserts"},
    {"name": "Käse", "rank": 10, "description": "Hart-, Schnitt-, Weich- und Frischkäse"},
    {"name": "Eier", "rank": 11, "description": "Hühnereier"},
    {"name": "Butter & Margarine", "rank": 12, "description": "Butter, Margarine, Schmalz"},
    {"name": "Fleischersatz & Tofu", "rank": 13, "description": "Tofu, Tempeh, Seitan, vegane Alternativen"},
    {"name": "Feinkost & Kühltheke", "rank": 14, "description": "Frische Pasta, Salate, Dips, Teige"},
    {"name": "Nudeln", "rank": 15, "description": "Trockene Teigwaren"},
    {"name": "Reis & Getreide", "rank": 16, "description": "Reis, Couscous, Bulgur, Grieß, Quinoa"},
    {"name": "Hülsenfrüchte", "rank": 17, "description": "Getrocknete Linsen, Bohnen, Kichererbsen"},
    {"name": "Nüsse, Samen & Trockenobst", "rank": 18, "description": "Nüsse, Kerne, Saaten, Trockenfrüchte"},
    {"name": "Müsli & Cerealien", "rank": 19, "description": "Müsli, Flocken, Cornflakes"},
    {"name": "Mehl, Zucker & Backzutaten", "rank": 20, "description": "Mehl, Zucker, Backpulver, Hefe"},
    {"name": "Brotaufstriche", "rank": 21, "description": "Konfitüre, Honig, Nuss-Nougat-Creme"},
    {"name": "Konserven & Gläser", "rank": 22, "description": "Dosen- und Glaskonserven"},
    {"name": "Öle & Essig", "rank": 23, "description": "Speiseöle, Essig, Bratfette"},
    {"name": "Saucen & Würzsaucen", "rank": 24, "description": "Ketchup, Senf, Mayonnaise, Pesto, Sojasauce"},
    {"name": "Gewürze & Trockenkräuter", "rank": 25, "description": "Salz, Pfeffer, Gewürze, getrocknete Kräuter"},
    {"name": "Brühen, Suppen & Fertiggerichte", "rank": 26, "description": "Brühe, Fix-Produkte, Instantgerichte"},
    {"name": "Internationale Küche", "rank": 27, "description": "Asia, Mexiko, Orient"},
    {"name": "Süßwaren & Kekse", "rank": 28, "description": "Schokolade, Fruchtgummi, Kekse, Riegel"},
    {"name": "Knabberartikel", "rank": 29, "description": "Chips, Flips, Salzstangen"},
    {"name": "Kaffee, Tee & Kakao", "rank": 30, "description": "Kaffee, Tee, Kakaopulver"},
    {"name": "Säfte & Smoothies", "rank": 31, "description": "Frucht- und Gemüsesäfte, Nektare, Smoothies"},
    {"name": "Wasser & Erfrischungsgetränke", "rank": 32, "description": "Wasser, Limonade, Sirup, Eistee"},
    {"name": "Alkoholische Getränke", "rank": 33, "description": "Bier, Wein, Spirituosen"},
    {"name": "TK Obst & Gemüse", "rank": 34, "description": "Tiefkühl-Obst, -Gemüse, -Kräuter, Pommes"},
    {"name": "TK Fleisch & Fisch", "rank": 35, "description": "Tiefkühl-Fleisch, -Fisch, -Meeresfrüchte"},
    {"name": "TK Fertiggerichte & Pizza", "rank": 36, "description": "Tiefkühl-Pizza, -Gerichte, -Snacks"},
    {"name": "TK Eis & Desserts", "rank": 37, "description": "Speiseeis, TK-Kuchen und -Desserts"},
    {"name": "Sonstiges", "rank": 38, "description": "Nicht zuordenbar"},
]

RETAIL_SECTION_NAMES: frozenset[str] = frozenset(entry["name"] for entry in RETAIL_SECTIONS)

# Legacy name -> catalog name. Used by the v2 data migration and by name
# resolution so older seed data ("Milchprodukte & Käse", …) keeps working.
# Split groups map to a sensible default; the classifier refines afterwards.
LEGACY_SECTION_ALIASES: dict[str, str] = {
    "Getränke": "Wasser & Erfrischungsgetränke",
    "Alkoholfreie Getränke": "Wasser & Erfrischungsgetränke",
    "Obst & Gemüse": "Gemüse",
    "Fleisch & Wurst": "Fleisch",
    "Fleisch & Fisch": "Fleisch",
    "Fisch": "Fisch & Meeresfrüchte",
    "Milchprodukte & Käse": "Milch & Pflanzendrinks",
    "Milchprodukte": "Milch & Pflanzendrinks",
    "Gekühlt": "Feinkost & Kühltheke",
    "Nudeln & Reis & Getreide": "Reis & Getreide",
    "Öle & Soßen": "Saucen & Würzsaucen",
    "Gewürze & Kräuter": "Gewürze & Trockenkräuter",
    "Hülsenfrüchte & Nüsse": "Hülsenfrüchte",
    "Salzige Snacks": "Knabberartikel",
    "Süßwaren": "Süßwaren & Kekse",
    "Süßwaren & Snacks": "Süßwaren & Kekse",
    "Kaffee und Tee": "Kaffee, Tee & Kakao",
    "Tiefkühl": "TK Fertiggerichte & Pizza",
    "TK Fertiggerichte": "TK Fertiggerichte & Pizza",
    "Fleischersatz": "Fleischersatz & Tofu",
}

# Legacy groups that were too coarse: ingredients in these groups must be
# re-classified instead of trusting the default alias target.
LEGACY_SPLIT_SECTIONS: frozenset[str] = frozenset(
    {
        "Obst & Gemüse",
        "Fleisch & Wurst",
        "Fleisch & Fisch",
        "Milchprodukte & Käse",
        "Nudeln & Reis & Getreide",
        "Öle & Soßen",
        "Hülsenfrüchte & Nüsse",
        "Tiefkühl",
    }
)


def resolve_section_name(name: str) -> str:
    """Return the catalog name for a (possibly legacy) retail section name."""
    return LEGACY_SECTION_ALIASES.get(name, name)
