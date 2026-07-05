## ADDED Requirements

### Requirement: Duplicate meal plan via API
The system SHALL provide an endpoint `POST /api/meal-plans/{slug}/duplicate/` that creates a copy of an existing meal plan with new parameters.

#### Scenario: Successful duplication
- **WHEN** authenticated user sends POST to `/api/meal-plans/{slug}/duplicate/` with `{ name: "Sommerlager 2026", start_datetime: "2026-07-01T10:00:00Z", norm_portions: 30 }`
- **THEN** the system creates a new MealPlan with the given name, start_datetime, norm_portions, and end_datetime calculated as `source.end_datetime + (new_start - source.start_datetime)`
- **AND** all Meals from the source plan are copied with their datetimes shifted by the offset
- **AND** all MealItems from each Meal are copied with recipe, ingredient, factor, quantity, measuring_unit, display_name
- **AND** the response contains the new MealPlan in `MealPlanOut` format

#### Scenario: Source plan not found
- **WHEN** authenticated user sends POST to `/api/meal-plans/{slug}/duplicate/` with a non-existing slug
- **THEN** the system returns HTTP 404

#### Scenario: Unauthenticated request
- **WHEN** unauthenticated user sends POST to `/api/meal-plans/{slug}/duplicate/`
- **THEN** the system returns HTTP 401

#### Scenario: Missing required fields
- **WHEN** authenticated user sends POST without name, start_datetime, or norm_portions
- **THEN** the system returns HTTP 422 with validation errors

### Requirement: Excluded data from duplication
The system SHALL NOT copy MealPlanCollaborators, MealItemOverrides, or Meal notes when duplicating a plan.

#### Scenario: Collaborators not copied
- **WHEN** a plan with collaborators is duplicated
- **THEN** the new plan has no collaborators (only created_by is set to the requesting user)

#### Scenario: Overrides not copied
- **WHEN** a plan with MealItemOverrides is duplicated
- **THEN** the new plan's MealItems have no overrides

#### Scenario: Notes not copied
- **WHEN** a plan with Meal notes is duplicated
- **THEN** the new plan's Meals have empty note fields

### Requirement: Smart day-index-based duplicate algorithm

The system SHALL replace the current offset-based duplicate algorithm with a day-index-based algorithm. Meal datetimes SHALL be calculated by mapping each meal's day index (0-based offset from source plan start) to the corresponding day in the new plan, preserving the exact time-of-day.

#### Scenario: Mahlzeit wird auf korrekten Tag kopiert

- **GIVEN** ein Quellplan mit 3 Tagen (Mo 2024-01-01 bis Mi 2024-01-03)
- **AND** eine Mahlzeit am Mo um 08:00 und eine am Di um 12:00
- **WHEN** der Plan dupliziert wird mit Ziel-Do 2024-01-04 bis Sa 2024-01-06
- **THEN** SHALL die Mo-08:00-Mahlzeit auf Do 2024-01-04 08:00 landen
- **AND** SHALL die Di-12:00-Mahlzeit auf Fr 2024-01-05 12:00 landen

#### Scenario: Uhrzeit bleibt exakt erhalten

- **GIVEN** ein Quellplan mit Mahlzeit um 08:00 Uhr
- **WHEN** dupliziert mit anderem Starttag
- **THEN** SHALL die kopierte Mahlzeit ebenfalls um 08:00 Uhr sein

#### Scenario: DST-Grenze wird korrekt behandelt

- **GIVEN** ein Quellplan mit Mahlzeit um 08:00 vor der Zeitumstellung
- **WHEN** dupliziert auf einen Zeitraum nach der Zeitumstellung (Sommerzeit)
- **THEN** SHALL die kopierte Mahlzeit ebenfalls um 08:00 Ortszeit sein

### Requirement: `end_datetime` im Duplicate-Request (Pflicht)

