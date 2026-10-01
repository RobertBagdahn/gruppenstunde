# meal-integrity Specification

## Purpose
TBD - created by archiving change meal-plan-integrity-and-number-formatting. Update Purpose after archive.
## Requirements
### Requirement: Referenzmahlzeiten haben kein Datum
Eine Mahlzeit mit `is_reference=True` MUST `start_datetime=NULL` und `end_datetime=NULL` haben. Die Datenbank SHALL dies per CheckConstraint erzwingen. Eine Datenmigration MUST vorher Datum und Uhrzeit bestehender Referenzmahlzeiten auf `NULL` setzen.

#### Scenario: Bestehende Referenzmahlzeit mit Datum
- **WHEN** die Migration auf eine Referenzmahlzeit mit `start_datetime=2026-01-01 08:00` trifft
- **THEN** hat sie danach `start_datetime=NULL` und `end_datetime=NULL` und ihre Einträge bleiben erhalten

#### Scenario: Referenzmahlzeit mit Datum speichern
- **WHEN** Code eine Referenzmahlzeit mit gesetztem `start_datetime` speichern will
- **THEN** SHALL die Datenbank den Schreibvorgang ablehnen

### Requirement: Eindeutige reguläre Mahlzeit je Tag und Typ
Je Essensplan, Kalendertag und Mahlzeitentyp MUST höchstens eine reguläre Mahlzeit (`is_reference=False`) existieren; Snacks sind ausgenommen. Die Datenbank SHALL dies per UniqueConstraint auf `(meal_plan, TruncDate(start_datetime), meal_type)` mit Bedingung `is_reference=False AND meal_type != 'snack'` erzwingen, zusätzlich zur Prüfung in `Meal.clean()`.

#### Scenario: Zweites Frühstück am selben Tag
- **GIVEN** ein angemeldeter Editor des Plans
- **WHEN** er `POST /api/meal-plans/{id}/meals/` für einen Tag sendet, an dem schon ein Frühstück existiert
- **THEN** antwortet die API mit HTTP 400 „Diese Mahlzeit existiert bereits für diesen Tag“

#### Scenario: Zweiter Snack am selben Tag
- **WHEN** ein zweiter Snack für denselben Tag angelegt wird
- **THEN** wird er angelegt

### Requirement: Mahlzeiten liegen im Planzeitraum
Beim Anlegen einer regulären Mahlzeit und bei jeder Änderung ihres `start_datetime` MUST das Datum zwischen dem Startdatum und dem Enddatum des Plans liegen (inklusive). Die Prüfung MUST ohne zusätzliche Datenbankabfrage gegen die Felder des Plans erfolgen und gilt für alle Erzeugungspfade (API, Assistent, Buffet, Kopieren, KI-Übernahme, Duplizieren). Bestehende Mahlzeiten außerhalb des Zeitraums SHALL bearbeitbar bleiben, solange ihr Datum nicht geändert wird.

#### Scenario: Mahlzeit außerhalb des Zeitraums anlegen
- **GIVEN** ein Plan vom 26.06. bis 28.06.
- **WHEN** ein Editor eine Mahlzeit für den 01.01. anlegt
- **THEN** antwortet die API mit HTTP 400 „Die Mahlzeit liegt außerhalb des Planzeitraums“

#### Scenario: Bestehende Mahlzeit außerhalb bearbeiten
- **GIVEN** eine bestehende Mahlzeit liegt außerhalb des Zeitraums
- **WHEN** ein Editor ihre Einträge ändert
- **THEN** wird die Änderung gespeichert

#### Scenario: Anonymer Nutzer
- **WHEN** ein nicht angemeldeter Nutzer `POST /api/meal-plans/{id}/meals/` sendet
- **THEN** antwortet die API mit HTTP 403

### Requirement: Zutaten-Einträge haben eine Menge
Ein Essens-Eintrag mit `ingredient_id` MUST beim Anlegen und Ändern eine `quantity > 0` haben. Pydantic-Schemas (`MealItemCreateIn`, `RefMealItemIn`, Assistenten- und Buffet-Eingaben) MUST dies validieren. Rezept-Einträge sind nicht betroffen (sie nutzen `factor`). Bestehende Einträge ohne Menge bleiben erhalten und werden im Plan-Check gemeldet.

#### Scenario: Zutat ohne Menge hinzufügen
- **WHEN** ein Editor `POST /api/meal-plans/{id}/meals/{mealId}/items/` mit `ingredient_id` und ohne `quantity` sendet
- **THEN** antwortet die API mit HTTP 422

#### Scenario: Rezept ohne Menge hinzufügen
- **WHEN** ein Editor einen Eintrag mit `recipe_id` und ohne `quantity` sendet
- **THEN** wird der Eintrag mit `factor=1.0` angelegt

### Requirement: Referenzmahlzeiten getrennt ausgeliefert
`GET /api/meal-plans/{id}/` MUST im Feld `meals` nur reguläre Mahlzeiten liefern. Referenzmahlzeiten SHALL ausschließlich über `GET /api/meal-plans/{id}/ref-meals/` bzw. ein eigenes Feld `ref_meals` erscheinen. Pydantic (`MealPlanDetailOut`) und Zod (`MealPlanDetailSchema`) MUST synchron sein.

#### Scenario: Plan mit Referenzmahlzeit
- **GIVEN** ein Plan mit einer Referenz-Frühstücksmahlzeit
- **WHEN** die Tagesansicht geladen wird
- **THEN** erscheint die Referenzmahlzeit nicht als eigener Tag

### Requirement: Sortierung nach Uhrzeit
Mahlzeiten eines Tages MUST in Tages- und Tabellenansicht nach `start_datetime` aufsteigend sortiert angezeigt werden; bei gleicher Uhrzeit gilt die Typ-Reihenfolge Frühstück, Mittagessen, Abendessen, Snack, Getränke.

#### Scenario: Snack am Nachmittag
- **GIVEN** Mittagessen 12:00, Snack 15:00, Abendessen 18:00
- **WHEN** die Tagesansicht angezeigt wird
- **THEN** erscheint die Reihenfolge Mittagessen, Snack, Abendessen
