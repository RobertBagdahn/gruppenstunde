## ADDED Requirements

### Requirement: Buffet-Vorlage als Datenmodell
Das System SHALL ein Modell `BuffetTemplate` bereitstellen mit `name`, `slug` (eindeutig), `description`, `meal_types` (Liste aus `MealTypeChoices`), `is_active`, `sort_order`. Zu jeder Vorlage SHALL es `BuffetTemplateRole`-Einträge geben mit `role` (Tag mit `group="buffet"`), `amount_per_person` (> 0), `unit` (`g` oder `ml`), `enabled_by_default`, `sort_order` sowie optionalen Standardauswahlen `default_ingredients` und `default_recipes`. Je Vorlage MUST jede Rolle höchstens einmal vorkommen.

#### Scenario: Rolle doppelt in Vorlage
- **WHEN** Staff einer Vorlage die Rolle `buffet-savory` ein zweites Mal hinzufügen will
- **THEN** lehnt das System dies mit einem Validierungsfehler ab

#### Scenario: Nur Buffet-Tags als Rolle
- **WHEN** Staff als Rolle einen Tag ohne `group="buffet"` wählt
- **THEN** lehnt das System dies mit einem Validierungsfehler ab

### Requirement: Pflege nur durch Staff
Vorlagen SHALL ausschließlich von Staff-Nutzern über den Django-Admin angelegt und geändert werden. Es MUST keine öffentlichen Schreib-Endpunkte für Vorlagen geben.

#### Scenario: Staff legt Vorlage an
- **WHEN** ein Staff-Nutzer im Admin die Vorlage „Grillabend“ für `dinner` mit Rollen anlegt
- **THEN** steht sie im Builder für Abendessen zur Auswahl

### Requirement: Vorlagen lesen
`GET /api/meal-plans/buffet-templates/` SHALL alle aktiven Vorlagen sortiert nach `sort_order` mit ihren Rollen liefern. Der optionale Parameter `meal_type` MUST auf Vorlagen filtern, deren `meal_types` diesen Typ enthalten. Der Endpunkt SHALL für angemeldete und nicht angemeldete Nutzer lesbar sein; die Liste ist nicht paginiert (erwartet < 50 Einträge).

#### Scenario: Vorlagen für Mittagessen
- **WHEN** `GET /api/meal-plans/buffet-templates/?meal_type=lunch` aufgerufen wird
- **THEN** enthält die Antwort „Belegte Baguettes“ und nicht „Frühstück“

#### Scenario: Inaktive Vorlage
- **WHEN** Staff eine Vorlage auf `is_active=false` setzt
- **THEN** erscheint sie nicht mehr in der Liste

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer die Vorlagen abruft
- **THEN** erhält er dieselbe Liste wie ein angemeldeter Nutzer

### Requirement: Mitgelieferte Vorlagen
Ein idempotenter Command `seed_buffet_templates` SHALL folgende Vorlagen anlegen, sofern der Slug noch nicht existiert (Mengen pro Person):

| Vorlage | Mahlzeiten | Rollen (Standard an) | Rollen (Standard aus) |
|---|---|---|---|
| Frühstück (`breakfast`) | breakfast | Brot 120 g, Streichfett 10 g, Belag herzhaft 40 g, Belag süß 30 g, Gemüse & Obst 80 g, Getränke 250 ml | Müsli & Joghurt 60 g, Gerichte 150 g |
| Belegte Baguettes (`baguettes`) | lunch, dinner | Brot 150 g, Streichfett 10 g, Belag herzhaft 70 g, Soßen & Würze 15 g, Gemüse & Obst 100 g, Getränke 300 ml | Belag süß 20 g |
| Abendbrot (`supper`) | dinner | Brot 130 g, Streichfett 10 g, Belag herzhaft 60 g, Gemüse & Obst 100 g, Getränke 250 ml | Soßen & Würze 10 g, Belag süß 20 g, Gerichte 150 g |

#### Scenario: Seed zweimal ausgeführt
- **WHEN** `uv run python manage.py seed_buffet_templates` zweimal läuft
- **THEN** existiert jede Vorlage genau einmal und von Staff geänderte Werte bleiben erhalten
