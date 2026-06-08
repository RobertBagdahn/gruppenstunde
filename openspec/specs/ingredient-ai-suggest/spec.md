## ADDED Requirements

### Requirement: AI-powered ingredient data suggestion endpoint
The system SHALL provide a POST endpoint at `/api/ingredients/{slug}/ai-suggest-all/` that returns suggested values for all fields of an ingredient (nutrition, ratings, physical properties, scout fields, name suggestion, portions, aliases, nutritional tags) using Gemini with structured output in a single call. The `portions`, `aliases`, and `nutritional_tags` fields SHALL be required (non-optional) in the structured output schema to ensure Gemini always returns them.

#### Scenario: Successful suggestion for ingredient with missing data
- **WHEN** an authenticated user sends POST to `/api/ingredients/{slug}/ai-suggest-all/`
- **THEN** the system SHALL return a JSON object with suggested values for nutrition fields, rating fields, physical property fields, scout fields (storage_type, cooking_factor, camp_suitable, preparation_time_min, season_start, season_end), name_suggestion (string or null), a list of portion suggestions (name + weight_g), a list of alias strings, and a list of nutritional tag objects, where scalar fields the LLM cannot determine are null but list fields SHALL NOT be null (empty arrays are valid)
- **THEN** `portions` SHALL always be an array (may be empty)
- **THEN** `aliases` SHALL always be an array (may be empty)
- **THEN** `nutritional_tags` SHALL always be an array (may be empty)

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
The system SHALL display a dialog showing all non-null suggestions with the current value for comparison, allowing the user to select individual fields via checkboxes and apply only selected suggestions. The dialog SHALL use a CSS Grid 3-column layout on desktop (896px wide), collapsing to single column on mobile. Portions, aliases, and nutritional tags SHALL be shown as lists that can be individually selected.

#### Scenario: Dialog layout is multi-column on desktop
- **WHEN** the AI returns suggestions and the viewport is >=1024px
- **THEN** the dialog SHALL use a 3-column CSS Grid layout with groups distributed across columns
- **THEN** the dialog SHALL be `max-w-4xl` (896px)

#### Scenario: Dialog layout collapses on mobile
- **WHEN** the AI returns suggestions and the viewport is <768px
- **THEN** the dialog SHALL use a single-column layout

#### Scenario: Name suggestion displayed prominently
- **WHEN** the AI returns a name_suggestion that differs from the current ingredient name
- **THEN** the dialog SHALL display a full-width "Name" group showing ~~current name~~ → suggested name

#### Scenario: Dialog shows only changed/new values
- **WHEN** the AI returns suggestions
- **THEN** the dialog SHALL only display fields where the suggested value differs from the current value or where the current value is null/0

#### Scenario: User selects and applies individual suggestions
- **WHEN** the user checks specific field checkboxes and clicks "Ausgewählte übernehmen"
- **THEN** the system SHALL send a PATCH request for scalar fields (including name_suggestion) and create Portions/Aliases for selected list items

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

---

### Requirement: Gemini prompt for suggest_all_fields includes all new fields
The prompt for `suggest_all_fields` SHALL include instructions for all new scout fields and improved alias specificity.

#### Scenario: Prompt requests scout fields
- **WHEN** the Gemini prompt is constructed
- **THEN** it SHALL request values for storage_type (dry/refrigerated/frozen/ambient), cooking_factor (raw→cooked multiplier), camp_suitable (boolean), preparation_time_min, season_start/season_end (1–12 or null)
- **THEN** it SHALL request a name_suggestion if the current name is too generic

#### Scenario: Prompt requires specific aliases
- **WHEN** the Gemini prompt is constructed
- **THEN** it SHALL instruct: "Gib mindestens 3 alternative Bezeichnungen an, die spezifischer sind als der Zutatenname. Format: 'Nudeln (Fusilli)', 'Nudeln (Makkaroni)', 'Nudeln (Spaghetti)'"
