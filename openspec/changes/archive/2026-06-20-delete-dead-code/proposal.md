## Why

Die Codebasis enthält Relikte der gelöschten `idea`-App, veraltete Backward-Compat-Shims, verwaiste Test-Helper, und tote Komponenten. Diese Altlasten erschweren das Verständnis für Neueinsteiger und KI-Agenten und verdecken die tatsächliche Architektur.

## What Changes

- **Backend — Idea-Legacy entfernen**:
  - `/me/ideas/` Legacy-Endpunkt in `profiles/api/profile.py` löschen
  - `content/base_schemas.py` und `content/base_api.py` (Re-Export-Shims) löschen, alle Konsumenten auf direkte Importe umstellen
  - `recipe/choices.py` bereinigen: `RecipeStatusChoices = ContentStatus` Alias entfernen, `HintLevelChoices`/`HintMinMaxChoices`/`HintParameterChoices` Re-Exports entfernen
  - `recipe/models/rule.py`: Backward-Compat Properties `min_max`, `value`, `hint` entfernen
  - `recipe/tests/__init__.py`: `make_recipe_hint()` und `make_health_rule()` Legacy-Factory-Helpers entfernen
  - `supply/choices.py`: `HintLevelChoices.WARNING = HintLevelChoices.WARN` Monkey-Patch entfernen
  - Alle `"Replaces the old Idea model"`-Kommentare und `"Migrated from idea/"`-Kommentare entfernen
  - `IdeaOfTheWeekPage` im Frontend löschen + Route entfernen

- **Backend — Tote Referenzen**:
  - `seed_all.py`: `HintParameterChoices.ENERGY_KJ` → `ENERGY_KCAL` korrigieren
  - `content/api/__init__.py`: Tote for-Schleife und doppelten Router-Init aufräumen
  - `shopping/tests/test_api.py:460`: `assert len(data["items"]) >= 0` → sinnvolle Assertion
  - `Meal.db_column="meal_event_id"` → `db_column="meal_plan_id"` korrigieren (Migration)

- **Frontend — Tote Komponenten**:
  - `MaterialPage.tsx` löschen (keine Route)
  - `AiSuggestDialog.tsx` im Haupt-Frontend löschen (Duplikat im Food-Frontend existiert)
  - `NutrientBalanceChart.tsx` und `NutritionPieChart.tsx` im Haupt-Frontend löschen

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

Keine — es werden keine Spec-Level-Requirements geändert.

## Impact

- **Backend**: ~10 Dateien geändert, ~5 Dateien/große Abschnitte gelöscht
- **Frontend**: ~4 Dateien gelöscht, IdeaOfTheWeekPage + Route entfernt
- **Migrationen**: 1 Migration für `Meal.db_column`-Umbenennung
- **Tests**: Assert-Korrekturen, Legacy-Helper-Entfernungen
