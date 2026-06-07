## Why

Der bestehende `CopyFromPlanDialog` zeigt nur eine flache Plan-Liste ohne Such-/Datumsfilter, keine Mahlzeiten-Vorschau vor dem Kopieren, und setzt keinen Hinweis auf die Herkunft der importierten Daten. Das macht die Wiederverwendung von bestehenden Essensplänen umständlich. Scouter wollen schnell passende Mahlzeiten aus früheren Lagern/Events finden und übernehmen — mit Kontext (Datum, Tage, Vorschau) und Herkunfts-Vermerk.

## What Changes

- **BREAKING** Ersetzt den bestehenden `CopyFromPlanDialog` durch einen neuen `CopyFromPlanDialog` mit:
  - Suchfilter (name, description, event_name) auf der Plan-Liste
  - Datumsfilter (von–bis) auf der Plan-Liste
  - Erweiterte Plan-Karten: Datumsbereich, Anzahl Tage, Mahlzeiten-Count
  - Mahlzeiten-Vorschau beim Meal-Selektions-Schritt (Items-Liste + kcal-Summe)
  - Automatische Note auf der Ziel-Mahlzeit: "Importiert aus «<Plan-Name>»"
- Neuer Backend-Endpunkt für angereicherte Plan-Liste (für Such-/Datumsfilter)
- Anpassung des bestehenden Copy-Endpunkts: optionale note-Übergabe
- Entfernt die Item-Selektion (Checkboxen) — stattdessen immer komplette Mahlzeit

## Capabilities

### New Capabilities
- `event-meal-import-dialog`: Multi-Step-Dialog zum Import von Mahlzeiten aus anderen Essensplänen mit Such-/Datumsfilter, Plan-Vorschau, Meal-Vorschau und automatischer Herkunfts-Note

### Modified Capabilities
- `meal-item-copy`: Das Requirement ändert sich von "Einzel-Items selektieren" zu "komplette Mahlzeit übernehmen". Item-Selektion entfällt, dafür kommen Plan-Suche/Filter, Meal-Vorschau, und auto-Note hinzu.

## Impact

- **Frontend**: `frontend-food/src/pages/planning/CopyFromPlanDialog.tsx` — vollständig ersetzt. `frontend-food/src/api/mealPlans.ts` — neuer/angepasster Query. `frontend-food/src/schemas/mealPlan.ts` — ggf. neues Schema für Plan-Liste mit Filtern.
- **Backend**: `backend/planner/api/meal_plan.py` — neuer Endpunkt für gefilterte Plan-Liste und/oder Erweiterung bestehender Plan-Liste (query parameters für search/date_from/date_to). Copy-Endpunkt optional um note-Parameter erweitert.
- Keine neuen Abhängigkeiten.
