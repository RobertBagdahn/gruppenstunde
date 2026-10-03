"""Declarative buffet mapping and the reviewed proposal-export adapter.

Entries are addressed by ID and expected name; a mismatch is skipped and
reported. Strategy-derived IDs/names are not independently confirmed against
Prod: review every entry against the intended target and obtain separate
operational approval before any Prod apply. Merges use the shared services.
The CLI dry-runs by default; writes require an explicit ``--apply``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

Action = Literal["keep", "add", "merge_into", "untag", "create"]
Kind = Literal["ingredient", "recipe"]

OLD_BREAKFAST_TAG_SLUGS = (
    "breakfast-base",
    "breakfast-fat",
    "breakfast-topping",
    "breakfast-extra",
    "breakfast-drink",
    "breakfast-warm-meal",
)


@dataclass(frozen=True)
class RoleMapping:
    action: Action
    kind: Kind
    id: int | None
    name: str
    role: str | None = None
    role_slugs: tuple[str, ...] = ()
    target_id: int | None = None
    target_name: str | None = None
    aliases: tuple[str, ...] = ()
    create_data: dict[str, Any] | None = None


def _i(
    action: Action,
    id_: int | None,
    name: str,
    role: str | None = None,
    *,
    target_id: int | None = None,
    target_name: str | None = None,
    role_slugs: tuple[str, ...] = (),
    aliases: tuple[str, ...] = (),
    create_data: dict[str, Any] | None = None,
) -> RoleMapping:
    return RoleMapping(
        action=action,
        kind="ingredient",
        id=id_,
        name=name,
        role=role,
        role_slugs=role_slugs,
        target_id=target_id,
        target_name=target_name,
        aliases=aliases,
        create_data=create_data,
    )


def _r(
    action: Action,
    id_: int | None,
    name: str,
    role: str | None = None,
    *,
    target_id: int | None = None,
    target_name: str | None = None,
    role_slugs: tuple[str, ...] = (),
    aliases: tuple[str, ...] = (),
    create_data: dict[str, Any] | None = None,
) -> RoleMapping:
    return RoleMapping(
        action=action,
        kind="recipe",
        id=id_,
        name=name,
        role=role,
        role_slugs=role_slugs,
        target_id=target_id,
        target_name=target_name,
        aliases=aliases,
        create_data=create_data,
    )


BREAD = "buffet-bread"
FAT = "buffet-fat"
SAVORY = "buffet-savory"
SWEET = "buffet-sweet"
CONDIMENT = "buffet-condiment"
FRESH = "buffet-fresh"
CEREAL = "buffet-cereal"
DRINK = "buffet-drink"
DISH = "buffet-dish"

BUFFET_ROLE_MAPPING: tuple[RoleMapping, ...] = (
    # Brot & Gebäck
    _i("keep", 7328, "Bauernbrot", BREAD, aliases=("Mischbrot",)),
    _i("keep", 139, "Brötchen", BREAD),
    _i("merge_into", 7333, "Brötchen (ganzes)", target_id=139, target_name="Brötchen"),
    _i("merge_into", 7332, "Brötchen (halbes)", target_id=139, target_name="Brötchen"),
    _i("keep", 138, "Vollkornbrot geschnitten", BREAD),
    _i("merge_into", 294, "Brot (Vollkorn)", target_id=138, target_name="Vollkornbrot geschnitten"),
    _i("keep", 7331, "Körnerbrot", BREAD),
    _i("keep", 7330, "Stuten", BREAD),
    _i("keep", 7329, "Toastbrot", BREAD),
    _i("untag", 4666, "Vollkorn-Toast"),
    _i("add", 142, "Baguette", BREAD),
    _i("add", 305, "Tortilla-Wraps", BREAD),
    _i("merge_into", 140, "Wraps", target_id=305, target_name="Tortilla-Wraps"),
    _i("add", 144, "Knäckebrot", BREAD),
    _r("add", 370, "Protein-Zwiebelbrötchen", BREAD),
    _r("add", 373, "Quark-Hafer-Brötchen", BREAD),
    _r("add", 413, "Schokobrötchen mit Tangzhong", BREAD),
    # Streichfett
    _i("keep", 94, "Deutsche Markenbutter", FAT),
    _i("keep", 1875, "Margarine", FAT),
    _i("merge_into", 5041, "Pflanzenmargarine", target_id=1875, target_name="Margarine"),
    _i("merge_into", 5116, "Sonnenblumenmargarine", target_id=1875, target_name="Margarine"),
    _i("merge_into", 4292, "Bio-Margarine", target_id=1875, target_name="Margarine"),
    _i("untag", 3296, "Halbfettmargarine"),
    _i("untag", 5498, "Leichtmargarine"),
    _i("untag", 5948, "Leichtmargarine Extra Fit"),
    _i("add", 2860, "Kräuterbutter", FAT),
    # Belag herzhaft
    _i("keep", 105, "Gouda", SAVORY),
    _i("keep", 7341, "Edamer", SAVORY),
    _i("keep", 107, "Emmentaler Hartkäse", SAVORY),
    _i("keep", 7343, "Putenbrust (Aufschnitt)", SAVORY),
    _i("keep", 7342, "Schinken (gekocht)", SAVORY),
    _i("keep", 115, "Salami italienische Art", SAVORY),
    _i("keep", 7337, "Leberwurst", SAVORY),
    _i("add", 3, "Frischkäse Doppelrahmstufe", SAVORY),
    _i("add", 5, "Mozzarella aus Kuhmilch", SAVORY),
    _i("add", 87, "Thunfisch in eigenem Saft", SAVORY),
    _i("add", 323, "Hummus", SAVORY),
    # Belag süß
    _i("keep", 7335, "Marmelade", SWEET),
    _i("merge_into", 7339, "Marmelade Erdbeere", target_id=7335, target_name="Marmelade"),
    _i("keep", 160, "Blütenhonig", SWEET),
    _i("keep", 7334, "Nutella", SWEET),
    _i("keep", 181, "Erdnussbutter", SWEET),
    # Soßen & Würze
    _i("add", 176, "mittelscharfer Senf", CONDIMENT),
    _i("add", 177, "Tomaten-Ketchup", CONDIMENT),
    _i("add", 6674, "Mayonnaise", CONDIMENT),
    # Gemüse & Obst
    _i("keep", 65, "frische Avocado", FRESH),
    _i("add", 299, "Salatgurke", FRESH),
    _i("add", 6925, "Tomaten", FRESH),
    _i("merge_into", 7041, "Tomate frisch", target_id=6925, target_name="Tomaten"),
    _i("add", 293, "Gemüsepaprika rot", FRESH),
    _i("add", 30, "Eisbergsalat", FRESH),
    _i("add", 34, "Radieschen", FRESH),
    _i("add", 41, "Karotte", FRESH),
    _i("add", 57, "frischer Apfel", FRESH),
    _i("add", 58, "frische Banane", FRESH),
    _i("add", 59, "Birne", FRESH),
    _r("untag", 208, "Frühstücksgemüse für VIA24"),
    # Müsli & Joghurt
    _i("add", 184, "Haferflocken", CEREAL),
    _i("add", 306, "Müsli (Basis)", CEREAL),
    _i("add", 98, "Naturjoghurt 3,5 % Fett", CEREAL),
    _i("add", 101, "Quark (Magerquark)", CEREAL),
    _i("add", 598, "Cornflakes", CEREAL),
    # Getränke
    _i("keep", 112, "Haferdrink natur", DRINK),
    _i("keep", 288, "Kuhmilch 3,5 % Fett", DRINK),
    _i("keep", 7344, "Milch (laktosefrei)", DRINK),
    _i("keep", 7346, "Saft (Apfel)", DRINK),
    _i("keep", 7347, "Saft (Multivitamin)", DRINK),
    _i("keep", 7345, "Saft (Orange)", DRINK),
    _r("keep", 436, "Kaffee", DRINK),
    _r("keep", 437, "Kakao", DRINK),
    _r("keep", 438, "Schwarzer Tee", DRINK),
    _r("keep", 108, "Tasse Kaffee mit Hafermilch", DRINK),
    _r("keep", 109, "Hafermilch Kakao", DRINK),
    _r("keep", 146, "Apfel-Zimt-Tee", DRINK),
    _r("keep", 415, "Apfel-Zimt Getränk", DRINK),
    _r("keep", 156, "Ingwertee mit Zitronen", DRINK),
    _r("keep", 136, "Krümeltee", DRINK),
    _r("keep", 152, "Marokkanischer Minztee", DRINK),
    _r("keep", 149, "Ostfriesentee", DRINK),
    _r("keep", 145, "Waldbeerentee", DRINK),
    _r("keep", 153, "Tschai einfach/günstig", DRINK),
    _r("merge_into", 155, "Tschai einfach/günstig", target_id=153, target_name="Tschai einfach/günstig"),
    _r("merge_into", 215, "Tschai einfach/günstig", target_id=153, target_name="Tschai einfach/günstig"),
    _r("merge_into", 191, "Glas Apfelsaft", target_id=183, target_name="Glas Apfelsaft"),
    _r("untag", 183, "Glas Apfelsaft"),
    _r("untag", 193, "Glas Orangensaft"),
    _r("untag", 147, "Bergwasser (VIA24)"),
    _r("untag", 148, "Brackwasser (VIA24)"),
    _r("untag", 144, "Moorhexentrank (VIA24)"),
    _r("untag", 141, "Waldschorle (VIA24)"),
    _r("untag", 133, "Wüstenlimo (VIA24)"),
    # Gerichte
    _r("keep", 439, "Rührei", DISH),
    _r("keep", 440, "Omelett", DISH),
    _r("keep", 441, "Gekochte Eier", DISH),
    _r("keep", 423, "Porridge", DISH),
    _r("keep", 54, "Overnight Oats", DISH),
    _r("keep", 347, "Erdnussbutter-Bananen Baked Oats", DISH),
    _r("keep", 51, "Müsli mit frischem Obst", DISH),
    _r("keep", 178, "Schokomüsli", DISH),
    _r("untag", 189, "Bionella-Brot"),
    _r("untag", 107, "Erdbeermarmeladenbrot"),
    _r("untag", 171, "Erdnussbutterbrot"),
    _r("untag", 182, "Heidelbeerbrot"),
    _r("untag", 187, "Keksaufstrich-Brot"),
    _r("untag", 185, "Sauerkirschbrot"),
    _r("untag", 83, "Schokocreme Brot"),
    _r("untag", 195, "VIArine mit Brot"),
)


def role_mappings_from_export(export_data: Any) -> tuple[RoleMapping, ...]:
    """Convert the staff-reviewed proposal export to typed migration rows."""
    rows = export_data.get("items") if isinstance(export_data, dict) else export_data
    if not isinstance(rows, list):
        raise ValueError("Mapping-Export muss eine items-Liste enthalten.")

    mappings: list[RoleMapping] = []
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"Mapping-Zeile {index + 1} ist kein Objekt.")
        action = row.get("action")
        kind = row.get("item_kind")
        if action not in {"keep", "add", "merge_into", "untag", "create"}:
            raise ValueError(f"Mapping-Zeile {index + 1} hat eine unbekannte Aktion.")
        if kind not in {"ingredient", "recipe"}:
            raise ValueError(f"Mapping-Zeile {index + 1} hat einen unbekannten Item-Typ.")

        source_id = row.get("source_id")
        source_name = str(row.get("source_name") or "").strip()
        target_id = row.get("target_id")
        target_name = str(row.get("target_name") or "").strip() or None
        proposed_data = row.get("proposed_data") or {}
        role_slugs_value = row.get("role_slugs") or []
        if not isinstance(role_slugs_value, list) or any(not isinstance(slug, str) for slug in role_slugs_value):
            raise ValueError(f"Mapping-Zeile {index + 1} hat ungültige Rollen-Slugs.")
        role_slugs = tuple(dict.fromkeys(role_slugs_value))
        if not isinstance(proposed_data, dict):
            raise ValueError(f"Mapping-Zeile {index + 1} hat ungültige vorgeschlagene Daten.")

        constructor = _i if kind == "ingredient" else _r
        if action == "create":
            name = source_name or str(proposed_data.get("name") or proposed_data.get("title") or "").strip()
            if not name or not role_slugs:
                raise ValueError(f"Create-Zeile {index + 1} benötigt Namen und mindestens eine Rolle.")
            mappings.append(
                constructor(
                    "create",
                    None,
                    name,
                    role_slugs[0],
                    role_slugs=role_slugs,
                    create_data=proposed_data,
                )
            )
            continue

        if not isinstance(source_id, int) or not source_name:
            raise ValueError(f"Mapping-Zeile {index + 1} benötigt Quell-ID und erwarteten Namen.")
        if action in {"keep", "add"}:
            if not role_slugs:
                raise ValueError(f"Mapping-Zeile {index + 1} benötigt mindestens eine Buffet-Rolle.")
            mappings.extend(constructor(action, source_id, source_name, role_slug) for role_slug in role_slugs)
        elif action == "merge_into":
            if not isinstance(target_id, int) or not target_name:
                raise ValueError(f"Merge-Zeile {index + 1} benötigt Ziel-ID und erwarteten Zielnamen.")
            mappings.append(constructor(action, source_id, source_name, target_id=target_id, target_name=target_name))
        else:
            if not role_slugs:
                raise ValueError(f"Untag-Zeile {index + 1} benötigt die zu entfernenden Rollen-Slugs.")
            mappings.append(constructor(action, source_id, source_name, role_slugs=role_slugs))
    return tuple(mappings)
