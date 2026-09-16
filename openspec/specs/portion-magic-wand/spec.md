# portion-magic-wand Specification

## Purpose
Defines the confirmation-based AI preview and atomic application flow for completing ingredient portions.

## Requirements

### Requirement: A single portions magic wand provides a preview
The Food ingredient detail page SHALL provide exactly one portions magic-wand action in the “Portionen” section. It SHALL request a fresh AI preview on every invocation and SHALL NOT mutate portions before confirmation.

#### Scenario: Authenticated editor opens the wand
- **WHEN** an authenticated user with portion edit permission clicks the portions magic wand
- **THEN** the frontend SHALL call `POST /api/ingredients/{slug}/portions/magic-wand/preview/`
- **THEN** the frontend SHALL display the returned preview in a dialog
- **THEN** no portion SHALL be deleted or created before apply confirmation

#### Scenario: Unauthenticated user opens the wand
- **WHEN** an unauthenticated user calls the preview endpoint
- **THEN** the backend SHALL return HTTP 403
- **THEN** no AI request SHALL be made

### Requirement: The preview includes complete contextual suggestions
The preview service SHALL provide the AI with the available ingredient name, description, aliases, current portions, packages, nutrition, categories, physical properties and bounded recipe-usage context. The response SHALL identify existing sources and new proposed portions separately.

#### Scenario: Ingredient with existing data is analyzed
- **WHEN** the editor requests a preview for an ingredient with portions, packages and recipe usages
- **THEN** the AI request SHALL include those relevant context fields
- **THEN** the response SHALL contain structured operations with names, quantities, measuring units and proposed positive weights

### Requirement: Weighted portions are protected
The wand SHALL exclude active portions with a positive weight from replacement and SHALL leave them unchanged during apply.

#### Scenario: Existing weighted and unweighted portions are previewed
- **WHEN** an ingredient has one weighted portion and one unweighted portion
- **THEN** the weighted portion SHALL be shown as unchanged and not selected for replacement
- **THEN** the unweighted portion SHALL be shown as an automatically selected replacement candidate

### Requirement: New typical portions are individually selectable
The AI MAY return additional typical portions. Each new portion SHALL be independently selectable in the preview and SHALL be unselected by default.

#### Scenario: AI suggests Stück and Packung
- **WHEN** the AI proposes new `Stück` and `Packung` portions with valid weights
- **THEN** the dialog SHALL render two independent selectable suggestions
- **THEN** applying the preview SHALL create only the selected suggestions

### Requirement: Missing AI weights require manual input
Every portion selected for creation or replacement SHALL have a positive weight. If the AI does not provide a usable weight, the dialog SHALL provide a manual positive-weight field and SHALL block apply until it is valid.

#### Scenario: AI cannot determine a weight
- **WHEN** a proposed portion has no usable AI weight
- **THEN** the preview SHALL show a manual weight input for that portion
- **THEN** the apply action SHALL remain blocked until the entered weight is greater than zero

### Requirement: Applying a preview replaces selected incomplete rows atomically
The apply endpoint SHALL revalidate permissions and current data, soft-delete selected unweighted source portions and create complete replacements/new portions in one transaction. A failed validation SHALL roll back the entire operation.

#### Scenario: Confirmed replacement is applied
- **WHEN** an editor confirms a preview replacing an unweighted `Stück` portion with `weight_g=150`
- **THEN** the source portion SHALL be soft-deleted
- **THEN** a complete replacement SHALL be created with positive weight
- **THEN** the response SHALL include the active portion list and operation summary

#### Scenario: Stale source became weighted
- **WHEN** a selected source portion receives a weight after preview but before apply
- **THEN** the apply endpoint SHALL return a conflict error
- **THEN** no selected source SHALL be deleted and no replacement SHALL be created

### Requirement: Unselected incomplete rows cannot remain active silently
If an unweighted existing portion is deselected, the preview SHALL require either a positive manual weight for that portion or an explicit delete-without-replacement choice.

#### Scenario: User deselects an incomplete replacement
- **WHEN** the user unchecks an automatically selected unweighted portion
- **THEN** the dialog SHALL require manual weighting or explicit deletion
- **THEN** it SHALL not allow confirmation while the portion would remain active without weight
