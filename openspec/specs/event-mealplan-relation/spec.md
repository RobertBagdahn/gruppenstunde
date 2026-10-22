# event-mealplan-relation Specification

## Purpose

This specification defines the canonical relation between Events and MealPlans.

## Requirements

### Requirement: Canonical Event-MealPlan relation
The system SHALL store Event-to-MealPlan links in a canonical relation table and SHALL enforce that one MealPlan is linked to at most one Event.

#### Scenario: Authorized user links resources
- **WHEN** a user has edit access to both an Event and a MealPlan and creates a link
- **THEN** the relation SHALL be stored successfully

#### Scenario: User lacks edit access on one side
- **WHEN** a user lacks edit access to either the Event or MealPlan
- **THEN** the API SHALL reject the link with HTTP 403

### Requirement: Existing relation migration
The migration SHALL transfer existing links into the relation table. When Event and MealPlan foreign keys disagree, the MealPlan-side link SHALL win.

#### Scenario: Consistent existing link
- **WHEN** both legacy foreign keys point to the same pair
- **THEN** exactly one relation row SHALL be created

#### Scenario: Conflicting existing link
- **WHEN** the legacy foreign keys point to different Events
- **THEN** the MealPlan-side Event SHALL be migrated and the conflict SHALL be recorded

### Requirement: Bestehenden Essensplan mit einem Event verknüpfen
`PUT /api/meal-plans/{id}/event/` mit `{event_id}` SHALL einen bestehenden Essensplan mit einem Event verknüpfen. Der Nutzer MUST Bearbeitungsrecht auf den Plan und Verwaltungsrecht auf das Event haben (sonst 403). Ist der Plan bereits mit einem anderen Event verknüpft, MUST die API 409 „Dieser Essensplan gehört schon zu einem Event“ liefern. Ein bestehender Link zum selben Event MUST mit 200 bestätigt werden.

#### Scenario: Plan verknüpfen
- **GIVEN** Anna ist Besitzerin des Plans „Herbstfahrt“ und verantwortlich für das Event „Herbstfahrt 2026“
- **WHEN** sie den Plan mit dem Event verknüpft
- **THEN** antwortet die API mit 200 und der Plan liefert `event_id` und `event_name`

#### Scenario: Fremdes Event
- **WHEN** der Nutzer einen Plan mit einem Event verknüpft, das er nicht verwaltet
- **THEN** antwortet die API mit 403

#### Scenario: Schon verknüpft
- **GIVEN** der Plan gehört zum Event A
- **WHEN** der Nutzer ihn mit Event B verknüpft
- **THEN** antwortet die API mit 409

#### Scenario: Nicht angemeldet
- **WHEN** ein anonymer Client den Endpunkt aufruft
- **THEN** antwortet die API mit 401

### Requirement: Dialog „Event verknüpfen“
Der Dialog „Event verknüpfen“ im Food-Frontend SHALL zwei Wege bieten: ein Event wählen, das der Nutzer verwaltet (Suche, paginiert), oder ein neues Event anlegen. Nach erfolgreichem Verknüpfen MUST sich „Einkäufe planen“ des Events öffnen.

#### Scenario: Bestehendes Event wählen
- **WHEN** der Nutzer ein Event aus der Liste wählt
- **THEN** wird der Plan verknüpft und „Einkäufe planen“ öffnet sich

#### Scenario: Keine verwalteten Events
- **WHEN** der Nutzer kein Event verwaltet
- **THEN** zeigt der Dialog nur „Neues Event anlegen“

### Requirement: Neues Event aus dem Essensplan anlegen
Beim Anlegen im Dialog MUST der Name mit dem Plannamen und der Zeitraum mit Start und Ende des Plans vorbelegt sein. Das Event MUST nicht öffentlich sein, und die anlegende Person wird verantwortlich. Anlegen und Verknüpfen MUST atomar erfolgen: Ist der Plan inzwischen mit einem Event verknüpft, MUST kein Event entstehen (409).

#### Scenario: Neues Event aus dem Plan
- **GIVEN** der Plan „Pfingstlager“ läuft vom 22.05. bis 25.05.
- **WHEN** der Nutzer „Neues Event anlegen“ ohne Änderungen bestätigt
- **THEN** entsteht das nicht öffentliche Event „Pfingstlager“ vom 22.05. bis 25.05., der Plan ist verknüpft, und „Einkäufe planen“ öffnet sich

#### Scenario: Plan inzwischen verknüpft
- **GIVEN** eine andere Person hat den Plan während des Dialogs mit einem Event verknüpft
- **WHEN** der Nutzer „Neues Event anlegen“ bestätigt
- **THEN** antwortet die API mit 409, es entsteht kein Event, und der Dialog zeigt „Dieser Essensplan gehört schon zu einem Event“
