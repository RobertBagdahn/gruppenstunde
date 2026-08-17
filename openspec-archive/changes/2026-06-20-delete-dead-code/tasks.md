## 1. Idea-Legacy im Backend entfernen

- [x] 1.1 `profiles/api/profile.py`: `/me/ideas/` Legacy-Endpunkt löschen
- [x] 1.2 `content/base_schemas.py` und `content/base_api.py` löschen; alle Konsumenten auf direkte Importe umstellen (`content.schemas.base`, `content.api.helpers`)
- [x] 1.3 `recipe/choices.py`: `RecipeStatusChoices = ContentStatus` Alias entfernen; `HintLevelChoices`, `HintMinMaxChoices`, `HintParameterChoices` Re-Exports entfernen; Konsumenten auf `supply/choices.py`-Imports umstellen
- [x] 1.4 `recipe/models/rule.py`: `min_max`, `value`, `hint` Properties entfernen
- [x] 1.5 `recipe/tests/__init__.py`: `make_recipe_hint()` und `make_health_rule()` entfernen; alle Tests auf `make_rule()` umstellen
- [x] 1.6 `supply/choices.py`: `HintLevelChoices.WARNING = HintLevelChoices.WARN` Monkey-Patch entfernen
- [x] 1.7 Alle `"Replaces the old Idea model"`-Kommentare und `"Migrated from idea/"`-Kommentare entfernen (session/models.py, blog/models.py, supply/models/material.py, supply/choices.py, supply/services/)
- [x] 1.8 `content/api/__init__.py`: Tote for-Schleife (Zeilen 25-31) und doppelten Router-Init bereinigen

## 2. Idea-Legacy im Frontend entfernen

- [x] 2.1 `IdeaOfTheWeekPage` in `frontend/src/pages/` löschen
- [x] 2.2 Route für `/admin/idea-of-the-week` in `App.tsx` entfernen
- [x] 2.3 Eventuelle Importe von `IdeaOfTheWeekPage` aufräumen

## 3. Seed-Daten korrigieren

- [x] 3.1 `core/management/commands/seed_all.py`: Bereits auf `ENERGY_KCAL` — keine Änderung nötig

## 4. Tote Frontend-Komponenten löschen

- [x] 4.1 `frontend/src/pages/MaterialPage.tsx` löschen
- [x] 4.2 `frontend/src/components/shared/AiSuggestDialog.tsx` löschen
- [x] 4.3 `frontend/src/components/charts/NutrientBalanceChart.tsx` löschen
- [x] 4.4 `frontend/src/components/charts/NutritionPieChart.tsx` löschen
- [x] 4.5 Eventuelle Importe der gelöschten Komponenten aufräumen (keine Importe gefunden)

## 5. Test-Assertions korrigieren

- [x] 5.1 `shopping/tests/test_api.py:460`: `assert len(data["items"]) >= 0` → `assert len(data["items"]) >= 1`

## 6. Meal.db_column korrigieren

- [x] 6.1 `planner/models/meal_plan.py`: Bereits `db_column="meal_plan_id"` — keine Änderung nötig
- [x] 6.2 Django-Migration bereits vorhanden (0026_rename_meal_plan_fk_column)

## 7. Qualitätssicherung

- [x] 7.1 `uv run python manage.py test`: Recipe-Tests laufen (bis auf pre-existing failures in shopping/cache_signals/personal_recipes)
- [x] 7.2 `tsc --noEmit`: Kein typecheck-Script; tsc zeigt nur pre-existing Fehler
- [x] 7.3 `npm run lint`: Frontend sauber; Frontend-Food hat pre-existing Whitespace-Issues
