## ADDED Requirements

### Requirement: AI-powered ingredient data suggestion endpoint
The system SHALL provide a POST endpoint at `/api/ingredients/{slug}/ai-suggest-all/` that returns suggested values for all fields of an ingredient (nutrition, ratings, physical properties, portions, aliases) using Gemini with Google Search Grounding in a single structured output call.

#### Scenario: Successful suggestion for ingredient with missing data
- **WHEN** an authenticated user sends POST to `/api/ingredients/{slug}/ai-suggest-all/`
- **THEN** the system SHALL return a JSON object with suggested values for nutrition fields, rating fields, physical property fields, a list of portion suggestions (name + weight_g), and a list of alias strings, where fields the LLM cannot determine are null

#### Scenario: Unauthenticated user
- **WHEN** an unauthenticated user sends POST to `/api/ingredients/{slug}/ai-suggest-all/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Ingredient not found
- **WHEN** a user sends POST with a non-existent slug
- **THEN** the system SHALL return HTTP 404

#### Scenario: Gemini rate limit exceeded
- **WHEN** the global Gemini rate limit is exceeded
- **THEN** the system SHALL return HTTP 429 with a German error message

---

### Requirement: AI-powered ingredient creation endpoint
The system SHALL provide a POST endpoint at `/api/ingredients/ai-create/` that creates a complete ingredient (with portions and aliases) from just a name using Gemini with Google Search Grounding.

#### Scenario: Successful ingredient creation
- **WHEN** an authenticated user sends POST to `/api/ingredients/ai-create/` with `{ "name": "Vanillepuddingpulver" }`
- **THEN** the system SHALL create an Ingredient with all fields populated, create associated Portions, create associated Aliases, and return the created ingredient detail

#### Scenario: Unauthenticated user
- **WHEN** an unauthenticated user sends POST to `/api/ingredients/ai-create/`
- **THEN** the system SHALL return HTTP 403

---

### Requirement: Zauberstab button on ingredient detail page
The system SHALL display a magic wand button in the ingredient detail page header (alongside edit/delete) that triggers AI suggestions for the current ingredient.

#### Scenario: User clicks Zauberstab button
- **WHEN** an authenticated user clicks the Zauberstab button on an ingredient detail page
- **THEN** the system SHALL open a dialog and call the AI suggest endpoint

#### Scenario: Button visibility restricted to staff users
- **WHEN** a user with `is_staff=true` views the ingredient detail page
- **THEN** the Zauberstab button SHALL be displayed alongside edit/delete buttons
- **WHEN** a non-staff user (including authenticated non-staff) views the ingredient detail page
- **THEN** the Zauberstab button SHALL NOT be displayed

---

### Requirement: AI suggestion dialog with individual field acceptance
The system SHALL display a dialog showing all non-null suggestions with the current value for comparison, allowing the user to select individual fields via checkboxes and apply only selected suggestions. Portions and aliases SHALL be shown as lists that can be individually selected.

#### Scenario: Dialog shows only changed/new values
- **WHEN** the AI returns suggestions
- **THEN** the dialog SHALL only display fields where the suggested value differs from the current value or where the current value is null/0

#### Scenario: User selects and applies individual suggestions
- **WHEN** the user checks specific field checkboxes and clicks "Ausgewählte übernehmen"
- **THEN** the system SHALL send a PATCH request for scalar fields and create Portions/Aliases for selected list items

#### Scenario: Portion suggestions avoid duplicates
- **WHEN** a suggested portion name already exists for the ingredient
- **THEN** the system SHALL NOT create a duplicate portion

#### Scenario: Loading state while waiting for AI response
- **WHEN** the AI suggestion request is in progress
- **THEN** the dialog SHALL display a skeleton/loading state

#### Scenario: AI returns no useful suggestions
- **WHEN** all returned suggestion fields are null or match current values
- **THEN** the dialog SHALL display a message "Keine neuen Vorschläge gefunden"

---

### Requirement: AI-powered ingredient creation from Create flow
The system SHALL provide a Zauberstab button in the ingredient creation flow that creates a complete ingredient from just a name input.

#### Scenario: User creates ingredient via Zauberstab
- **WHEN** an authenticated user enters a name and clicks the Zauberstab in the create flow
- **THEN** the system SHALL call the ai-create endpoint and redirect to the newly created ingredient's detail page
