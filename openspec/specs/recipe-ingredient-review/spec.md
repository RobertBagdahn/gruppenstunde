# recipe-ingredient-review Specification

## Purpose
TBD - created by archiving change review-ai-recipe-ingredients. Update Purpose after archive.
## Requirements
### Requirement: Conditional ingredient review step
The recipe wizard SHALL show a dedicated ingredient review step immediately before `Zutaten` whenever an AI import or AI recipe action produces ingredient, portion, quantity, or replacement suggestions. The step SHALL be absent when no AI-derived ingredient data exists.

#### Scenario: AI import opens review
- **WHEN** an authenticated user imports a recipe with AI-derived ingredient data
- **THEN** the wizard SHALL show the review step before `Zutaten`

#### Scenario: Manual recipe has no review step
- **WHEN** an authenticated user creates a recipe without AI-derived ingredient data
- **THEN** the wizard SHALL not show the review step

### Requirement: Explicit row confirmation
Every review row SHALL require an explicit human confirmation before it is complete, including exact matches and unchanged AI suggestions. The row SHALL show original text, selected ingredient, portion, quantity, source, status, and a human-readable reason; technical matching details SHALL be expandable.

#### Scenario: Exact match requires confirmation
- **WHEN** the matcher returns an exact existing ingredient match
- **THEN** the row SHALL remain open until the user explicitly confirms it

#### Scenario: Row displays explanation
- **WHEN** a review row is rendered
- **THEN** it SHALL show a human-readable reason and SHALL provide matcher method, confidence, and candidates in expandable details

### Requirement: Human ingredient selection
The review UI SHALL allow the user to select an AI candidate, search for and select any other existing ingredient, add an extra ingredient, or state that no existing ingredient fits. A rejected suggestion SHALL remain unresolved until the user supplies a replacement or completes the row manually. The review UI SHALL render the matcher's candidate alternatives behind a collapsed `Alternativen anzeigen` toggle; selecting an alternative SHALL replace the selected ingredient and SHALL open the quantity dialog for that ingredient. The quantity dialog SHALL be available for every existing-ingredient row and SHALL be required whenever no quantity is present. Typing in the ingredient field without selecting a result SHALL clear the selected ingredient id so that the displayed name and the saved ingredient never differ. Cancelling the quantity dialog SHALL keep the previously selected portion and quantity. The quantity dialog SHALL open with the row's current portion and quantity. `Zutat hinzufügen` SHALL add a new empty row that the user completes via ingredient search and quantity dialog.

#### Scenario: User chooses another ingredient
- **WHEN** the user selects `Zutat ändern` and chooses a search result
- **THEN** the system SHALL replace the selected ingredient and generate new portion and quantity suggestions for explicit review

#### Scenario: User chooses a candidate alternative
- **WHEN** the user expands `Alternativen anzeigen` and clicks a candidate
- **THEN** the row SHALL switch to that ingredient, SHALL clear the previous portion, and SHALL open the quantity dialog with the candidate preselected

#### Scenario: User rejects without replacement
- **WHEN** the user rejects a suggestion without selecting or creating a replacement
- **THEN** the row SHALL remain incomplete and recipe save SHALL remain blocked

#### Scenario: Typing without selection
- **WHEN** the user overwrites "Weizenmehl Type 405" with "Dinkelmehl" but does not pick a search result
- **THEN** the row SHALL be incomplete and SHALL NOT be confirmable with the previous ingredient

#### Scenario: Cancel quantity dialog
- **GIVEN** a row with 2 × "Tasse Mehl"
- **WHEN** the user opens `Menge und Portion` and clicks `Abbrechen`
- **THEN** the row SHALL still show 2 × "Tasse Mehl" and SHALL remain confirmable

#### Scenario: Add extra ingredient
- **WHEN** the user clicks `Zutat hinzufügen`
- **THEN** a new row with status `Offen` SHALL appear with the ingredient search focused

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

### Requirement: Final atomic persistence
The system SHALL allow final recipe save only when every row is explicitly confirmed and valid. Confirmed temporary ingredients and portions SHALL be created in the same atomic operation as the recipe and recipe items.

#### Scenario: Successful final save
- **WHEN** all review rows are confirmed and the user saves the recipe
- **THEN** the system SHALL persist the recipe, temporary ingredients, portions, and recipe items atomically

