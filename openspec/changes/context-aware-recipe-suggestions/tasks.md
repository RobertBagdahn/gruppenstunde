## 1. Backend: MealPlanTag Modell + API

- [ ] 1.1 `MealPlanTag` Model in `planner/models/meal_plan.py` anlegen (name, meal_plan FK, UniqueConstraint)
- [ ] 1.2 Migration erstellen und anwenden
- [ ] 1.3 Pydantic-Schemas für Tags in `planner/schemas/meal_plan.py` (MealPlanTagIn, MealPlanTagOut)
- [ ] 1.4 CRUD-Endpunkte unter `/api/meal-plans/{plan_id}/tags/` in `planner/api/meal_plan.py`
- [ ] 1.5 Tags-Feld im MealPlan-Detail-Response ergänzen (MealPlanOut um tags erweitern)
- [ ] 1.6 Tests für Tag-CRUD schreiben (Auth, Berechtigung, Duplikate, 404)

## 2. Backend: Enhanced Intelligent Suggestions

- [ ] 2.1 `intelligent_suggestions_service.py` umbauen: Vorauswahl von Top 30 (statt Top 15) nach algorithmischem Scoring
- [ ] 2.2 Prompt-Assembly-Funktion schreiben: Event-Kontext, MealPlan-Beschreibung, Tags, Essensplan-Übersicht, Top-30-Kandidaten in einen deutschen Prompt packen
- [ ] 2.3 Query-Parameter von `ai_enhance` auf `context_enhance` umbenennen, Default `true`
- [ ] 2.4 Fallback-Logik beibehalten: bei Gemini-Fehler → algorithmisches Scoring
- [ ] 2.5 Tests für Prompt-Assembly und Fallback schreiben

## 3. Frontend: Zod Schemas

- [ ] 3.1 `MealPlanTagSchema` in `frontend-food/src/schemas/mealPlan.ts` anlegen (1:1 mit Pydantic)
- [ ] 3.2 MealPlanDetail-Schema um `tags: z.array(MealPlanTagSchema)` erweitern
- [ ] 3.3 `context_enhance` Query-Parameter im IntelligentSuggestions-Schema ergänzen

## 4. Frontend: Tag-UI im SettingsPanel

- [ ] 4.1 `useMealPlanTags` Hook in `frontend-food/src/api/mealPlans.ts` (CRUD: list, create, delete)
- [ ] 4.2 Tag-Manager-Komponente im `SettingsPanel` (Tag-Input + Chip-Liste + Lösch-Button)
- [ ] 4.3 Tag-Liste im MealPlan-Detail anzeigen (read-only, unter Plan-Metadaten)
- [ ] 4.4 Tests für Tag-Hooks und Komponente

## 5. Integration

- [ ] 5.1 Migration anwenden auf lokaler + prod-Datenbank
- [ ] 5.2 Manueller Test: Tag anlegen → Vorschläge aufrufen → Gemini-Prompt enthält Tags
- [ ] 5.3 Frontend-Test: Tags im SettingsPanel anlegen/löschen, persistiert bei Reload
