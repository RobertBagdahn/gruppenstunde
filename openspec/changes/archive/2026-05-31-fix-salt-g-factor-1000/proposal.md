## Why

Legacy-importierte Zutaten haben `salt_g`-Werte, die um Faktor 1000 zu hoch sind. Die Berechnung im Alt-System war `salt_g = sodium_mg * 2.5` statt korrekt `salt_g = sodium_mg * 2.5 / 1000`. Das führt zu absurden Nährwert-Anzeigen (z.B. 4952g Salz pro Portion in Meal Plans). Zusätzlich fehlt in der `nutrition_summary`-API die Skalierung `norm_portions / recipe_servings`.

## What Changes

- **Daten-Fix**: Alle `salt_g`-Werte in `supply_ingredient` korrigieren, wo `salt_g == sodium_mg * 2.5` (Division durch 1000)
- **Code-Fix**: `planner/api/meal_plan.py` `nutrition_summary` Endpunkt: fehlende `norm_portions / recipe_servings` Skalierung ergänzen (analog zur bestehenden Cost-Berechnung)
- **Prod-Fix**: Daten-Korrektur muss auch auf der Produktions-DB laufen
- **Cache-Invalidierung**: Nach Daten-Fix müssen `cached_salt_g`-Werte aller betroffenen Rezepte neu berechnet werden

## Capabilities

### New Capabilities

_Keine neuen Capabilities — rein korrektiver Fix._

### Modified Capabilities

_Keine Spec-Level-Änderungen — die bestehende Nährwert-Berechnung soll dasselbe tun, nur korrekt._

## Impact

- **Backend App `supply`**: `Ingredient.salt_g`-Feld — Daten-Migration
- **Backend App `planner`**: `planner/api/meal_plan.py` Zeile 560 — Code-Fix in `nutrition_summary`
- **Backend App `recipe`**: Cache-Neuberechnung (`recalculate_recipe_cache`) für alle Rezepte mit betroffenen Zutaten
- **Produktions-DB**: Migration muss auf Cloud SQL ausgeführt werden
- **Keine Schema-Änderungen**: Pydantic/Zod-Schemas bleiben unverändert (nur Werte ändern sich)
- **Keine API-Änderungen**: Endpunkte bleiben identisch
