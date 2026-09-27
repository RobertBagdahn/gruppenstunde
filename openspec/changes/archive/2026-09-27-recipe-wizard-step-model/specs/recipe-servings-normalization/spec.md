## ADDED Requirements

### Requirement: Normierung pro Portion im Backend
`POST /api/recipes/` SHALL ein Feld `input_servings` (Ganzzahl 1–100) annehmen. Werden `recipe_items` oder `ingredient_review_rows` übergeben, MUST `input_servings` gesetzt sein, sonst antwortet das System mit 422. Das Backend MUST jede übergebene Menge durch `input_servings` teilen und das Rezept mit `portions=1` speichern. Clients MUST Mengen als Gesamtmengen für `input_servings` Personen senden.

#### Scenario: Rezept für 4 Personen
- **WHEN** ein angemeldeter Nutzer ein Rezept mit `input_servings=4` und „Spaghetti 500 g“ anlegt
- **THEN** speichert das Rezept „Spaghetti 125 g“ bei `portions=1`

#### Scenario: Fehlende Personenzahl
- **WHEN** Zutaten ohne `input_servings` übergeben werden
- **THEN** antwortet das System mit 422 „Bitte gib die Personenzahl des Originalrezepts an.“

#### Scenario: Ungültige Personenzahl
- **WHEN** `input_servings=0` oder `input_servings=150` übergeben wird
- **THEN** antwortet das System mit 422

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer `POST /api/recipes/` aufruft
- **THEN** antwortet das System mit 403 („Sitzung nicht gefunden“) und legt nichts an

#### Scenario: Neue Zutat aus Review-Zeile
- **GIVEN** Nutzer A legt ein Rezept mit `input_servings=4` an, eine Review-Zeile erzeugt eine neue Zutat
- **WHEN** das Rezept gespeichert wird
- **THEN** hat die neue Zutat `status="draft"` und `created_by=A` (gemäß `ingredient-status`), und die Menge der Rezeptzeile ist durch 4 geteilt

### Requirement: Original-Personenzahl wird gespeichert
Das System SHALL die beim Anlegen übergebene Personenzahl als `Recipe.source_servings` speichern und in `RecipeDetailOut.source_servings` ausliefern. `source_servings` MUST beim Bearbeiten über `PATCH /api/recipes/{id}/` änderbar sein, ohne gespeicherte Mengen umzurechnen.

#### Scenario: Wiederaufnahme zeigt Personenzahl
- **GIVEN** ein Rezept wurde mit `input_servings=6` angelegt
- **WHEN** der Wizard den Entwurf lädt
- **THEN** zeigt er „Originalrezept für 6 Personen“ und skaliert die Anzeige im Zutatenschritt auf 6 Personen

#### Scenario: Bestehende Rezepte
- **WHEN** ein vor dieser Änderung angelegtes Rezept geladen wird
- **THEN** ist `source_servings` `null` und der Zutatenschritt zeigt Mengen für 1 Person
