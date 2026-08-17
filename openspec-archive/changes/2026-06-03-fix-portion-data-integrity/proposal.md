## Why

98,6 % aller Portionen in der Prod-DB (14.441 von 14.645) haben `weight_g = NULL`, 7.022 davon einen leeren Namen — die UI zeigt unsichtbare oder gewichtslose Portionszeilen. Ursache sind drei voneinander unabhängige Erzeugungspfade (Legacy-Import, URL-Import, API), die `weight_g`-Berechnung, Einheiten-Kanonisierung und Deduplizierung jeweils eigenständig und unterschiedlich falsch handhaben. Es fehlt eine zentrale, erzwungene Stelle für Portions-Integrität.

## What Changes

- **Zentrale Portions-Logik**: `Portion.weight_g` wird automatisch aus `quantity × measuring_unit.quantity` berechnet, wenn kein expliziter Wert gesetzt ist. Logik wandert vom API-Layer in eine wiederverwendbare Model-Methode, die alle Erzeugungspfade nutzen.
- **BREAKING — Fehler-Heuristik korrigiert**: Der fehlerhafte Vergleich `calculated > 1` (verwirft jedes legitime Gewicht ≤ 1 g, z. B. „1 g", „1 ml", „1 Stück") wird durch `> 0` ersetzt. Das war die Hauptursache für 14.441 NULL-Werte.
- **BREAKING — Model-Härtung**: `Portion.name` verliert `blank=True` und `default="g"`; ein Name wird Pflicht, damit fehlende Namen laut scheitern statt still zu „g"/"" zu werden.
- **URL-Import dedupliziert**: `_create_new_ingredients` nutzt `get_or_create` für Portionen (statt blind `create`); Einheiten werden auf kanonische `MeasuringUnit` gemappt statt per Name neu angelegt (Quelle der Dubletten-Einheiten g/ml/EL/TL).
- **Legacy-Import gehärtet**: `import_legacy_food` berechnet fehlende `weight_g` über die zentrale Logik und dedupliziert Portionen pro Zutat.
- **Daten-Cleanup-Migration**: Nachberechnung von `weight_g`, Ableitung leerer Namen aus der Einheit, Dedup der Duplikat-Portionen (z. B. „Pralinen" mit 146 → 2) und Konsolidierung der Dubletten-Einheiten.

## Capabilities

### New Capabilities
- `portion-data-integrity`: Zentrale Berechnung von `Portion.weight_g`, Pflicht-Name, Einheiten-Kanonisierung und Deduplizierungs-Garantien über alle Erzeugungspfade hinweg.

### Modified Capabilities
- `recipe-url-import`: Portion- und Einheiten-Erzeugung beim URL-Import muss kanonische Einheiten verwenden und Portionen deduplizieren.
- `inspi-data-import`: Legacy-Bulk-Import muss fehlende `weight_g` berechnen und Portionen deduplizieren.

## Impact

- **Django-Apps**: `supply` (Model `Portion`, `MeasuringUnit`, API `ingredients.py`), `recipe` (`services/url_import_service.py`), `core` (`management/commands/import_legacy_food.py`).
- **Migrationen**: Schema-Migration (`Portion.name` non-blank, kein Default) + Daten-Migration (Cleanup `weight_g`, Namen, Dedup Portionen, Konsolidierung Einheiten). Lauf gegen Prod-DB erforderlich.
- **Pydantic-Schemas**: `supply/schemas/ingredients.py` (`PortionCreateIn`, `PortionUpdateIn`, `PortionOut`) — `name` wird required.
- **Zod-Schemas**: Frontend-Food `schemas/supply.ts` / `recipe.ts` synchron halten (`name` required).
- **Frontend**: `frontend-food` `pages/ingredients/IngredientDetailPage.tsx` — kaputte/unvollständige Portionen sichtbar markieren statt leerer Zeile.
- **APIs**: `POST/PATCH /api/ingredients/{slug}/portions/` Verhalten ändert sich (Name-Pflicht, korrigierte Berechnung).
