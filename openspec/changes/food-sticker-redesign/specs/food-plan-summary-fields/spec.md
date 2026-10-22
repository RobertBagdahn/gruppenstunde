# Spec Delta

## Purpose

Beschreibt die wenigen zusätzlichen Lesefelder, die das Backend für das neue Layout liefern muss: Fortschritt je Plan und die Zähler des Startseiten-Dashboards. Kosten je Person und Tag kommen je Karte aus dem bestehenden Kostenendpunkt. Sie sind rein abgeleitet, ohne Migration und ohne neue Schreibwege.

## ADDED Requirements

### Requirement: Plan-Liste liefert den Fortschritt
Die Plan-Liste SHALL je Plan `filled_meals_count` ausgeben: die Anzahl der Mahlzeiten mit mindestens einem Eintrag. Das Feld MUST zusammen mit `meals_count` in einer Abfrage berechnet werden, ohne Abfrage je Plan.

#### Scenario: Plan mit gefüllten Mahlzeiten
- **WHEN** ein Plan 13 Mahlzeiten hat, davon 12 mit Eintrag
- **THEN** liefert die Plan-Liste `filled_meals_count = 12` und `meals_count = 13`

#### Scenario: Leerer Plan
- **WHEN** ein Plan keine Mahlzeit hat
- **THEN** liefert die Plan-Liste `filled_meals_count = 0`

### Requirement: Kosten je Person und Tag je sichtbarer Karte
Die Plan-Liste liefert keine Kosten. Jede Plan-Karte SHALL die Kosten über den bestehenden Endpunkt `GET /api/meal-plans/{id}/costs/` laden, nur für sichtbare Karten. Der Wert ist `cost_per_person` geteilt durch die Anzahl der Tage im Plan. Fehlen Preise (`missing_ingredients` größer als 0), MUST die Kostenzeile entfallen; es DARF NICHT geschätzt werden.

#### Scenario: Vollständig bepreister Plan
- **WHEN** eine Karte sichtbar wird und alle Zutaten einen Preis haben
- **THEN** zeigt sie `cost_per_person` geteilt durch die Tage als „€ pro Person/Tag“

#### Scenario: Unvollständige Preise
- **WHEN** Zutaten ohne Preis im Plan sind
- **THEN** zeigt die Karte keine Kostenzeile

### Requirement: Dashboard liefert aktive Pläne und offene Listen
Das Startseiten-Dashboard SHALL `active_meal_plan_count` und `open_shopping_list_count` ausgeben. Aktiv sind Pläne, deren Enddatum nicht in der Vergangenheit liegt; offen sind Einkaufslisten mit mindestens einem nicht abgehakten Eintrag.

#### Scenario: Zähler der Startseite
- **WHEN** der Nutzer 3 aktive Pläne und 2 offene Listen hat
- **THEN** liefert das Dashboard `active_meal_plan_count = 3` und `open_shopping_list_count = 2`

### Requirement: Lesefelder sind synchron und getestet
Jedes neue Feld SHALL im Pydantic-Schema und im Zod-Schema des Frontends gleichzeitig eingeführt werden, mit Tests im Backend (`uv run pytest`) und im Frontend (Schema-Test). Es DARF keine Migration und keinen neuen Schreibweg geben.

#### Scenario: Schemas stimmen überein
- **WHEN** die Schema-Tests laufen
- **THEN** lehnt das Zod-Schema keine Antwort des Backends mit den neuen Feldern ab

#### Scenario: Keine Migration
- **WHEN** der Change umgesetzt ist
- **THEN** enthält er keine Migrationsdatei
