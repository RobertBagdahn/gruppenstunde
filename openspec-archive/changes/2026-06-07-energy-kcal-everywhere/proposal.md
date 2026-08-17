## Why

Energie wird aktuell in der Datenbank in kJ gespeichert und erst an der API-/UI-Grenze nach kcal umgerechnet (`kj_to_kcal()`, `kjToKcal()`). Das erzeugt eine permanente Dual-Repräsentation (`energy_kj` + `energy_kcal`) in Schemas, Services und UI-Komponenten — über 80 Dateien enthalten Konvertierungslogik. Der archivierte Change `2026-06-03-energy-kj-to-kcal` hat kcal-Anzeige eingeführt, aber kJ-Speicherung beibehalten. Jetzt gehen wir den letzten Schritt: kcal als einzige Quelle der Wahrheit, keine Konvertierungen mehr.

## What Changes

- **BREAKING (Datenbank)**: Alle `*_kj`-Felder werden zu `*_kcal`-Feldern umbenannt und per SQL-Migration von kJ auf kcal umgerechnet (÷ 4.184, gerundet auf 0 Dezimalstellen).
- **BREAKING (Rule-Daten)**: `rule.parameter = "energy_kj"` wird zu `"energy_kcal"`. Schwellwerte bleiben unverändert (sind bereits in kcal).
- **BREAKING (API)**: Alle Pydantic- und Zod-Schema-Felder `energy_kj` / `cached_energy_kj` / `cached_energy_total_kj` / `external_energy_kj` werden zu `*_kcal`. `energy_kcal`-Computed-Felder entfallen.
- **Entfernt**: `kj_to_kcal()` / `kcal_to_kj()` (Backend) und `kjToKcal()` (Frontend) samt aller Aufrufe (~30 Stellen).
- **Gesundheits-Formel**: `health_traits_service.is_high_protein()` verwendet 4 kcal/g statt 17 kJ/g (mathematisch äquivalent).
- **Eingabeformular**: `IngredientCreatePage` Energie-Feld von `Energie (kJ)` auf `Energie (kcal)` umgestellt.
- **Seed-Daten und Management-Commands**: Alle hartkodierten kJ-Werte auf kcal umgerechnet.

## Capabilities

### Modified Capabilities

- **energy-unit-display**: Spezifikation ändert sich von "kJ in DB, kcal in UI" zu "kcal überall — DB, API, UI".
- **meal-energy-display**: `MealItemOut.energy_kj` wird zu `MealItemOut.energy_kcal`; keine Konvertierung mehr.
- **meal-external-cost**: `external_energy_kj` (DB) / `external_energy_kcal` (API-Surface) werden vereinheitlicht zu `external_energy_kcal` auf allen Ebenen.
- **seed-data**: Alle `energy_kj`-Werte in Seed-Daten werden zu `energy_kcal`-Werten (÷ 4.184, gerundet).
- **extended-nutrition-rules**: Regel-Parameter-Key ändert sich von `"energy_kj"` zu `"energy_kcal"`.
- **ingredient-database**: `Ingredient.energy_kj` → `Ingredient.energy_kcal`.
- **recipe-url-import**: Import-Schema-Feld `energy_kj` → `energy_kcal`.

## Impact

- **5 Django-Model-Felder** in 4 Tabellen betroffen (Ingredient, DgeReference, Recipe×2, Meal)
- **1 neue Django-Migration** mit SQL-basierten ALTER/UPDATE-Operationen
- **7 Pydantic-Schema-Dateien** und **6 Zod-Schema-Dateien** (beide Frontends)
- **8 Backend-Services** (nutrition_aggregation, recipe_checks, health_traits, suggestion, improvement_ranking, nutri_improvement, url_import, nutri_retrieval)
- **5 Backend-APIs** (supply/ingredients, recipe/nutrition, planner/meal_plan, supply/admin, supply/ai)
- **15+ Frontend-Komponenten** in `frontend-food/`
- **6 Management-Commands + Seed-Daten** (seed_all, seed_rules, fix_ingredient_nutrition, fix_ingredients, import_legacy_food, dge_reference.py)
- **15+ Test-Dateien**
- **2 Dateien gelöscht**: `nutrition_units.py`, `nutritionUnits.ts`
- **~80 Dateien insgesamt betroffen**
