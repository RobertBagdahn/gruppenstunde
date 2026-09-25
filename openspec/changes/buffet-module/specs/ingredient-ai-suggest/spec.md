## MODIFIED Requirements

### Requirement: AI-powered ingredient data suggestion endpoint

The system SHALL provide a POST endpoint at `/api/ingredients/{slug}/ai-suggest-all/` that returns suggested values for all fields of an ingredient (nutrition, ratings, physical properties, scout fields, name suggestion, portions, aliases, nutritional tags) using Gemini with structured output in a single call. Portion suggestions SHALL be returned as a structured `IngredientPortionSuggestSchema` object (not a flat array) with a required `portion_type` per entry (`system_gramm`, `rezeptportion`, `packung`, `belag`, `backmenge`). The response SHALL always include exactly one `system_gramm` suggestion (name „g", `weight_g=1`), at least one `rezeptportion` (typical per-person quantity, rank=1), and at least one `packung` suggestion. `belag`-Vorschläge SHALL nur enthalten sein, wenn die Zutat die Rolle `buffet-savory` oder `buffet-sweet` trägt; `backmenge`-Vorschläge SHALL nur enthalten sein, wenn die Zutat den Tag `baking-ingredient` trägt. Portion names SHALL NOT contain any digits; weight and quantity information SHALL be conveyed exclusively via the `weight_g` and `quantity` fields. The `aliases` and `nutritional_tags` fields SHALL be required (non-optional) in the structured output schema to ensure Gemini always returns them.

#### Scenario: Successful suggestion includes required portion groups

- **WHEN** an authenticated user sends POST to `/api/ingredients/{slug}/ai-suggest-all/`
- **THEN** the system SHALL return a JSON object with suggested values for all fields
- **THEN** the response SHALL include exactly one `system_gramm` entry with `name="g"` and `weight_g=1`
- **THEN** the response SHALL include at least one `rezeptportion` entry (rank=1 is the typical per-person quantity)
- **THEN** the response SHALL include at least one `packung` entry
- **THEN** `aliases` SHALL always be an array (may be empty)
- **THEN** `nutritional_tags` SHALL always be an array (may be empty)

#### Scenario: Portion names never contain digits

- **WHEN** Gemini returns a portion suggestion (any `portion_type`)
- **THEN** the system SHALL validate that `name` contains no digit characters
- **THEN** if a digit is found, the system SHALL reject the value and retry the Gemini call with an explicit correction instruction

#### Scenario: Multiple package sizes use descriptive names

- **WHEN** the ingredient has more than one plausible typical package size
- **THEN** the `packung`-Array SHALL contain multiple entries distinguished by descriptive adjectives (e.g. „Packung", „Großpackung", „Kleine Packung") rather than by embedding the weight in the name
- **THEN** each entry's actual weight SHALL be conveyed solely via its `weight_g` field

#### Scenario: Belag-Vorschläge nur bei Belag-Rolle

- **WHEN** eine Zutat die Rolle `buffet-savory` oder `buffet-sweet` trägt
- **THEN** SHALL das Antwortschema ein `belag`-Array mit Vorschlägen für „Belag knapp", „Belag normal" und „Belag üppig" enthalten (rank aufsteigend nach Menge)
- **WHEN** eine Zutat keine der Rollen `buffet-savory` und `buffet-sweet` trägt
- **THEN** SHALL das `belag`-Array leer sein

#### Scenario: Backmengen-Vorschläge nur bei baking-ingredient-Tag

- **WHEN** eine Zutat den Tag `baking-ingredient` trägt
- **THEN** SHALL das Antwortschema ein `backmengen`-Array mit mindestens einem Vorschlag für eine typische Backmenge enthalten
- **WHEN** eine Zutat den Tag `baking-ingredient` nicht trägt
- **THEN** SHALL das `backmengen`-Array leer sein

#### Scenario: Unauthenticated user

- **WHEN** an unauthenticated user sends POST to `/api/ingredients/{slug}/ai-suggest-all/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Ingredient not found

- **WHEN** a user sends POST with a non-existent slug
- **THEN** the system SHALL return HTTP 404

#### Scenario: Gemini rate limit exceeded

- **WHEN** the global Gemini rate limit is exceeded
- **THEN** the system SHALL return HTTP 429 with a German error message
