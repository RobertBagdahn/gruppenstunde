"""Single source of truth for RetailSection catalog (name, rank).

Used by seed_all, import_legacy_food, and the retail_section_mapping keyword
targets to keep DB names, seed names, and mapping target names in sync.
Names match the `data/masterdata/supply_retailsection.json` fixture exactly
(the fixture is the actual loaddata source of truth); this constant adds the
rank ordering plus the three catch-all groups the fixture doesn't have yet.
Ranks follow a supermarket walk-through order (Laden-Rundgang).

See openspec/changes/retail-sections-restructure/design.md (D1/D7) for rationale.
"""

from __future__ import annotations

RETAIL_SECTIONS: list[dict[str, object]] = [
    {"name": "Obst", "rank": 1},
    {"name": "Gemüse", "rank": 2},
    {"name": "Brot & Backwaren", "rank": 3},
    {"name": "Fleisch & Wurst", "rank": 4},
    {"name": "Fisch", "rank": 5},
    {"name": "Milchprodukte & Käse", "rank": 6},
    {"name": "Gekühlt", "rank": 7},
    {"name": "Nudeln & Reis & Getreide", "rank": 8},
    {"name": "Konserven & Gläser", "rank": 9},
    {"name": "Öle & Soßen", "rank": 10},
    {"name": "Gewürze & Kräuter", "rank": 11},
    {"name": "Hülsenfrüchte & Nüsse", "rank": 12},
    {"name": "Salzige Snacks", "rank": 13},
    {"name": "Süßwaren", "rank": 14},
    {"name": "Kaffee und Tee", "rank": 15},
    {"name": "Alkoholfreie Getränke", "rank": 16},
    {"name": "Alkoholische Getränke", "rank": 17},
    {"name": "TK Obst & Gemüse", "rank": 18},
    {"name": "TK Fleisch & Fisch", "rank": 19},
    {"name": "TK Fertiggerichte", "rank": 20},
    {"name": "Fleischersatz", "rank": 21},
    {"name": "Sonstiges", "rank": 22},
]

RETAIL_SECTION_NAMES: frozenset[str] = frozenset(entry["name"] for entry in RETAIL_SECTIONS)

# Bestehende DB-Gruppe, die im Zuge dieses Katalogs umbenannt wird (D2).
LEGACY_GETRAENKE_RENAME: tuple[str, str] = ("Getränke", "Alkoholfreie Getränke")
