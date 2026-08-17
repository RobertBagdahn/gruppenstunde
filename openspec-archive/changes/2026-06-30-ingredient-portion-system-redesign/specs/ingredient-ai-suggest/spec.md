## MODIFIED Requirements

### Requirement: AI-powered ingredient data suggestion endpoint

The system SHALL provide a POST endpoint at `/api/ingredients/{slug}/ai-suggest-all/` that returns suggested values for all fields of an ingredient (nutrition, ratings, physical properties, scout fields, name suggestion, portions, aliases, nutritional tags) using Gemini with structured output in a single call. The response SHALL always include a `normalportion` suggestion (rank=1), estimated `stueck_weight_g` (or null), and estimated `packung_weight_g` (or null). The `portions`, `aliases`, and `nutritional_tags` fields SHALL be required (non-optional) in the structured output schema to ensure Gemini always returns them.

#### Scenario: Successful suggestion includes Normalportion

- **WHEN** an authenticated user sends POST to `/api/ingredients/{slug}/ai-suggest-all/`
- **THEN** the system SHALL return a JSON object with suggested values for all fields
- **THEN** `portions` SHALL always be an array with the first element being the Normalportion (rank=1, typical per-person quantity)
- **THEN** `stueck_weight_g` SHALL be in the response (number or null)
- **THEN** `packung_weight_g` SHALL be in the response (number or null)
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

The system SHALL provide a POST endpoint at `/api/ingredients/ai-create/` that creates a complete ingredient (with portions and aliases) from just a name using Gemini with Google Search Grounding. The AI SHALL always suggest a Normalportion (rank=1) as the first portion, and SHALL provide `stueck_weight_g` and `packung_weight_g` estimates. After creation, system portions (g, Packung, Stück) SHALL be created with the AI-estimated weights applied.

#### Scenario: Successful ingredient creation with Normalportion

- **WHEN** an authenticated user sends POST to `/api/ingredients/ai-create/` with `{ "name": "Nudeln" }`
- **THEN** the system SHALL create an Ingredient with all fields populated
- **THEN** SHALL a Normalportion with rank=1 (e.g., „125g", weight_g=125) be created
- **THEN** SHALL System-Portionen (g, Packung, Stück) be created with AI-estimated weight_g where applicable
- **THEN** SHALL associated Portions and Aliases be created
- **THEN** SHALL the created ingredient detail be returned

#### Scenario: stueck_weight_g applied to Stück system portion

- **WHEN** `ai-create` returns `stueck_weight_g: 180` for „Apfel"
- **THEN** SHALL the „Stück" system portion be created with `weight_g=180`

#### Scenario: packung_weight_g applied to Packung system portion

- **WHEN** `ai-create` returns `packung_weight_g: 500` for „Nudeln"
- **THEN** SHALL the „Packung" system portion be created with `weight_g=500`

#### Scenario: null stueck_weight_g leaves Stück empty

- **WHEN** `ai-create` returns `stueck_weight_g: null` for „Salz"
- **THEN** SHALL the „Stück" system portion be created without `weight_g` (null)

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

The system SHALL display a dialog showing all non-null suggestions with the current value for comparison, allowing the user to select individual fields via checkboxes and apply only selected suggestions. The dialog SHALL use a CSS Grid 3-column layout on desktop (896px wide), collapsing to single column on mobile. Portions, aliases, and nutritional tags SHALL be shown as lists that can be individually selected. The dialog SHALL also show `stueck_weight_g` and `packung_weight_g` suggestions for applying to system portions.

#### Scenario: Dialog layout is multi-column on desktop

- **WHEN** the AI returns suggestions and the viewport is >=1024px
- **THEN** the dialog SHALL use a 3-column CSS Grid layout with groups distributed across columns
- **THEN** the dialog SHALL be `max-w-4xl` (896px)

#### Scenario: Dialog layout collapses on mobile

- **WHEN** the AI returns suggestions and the viewport is <768px
- **THEN** the dialog SHALL use a single-column layout

#### Scenario: Name suggestion displayed prominently

- **WHEN** the AI returns a name_suggestion that differs from the current ingredient name
- **THEN** the dialog SHALL display a full-width „Name" group showing ~~current name~~ → suggested name

#### Scenario: Dialog shows only changed/new values

- **WHEN** the AI returns suggestions
- **THEN** the dialog SHALL only display fields where the suggested value differs from the current value or where the current value is null/0

#### Scenario: User selects and applies individual suggestions

- **WHEN** the user checks specific field checkboxes and clicks „Ausgewählte übernehmen"
- **THEN** the system SHALL send a PATCH request for scalar fields (including name_suggestion) and create Portions/Aliases for selected list items

#### Scenario: Portion suggestions avoid duplicates

- **WHEN** a suggested portion name already exists for the ingredient (case-insensitive)
- **THEN** SHALL the dialog show the suggestion as already-existing (greyed out or pre-checked) and not re-create it

#### Scenario: Stück und Packung weight_g suggestions anzeigen

- **WHEN** die KI `stueck_weight_g` oder `packung_weight_g` zurückgibt
- **THEN** SHALL der Dialog diese als Vorschläge für die jeweiligen System-Portionen anzeigen
- **THEN** KANN der User diese separat akzeptieren oder ablehnen
