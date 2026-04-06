# planner Specification

## Purpose

Uebergeordnete Spezifikation fuer das Planungsmodul (`planner` Django App). Das Modul umfasst zwei Hauptfunktionen, die jeweils in eigenen Sub-Specs detailliert beschrieben werden:

1. **Heimabend-Planung** (`session-planner/spec.md`): Woechentliche Gruppenstunden planen mit
   festem Wochentag + Uhrzeit, Ideas zuordnen, Termine als ausfallend markieren.
   Refactoring des bestehenden Planner/PlannerEntry-Models.

2. **Essensplan** (`meal-plan/spec.md`): Mehrere Tage mit Mahlzeiten planen,
   Rezepte (Ideas vom Typ `recipe`) zuordnen. Neue Models: MealPlan, MealDay, Meal.

## Context

- **Django App**: `planner`
- **API-Prefix**: `/api/planner/` (Heimabend), `/api/meal-plans/` (Essensplan)
- **Frontend-Routen**: `/session-planner` (Landing), `/session-planner/app` (Heimabend), `/meal-plans` (Landing), `/meal-plans/app` (Essensplan)

## Bestehendes Datenmodell (Ist-Zustand)

Die folgenden Models existieren im Code und werden in `session-planner/spec.md` zur
Heimabend-Planung refactored:

| Model | Felder | Beschreibung |
|-------|--------|-------------|
| `Planner` | `owner` (FK User), `title` (CharField), `created_at`, `updated_at` | Planungs-Container |
| `PlannerEntry` | `planner` (FK), `idea` (FK Idea, nullable), `date` (DateField), `notes` (TextField), `sort_order` (IntegerField) | Einzelner Termin-Eintrag |
| `PlannerCollaborator` | `planner` (FK), `user` (FK), `role` (editor/viewer), `invited_at` | Mitarbeiter-Zuordnung |

### Bestehende API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/planner/` | Eigene + geteilte Planer auflisten (kein Paginierung) |
| POST | `/api/planner/` | Neuen Planer erstellen |
| GET | `/api/planner/{id}/` | Planer mit Eintraegen + Collaborators |
| POST | `/api/planner/{id}/entries/` | Eintrag hinzufuegen |
| DELETE | `/api/planner/{id}/entries/{entry_id}/` | Eintrag loeschen |
| POST | `/api/planner/{id}/invite/` | Collaborator einladen (Owner only) |

### Bestehende Schemas

**PlannerOut**: `id`, `title`, `created_at`, `updated_at`
**PlannerCreateIn**: `title`
**PlannerEntryOut**: `id`, `idea_id` (nullable), `idea_title` (resolved), `date`, `notes`, `sort_order`
**PlannerEntryIn**: `idea_id` (nullable), `date`, `notes` (default ""), `sort_order` (default 0)
**PlannerDetailOut**: `id`, `title`, `entries` (list), `collaborators` (list), `created_at`
**CollaboratorOut**: `id`, `user_id`, `username` (resolved), `role`
**InviteIn**: `user_id`, `role` (default "viewer")

### Bekannte Luecken im Ist-Zustand

- **Kein Update-Endpunkt**: Es fehlt PATCH `/api/planner/{id}/` und PATCH `/api/planner/{id}/entries/{entry_id}/`
- **Keine Paginierung**: `list_planners` gibt eine flache Liste zurueck
- **Kein Gruppen-Bezug**: `Planner` hat kein `group`-Feld (wird in session-planner ergaenzt)
- **Kein Wochentag/Uhrzeit**: `Planner` hat keine `weekday`/`time`-Felder (wird in session-planner ergaenzt)
- **Kein Entry-Status**: `PlannerEntry` hat kein `status`-Feld fuer "cancelled" (wird in session-planner ergaenzt)

## Migration: Bestehender Planer -> Heimabend-Planung

Der bestehende Planner wird wie folgt angepasst:

### Model-Aenderungen

| Feld | Alt | Neu |
|------|-----|-----|
| `Planner.group` | — (nicht vorhanden) | FK zu UserGroup (REQUIRED) |
| `Planner.weekday` | — | IntegerField (0=Montag, 6=Sonntag) |
| `Planner.time` | — | TimeField (z.B. 18:00) |
| `PlannerEntry.status` | — | CharField (planned/cancelled) |
| `PlannerEntry.date` | vorhanden | Bleibt, wird auf den festen Wochentag normalisiert |

### API-Aenderungen

| Aenderung | Details |
|-----------|---------|
| PATCH `/api/planner/{id}/` | Neu: Planer aktualisieren (Titel, Wochentag, Uhrzeit) |
| PATCH `/api/planner/{id}/entries/{entry_id}/` | Neu: Eintrag aktualisieren (Idea, Notizen, Status) |
| GET `/api/planner/` | Erweitern: Paginierung + Filter nach Gruppe |
| POST `/api/planner/` | Erweitern: `group_id`, `weekday`, `time` als Pflichtfelder |

## Sub-Specs

- **[session-planner/spec.md](../session-planner/spec.md)**: Vollstaendige Spezifikation der Heimabend-Planung (Ziel-Zustand nach Refactoring)
- **[meal-plan/spec.md](../meal-plan/spec.md)**: Vollstaendige Spezifikation des Essensplan-Tools (neue Models)
