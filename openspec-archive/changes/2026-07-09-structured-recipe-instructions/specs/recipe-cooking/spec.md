## MODIFIED Requirements

### Requirement: Step-Based Cooking Mode

The cooking mode interface SHALL display one step at a time with ingredients specific to that step, not the full recipe ingredient list.

#### Scenario: Display step with step-specific ingredients
- **WHEN** user enters cooking mode for a recipe with structured steps
- **THEN** system shows current step instruction (with resolved ingredient quantities) on the right, and ONLY ingredients used in this step on the left

#### Scenario: Navigate between steps
- **WHEN** user clicks "Weiter →" or "← Zurück" in cooking mode
- **THEN** system moves to next/previous step and updates ingredient display accordingly

#### Scenario: Fallback for legacy recipes
- **WHEN** recipe has no structured steps
- **THEN** cooking mode displays parsed steps from `description` using heuristic parsing (existing behavior)

### Requirement: Step Duration Display

Each step in cooking mode SHALL display its duration prominently.

#### Scenario: Show step timer
- **WHEN** a step has `duration_minutes` set
- **THEN** display duration prominently (e.g., "⏱ 10 Minuten") below the instruction text

#### Scenario: No timer if not set
- **WHEN** a step has no `duration_minutes`
- **THEN** omit timer display and show instruction only

### Requirement: Ingredient Checkboxes per Step

In cooking mode, each step's ingredients SHALL have checkboxes to mark them as used.

#### Scenario: Check off ingredients as used
- **WHEN** user clicks checkbox next to an ingredient
- **THEN** system marks ingredient as completed (visual feedback: strikethrough or check mark)

#### Scenario: Checkbox state persists during session
- **WHEN** user moves to next step and returns
- **THEN** previous checkboxes remain in same state (session-scoped, not persisted to server)

