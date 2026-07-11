# meal-plan-tags Specification

## Purpose
Defines a tagging system for MealPlans, allowing users to categorize and filter meal plans with custom tags. Tags are also passed to Gemini for context-aware recipe suggestions.

## Requirements

### Requirement: MealPlanTag Modell

Das System SHALL ein MealPlanTag-Modell bereitstellen, das benutzerdefinierte Tags für MealPlans abbildet.

#### Scenario: Modell-Struktur

- **WHEN** ein MealPlanTag-Eintrag angelegt wird
- **THEN** enthält er: `name` (CharField, max 50), `meal_plan` (FK zu MealPlan)
- **THEN** hat er einen UniqueConstraint auf `(name, meal_plan)`
- **THEN** der name wird automatisch getrimmt und in Kleinbuchstaben umgewandelt (via `save()`-Override oder `pre_save`-Signal)
- **THEN** ein Tag "  Frühstück  " wird als "frühstück" gespeichert
- **THEN** ein Tag "Frühstück" und ein Tag "frühstück" sind identisch (case-insensitive via lowercase)

#### Scenario: Tag-Löschung bei MealPlan-Löschung

- **WHEN** ein MealPlan gelöscht wird
- **THEN** werden alle zugehörigen MealPlanTag-Einträge kaskadiert gelöscht (CASCADE)

### Requirement: Tags via API verwalten

Das System SHALL REST-Endpunkte bereitstellen, um Tags für einen MealPlan zu verwalten.

#### Scenario: Tags abrufen (GET list)

- **WHEN** ein authentifizierter User GET `/api/meal-plans/{plan_id}/tags/` aufruft
- **THEN** returned der Endpunkt eine Liste aller Tags des MealPlans
- **THEN** jeder Tag enthält: `id`, `name`

#### Scenario: Tag erstellen (POST create)

- **WHEN** ein authentifizierter User POST `/api/meal-plans/{plan_id}/tags/` mit `{"name": "Frühstück"}` aufruft
- **THEN** wird ein neuer MealPlanTag erstellt (name normalisiert zu "frühstück")
- **THEN** returned der Endpunkt 201 mit dem erstellten Tag

#### Scenario: Tag löschen (DELETE)

- **WHEN** ein authentifizierter User DELETE `/api/meal-plans/{plan_id}/tags/{tag_id}` aufruft
- **THEN** wird der Tag gelöscht
- **THEN** returned der Endpunkt 204

#### Scenario: Nicht authentifiziert

- **WHEN** ein nicht-authentifizierter User einen Tag-Endpunkt aufruft
- **THEN** returned der Endpunkt 401

#### Scenario: Nicht berechtigt

- **WHEN** ein User einen Tag-Endpunkt für einen Plan aufruft, dessen Owner/Collaborator er nicht ist
- **THEN** returned der Endpunkt 403

#### Scenario: Duplicate Tag

- **WHEN** ein User einen Tag erstellt, der bereits für denselben MealPlan existiert (gleicher normalisierter Name)
- **THEN** returned der Endpunkt 409 Conflict

#### Scenario: Tag existiert nicht

- **WHEN** ein User DELETE auf eine nicht-existierende tag_id aufruft
- **THEN** returned der Endpunkt 404

### Requirement: Tags im MealPlan-Response

Das System SHALL Tags im MealPlan-Detail-Response inkludieren.

#### Scenario: Tags in Detail-Response

- **WHEN** ein User GET `/api/meal-plans/{plan_id}/` aufruft (oder einen anderen Endpunkt, der MealPlan-Detail returned)
- **THEN** enthält der Response ein `tags`-Feld: `"tags": [{"id": 1, "name": "frühstück"}, {"id": 2, "name": "vegetarisch"}]`
- **WHEN** der MealPlan keine Tags hat
- **THEN** ist tags eine leere Liste: `"tags": []`

### Requirement: Tags werden an Gemini übergeben

Das System SHALL MealPlan-Tags im Kontext-Prompt für Gemini (siehe context-recipe-suggestions Spec) übergeben.

#### Scenario: Tags im Gemini-Prompt

- **WHEN** Gemini Vorschläge mit `context_enhance=true` generiert
- **THEN** werden alle Tags des MealPlans als kommagetrennte Liste in den Prompt aufgenommen
- **THEN** der Prompt enthält eine Anweisung, Rezepte zu bevorzugen, die zu den Tags passen
- **WHEN** der MealPlan keine Tags hat
- **THEN** wird der Tags-Abschnitt im Prompt weggelassen
