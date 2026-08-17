## 1. Konvertierungs-Helper

- [x] 1.1 Frontend: `kjToKcal(kj: number): number` in `frontend-food/src/utils/` (z.B. `nutritionUnits.ts`), Rückgabe `kj / 4.184`
- [x] 1.2 Backend: zentrale `kj_to_kcal(kj: float) -> float` (z.B. `recipe/services/nutrition_units.py` oder bestehender Service)
- [x] 1.3 Verstreute `/ 4.184`-Vorkommen durch Helper ersetzen (FE: MealEventDetailPage, TableView, RefMealEditorPage, NormPortionSimulatorPage; BE: `recipe/api/nutrition.py`)

## 2. Backend Eval-Pipeline (Energie zu kcal vor evaluate)

- [x] 2.1 `recipe/services/nutrition_aggregation.py` `_evaluate_rules`: für `parameter="energy_kj"` `current_value` zu kcal konvertieren, bevor `rule.evaluate()` aufgerufen wird; gelieferter `current_value` in kcal
- [x] 2.2 `recipe/services/recipe_checks.py`: `value_per_serving` und `threshold` für Energie in kcal liefern
- [x] 2.3 `recipe/services/suggestion_service.py`: `_format_value`/`_build_nutritional_summary` Energie-Wert konvertieren; `:471` `("Energie", "kJ")` → `("Energie", "kcal")`
- [x] 2.4 `recipe/services/improvement_ranking_service.py`: `_UNIT_MAP` energy `kJ`→`kcal`; Schritt-Magnitude `:32` (335.0) prüfen/÷4.184; Werte konvertieren
- [x] 2.5 `recipe/services/nutri_improvement_service.py`: Energie-Werte konvertieren (Label bleibt)
- [x] 2.6 `supply/choices.py:54`: `ENERGY_KJ` Label `Energie (kJ)` → `Energie (kcal)` (Key bleibt)

## 3. Seeds auf kcal

- [x] 3.1 `recipe/management/commands/seed_rules.py`: alle `energy_kj`-Regeln auf kcal-Schwellen (day 1554/1912/2629/3107, meal 359/478/956/1195, recipe 287/430/1004/1243, meal_event analog), `unit="kcal"`, `tip_text` in kcal
- [x] 3.2 `core/management/commands/seed_all.py`: Energie-`RecipeHint`-Seeds (`:2098-2137`, `:2518-2563`) auf kcal-Werte + kcal-Texte umrechnen
- [x] 3.3 Verifizieren: Ingredient/DgeReference-Storage-Werte (`energy_kj` Nährwerte) bleiben kJ (NICHT ändern)

## 4. Daten-Migration

- [x] 4.1 Neue recipe-Migration: alle `Rule` mit `parameter="energy_kj"` und `unit != "kcal"` → Schwellen ÷ 4.184, `unit="kcal"` (idempotent)

## 5. Frontend-Anzeige auf kcal

- [x] 5.1 `pages/ingredients/IngredientDetailPage.tsx:679` Nährwert-Zeile + `:1052` Export-Spalte auf kcal
- [x] 5.2 `components/ingredient/IngredientCard.tsx:46-49` auf kcal
- [x] 5.3 `pages/planning/MealEventDetailPage.tsx:991,1000` auf kcal (über Helper)
- [x] 5.4 `pages/planning/RecipePreviewDialog.tsx:44-46,103` auf kcal
- [x] 5.5 `pages/recipes/RecipeDetailPage.tsx:234` units-map energy `kJ`→`kcal`; `:741-764` DGE-Referenz (`dailyEnergyKj=12000` → kcal-Basis, Anzeige + Kommentar)
- [x] 5.6 `pages/tools/NormPortionSimulatorPage.tsx:321-323` Chart-Serie `Energie (kJ)` → kcal (Werte + Label)
- [x] 5.7 `IngredientCreatePage.tsx`: Eingabe bleibt kJ (Entscheidung), Label belassen — verifizieren dass keine Anzeige-Stelle dort kJ zeigt, die kcal sein sollte

## 6. getCoverageStatus + Admin-Editor

- [x] 6.1 `schemas/mealPlan.ts:290-304` `getCoverageStatus` kcal-konform (Konstante `8368`→`2000`, Eingabe kcal); Aufrufer `MealEventDetailPage.tsx:793` Wert zu kcal konvertieren
- [x] 6.2 `components/admin/RuleEditDialog.tsx:23` Label `Energie (kJ)`→`Energie (kcal)`, unit `kcal`; `:88` Default-Unit `kcal`; optional Hilfetext "Werte in kcal"

## 7. Tests

- [x] 7.1 Eval-Test: Energie-Wert kJ wird zu kcal konvertiert und korrekt gegen kcal-Schwelle eingestuft (kein 4.184×-Fehler)
- [x] 7.2 Migration-Test: Bestandsregel kJ→kcal korrekt + idempotent
- [x] 7.3 Seed-Test: `seed_rules` erzeugt kcal-Regeln mit `unit="kcal"`
- [x] 7.4 Frontend-Stichprobe: keine kJ-Anzeige mehr in Zutat/Mahlzeit/Rezept-Vorschau

## 8. Ausführung

- [x] 8.1 Migration + Re-Seed auf Staging; Cockpit-Ampeln prüfen (plausible kcal-Werte, Farben unverändert sinnvoll)
- [x] 8.2 App-Durchsicht: alle Energie-Anzeigen zeigen kcal
