## Why

Die Meal Plan API und TanStack Query Hooks existieren vollständig, aber es gibt keine Frontend-Seiten. `/meal-plans/app` wird verlinkt (Landing Page, Command Palette, Layout), aber die Route existiert nicht in `App.tsx`. Ohne diese Seiten können User weder Essenspläne erstellen noch die kürzlich implementierte Collaborator-Funktion nutzen.

## What Changes

- Neue Route `/meal-plans/app` mit Meal Plan List Page (eigene + kollaborative Pläne)
- Neue Route `/meal-plans/new` mit Create-Formular
- Neue Route `/meal-plans/:id` mit Detail Page (Tagesansicht, Mahlzeiten, Items)
- Collaborator-Management-Section auf der Detail Page (analog Shopping List)
- Routen-Registrierung in `App.tsx`

## Capabilities

### New Capabilities
- `meal-plan-frontend`: Frontend-Seiten für Meal Plan CRUD, Detail-Ansicht und Collaborator-Management

### Modified Capabilities

## Impact

- **Frontend Pages**: 3 neue Seiten (List, Create, Detail)
- **Frontend Components**: Collaborator-Management-Komponente (wiederverwendbar oder Meal-Plan-spezifisch)
- **Routing**: `App.tsx` bekommt neue Routes
- **Zod Schemas**: Bereits vorhanden (`schemas/mealPlan.ts` + Collaborator-Schema)
- **API Hooks**: Bereits vorhanden (`api/mealPlans.ts` inkl. Collaborator-Hooks)
- **Backend**: Keine Änderungen nötig (API komplett)
