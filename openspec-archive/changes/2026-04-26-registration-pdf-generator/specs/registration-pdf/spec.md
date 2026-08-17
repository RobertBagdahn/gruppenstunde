## ADDED Requirements

### Requirement: YAML-based event configuration
The system SHALL accept a YAML file with structured event data (dates, times, locations, fees) and generate all display strings automatically. The YAML schema SHALL be validated with Pydantic before processing. Required fields: `event.name`, `event.start_date`, `event.end_date`, `event.meeting_point`, `event.fee`, `event.registration_deadline`, `participants.type`.

#### Scenario: Minimal valid YAML
- **WHEN** user provides a YAML with all required fields
- **THEN** the system validates successfully and proceeds to PDF generation

#### Scenario: Missing required field
- **WHEN** user provides a YAML missing `event.start_date`
- **THEN** the system exits with a clear error message naming the missing field

#### Scenario: Date string generation
- **WHEN** `event.start_date` is `2026-05-29` and `event.end_date` is `2026-05-31`
- **THEN** the generated detail string reads `"Freitag, 29.05.2026 bis Sonntag, 31.05.2026"` (German weekday names, DD.MM.YYYY format)

#### Scenario: Meeting point string generation
- **WHEN** `event.start_time` is `"16:30"` and `event.meeting_point` is `"Bahnhof Korschenbroich"`
- **THEN** the generated detail string reads `"Freitag um 16:30 Uhr am Bahnhof Korschenbroich"` (weekday derived from `start_date`)

#### Scenario: Return point defaults to meeting point
- **WHEN** `event.return_point` is not set
- **THEN** the system uses `event.meeting_point` as return point

#### Scenario: Fee string generation
- **WHEN** `event.fee` is `25.00` and `event.fee_note` is `"passend in bar mitbringen"`
- **THEN** the generated detail string reads `"25,00 € (passend in bar mitbringen)"`

### Requirement: Text block resolution
The system SHALL resolve text content from three sources in priority order: (1) explicit string override, (2) named text block preset with template variable substitution, (3) AI generation. The source is determined by the value in the `texts` section of the YAML.

#### Scenario: Text block preset
- **WHEN** `texts.greeting` is `"default"` and `event.type` is `"sippentippel"`
- **THEN** the system loads the greeting template for type `"sippentippel"` from `defaults/text_blocks.yaml` and substitutes variables like `{participants.type}`, `{event.name}`, `{event.location}`

#### Scenario: Named preset key
- **WHEN** `texts.additional_info` is `"zelt_wanderung"`
- **THEN** the system loads the `zelt_wanderung` block from `defaults/text_blocks.yaml` under `additional_info` and substitutes variables

#### Scenario: Explicit override
- **WHEN** `texts.greeting` is a string that is not a known preset key and not `"ai"`
- **THEN** the system uses the string verbatim as the greeting text

#### Scenario: AI text generation
- **WHEN** `texts.additional_info` is `"ai"` and `event.theme` is `"Harry Potter"`
- **THEN** the system sends a prompt to Google Gemini with event data and theme, and uses the response as the additional info text

#### Scenario: AI without theme
- **WHEN** `texts.additional_info` is `"ai"` and `event.theme` is not set
- **THEN** the system generates a generic additional info text based on event type and data

#### Scenario: Default consent text
- **WHEN** `consent` is `"default"` or not specified
- **THEN** the system uses the standard consent text from `defaults/text_blocks.yaml` with variable substitution for location-specific data

### Requirement: Packlist and form field presets
The system SHALL provide named presets for packlists and form fields. Presets are referenced by key in the YAML. Additional items can be appended via `packlist_extra`.

#### Scenario: Packlist preset
- **WHEN** `packlist` is `"wanderung"`
- **THEN** the system loads the `wanderung` list from `defaults/packlists.yaml`

#### Scenario: Packlist with extras
- **WHEN** `packlist` is `"wanderung"` and `packlist_extra` contains `["Taschenmesser"]`
- **THEN** the packlist contains all items from the `wanderung` preset plus `"Taschenmesser"`

#### Scenario: Inline packlist
- **WHEN** `packlist` is a YAML list of strings (not a preset key)
- **THEN** the system uses the list directly

#### Scenario: Form field preset
- **WHEN** `form_fields` is `"standard"`
- **THEN** the system loads the `standard` field definitions from `defaults/form_fields.yaml`

