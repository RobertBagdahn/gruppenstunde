## Why

Die Nährwertberechnung für Rezepte liefert teilweise falsche Ergebnisse: unrealistisch niedrige Kalorienangaben (z.B. 8 kcal für ein Gericht) und inkonsistente Summen zwischen Zutaten-Beiträgen und Kachel-Werten. Ursache sind drei unabhängige Bugs in der Berechnungskette.

## What Changes

- **BREAKING**: Korrektur der Gewichtsberechnung für Volumen-basierte Zutaten (EL, Tassen, ml) — `physical_density` der Zutat wird jetzt berücksichtigt → Nährwerte ändern sich für betroffene Rezepte
- Fixe Darstellung von `cached_energy_kcal` (per-100g) in Vorschau-Dialogen: Umstellung auf `cached_energy_total_kcal` / Portion
- Fixe Label "Zutaten-Beiträge pro Portion" — zeigt korrekt per-serving Werte statt total
- Entferne Rounding-Mismatch zwischen per-item und total Werten in `/nutrition-breakdown/`
- N+1 Query-Fix: `select_related("portion__measuring_unit")` in `get_recipe_nutritional_values`

## Capabilities

### New Capabilities
- `nutrition-calculation`: Korrekte Gewichts- und Nährwertberechnung für Rezepte unter Berücksichtigung von physical_density bei Volumeneinheiten

### Modified Capabilities
- *(keine, da der Bug keine Spezifikations-Änderung erfordert — nur Implementierungsfehler)*

## Impact

- **Backend**: `recipe/services/recipe_checks.py`, `recipe/api/nutrition.py` — Berechnungslogik
- **Frontend**: `RecipePreviewDialog`, `RecipePreviewInline`, `RecipePrintPage` — cached_energy_kcal Darstellung
- **Frontend**: `NutritionContributionPanel` — per-serving statt total Werte
- **Tests**: Neue Tests für density-adjusted volume calculation
- **Cache**: Neuberechnung betroffener Rezepte via Management Command
- **Keine Migration**: Nur Logik-Änderungen, keine Schema-Änderungen
