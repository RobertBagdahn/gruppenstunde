## ADDED Requirements

### Requirement: Interactive Drag-and-Drop Step Editor

The recipe editing interface SHALL provide a Drag-and-Drop editor for managing `RecipeStep` records. Users SHALL be able to reorder steps by dragging them vertically.

#### Scenario: Drag step to new position
- **WHEN** user drags step 3 above step 1
- **THEN** system updates `sort_order` so that reordered steps reflect the new sequence on next render

#### Scenario: Visual feedback during drag
- **WHEN** user initiates a drag operation
- **THEN** system displays visual hover-zone indicating drop target area

#### Scenario: Drag-and-drop on mobile (touch)
- **WHEN** user long-presses a step on mobile device
- **THEN** system enters drag-mode (if supported) or provides ↑↓ buttons as alternative

### Requirement: Inline Step Editing

Each step in the editor SHALL support inline editing of the instruction text with live preview of resolved placeholders.

#### Scenario: Edit step instruction directly
- **WHEN** user clicks into a step's instruction textarea and modifies text
- **THEN** system does NOT save until user clicks "Speichern", but displays live preview of resolved text

#### Scenario: Live placeholder resolution during editing
- **WHEN** user types or modifies placeholders in instruction text
- **THEN** system shows real-time preview below the textarea with resolved ingredient names and quantities

#### Scenario: Syntax highlighting for placeholders
- **WHEN** user types `{` or `@`
- **THEN** system highlights recognized placeholder syntax visually (optional: autocomplete dropdown with ingredient names)

### Requirement: Step Card UI Components

Each step SHALL be displayed in an expandable card with the following elements:
- Drag handle (≡)
- Step number (auto-calculated)
- Duration input field
- Instruction textarea
- Live preview pane
- Ingredient assignment panel
- Action buttons (add, delete, KI-rewrite)

#### Scenario: Display step card
- **WHEN** editor renders a step
- **THEN** all required elements (drag handle, number, duration, instruction, preview, ingredients) are visible and functional

#### Scenario: Collapse/expand ingredient panel
- **WHEN** user clicks on ingredient panel header
- **THEN** ingredient list toggles between expanded and collapsed

### Requirement: Add and Delete Steps

Users SHALL be able to add new empty steps at the end of the recipe and delete existing steps.

#### Scenario: Add new step
- **WHEN** user clicks "+ Schritt hinzufügen"
- **THEN** system appends a new empty step with auto-incremented sort_order

#### Scenario: Delete step
- **WHEN** user clicks "✕ Löschen" on a step
- **THEN** system prompts for confirmation, then deletes the step and re-orders remaining steps

#### Scenario: Prevent deletion if only step exists
- **WHEN** user tries to delete the only step in a recipe
- **THEN** system shows validation message (recipe MUST have at least one step)

### Requirement: Ingredient Assignment Panel per Step

Each step SHALL display a list of assigned ingredients (`RecipeStepIngredient` records). Users SHALL be able to:
- Toggle ingredients on/off via checkbox
- Add new ingredients from a dropdown of unassigned recipe ingredients
- Edit per-step preparation notes
- Remove ingredient assignments

#### Scenario: Display assigned ingredients
- **WHEN** step has 3 assigned ingredients
- **THEN** system displays all 3 with checkboxes, preparation fields, and remove buttons

#### Scenario: Add ingredient to step
- **WHEN** user clicks "+ Zutat zuordnen" and selects an ingredient from the dropdown
- **THEN** system adds a new `RecipeStepIngredient` record for that ingredient

#### Scenario: Edit preparation note
- **WHEN** user clicks into preparation field for an ingredient and types "gehackt"
- **THEN** live preview updates to show "5 Zwiebeln, gehackt"

#### Scenario: Remove ingredient from step
- **WHEN** user clicks remove button (✕) for an ingredient
- **THEN** system deletes the `RecipeStepIngredient` record (RecipeItem is NOT deleted)

### Requirement: Simple Undo/Redo

The editor SHALL support a single level of undo/redo for user edits.

#### Scenario: Undo last change
- **WHEN** user modifies a step and clicks "↶ Undo"
- **THEN** editor reverts to the previous state (before the last change)

#### Scenario: Redo after undo
- **WHEN** user clicks "↷ Redo" after undo
- **THEN** editor restores the undone change

#### Scenario: Undo history clears on save
- **WHEN** user clicks "Speichern" (which calls batch API)
- **THEN** undo/redo stack is cleared (new baseline established)

### Requirement: Mobile-Friendly Editor

The editor SHALL be responsive and work on mobile devices (≥320px width), with adaptive UI for smaller screens.

#### Scenario: Editor on desktop (>768px)
- **WHEN** user opens editor on desktop
- **THEN** full Drag-and-Drop editor with all components is available

#### Scenario: Editor on mobile (<768px)
- **WHEN** user opens editor on mobile
- **THEN** Drag-and-Drop is disabled; ↑↓ buttons are shown instead; step cards are full-width

#### Scenario: Touch-friendly buttons
- **WHEN** on mobile device
- **THEN** all buttons have minimum 44x44px tap targets (accessibility best practice)

### Requirement: Ingredient Placeholder Insertion

Users SHALL be able to quickly insert ingredient placeholders into step instructions via a UI dropdown.

#### Scenario: Insert placeholder via dropdown
- **WHEN** user clicks "🔗 Platzhalter einfügen" and selects "Mehl" from dropdown
- **THEN** system inserts `{Mehl}` at the current cursor position in the instruction textarea

### Requirement: KI-Powered Step Rewriting

The editor SHALL provide a button to rewrite a step's instruction using AI, with tone and style options.

#### Scenario: Rewrite step with AI
- **WHEN** user clicks "🤖 KI umschreiben" on a step
- **THEN** system opens a dialog with options (tone: präzise / ausführlich / etc.)
- **AND THEN** system calls backend AI service and replaces instruction with rewritten version

#### Scenario: AI respects ingredient preservation
- **WHEN** user selects "Zutaten exakt behalten" option before rewrite
- **THEN** AI generates new instruction text while maintaining all original ingredient placeholders

### Requirement: Auto-Generate All Steps via KI

The editor toolbar SHALL provide a button to auto-generate all steps from the recipe's ingredients using AI.

#### Scenario: Generate steps from ingredients
- **WHEN** user clicks "🤖 KI-Komplettgenerierung"
- **THEN** system calls backend AI service, appends generated steps to editor (does not replace existing steps)

#### Scenario: Auto-generated steps have valid ingredient links
- **WHEN** steps are generated via AI
- **THEN** all generated ingredient references are automatically mapped to valid `RecipeItem` records

### Requirement: State Management with Undo/Redo

The editor's state (steps, selections, undo/redo stack) SHALL be managed via a Zustand store (`useRecipeStepStore`).

#### Scenario: Store state persists during editing session
- **WHEN** user makes edits to multiple steps
- **THEN** all edits are held in the Zustand store until user saves or navigates away

#### Scenario: Unsaved changes indicator
- **WHEN** user has made edits but hasn't saved
- **THEN** browser tab title or UI shows indication like "* Recipe" or "Ungespeicherte Änderungen"

### Requirement: API Integration for Save

The editor SHALL integrate with `PUT /api/recipes/{slug}/steps/batch` to persist changes.

#### Scenario: Save steps via batch API
- **WHEN** user clicks "💾 Speichern"
- **THEN** system sends current editor state to batch endpoint; on success, clears undo/redo and shows success toast

#### Scenario: Handle batch API validation errors
- **WHEN** batch API rejects changes due to validation errors
- **THEN** system displays error message to user and keeps editor state intact for correction

