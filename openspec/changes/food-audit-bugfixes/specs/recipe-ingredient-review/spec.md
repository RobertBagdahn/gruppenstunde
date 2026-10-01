## ADDED Requirements

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

## MODIFIED Requirements

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
