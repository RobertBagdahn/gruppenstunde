## MODIFIED Requirements

### Requirement: Display Recipe with Structured Steps

The recipe detail page SHALL display structured steps when available, falling back to markdown-parsed description if steps are not yet structured.

#### Scenario: Show structured steps on detail page
- **WHEN** a recipe has `has_structured_steps: true`
- **THEN** display all steps in a collapsible "Zubereitung"-section with step numbers, durations, and resolved ingredient lists

#### Scenario: Fallback to markdown description
- **WHEN** a recipe has `has_structured_steps: false` but has `description`
- **THEN** display the markdown-parsed description as before (heuristic parsing via `parseRecipeSteps.ts`)

#### Scenario: Convert legacy recipe to steps on demand
- **WHEN** user clicks button "Aus Beschreibung Schritte generieren" on a legacy recipe detail page
- **THEN** system calls KI service to parse `description`, creates `RecipeStep` records, refreshes page to show new structure

### Requirement: Step-by-Step Accordion Display

Steps SHALL be displayed in a collapsible accordion format on the recipe detail page.

#### Scenario: Accordion header shows step summary
- **WHEN** step is collapsed
- **THEN** header displays "Schritt N — [section if exists] — ⏱ [duration]" and ingredient count

#### Scenario: Accordion expanded shows full step
- **WHEN** user expands a step
- **THEN** system displays full instruction with resolved placeholders, ingredient list for this step, and duration timer

### Requirement: Print-Friendly Step Layout

The recipe print page SHALL display steps in a two-column layout: ingredients on left, instruction on right.

#### Scenario: Print two-column layout
- **WHEN** user clicks "Drucken" on recipe detail page
- **THEN** system renders each step with ingredients in left column and resolved instruction in right column

