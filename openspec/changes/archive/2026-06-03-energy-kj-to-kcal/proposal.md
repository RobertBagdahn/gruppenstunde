## Why

Energie wird in der gesamten App uneinheitlich angezeigt: an manchen Stellen in Kilojoule (kJ), an anderen bereits in Kilokalorien (kcal). Nutzer (Gruppenführer, Eltern) denken in kcal — kJ ist für die Zielgruppe wenig greifbar. Zusätzlich sind die Nährwert-Regeln (Ampel-Schwellen) und ihre Hinweistexte in kJ formuliert, was die Anzeige inkonsistent und schwer verständlich macht.

## What Changes

- **BREAKING (Regeldaten)**: Alle Energie-bezogenen Ampel-Regeln werden physisch auf kcal umgestellt. Schwellwerte (`min_yellow/min_green/max_green/max_yellow`) und `unit` der Rule-Datensätze mit `parameter="energy_kj"` werden von kJ auf kcal umgerechnet (÷ 4,184). Eine Daten-Migration konvertiert Bestandsregeln.
- **Eval-Pipeline**: Der in `Rule.evaluate()` eingespeiste Energie-Wert wird vor dem Vergleich von kJ nach kcal konvertiert, damit Wert und Schwelle dieselbe Einheit haben.
- **Seeds**: `seed_rules.py` und die Energie-`RecipeHint`-Seeds in `seed_all.py` werden auf kcal-Schwellwerte und kcal-Hinweistexte umgeschrieben.
- **Backend-Label-/Unit-Maps**: `suggestion_service`, `improvement_ranking_service`, `nutri_improvement_service`, `supply/choices.py` geben für Energie `kcal` als Einheit aus und konvertieren ihre Werte.
- **Frontend-Anzeige**: Jede verbliebene kJ-Anzeige (Zutat-Detail/Card/Export, Mahlzeit-Nährwerte, Rezept-Vorschau, Rezept-DGE-Referenz, Norm-Portion-Simulator) wird auf kcal umgestellt; ein zentraler `kjToKcal`-Helper ersetzt verstreute `/ 4.184`-Berechnungen.
- **Hardcoded-Konstante**: `getCoverageStatus` in `mealPlan.ts` arbeitet konsistent mit kcal (Konstante `8368` → `2000`, Eingabewert in kcal).
- **Admin-Rule-Editor**: Parameter-Dropdown-Label `Energie (kJ)` → `Energie (kcal)`, Default-Unit `kcal`; Schwellwert-Eingaben bedeuten künftig kcal.

**Nicht geändert**: Die DB-Speicherung der Nährwerte bleibt in kJ (`energy_kj`, `cached_energy_kj`, `cached_energy_total_kj`, `Ingredient.energy_kj`). Feldnamen bleiben. Nur die Auswertung an der Regel-/Anzeige-Grenze wird kcal.

## Capabilities

### New Capabilities
- `energy-unit-display`: Einheitliche kcal-Darstellung von Energie in der gesamten App (Anzeige, Regeln, Hinweistexte) bei unveränderter kJ-Speicherung.

### Modified Capabilities
- `meal-plan-colorful-ui`: Die Soll-Deckungs-Berechnung (`getCoverageStatus`) wird auf kcal umgestellt (Referenzbasis 2000 kcal statt 8368 kJ).
- `meal-cockpit`: Energie-Regeln werden in kcal ausgewertet; der eingespeiste Energie-Wert wird vor der Schwellenprüfung zu kcal konvertiert.

## Impact

- **Backend / recipe App**:
  - Migration (neu): konvertiert Bestands-`Rule`-Schwellen + `unit` für `parameter="energy_kj"`
  - Geändert: `recipe/services/nutrition_aggregation.py` (`_evaluate_rules`), `recipe/services/recipe_checks.py` (`value_per_serving`/`threshold`), `recipe/services/suggestion_service.py`, `recipe/services/improvement_ranking_service.py`, `recipe/services/nutri_improvement_service.py`
  - Geändert (Seeds): `recipe/management/commands/seed_rules.py`, `core/management/commands/seed_all.py`
- **Backend / supply App**: `supply/choices.py` (`ENERGY_KJ`-Label)
- **Frontend (frontend-food)**: `schemas/mealPlan.ts` (`getCoverageStatus`), `pages/planning/MealEventDetailPage.tsx`, `pages/planning/RecipePreviewDialog.tsx`, `pages/recipes/RecipeDetailPage.tsx`, `pages/ingredients/IngredientDetailPage.tsx`, `pages/ingredients/IngredientCreatePage.tsx`, `components/ingredient/IngredientCard.tsx`, `pages/tools/NormPortionSimulatorPage.tsx`, `components/admin/RuleEditDialog.tsx`, neuer Helper in `utils/`
- **Schemas**: Keine Pydantic-/Zod-Feld-Umbenennung. Cockpit-/Rule-Out-Werte ändern semantisch ihre Einheit (Wert+`unit` jetzt kcal für Energie) — Zod-Strukturen bleiben gleich.
- **Migration**: 1 Daten-Migration (recipe). Re-Seed nach Code-Änderung nötig.
- **Tests**: Eval-Konvertierung (kJ→kcal vor evaluate), Migration, Seed-Werte, Frontend-Anzeige-Stichproben.
