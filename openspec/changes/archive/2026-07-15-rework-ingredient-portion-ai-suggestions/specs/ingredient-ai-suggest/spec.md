## MODIFIED Requirements

### Requirement: AI-powered ingredient data suggestion endpoint

The system SHALL provide a POST endpoint at `/api/ingredients/{slug}/ai-suggest-all/` that returns suggested values for all fields of an ingredient (nutrition, ratings, physical properties, scout fields, name suggestion, portions, aliases, nutritional tags) using Gemini with structured output in a single call. Portion suggestions SHALL be returned as a structured `IngredientPortionSuggestSchema` object (not a flat array) with a required `portion_type` per entry (`system_gramm`, `rezeptportion`, `packung`, `belag`, `backmenge`). The response SHALL always include exactly one `system_gramm` suggestion (name „g", `weight_g=1`), at least one `rezeptportion` (typical per-person quantity, rank=1), and at least one `packung` suggestion. `belag`-Vorschläge SHALL nur enthalten sein, wenn die Zutat den Tag `breakfast-topping` trägt; `backmenge`-Vorschläge SHALL nur enthalten sein, wenn die Zutat den Tag `baking-ingredient` trägt. Portion names SHALL NOT contain any digits; weight and quantity information SHALL be conveyed exclusively via the `weight_g` and `quantity` fields. The `aliases` and `nutritional_tags` fields SHALL be required (non-optional) in the structured output schema to ensure Gemini always returns them.

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

#### Scenario: Belag-Vorschläge nur bei breakfast-topping-Tag

- **WHEN** eine Zutat den Tag `breakfast-topping` trägt
- **THEN** SHALL das Antwortschema ein `belag`-Array mit Vorschlägen für „Belag knapp", „Belag normal" und „Belag üppig" enthalten (rank aufsteigend nach Menge)
- **WHEN** eine Zutat den Tag `breakfast-topping` nicht trägt
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

---

### Requirement: AI-powered ingredient creation endpoint

The system SHALL provide a POST endpoint at `/api/ingredients/ai-create/` that creates a complete ingredient (with portions and aliases) from just a name using Gemini with Google Search Grounding. Portion suggestions SHALL use the shared `IngredientPortionSuggestSchema` (same structure and naming rules as the `ai-suggest-all` endpoint). After creation, the `system_gramm` portion SHALL always be created together with the remaining system portions (Packung, Stück); AI-estimated weights from the `packung`/`rezeptportion` groups SHALL be applied where applicable.

#### Scenario: Successful ingredient creation with required portion groups

- **WHEN** an authenticated user sends POST to `/api/ingredients/ai-create/` with `{ "name": "Nudeln" }`
- **THEN** the system SHALL create an Ingredient with all fields populated
- **THEN** SHALL a `rezeptportion` with rank=1 (e.g., name „Portion", weight_g=125) be created without digits in its name
- **THEN** SHALL System-Portionen (g, Packung, Stück) be created, with the `system_gramm` suggestion always applied to „g"
- **THEN** SHALL associated Portions and Aliases be created
- **THEN** SHALL the created ingredient detail be returned

#### Scenario: packung-Vorschlag wird auf Packung-Systemportion angewendet

- **WHEN** `ai-create` einen `packung`-Vorschlag mit `weight_g=500` für „Nudeln" zurückgibt
- **THEN** SHALL die „Packung"-Systemportion mit `weight_g=500` angelegt werden

#### Scenario: Kein Rezeptportion-Vorschlag verfügbar

- **WHEN** `ai-create` für eine Zutat wie „Salz" keinen sinnvollen `rezeptportion`-Vorschlag liefern kann
- **THEN** SHALL das Schema dennoch mindestens einen `rezeptportion`-Eintrag enthalten (z.B. „Prise" mit geschätztem `weight_g`)

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

The system SHALL display a dialog showing all non-null suggestions with the current value for comparison, allowing the user to select individual fields via checkboxes and apply only selected suggestions. The dialog SHALL use a CSS Grid 3-column layout on desktop (896px wide), collapsing to single column on mobile. Portion suggestions SHALL be grouped and displayed by `portion_type` (System, Rezeptportion, Packungen, Belag, Backmengen), each group offering an „Alle auswählen"/„Keine auswählen" toggle in addition to individual checkboxes. The dialog SHALL additionally offer an opt-in „Alte Portionen ersetzen"-Checkbox (default: deaktiviert). Aliases and nutritional tags SHALL be shown as lists that can be individually selected.

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

#### Scenario: Portionen nach portion_type gruppiert angezeigt

- **WHEN** die KI Portionsvorschläge zurückgibt
- **THEN** SHALL der Dialog sie in getrennten Gruppen anzeigen: „System", „Rezeptportion", „Packungen", „Belag" (nur falls vorhanden), „Backmengen" (nur falls vorhanden)
- **THEN** SHALL jede Gruppe eine „Alle auswählen"/„Keine auswählen"-Option sowie Einzelauswahl-Checkboxen pro Portion anbieten

#### Scenario: User selects and applies individual suggestions

- **WHEN** the user checks specific field checkboxes and clicks „Ausgewählte übernehmen"
- **THEN** the system SHALL send a PATCH request for scalar fields (including name_suggestion) and SHALL call the atomic `ai-apply`-Endpoint for selected Portions

#### Scenario: Portion suggestions avoid duplicates

- **WHEN** a suggested portion name already exists for the ingredient (case-insensitive) and „Alte Portionen ersetzen" ist NICHT aktiviert
- **THEN** SHALL the dialog show the suggestion as already-existing (greyed out or pre-checked) and not re-create it

#### Scenario: Alte Portionen ersetzen-Checkbox verfügbar

- **WHEN** der Zauberstab-Dialog Portionsvorschläge anzeigt
- **THEN** SHALL eine Checkbox „Alte Portionen ersetzen" angezeigt werden (standardmäßig deaktiviert)
- **THEN** SHALL bei Aktivierung ein Warnhinweis erscheinen, wie viele bestehende Portionen ersetzt würden
