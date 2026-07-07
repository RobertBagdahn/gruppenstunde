## Why

Der AI-gestützte Essensplan-Generator in `frontend-food` generiert Vorschläge (Tage + Mahlzeiten mit Rezept-IDs), zeigt sie im Wizard an, aber persistiert sie nie in der Datenbank. Die `handleCreate`-Funktion in `MealPlanWizardPage.tsx` hat eine tote Schleife (Zeilen 102–111), die über `suggestions.days` iteriert aber keine API aufruft. Nutzer sehen die KI-Vorschläge, klicken "Essensplan erstellen" — und erhalten einen leeren Plan. Das Feature ist damit broken-by-design.

## What Changes

- **Neuer Backend-Endpunkt** `POST /api/meal-plans/{id}/apply-ai/` — nimmt `AiSuggestOut` (oder ein Subset) entgegen, erstellt zu jedem Tag die passenden Meals (via `create_meals_for_date_timeaware`) und legt pro Mahlzeit `MealItem`-Einträge für die vorgeschlagenen Rezepte an
- **Frontend `handleCreate` reparieren** — nach Plan-Erstellung mit AI-Strategy den neuen Endpunkt aufrufen statt toter Schleife
- **Zod-Schema für Apply-Request** — synchron zu Pydantic-Schema
- **TanStack Query Hook** `useApplyAiSuggestions(planId)` im Food-Frontend
- **Tests** für den neuen Endpunkt + aktualisierte Wizard-Tests

## Capabilities

### New Capabilities
- `meal-plan-ai-apply`: Definieren wie AI-Vorschläge auf einen MealPlan angewendet werden: Endpunkt-Signatur, Request/Response-Schemas, Bulk-Creation-Logik (Meals + MealItems in einer Transaktion), Fehlerbehandlung (teilweise Anwendung bei ungültigen recipe_ids)

### Modified Capabilities
- *(keine — dies ist eine neue Fähigkeit, keine Änderung bestehender Specs)*

## Impact

- **Backend**: Neue Datei `planner/api/apply_ai.py` (oder in bestehendem `ai_generation.py`), neues Schema `AiApplyIn`, neuer Service `AiApplyService` oder Erweiterung von `MealPlanAiService`, Tests in `planner/tests/test_apply_ai.py`
- **Frontend**: `frontend-food/src/pages/planning/wizard/MealPlanWizardPage.tsx` (`handleCreate` reparieren), neuer API-Hook in `frontend-food/src/api/mealPlans.ts`, neues Zod-Schema in `frontend-food/src/schemas/mealPlan.ts`
- **Keine DB-Migrationen** — das Modell-Schema wird nicht geändert
