## MODIFIED Requirements

### Requirement: Generic ingredient warnings are covered in the browser
The Food E2E suite SHALL verify the non-blocking generic-name warning in the Ingredient creation flow and SHALL assert that the created Ingredient remains persisted.

#### Scenario: Generic name warning is visible but non-blocking
- **WHEN** an authenticated user enters a configured generic Ingredient name and proceeds through the creation stepper
- **THEN** the German warning SHALL be visible, the preview and save actions SHALL remain usable, and the created Ingredient SHALL be reachable on its detail page

#### Scenario: Specific name has no generic warning
- **WHEN** an authenticated user enters a specific Ingredient name
- **THEN** no generic-name warning SHALL be shown and the specific Ingredient SHALL be created normally
