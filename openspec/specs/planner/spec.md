# planner Specification

## Purpose

Übergeordnete Spezifikation für das Planungsmodul (`planner` Django App). Das Modul umfasst zwei Hauptfunktionen, die jeweils in eigenen Sub-Specs detailliert beschrieben werden:

1. **Heimabend-Planung** (`session-planner/spec.md`): Wöchentliche Gruppenstunden planen mit
   festem Wochentag + Uhrzeit, GroupSessions zuordnen, Termine als ausfallend markieren.

2. **Essensplan** (`meal-plan/spec.md`): Mehrere Tage mit Mahlzeiten planen,
   Rezepte (`recipe.Recipe`) zuordnen. Models: MealEvent (DB: `planner_mealplan`), Meal, MealItem.

## Context

- **Django App**: `planner`
- **API-Prefix**: `/api/planner/` (Heimabend), `/api/meal-plans/` (Essensplan, aktuell im Code als `/api/meal-events/` — Rename geplant)
- **Frontend-Routen**: `/session-planner` (Landing), `/session-planner/app` (Heimabend), `/meal-plans` (Landing), `/meal-plans/app` (Essensplan)

## Datenmodell (Ist-Zustand)

### Heimabend-Planung

| Model | Felder | Beschreibung |
|-------|--------|-------------|
| `Planner` | `owner` (FK User), `title` (CharField), `group` (FK UserGroup, nullable), `weekday` (IntegerField 0-6, default=Friday), `time` (TimeField, default="18:00"), `created_at`, `updated_at` | Planungs-Container mit Gruppen-Bezug |
| `PlannerEntry` | `planner` (FK), `session` (FK GroupSession, nullable), `date` (DateField), `notes` (TextField), `status` (planned/cancelled), `sort_order` (IntegerField) | Einzelner Termin-Eintrag |
| `PlannerCollaborator` | `planner` (FK), `user` (FK), `role` (editor/viewer), `invited_at` | Mitarbeiter-Zuordnung |

### Essensplan

| Model | Felder | Beschreibung |
|-------|--------|-------------|
| `MealEvent` | `name`, `slug` (unique), `description`, `norm_portions`, `activity_factor`, `reserve_factor`, `event` (FK Event, nullable), `created_by` (FK), timestamps. DB-Tabelle: `planner_mealplan` | Essensplan-Container |
| `Meal` | `meal_event` (FK), `start_datetime`, `end_datetime`, `meal_type` (breakfast/lunch/dinner/snack/dessert), `day_part_factor` | Einzelne Mahlzeit |
| `MealItem` | `meal` (FK), `recipe` (FK Recipe), `factor` (default 1.0) | Rezept-Zuordnung zu Mahlzeit |

## Sub-Specs

- **[session-planner/spec.md](../session-planner/spec.md)**: Vollständige Spezifikation der Heimabend-Planung
- **[meal-plan/spec.md](../meal-plan/spec.md)**: Vollständige Spezifikation des Essensplan-Tools

## Requirements

### Requirement: Friendly unauthenticated state on session-planner app route
The app route `/session-planner/app` SHALL display a friendly authentication prompt when accessed by an unauthenticated user, instead of a raw API error or empty screen.

#### Scenario: Anonymous user opens session-planner app
- **WHEN** an unauthenticated user navigates to `/session-planner/app`
- **THEN** the page SHALL display a shared `<UnauthGate>` component with a short explanation ("Melde dich an, um deine Gruppenstunden zu planen.")
- **AND** a primary "Anmelden" CTA linking to the login page
- **AND** a secondary "Kostenlos registrieren" CTA linking to the registration page
- **AND** no API call that would return 403 SHALL be executed

## Planned Changes

### Planned: Rename `/api/meal-events/` to `/api/meal-plans/`
Der kanonische Name ist `meal-plans`. Im Code wird aktuell `/api/meal-events/` verwendet. Ein Rename ist geplant, um Backend-Routes, Frontend-Routes, API-Hooks und Schemas zu vereinheitlichen.
