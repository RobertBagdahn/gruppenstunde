## Why

Die Stammdaten (RetailSection, NutritionalTag, HealthRule) können aktuell nur über das Django-Admin verwaltet werden. RecipeHints haben eine Admin-Seite im Haupt-Frontend, aber nicht im food-frontend wo sie hingehören. Staff-User brauchen eine einheitliche Oberfläche im food-frontend um alle Referenzdaten zu pflegen.

## What Changes

- Neuer `/admin`-Bereich im food-frontend mit Staff-Auth-Guard
- CRUD-API-Endpunkte (Create, Update, Delete) für RetailSection, NutritionalTag, HealthRule im Backend (staff-only)
- Admin-Seite mit Tab-Navigation: RetailSection, NutritionalTag, RecipeHint, HealthRule
- Shared Table-Layout mit individuellen Dialog-Formularen pro Typ (React Hook Form + Zod)
- TanStack Query Hooks für alle CRUD-Operationen
- Entfernung der RecipeHintAdminPage aus dem Haupt-Frontend

## Capabilities

### New Capabilities

- `food-admin`: Staff-geschützter Admin-Bereich im food-frontend mit Tab-basierter Stammdatenverwaltung (RetailSection, NutritionalTag, RecipeHint, HealthRule)

### Modified Capabilities

- `recipe-hint-admin`: Admin-UI wandert vom Haupt-Frontend ins food-frontend; Backend-API bleibt unverändert

## Impact

- **Backend**: `supply/api/` — neue CRUD-Endpunkte für RetailSection und NutritionalTag; `recipe/api/` — neue CRUD-Endpunkte für HealthRule. Neue Pydantic-Schemas für Create/Update.
- **Frontend-food**: Neue Route `/admin`, neue Seiten und Komponenten, neue Zod-Schemas für alle vier Typen, neue TanStack Query Hooks.
- **Frontend (main)**: Entfernung von `RecipeHintAdminPage` und zugehörigem Admin-Tab.
- **Migrations**: Keine DB-Migrations nötig (Models existieren bereits).
- **Schemas**: Neue Pydantic-Schemas (RetailSectionIn, NutritionalTagIn, HealthRuleIn) + entsprechende Zod-Schemas im food-frontend.
