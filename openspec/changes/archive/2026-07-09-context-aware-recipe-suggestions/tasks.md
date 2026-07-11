## 1. Backend: MealPlanTag Modell + API

- [x] 1.1 `MealPlanTag` Model in `planner/models/meal_plan.py` anlegen (name, meal_plan FK, UniqueConstraint)
- [x] 1.2 Migration erstellen und anwenden
- [x] 1.3 Pydantic-Schemas für Tags in `planner/schemas/meal_plan.py` (MealPlanTagIn, MealPlanTagOut)
- [x] 1.4 CRUD-Endpunkte unter `/api/meal-plans/{plan_id}/tags/` in `planner/api/meal_plan.py`
- [x] 1.5 Tags-Feld im MealPlan-Detail-Response ergänzen (MealPlanOut um tags erweitern)
- [x] 1.6 Tests für Tag-CRUD schreiben (Auth, Berechtigung, Duplikate, 404)

## 2. Backend: Enhanced Intelligent Suggestions

- [x] 2.1 `intelligent_suggestions_service.py` umbauen: Vorauswahl von Top 30 (statt Top 15) nach algorithmischem Scoring
- [x] 2.2 Prompt-Assembly-Funktion schreiben: Event-Kontext, MealPlan-Beschreibung, Tags, Essensplan-Übersicht, Top-30-Kandidaten in einen deutschen Prompt packen
- [x] 2.3 Query-Parameter von `ai_enhance` auf `context_enhance` umbenennen, Default `true`
- [x] 2.4 Fallback-Logik beibehalten: bei Gemini-Fehler → algorithmisches Scoring
- [x] 2.5 Tests für Prompt-Assembly und Fallback schreiben

## 3. Frontend: Zod Schemas

- [x] 3.1 `MealPlanTagSchema` in `frontend-food/src/schemas/mealPlan.ts` anlegen (1:1 mit Pydantic)
- [x] 3.2 MealPlanDetail-Schema um `tags: z.array(MealPlanTagSchema)` erweitern
- [x] 3.3 `context_enhance` Query-Parameter im IntelligentSuggestions-Schema ergänzen

## 4. Frontend: Tag-UI im SettingsPanel

- [x] 4.1 `useMealPlanTags` Hook in `frontend-food/src/api/mealPlans.ts` (CRUD: list, create, delete)
- [x] 4.2 Tag-Manager-Komponente im `SettingsPanel` (Tag-Input + Chip-Liste + Lösch-Button)
- [x] 4.3 Tag-Liste im MealPlan-Detail anzeigen (read-only, unter Plan-Metadaten)
- [x] 4.4 Tests für Tag-Hooks und Komponente (via API-Tests + TypeScript)

## 5. Integration

- [x] 5.1 Migration anwenden auf lokaler DB
- [x] 5.1b Migration für Prod (bei nächstem Prod-Deploy)
- [x] 5.2 Manueller Test: Tag anlegen → Vorschläge aufrufen → Gemini-Prompt enthält Tags
- [x] 5.3 Frontend-Test: Tags im SettingsPanel anlegen/löschen, persistiert bei Reload
