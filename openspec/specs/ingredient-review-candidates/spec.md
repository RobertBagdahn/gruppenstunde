# ingredient-review-candidates Specification

## Purpose
Review-Zeilen der Rezept-Zutatenprüfung tragen immer eine wählbare Kandidatenliste (Top 5 inkl. slug und Konfidenz), die der User alternativ zum KI-Vorschlag auswählen kann.

## Requirements

### Requirement: Candidate list on every review row
Every review row SHALL carry a candidate list of up to five alternatives from the matcher stage that produced the result, including the selected suggestion. Each candidate SHALL include `id`, `name`, `slug`, and `confidence` (0.0–1.0). The list SHALL be present for confident matches as well as grey-zone results.

#### Scenario: Confident match carries candidates
- **WHEN** the matcher returns a confident match (e.g. via fuzzy stage)
- **THEN** the review row SHALL include the top candidates of that stage with `id`, `name`, `slug`, and `confidence`

#### Scenario: Grey-zone result carries candidates
- **WHEN** the matcher returns a `needs_review` result
- **THEN** the review row SHALL include the top five candidates with `id`, `name`, `slug`, and `confidence`

#### Scenario: Candidate has slug
- **WHEN** a candidate is serialized to the API
- **THEN** it SHALL include a `slug` that resolves the ingredient detail and portion endpoints

### Requirement: Collapsible candidate alternatives
The review UI SHALL render the candidate alternatives behind a collapsed toggle labeled `Alternativen anzeigen`. When expanded, each candidate SHALL be shown as a selectable row with name and confidence percentage. Selecting a candidate SHALL replace the row's selected ingredient and SHALL open the quantity dialog for that ingredient.

#### Scenario: Candidates collapsed by default
- **WHEN** a review row with candidates is rendered
- **THEN** the alternatives SHALL be hidden behind `Alternativen anzeigen`

#### Scenario: Candidate selected opens quantity dialog
- **WHEN** the user clicks a candidate in the expanded list
- **THEN** the row SHALL switch to that ingredient and the quantity dialog SHALL open with the ingredient preselected

#### Scenario: Candidate selection resets portion
- **WHEN** the user selects a candidate
- **THEN** the previously selected portion SHALL be cleared and SHALL require explicit confirmation in the quantity dialog

### Requirement: Candidate selection from technical details
The expandable technical details of a review row SHALL list the same candidates with method and confidence, consistent with the alternatives toggle.

#### Scenario: Details match alternatives
- **WHEN** the user expands the technical details of a row
- **THEN** the candidates listed SHALL be identical to those offered in `Alternativen anzeigen`
