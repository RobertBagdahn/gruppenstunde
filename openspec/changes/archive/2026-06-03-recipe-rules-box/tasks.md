## 1. Backend: Service

- [x] 1.1 Gemeinsamen Helper für Gesamtgewicht und `nutri_class`-Ermittlung aus `match_recipe_hints` extrahieren (Drift vermeiden)
- [x] 1.2 `evaluate_recipe_rules(recipe)` in `recipe/services/recipe_checks.py` implementieren: alle aktiven `scope=recipe`-Regeln auswerten, auch grüne zurückgeben
- [x] 1.3 Pro-Portion-Umrechnung (`value_per_serving = value_per_100g × total_weight_g/100 / servings`) und Status via `Rule.evaluate()` (auf 100g-Basis)
- [x] 1.4 `nutri_class`-Mapping (1→A … 5→E) als `display_value`, ohne Einheit
- [x] 1.5 Relevante Schwelle (`threshold`) und Richtung (`min`/`max`) pro Regel ermitteln; Zähler `green_count`/`yellow_count`/`red_count` aggregieren

## 2. Backend: Schema & Endpunkt

- [x] 2.1 Pydantic-Schemas `RecipeRuleResult` und `RecipeRulesOut` in `recipe/schemas/nutrition.py` anlegen und in `schemas/__init__.py` re-exportieren
- [x] 2.2 Endpunkt `GET /{recipe_id}/rules/` in `recipe/api/nutrition.py` ergänzen (404 bei unbekanntem Rezept)

## 3. Backend: Tests

- [x] 3.1 `recipe/tests/test_recipe_rules.py`: Service-Test mit gemischten Regelergebnissen (grün/gelb/rot enthalten, Zähler korrekt)
- [x] 3.2 Test: inaktive Regeln werden ignoriert
- [x] 3.3 Test: `nutri_class` liefert korrektes `display_value`
- [x] 3.4 Test: Endpunkt Happy-Path (200) und 404 bei unbekannter `recipe_id`
- [x] 3.5 `uv run pytest recipe/tests/test_recipe_rules.py` grün

## 4. Frontend: API-Schicht

- [x] 4.1 Zod-Schemas `recipeRuleResultSchema` und `recipeRulesSchema` in `frontend-food/src/schemas/recipe.ts` (1:1 mit Pydantic)
- [x] 4.2 Hook `useRecipeRules(recipeId)` in `frontend-food/src/api/recipes.ts` (TanStack Query)

## 5. Frontend: UI

- [x] 5.1 `RecipeRulesBox.tsx` in `frontend-food/src/components/recipe/` erstellen (ausklappbar nach `AnalysisSection`-Muster)
- [x] 5.2 Zähler-Ampel-Vorschau im eingeklappten Titel
- [x] 5.3 Regel-Liste: Status-Ampel, Name, Pro-Portion-Wert (bzw. `display_value`), Schwellenwert; Tipp-Text nur bei gelb/rot
- [x] 5.4 Leerzustand: Box ausblenden, wenn keine Regeln vorhanden
- [x] 5.5 Box in `RecipeDetailPage.tsx` einbinden

## 6. Verifikation

- [x] 6.1 Pydantic- und Zod-Schemas auf Synchronität prüfen
- [x] 6.2 Manuell mobil (320px) und Desktop an einem Rezept mit gemischten Regeln prüfen
- [x] 6.3 Keine `console.log` / `print` im Production-Code