#### Scenario: Save failure preserves review
- **WHEN** final persistence fails
- **THEN** no partial data SHALL remain persisted, the local review state SHALL remain open, and the affected field SHALL show the reason when available

### Requirement: Bulk confirmation
The review step SHALL provide `Alle Vorschläge übernehmen`, which SHALL explicitly confirm every complete open row, including manually added rows, while leaving incomplete rows unresolved.

#### Scenario: Bulk confirmation succeeds for complete rows
- **WHEN** the user activates `Alle Vorschläge übernehmen`
- **THEN** all complete rows SHALL become confirmed and incomplete rows SHALL remain open

### Requirement: Navigation protection
The review flow SHALL warn before navigation or reload when it contains unsaved review state. If the user confirms leaving, all local review data SHALL be discarded.

#### Scenario: User leaves with unsaved review
- **WHEN** the user attempts to leave a dirty review and confirms the browser warning
- **THEN** the review state SHALL be discarded and no server data SHALL be created

### Requirement: Review rows can be removed
Every review row SHALL offer an `Entfernen` action. A removed row SHALL no longer block the final save and SHALL NOT create a recipe item. Removal SHALL be undoable via a toast action `Rückgängig` until the next removal or navigation. When the last row is removed, the system SHALL ask for confirmation and afterwards SHALL hide the review step; the recipe SHALL then be created without imported ingredients.

#### Scenario: Remove an unwanted AI row
- **GIVEN** a signed-in user reviews 6 imported rows, one of them "Salz und Pfeffer nach Geschmack" without quantity
- **WHEN** the user clicks `Entfernen` on that row and confirms the other 5 rows
- **THEN** the recipe SHALL be saved with 5 recipe items

#### Scenario: Undo removal
- **WHEN** the user clicks `Rückgängig` in the removal toast
- **THEN** the row SHALL reappear at its previous position with its previous status

#### Scenario: Remove last row
- **GIVEN** only one review row remains
- **WHEN** the user clicks `Entfernen` and confirms the dialog
- **THEN** the review step SHALL disappear from the wizard

### Requirement: Missing quantity is shown and resolvable
A row with a matched or selected ingredient but without quantity SHALL have status `unresolved` (`Offen`) and the reason „Menge fehlt – bitte Menge und Portion festlegen.“ The quantity column SHALL show „Menge fehlt“ in the warning style instead of „—“. For any incomplete row, the primary action SHALL read `Menge festlegen` and SHALL open the quantity dialog instead of being disabled.

#### Scenario: Import without amount
- **WHEN** the pasted recipe text contains "Zimt" without amount and "Zimt" matches an existing ingredient
- **THEN** the row SHALL show status `Offen`, „Menge fehlt“ and the action `Menge festlegen`

#### Scenario: Quantity set via primary action
- **WHEN** the user clicks `Menge festlegen` and confirms 1 × "1 TL Zimt"
- **THEN** the row SHALL show „1 × 1 TL Zimt (5 g)“ and the action SHALL change to `Vorschlag bestätigen`

### Requirement: Source-aware row grouping
The preview SHALL merge rows with the same normalized ingredient text only when they originate from different sources, and at most one row per source SHALL be merged into a group. Rows from the same source SHALL remain separate rows with their own quantities.

#### Scenario: Same ingredient twice in one recipe
- **WHEN** one pasted text lists "250 g Mehl" for the dough and "50 g Mehl" for the crumble
- **THEN** the preview SHALL contain two separate "Mehl" rows with 250 g and 50 g and no quantity conflict

#### Scenario: Same ingredient in two sources
- **WHEN** a URL and a pasted text both list "Mehl" with different amounts
- **THEN** the preview SHALL contain one "Mehl" row with both sources and a quantity conflict

### Requirement: Readable quantity and portion display
The quantity column SHALL show the quantity in German number format, the portion's own name and its weight, for example „2,4 × Tasse Mehl (à 100 g)“. It SHALL NOT show the internal portion string (`name / quantity unit / ingredient`).

#### Scenario: Flour row
- **WHEN** a row has quantity 2.4 and the portion "Tasse Mehl" with 100 g
- **THEN** the column SHALL show „2,4 × Tasse Mehl (à 100 g)“
