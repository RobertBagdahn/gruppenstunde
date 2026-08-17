## ADDED Requirements

### Requirement: Ingredients menu entry in navigation dropdown
The system SHALL display a "Zutaten" entry with the `egg` icon in the "Inhalte" navigation dropdown menu, positioned after "Rezepte".

#### Scenario: User opens Inhalte dropdown
- **WHEN** user clicks the "Inhalte" dropdown in the main navigation
- **THEN** the dropdown MUST show "Zutaten" with an egg icon as the fifth entry
- **THEN** clicking "Zutaten" MUST navigate to `/ingredients`

### Requirement: TOOL_INGREDIENTS constant
The system SHALL define a `TOOL_INGREDIENTS` constant in `toolColors.ts` with `icon: 'egg'`, `basePath: '/ingredients'`, and `label: 'Zutaten'`.

#### Scenario: Constant is used in navigation
- **WHEN** the Layout component renders the content menu
- **THEN** it MUST use `TOOL_INGREDIENTS` properties for the ingredients menu item
