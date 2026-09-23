# recipe-ingredient-review Specification (Delta)

## MODIFIED Requirements

### Requirement: Human ingredient selection
The review UI SHALL allow the user to select an AI candidate, search for and select any other existing ingredient, add an extra ingredient, or state that no existing ingredient fits. A rejected suggestion SHALL remain unresolved until the user supplies a replacement or completes the row manually. The review UI SHALL render the matcher's candidate alternatives behind a collapsed `Alternativen anzeigen` toggle; selecting an alternative SHALL replace the selected ingredient and SHALL open the quantity dialog for that ingredient. The quantity dialog SHALL be available for every existing-ingredient row and SHALL be required whenever no quantity is present.

#### Scenario: User chooses another ingredient
- **WHEN** the user selects `Zutat ändern` and chooses a search result
- **THEN** the system SHALL replace the selected ingredient and generate new portion and quantity suggestions for explicit review

#### Scenario: User chooses a candidate alternative
- **WHEN** the user expands `Alternativen anzeigen` and clicks a candidate
- **THEN** the row SHALL switch to that ingredient, SHALL clear the previous portion, and SHALL open the quantity dialog with the candidate preselected

#### Scenario: User rejects without replacement
- **WHEN** the user rejects a suggestion without selecting or creating a replacement
- **THEN** the row SHALL remain incomplete and recipe save SHALL remain blocked

### Requirement: Temporary new ingredient review
When no existing ingredient fits, the system SHALL offer the existing ingredient editor populated with a complete AI enrichment draft. All supplied fields and every supplied portion SHALL be editable and explicitly confirmable. No ingredient or portion SHALL be persisted during the review. The AI draft SHALL be filled completely — name, nutritional values, portion name, portion weight, and a quantity — and SHALL be reviewed in a dialog without leaving the review step. The dialog SHALL allow confirming the draft with the quantity so the row becomes confirmable.

#### Scenario: New ingredient draft is reviewed
- **WHEN** the user chooses `Neue Zutat erstellen`
- **THEN** the existing ingredient editor SHALL open with the AI draft and all editable details

#### Scenario: New ingredient draft is complete
- **WHEN** a review row for a new ingredient (e.g. "Crushed Ice") is rendered
- **THEN** the dialog SHALL show AI-filled name, nutritional values, portion with weight, and a quantity that the user can edit before confirming

#### Scenario: New ingredient row becomes confirmable
- **WHEN** the user confirms the completed AI draft in the dialog
- **THEN** the row SHALL satisfy the completeness rule (ingredient or draft present, portion set, quantity > 0) and SHALL be confirmable

#### Scenario: New ingredient is not persisted on cancel
- **WHEN** the user cancels the import before final recipe save
- **THEN** the temporary ingredient and portions SHALL be discarded

## ADDED Requirements

### Requirement: Quantity confirmation for every row
Every review row SHALL provide a quantity and portion before it can be confirmed. Rows with a suggested quantity SHALL prefill the quantity dialog with that suggestion. Rows without a suggestion SHALL start with quantity 1 and require an explicit confirm in the dialog.

#### Scenario: Suggested quantity prefilled
- **WHEN** a row carries a suggested quantity (e.g. converted "1 Liter Orangensaft" → 5 portions)
- **THEN** the quantity dialog SHALL prefill the suggested portion count

#### Scenario: Missing quantity requires dialog
- **WHEN** a row has no quantity suggestion
- **THEN** the quantity dialog SHALL open with quantity 1 and the row SHALL remain unconfirmable until the user confirms a quantity

#### Scenario: Confirmed quantity marks row complete
- **WHEN** the user confirms the quantity dialog on a row with selected ingredient or new-ingredient draft
- **THEN** the row SHALL become confirmable (`Vorschlag bestätigen` enabled)
