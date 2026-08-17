## Why

Nutzer erstellen häufig ähnliche Essenspläne für wiederkehrende Veranstaltungen (z.B. Sommerlager jedes Jahr). Aktuell müssen sie jeden Plan komplett neu anlegen und alle Mahlzeiten/Rezepte manuell zuordnen. Ein "Als Vorlage verwenden"-Feature spart erheblich Zeit.

## What Changes

- Neuer API-Endpunkt `POST /api/meal-plans/{id}/duplicate/` der einen bestehenden Plan mit neuen Parametern kopiert
- Kopiert alle Meals und MealItems, verschiebt Datumswerte um den Offset zwischen altem und neuem Startdatum
- Collaborators, MealItemOverrides und Notizen werden NICHT kopiert
- Neuer Pydantic-Schema `MealPlanDuplicateIn` (name, start_datetime, norm_portions)
- Neues Zod-Schema + TanStack Query Mutation im Frontend
- "Als Vorlage verwenden"-Option im Kontextmenü der Essensplan-Karten (MealEventListPage)
- Dialog mit drei Pflichtfeldern: Name, Startdatum, Portionen

## Capabilities

### New Capabilities
- `meal-plan-duplicate`: Duplizieren eines bestehenden Essensplans mit neuem Startdatum und Portionen

### Modified Capabilities
- `meal-plan`: Neuer Endpunkt auf dem bestehenden MealPlan-Router

## Impact

- **Backend**: `planner` App — neuer API-Endpunkt, neues Schema. Keine Migration nötig.
- **Frontend**: `frontend-food/` — MealEventListPage (Kontextmenü + Dialog), neue API-Funktion, neues Zod-Schema
- **Schemas**: Neues Pydantic-Schema `MealPlanDuplicateIn`, neues Zod-Schema `mealPlanDuplicateSchema`