#### Scenario: Unknown preset key
- **WHEN** `packlist` or `form_fields` references a key not found in defaults
- **THEN** the system exits with an error naming the unknown key and listing available presets

### Requirement: PDF generation with reportlab
The system SHALL generate a PDF file using reportlab Platypus with the following block structure in order: Header (title + logo), Greeting, Details (key-value list), Additional Info, Packlist, Signup Note, Form Fields, Consent Text, Signature Line.

#### Scenario: Single page PDF
- **WHEN** `layout.pages` is `1`
- **THEN** all content MUST fit on exactly 1 A4 page

#### Scenario: Two page PDF
- **WHEN** `layout.pages` is `2`
- **THEN** page 1 contains informational blocks (Header through Packlist), page 2 contains the form (Signup Note through Signature). The page break SHALL occur before the form section.

#### Scenario: Logo placement
- **WHEN** `group.logo` path points to a valid PNG file
- **THEN** the logo is rendered top-right in the header area, scaled proportionally

#### Scenario: Form field rendering - text_line
- **WHEN** a form field has `type: text_line` and `label: "Name"`
- **THEN** the PDF renders `"Name: _______________"` with a horizontal line for handwriting

#### Scenario: Form field rendering - same_line_with
- **WHEN** a form field has `same_line_with: "Geburtsdatum"`
- **THEN** both fields render side-by-side on the same line

#### Scenario: Form field rendering - checkboxes
- **WHEN** a form field has `type: checkboxes` with `options: ["vegetarisch", "Vegan"]` and `has_other: true`
- **THEN** the PDF renders `"[ ] vegetarisch; [ ] Vegan; [ ] sonstiges: ___________"`

#### Scenario: Form field rendering - text_area
- **WHEN** a form field has `type: text_area` with `lines: 2`
- **THEN** the PDF renders the label followed by 2 horizontal lines for handwriting

### Requirement: Page optimizer
The system SHALL automatically adjust layout parameters to fit content into the configured number of pages. If fitting is impossible, the system SHALL exit with an error.

#### Scenario: Content fits with defaults
- **WHEN** content naturally fits on the target page count with default parameters
- **THEN** the PDF is generated with default styling (Font 11pt, paragraph spacing 6mm, margins 20mm)

#### Scenario: Content too long - compression
- **WHEN** content exceeds 1 page and `layout.pages` is `1`
- **THEN** the optimizer reduces parameters in priority order: paragraph spacing (min 4mm) → block spacing (min 3mm) → line height (min 11pt) → body font size (min 9pt) → header font size (min 14pt) → margins (min 15mm)

#### Scenario: Content too short - expansion
- **WHEN** content fits on less pages than `layout.pages`
- **THEN** the optimizer increases parameters in reverse priority order up to their maximum values

#### Scenario: Impossible fit
- **WHEN** content cannot fit on the target page count even with all parameters at their extreme
- **THEN** the system exits with an error stating the minimum page count needed and recommending to increase `layout.pages` or shorten texts

#### Scenario: Block integrity
- **WHEN** optimizing layout
- **THEN** no content block (Header, Greeting, Details, etc.) SHALL be split across a page break. Each block MUST use reportlab `KeepTogether`.

#### Scenario: Optimizer logging
- **WHEN** optimization adjusts any parameter
- **THEN** the system prints which parameters were changed and their original/new values (e.g., `"Optimiert: Schriftgröße 11pt → 10.5pt, Absatzabstand 6mm → 5mm"`)

### Requirement: CLI interface
The system SHALL be invoked as a standalone Python script via `uv run python backend/documents/generate.py <yaml-path>` and output a PDF file.

#### Scenario: Basic invocation
- **WHEN** user runs `uv run python backend/documents/generate.py templates/sippentippel.yaml`
- **THEN** a PDF is generated at `output/sippentippel.pdf` (derived from YAML filename)

#### Scenario: Custom output path
- **WHEN** user runs `uv run python backend/documents/generate.py templates/event.yaml --output meine_anmeldung.pdf`
- **THEN** the PDF is written to `meine_anmeldung.pdf`

#### Scenario: YAML validation error
- **WHEN** the YAML file has invalid structure
- **THEN** the system prints a human-readable error with field name and expected type, then exits with code 1

#### Scenario: Missing file
- **WHEN** the YAML file or logo file does not exist
- **THEN** the system prints `"Datei nicht gefunden: <path>"` and exits with code 1
