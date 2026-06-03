## Why

Auf der Rezept-Detailseite werden die Rezeptregeln im neuen "Rezeptregeln"-Akkordeon fälschlicherweise auf 100g-Basis anstatt auf Portionsbasis ausgewertet. Da die in der Datenbank hinterlegten DGE-Regeln (wie "Eiweiß (Rezept) >= 30g") absolute Portions-Sollwerte sind, führt dies zu fehlerhaften roten Bewertungen (z.B. wird ein Quarkbrot mit 59,42g Eiweiß pro Portion als rot markiert, da sein 100g-Wert von 13,5g unter dem Schwellenwert von 30g liegt).

Gleichzeitig summiert das Nährstoff-Cockpit im Menüplan fälschlicherweise per-100g-Werte von Rezepten anstelle von portionsskalierten Werten. Dies führt im Cockpit und bei den automatisierten Menüplan-Empfehlungen (Suggestions) zu massiven Verfälschungen (z.B. falsche Defizit-Warnungen), da tagesbasierte Gesamtwerte gegen absolute Tagesbedarfe (8.000–11.000 kJ) ausgewertet werden.

## What Changes

- **Datenmodell**: Ergänzung des `Recipe`-Modells um das denormalisierte Feld `cached_weight_g` zur performanten Ermittlung des Rezept-Gesamtgewichts ohne N+1-Datenbankabfragen.
- **Cache-Berechnung**: Anpassung von `recalculate_recipe_cache` zur Berechnung und Speicherung des Gesamtgewichts im neuen Feld `cached_weight_g`.
- **Rezept-Regelauswertung**:
  - `evaluate_recipe_rules(recipe)` wertet Regeln auf Portionsbasis aus (Wert pro 100g × Gesamtgewicht / 100 / Portionen), mit Ausnahme von `nutri_class` und `weight_g`.
  - `match_recipe_hints(recipe)` wertet ebenfalls auf Portionsbasis aus.
- **Cockpit- & Suggestion-Aggregation**:
  - `_aggregate_meal_values(meal)` berechnet Nährwerte pro Portion/Person durch Portionsskalierung (Wert pro 100g × Gesamtgewicht / 100 / Portionen × Skalierungsfaktor des Mahlzeiteneintrags).
  - Das Cockpit und die Suggestions werten die aggregierten Tages- und Mahlzeitenwerte somit korrekt auf Pro-Person-Basis gegen die hinterlegten Regeln aus.

## Capabilities

### New Capabilities
<!-- Keine neuen Capabilities, da wir bestehende korrigieren -->

### Modified Capabilities
- `recipe-rules-display`: Auswertung der Rezeptregeln erfolgt nun korrekt auf Portionsbasis statt per-100g-Basis.
- `meal-cockpit`: Aggregation und Auswertung der Nährwert-Regeln auf Mahlzeiten-, Tages- und Planebene erfolgt nun korrekt auf Portionsbasis (per Person) statt per-100g-Basis.
- `recipe-suggestions`: Automatisierte Verbesserungsvorschläge und Plan-Analysen basieren auf korrekten Pro-Person-Nährwertaggregaten.

## Impact

- **Backend (`recipe` & `planner` Apps)**:
  - `recipe/models/recipe.py` — neues Feld `cached_weight_g`.
  - `recipe/services/recipe_checks.py` — Speicherung von `cached_weight_g` in `recalculate_recipe_cache`; Anpassung von `evaluate_recipe_rules` und `match_recipe_hints`.
  - `recipe/services/nutrition_aggregation.py` — Anpassung von `_aggregate_meal_values` zur Portionsskalierung.
  - Tests: Aktualisierung und Erweiterung der Tests in `recipe/tests/test_recipe_rules.py` und Anpassung/Erstellung von Integrationstests für das Cockpit.
- **Datenbank**: Migration für `cached_weight_g` erstellen und per Management-Command (`recalculate_recipe_caches`) Backfill ausführen.
- **Frontend (`frontend-food`)**: Keine UI-Änderungen erforderlich, da die API-Schemas unverändert bleiben; die angezeigten Ampelfarben und Werte werden nun automatisch korrekt dargestellt.