The system SHALL require `end_datetime` in `MealPlanDuplicateIn`. Die Tagesanzahl des Zielfensters (`(end - start).days`) MUSS mit der Tagesanzahl des Quellplans (`(source.end - source.start).days`) übereinstimmen.

#### Scenario: Erfolgreiche Validierung

- **GIVEN** ein Quellplan mit 3 Tagen (start=2024-01-01, end=2024-01-03)
- **WHEN** POST /api/meal-plans/{id}/duplicate/ mit end_datetime=2024-01-06 und start_datetime=2024-01-04
- **THEN** SHALL der Request akzeptiert werden (Tagesanzahl: 3 == 3)

#### Scenario: Day-Mismatch-Fehler

- **GIVEN** ein Quellplan mit 3 Tagen
- **WHEN** POST /api/meal-plans/{id}/duplicate/ mit end_datetime=2024-01-05 (nur 2 Tage)
- **THEN** SHALL der Response 400 sein
- **AND** SHALL die Fehlermeldung "Tagesanzahl muss übereinstimmen" enthalten

### Requirement: `start_datetime` required auf MealPlan-Model

Das Model `MealPlan.start_datetime` SHALL `null=False` sein. Bestehende NULL-Einträge MÜSSEN per Data-Migration auf `created_at`-Datum gesetzt werden. Der Create-Endpoint SHALL `start_datetime` als Pflichtfeld erfordern.

#### Scenario: Neuer Plan ohne start_datetime wird abgelehnt

- **GIVEN** ein authentifizierter Benutzer
- **WHEN** POST /api/meal-plans/ mit payload ohne start_datetime
- **THEN** SHALL der Response 422 sein (Validierungsfehler)

#### Scenario: Bestehender NULL-Eintrag wird migriert

- **GIVEN** ein existierender MealPlan mit start_datetime=NULL und created_at=2024-06-01
- **WHEN** die Data-Migration läuft
- **THEN** SHALL start_datetime auf 2024-06-01 gesetzt werden

### Requirement: Response-Meta-Felder für Duplicate

The system SHALL im `MealPlanOut`-Schema die Felder `meals_copied`, `items_copied` und `overrides_copied` bereitstellen (Default 0). Der View befüllt diese nach dem Klonen.

#### Scenario: Duplicate-Response enthält Zählung

- **GIVEN** ein Quellplan mit 3 Mahlzeiten, 6 Items und 2 Overrides
- **WHEN** der Plan erfolgreich dupliziert wurde
- **THEN** SHALL `meals_copied=3`, `items_copied=6`, `overrides_copied=2` sein

### Requirement: Frontend-Button nur bei vorhandenen Daten

Das Frontend SHALL den "Duplizieren"-Button nur anzeigen, wenn der Quellplan `start_datetime` und `end_datetime` gesetzt hat.

#### Scenario: Button unsichtbar bei fehlenden Daten

- **GIVEN** ein MealPlan ohne start_datetime oder ohne end_datetime
- **WHEN** die Plan-Liste gerendert wird
- **THEN** SHALL der Duplizieren-Button nicht sichtbar sein

#### Scenario: Button sichtbar bei vollständigen Daten

- **GIVEN** ein MealPlan mit start_datetime und end_datetime
- **WHEN** die Plan-Liste gerendert wird
- **THEN** SHALL der Duplizieren-Button sichtbar sein

### Requirement: Frontend-Duplicate-Dialog mit end_datetime

Der Duplicate-Dialog SHALL ein `end_datetime`-Feld enthalten. Der Wert SHALL automatisch aus `start + (source.end - source.start)` berechnet werden. Der Benutzer KANN den Wert überschreiben.

#### Scenario: end_datetime automatisch berechnet

- **GIVEN** ein Quellplan mit start=2024-01-01 und end=2024-01-03
- **AND** Benutzer wählt start=2024-02-01 im Dialog
- **THEN** SHALL end_datetime automatisch auf 2024-02-03 gesetzt werden
