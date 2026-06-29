## Why

Die Rezept-Detailseite zeigt falsche Gesamtwerte für Preis, Energie und Nährwerte, weil Austausch-Alternativen (`exchange_position > 0`) in den Berechnungen doppelt gezählt werden. Eine Alternative ist kein zusätzliches Lebensmittel – sie ersetzt die primäre Zutat. Nur die primäre Zutat (`exchange_position = 0`) soll in die Kalkulation einfließen.

## What Changes

- **Backend — Nutrition Breakdown API** (`nutrition.py`): Austausch-Alternativen aus der Aggregation ausschließen
- **Backend — Cache-Neuberechnung** (`recipe_checks.py`): Austausch-Alternativen in beiden Funktionen (`get_recipe_nutritional_values`, `recalculate_recipe_cache`) ausschließen
- **Keine Schema-Änderungen**: Pydantic/Zod-Schemas bleiben unverändert
- **Keine Migrationen**: Reine Query-Änderung (Filter `.exclude()`)
- **Kein Frontend-Code**: Betrifft nur Backend-Berechnungen

## Capabilities

### New Capabilities
- `recipe-billing-filter`: Definiert, welche Zutaten in recipe-weiten Aggregationen (Preis, Energie, Nährwerte) berücksichtigt werden und welche nicht.

### Modified Capabilities
<!-- Keine bestehenden Spezifikationen werden in ihren Requirements geändert. Die Filter-Logik ist eine Implementation-Korrektur, kein neues Requirement. -->

## Impact

| Bereich | Datei(en) | Änderung |
|---------|-----------|----------|
| Nutrition API | `backend/recipe/api/nutrition.py:103` | Filter beim Query ergänzen |
| Nutritional Values | `backend/recipe/services/recipe_checks.py:43` | Filter beim Query ergänzen |
| Price Cache | `backend/recipe/services/recipe_checks.py:376` | Filter beim Query ergänzen |
| Signals | `backend/recipe/signals.py` | Keine Änderung (Cache wird automatisch neuberechnet) |
| Variant Service | `backend/planner/services/variant_service.py` | Keine Änderung (verwendet `active_ids`, nicht die Rohdaten) |
| Shopping Service | `backend/supply/services/shopping_service.py` | Keine Änderung (verwendet `active_ids`) |
