## MODIFIED Requirements

### Requirement: Recipe Items with Quantity and Unit
The system SHALL create RecipeItem associations with correct `portion_id`, quantity, and optional note for each ingredient. The Import-Service SHALL resolve or create the appropriate Portion during import, not at save time.

#### Scenario: Portion exists for ingredient + measuring_unit
- **WHEN** eine Portion für die Kombination (ingredient_id, measuring_unit_id) in der DB existiert
- **THEN** SHALL der Import-Service diese `portion_id` im Draft-Response zurückgeben

#### Scenario: Portion does not exist — created with estimated weight_g
- **WHEN** keine Portion für die Kombination (ingredient_id, measuring_unit_id) existiert
- **THEN** SHALL der Import-Service eine neue Portion erstellen mit `weight_g` aus Geminis `estimated_portion_weight_g`
- **THEN** die neue `portion_id` SHALL im Draft-Response enthalten sein

#### Scenario: Frontend sends portion_id when saving
- **WHEN** der User das Rezept speichert
- **THEN** SHALL das Frontend `portion_id` (nicht `ingredient_id`) an `POST /api/recipes/{id}/recipe-items/` senden

#### Scenario: Quantity and unit extracted
- **WHEN** the source recipe specifies "2 EL Olivenöl"
- **THEN** the system SHALL return a draft item with the correct portion_id (Olivenöl + EL), quantity=2

#### Scenario: Note extracted
- **WHEN** the source recipe specifies "2 Zwiebeln, fein gewürfelt"
- **THEN** the system SHALL set note="fein gewürfelt" on the draft item

### Requirement: Neue Zutaten in Vorschau als NEU markiert
Das Frontend SHALL Zutaten, die vom Import neu erstellt wurden, in der Vorschau visuell als "NEU" kennzeichnen.

#### Scenario: Neue Zutat erkennbar
- **WHEN** der Import eine neue Zutat erstellt hat (`is_new_ingredient=true`)
- **THEN** SHALL die Vorschau diese Zutat mit einem "Neu"-Badge markieren

#### Scenario: Bestehende Zutat ohne Markierung
- **WHEN** eine Zutat aus der DB gematcht wurde (`is_new_ingredient=false`)
- **THEN** SHALL kein Badge angezeigt werden

### Requirement: Lesbare Namen in der Vorschau
Die Import-Vorschau SHALL für jede Zutat den lesbaren `ingredient_name` und `measuring_unit_name` anzeigen, nicht technische IDs oder Feldnamen.

#### Scenario: Zutatenliste zeigt Namen
- **WHEN** die Import-Vorschau Zutaten anzeigt
- **THEN** SHALL jede Zutat als "{quantity} {measuring_unit_name} {ingredient_name}" dargestellt werden (z.B. "2 EL Olivenöl")
