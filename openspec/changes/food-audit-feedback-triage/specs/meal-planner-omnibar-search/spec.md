## MODIFIED Requirements

### Requirement: Unified Search with Filter Pills
The Omnibar search SHALL query recipes and single ingredients concurrently, allowing instant narrowing via filter pills: `[ Alle ]`, `[ Rezepte ]` and `[ Zutaten ]`. Placeholder sets or bundles without a backend source SHALL NOT be shown. In `Alle`, results SHALL be grouped under the headings „Rezepte“ and „Zutaten“ with at most 5 entries each, each group followed by „Alle anzeigen“ which switches to the corresponding pill and makes the complete matching category available. The five-entry limit is intentional and SHALL NOT be treated as a defect by itself.

#### Scenario: Alle shows both groups with intentional limit
- **WHEN** the search returns more than 5 recipes and more than 5 ingredients and the pill `Alle` is active
- **THEN** the list SHALL show no more than 5 recipes under „Rezepte“ and no more than 5 ingredients under „Zutaten“
- **AND** each group SHALL provide „Alle anzeigen“

#### Scenario: Show all results in a category
- **GIVEN** more than 5 matching recipes and ingredients are available
- **WHEN** the user selects „Alle anzeigen“ under „Rezepte“ or „Zutaten“
- **THEN** the corresponding category filter SHALL become active
- **AND** the matching results for that category SHALL be available beyond the initial five-entry preview
