## 1. Backend: Pfad und Namespace ändern

- [x] 1.1 `planner/api/ai_generation.py` – Endpunkt-Pfad von `/ai-suggest/` auf `/ai/suggest/` ändern
- [x] 1.2 `inspi/urls.py` – Router-Reihenfolge ändern: `ai_suggest_router` + `ref_meal_router` vor `meal_plan_router`

## 2. Backend: Tests aktualisieren

- [x] 2.1 `planner/tests/test_ai_generation.py` – URLs von `/api/meal-plans/ai-suggest/` auf `/api/meal-plans/ai/suggest/` aktualisieren
- [x] 2.2 Tests ausführen: `uv run python manage.py test planner.tests.test_ai_generation --keepdb`

## 3. Frontend: API-URL aktualisieren

- [x] 3.1 `frontend-food/src/api/mealPlans.ts` – API-URL in `aiSuggest`-Funktion von `/ai-suggest/` auf `/ai/suggest/` ändern

## 4. Dokumentation

- [x] 4.1 `backend/AGENTS.md` – Konvention für Router-Reihenfolge hinzufügen: spezifische Pfade vor parametrisierten Routern registrieren
