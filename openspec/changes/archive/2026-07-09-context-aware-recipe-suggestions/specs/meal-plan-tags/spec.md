# meal-plan-tags Specification

## ADDED Requirements

### Requirement: MealPlanTag Modell

Das System SHALL ein eigenes Tag-Modell für MealPlans bereitstellen, das unabhängig von content.Tag ist.

#### Scenario: Modell-Struktur

- **WHEN** ein MealPlanTag-Eintrag angelegt wird
- **THEN** enthält er: name (CharField, max 50), meal_plan (FK zu MealPlan, CASCADE)
- **THEN** es gibt einen UniqueConstraint auf (meal_plan, name)
- **THEN** name wird automatisch getrimmt und lowercase normalisiert

### Requirement: Tags via API verwalten

Das System SHALL CRUD-Endpunkte unter `/api/meal-plans/{plan_id}/tags/` bereitstellen.

#### Scenario: Tags auflisten

- **WHEN** ein authentifizierter User mit Zugriff GET `/api/meal-plans/{plan_id}/tags/` aufruft
- **THEN** returned der Endpunkt eine Liste aller Tags des Plans: `[{ id, name }]`

#### Scenario: Tag hinzufügen

- **WHEN** ein authentifizierter User mit edit-Recht POST `/api/meal-plans/{plan_id}/tags/` mit `{ name: "sommerlager" }` aufruft
- **THEN** wird ein neuer Tag angelegt
- **THEN** returned der Endpunkt 201 mit dem neuen Tag-Objekt

#### Scenario: Doppeltes Tag ignorieren

- **WHEN** ein User ein Tag hinzufügt, das bereits existiert (gleicher Plan, gleicher Name)
- **THEN** returned der Endpunkt 409 Conflict

#### Scenario: Tag löschen

- **WHEN** ein authentifizierter User mit edit-Recht DELETE `/api/meal-plans/{plan_id}/tags/{tag_id}` aufruft
- **THEN** wird der Tag gelöscht
- **THEN** returned der Endpunkt 204

#### Scenario: Nicht authentifiziert

- **WHEN** ein nicht-authentifizierter User einen Tag-Endpunkt aufruft
- **THEN** returned der Endpunkt 401

#### Scenario: Nicht berechtigt

- **WHEN** ein User ohne edit-Recht einen Tag-Endpunkt aufruft
- **THEN** returned der Endpunkt 403

### Requirement: Tags im MealPlan-Response

Das System SHALL die Tags im MealPlan-Detail-Response mitsenden.

#### Scenario: Tags im MealPlan-Detail

- **WHEN** ein authentifizierter User GET `/api/meal-plans/{plan_id}` aufruft
- **THEN** enthält die Response ein `tags`-Feld: `[{ id, name }]`
- **WHEN** der Plan keine Tags hat
- **THEN** ist `tags` ein leeres Array

### Requirement: Tags werden an Gemini übergeben

Das System SHALL alle Tags eines MealPlans als Kontext in den Gemini-Prompt einbauen.

#### Scenario: Tags im Prompt

- **WHEN** Gemini-Vorschläge generiert werden
- **THEN** werden alle Tags des Plans als deutscher Satz in den Prompt eingefügt
- **THEN** Beispiel: "Der Nutzer hat diesen Plan mit folgenden Tags markiert: sommerlager, lagerfeuer, wenig_küche"
