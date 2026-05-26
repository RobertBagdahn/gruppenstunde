## ADDED Requirements

### Requirement: 8-step wizard structure
The event creation wizard SHALL consist of 8 sequential steps: Grunddaten (step 1), Gruppe & Einladung (step 2), Datum & Ort (step 3), Anmeldung (step 4), Buchungsoptionen (step 5), Packliste & Felder (step 6), Einladungstext (step 7), and Zusammenfassung (step 8). Only step 1 (event name) and step 8 (summary/confirmation) SHALL be required. Steps 2 through 7 SHALL be optional and skippable. The wizard SHALL be accessible at the frontend route `/events/app/new`.

#### Scenario: User opens the event creation wizard
- **WHEN** an authenticated user navigates to `/events/app/new`
- **THEN** the wizard SHALL display step 1 "Grunddaten" with a stepper navigation showing all 8 steps

#### Scenario: User skips optional steps
- **WHEN** the user is on any step between 2 and 7
- **THEN** the wizard SHALL display a "Überspringen" button allowing the user to advance to the next step without entering data

#### Scenario: User completes only required steps
- **WHEN** the user fills in the event name in step 1 and skips directly to step 8
- **THEN** the wizard SHALL allow creating the event with only the name provided and all other fields using defaults

### Requirement: Stepper navigation with progress indicator
The wizard SHALL display a stepper component showing all 8 steps with their names, the current active step highlighted, completed steps marked with a checkmark, and skipped steps visually distinguished. The progress indicator SHALL show the overall completion status.

#### Scenario: User navigates between steps
- **WHEN** the user has completed step 1 and is on step 3
- **THEN** the stepper SHALL show step 1 as completed (checkmark), step 2 as skipped (if skipped), step 3 as active/current, and steps 4-8 as upcoming

#### Scenario: User clicks on a completed step
- **WHEN** the user clicks on a previously completed step in the stepper
- **THEN** the wizard SHALL navigate back to that step with all previously entered data preserved

#### Scenario: Progress indicator reflects completion
- **WHEN** the user has completed 3 of 8 steps
- **THEN** the progress indicator SHALL show the completion percentage and filled steps count

### Requirement: Context help text per step
Each wizard step SHALL display a contextual help text explaining what the step does and why it matters. The help text SHALL be shown in a subtle info area at the top of each step.

#### Scenario: Step 1 context help
- **WHEN** the user is on step 1 "Grunddaten"
- **THEN** the wizard SHALL display: "Gib deinem Event einen Namen und wähle eine Farbe und ein Icon. Diese Grunddaten helfen Teilnehmern, dein Event schnell wiederzuerkennen."

#### Scenario: Step 2 context help
- **WHEN** the user is on step 2 "Gruppe & Einladung"
- **THEN** the wizard SHALL display: "Verknüpfe dein Event mit einer Gruppe und lade direkt Personen ein. Du kannst diesen Schritt auch überspringen und Einladungen später versenden."

#### Scenario: Step 3 context help
- **WHEN** the user is on step 3 "Datum & Ort"
- **THEN** the wizard SHALL display: "Lege Start- und Enddatum fest und füge Veranstaltungsorte und Treffpunkte hinzu."

#### Scenario: Step 4 context help
- **WHEN** the user is on step 4 "Anmeldung"
- **THEN** the wizard SHALL display: "Konfiguriere den Anmeldezeitraum, die maximale Teilnehmerzahl und ob eine Warteliste aktiviert werden soll."

#### Scenario: Step 5 context help
- **WHEN** the user is on step 5 "Buchungsoptionen"
- **THEN** the wizard SHALL display: "Erstelle Buchungsoptionen mit unterschiedlichen Preisen, z.B. Frühbucher, Standardpreis oder ermäßigte Teilnahme."

#### Scenario: Step 6 context help
- **WHEN** the user is on step 6 "Packliste & Felder"
- **THEN** the wizard SHALL display: "Erstelle eine Packliste für Teilnehmer und füge eigene Felder hinzu, die bei der Anmeldung ausgefüllt werden müssen."

#### Scenario: Step 7 context help
- **WHEN** the user is on step 7 "Einladungstext"
- **THEN** the wizard SHALL display: "Schreibe einen Einladungstext, der Teilnehmern bei der Anmeldung angezeigt wird. Du kannst Markdown verwenden."

#### Scenario: Step 8 context help
- **WHEN** the user is on step 8 "Zusammenfassung"
- **THEN** the wizard SHALL display: "Überprüfe alle Angaben und erstelle dein Event. Du kannst jederzeit zu vorherigen Schritten zurückkehren."

### Requirement: Color picker with predefined colors
Step 1 SHALL include a color picker offering exactly 15 predefined Tailwind color families: slate, red, orange, amber, yellow, lime, green, emerald, teal, cyan, blue, violet, purple, pink, and rose. Each color SHALL be displayed as a circular swatch. The selected color SHALL be used for the event's visual identity (cards, headers, badges).

#### Scenario: User selects a color
- **WHEN** the user clicks on the "emerald" color swatch
- **THEN** the color picker SHALL highlight the selected swatch with a border/checkmark and store the value `emerald` in the wizard state

#### Scenario: Default color
- **WHEN** the user does not select a color
- **THEN** the wizard SHALL default to the color `blue`

#### Scenario: Color preview in wizard
- **WHEN** the user selects a color
- **THEN** the wizard header and step 8 summary card SHALL reflect the selected color for visual preview

### Requirement: Icon picker with Lucide icons
Step 1 SHALL include an icon picker offering at least 30 predefined Lucide icons: tent, flame, compass, map, mountain, tree, sun, moon, star, heart, flag, users, music, book, utensils, backpack, flashlight, binoculars, anchor, shield, award, crown, zap, cloud, snowflake, umbrella, fire, leaf, fish, and bird. Icons SHALL be displayed in a grid layout. A search/filter input SHALL allow filtering icons by name. Note: The Lucide icon name `flame` SHALL be used instead of `campfire` (which does not exist in Lucide).

#### Scenario: User selects an icon
- **WHEN** the user clicks on the "tent" icon
- **THEN** the icon picker SHALL highlight the selected icon and store the value `tent` in the wizard state

#### Scenario: User filters icons
- **WHEN** the user types "fl" in the icon filter input
- **THEN** the icon picker SHALL show only icons whose names contain "fl" (e.g., flame, flag, flashlight)

#### Scenario: Default icon
- **WHEN** the user does not select an icon
- **THEN** the wizard SHALL default to the icon `calendar`

### Requirement: Editable slug with auto-generation and uniqueness check
Step 1 SHALL include an editable slug field. The slug SHALL be auto-generated from the event name using lowercase, replacing spaces with hyphens, and removing special characters. The user SHALL be able to manually edit the slug. The system SHALL perform a debounced uniqueness check (500ms delay) against the backend API and display the result inline.

#### Scenario: Slug auto-generation
- **WHEN** the user types "Sommerlager 2026" as the event name
- **THEN** the slug field SHALL auto-populate with `sommerlager-2026`

#### Scenario: Slug uniqueness check passes
- **WHEN** the slug `sommerlager-2026` is checked and no other event uses it
- **THEN** the slug field SHALL display a green checkmark with "Verfügbar"

#### Scenario: Slug uniqueness check fails
- **WHEN** the slug `sommerlager-2026` is already taken by another event
- **THEN** the slug field SHALL display a red warning with "Dieser Slug ist bereits vergeben" and suggest alternatives like `sommerlager-2026-2`

#### Scenario: User manually edits slug
- **WHEN** the user changes the slug from `sommerlager-2026` to `sola-2026`
- **THEN** auto-generation from name SHALL stop and the manually entered slug SHALL be validated for uniqueness

### Requirement: Group selection and person invitation in step 2
Step 2 SHALL allow the user to select one or more groups to associate with the event. Upon selecting a group, the wizard SHALL display the group's members and allow the user to invite individuals immediately. Events without any group association SHALL also be supported.

#### Scenario: User selects a group
- **WHEN** the user selects group "Pfadfinder Stamm Adler"
- **THEN** the wizard SHALL display the group members list with checkboxes for individual invitation

#### Scenario: User invites group members
- **WHEN** the user checks 5 members from the group list and proceeds
- **THEN** the wizard state SHALL store these 5 members as invited persons

#### Scenario: Event without group
- **WHEN** the user skips step 2 or deselects all groups
- **THEN** the wizard SHALL allow the event to be created without any group association

### Requirement: Labels and Custom Fields creation in wizard
Step 6 SHALL allow the user to create new labels and custom fields directly within the wizard, without needing to navigate to separate settings pages. Labels SHALL support name and color. Custom fields SHALL support name, type (text, number, checkbox, select), and required flag.

#### Scenario: User creates a label in the wizard
- **WHEN** the user clicks "Neues Label erstellen" and enters name "Vegetarisch" with color green
- **THEN** the label SHALL be added to the wizard state and displayed in the labels list

#### Scenario: User creates a custom field in the wizard
- **WHEN** the user clicks "Neues Feld erstellen" and configures a field with name "T-Shirt Größe", type "select", options ["S", "M", "L", "XL"], and required = true
- **THEN** the custom field SHALL be added to the wizard state and previewed in the fields list

#### Scenario: User removes a label or field
- **WHEN** the user clicks the delete icon on a created label or custom field
- **THEN** the item SHALL be removed from the wizard state

### Requirement: State management via Zustand store
The wizard state SHALL be managed via a dedicated Zustand store (not URL parameters). The store file MUST be located at `frontend/src/store/eventWizardStore.ts` (using the `store/` directory, NOT `stores/`). The store SHALL persist state across step navigation within a single session. The store SHALL be cleared when the wizard is closed or the event is successfully created.

#### Scenario: State persists across steps
- **WHEN** the user fills in data on step 1, navigates to step 3, and returns to step 1
- **THEN** all previously entered data on step 1 SHALL still be present

#### Scenario: State cleared on wizard close
- **WHEN** the user navigates away from the wizard without completing it
- **THEN** the Zustand store SHALL be reset to its initial state

#### Scenario: State cleared on successful creation
- **WHEN** the user submits the wizard on step 8 and the event is successfully created
- **THEN** the Zustand store SHALL be cleared and the user SHALL be redirected to the new event's dashboard

### Requirement: Per-step validation with React Hook Form and Zod
Each wizard step SHALL use React Hook Form with a dedicated Zod schema for validation. The npm packages `react-hook-form` and `@hookform/resolvers` MUST be added as project dependencies. Validation SHALL run on form submission (advancing to next step) and display inline error messages in German. The step SHALL not advance if validation fails.

#### Scenario: Step 1 validation fails
- **WHEN** the user tries to advance from step 1 without entering an event name
- **THEN** the form SHALL display the error "Bitte gib einen Event-Namen ein" under the name field and remain on step 1

#### Scenario: Step 4 validation with date logic
- **WHEN** the user sets the registration end date before the registration start date
- **THEN** the form SHALL display the error "Das Ende der Anmeldung muss nach dem Beginn liegen"

#### Scenario: Valid step advances
- **WHEN** the user fills in all required fields on a step and clicks "Weiter"
- **THEN** the wizard SHALL advance to the next step

### Requirement: Summary step with review and submission
Step 8 "Zusammenfassung" SHALL display a read-only summary of all entered data organized by step. Each section SHALL include an "Bearbeiten" link to jump back to the respective step. The step SHALL include a "Event erstellen" button to submit the form. Upon successful submission, the user SHALL be redirected to the event dashboard.

#### Scenario: Summary displays all sections
- **WHEN** the user reaches step 8
- **THEN** the summary SHALL show sections for Grunddaten, Gruppe & Einladung, Datum & Ort, Anmeldung, Buchungsoptionen, Packliste & Felder, and Einladungstext with entered or default values

#### Scenario: User edits from summary
- **WHEN** the user clicks "Bearbeiten" next to the "Datum & Ort" section
- **THEN** the wizard SHALL navigate back to step 3 with all data preserved

#### Scenario: Successful event creation
- **WHEN** the user clicks "Event erstellen" on the summary step
- **THEN** the system SHALL send a POST request to the backend API, create the event with all configured data, and redirect to `/events/app/{slug}`

#### Scenario: Creation error handling
- **WHEN** the backend returns a validation error during event creation
- **THEN** the wizard SHALL display the error message in a toast notification and remain on the summary step

### Requirement: Mobile-first responsive layout
The wizard SHALL be designed mobile-first with a minimum supported width of 320px. The stepper navigation SHALL collapse to a compact format on mobile (showing only step number and name of current step). Form fields SHALL stack vertically on mobile. The color and icon pickers SHALL use a responsive grid.

#### Scenario: Wizard on mobile (320px)
- **WHEN** the wizard is displayed on a 320px wide screen
- **THEN** the stepper SHALL show only the current step indicator, form fields SHALL be full-width stacked, and the color picker SHALL display 5 swatches per row

#### Scenario: Wizard on desktop (1024px+)
- **WHEN** the wizard is displayed on a desktop screen
- **THEN** the stepper SHALL show all 8 step names in a horizontal bar, and form fields SHALL use a wider layout with side-by-side fields where appropriate

## Wizard Stepper

### Requirement: Wizard stepper icon visibility
The event creation wizard stepper SHALL display clearly visible step icons at all viewport sizes.

#### Scenario: Icons visible on mobile (320px)
- **WHEN** the user views the wizard stepper on a 320px viewport
- **THEN** each step SHALL display either a step number (inactive) or a Material Symbol icon (active/completed) in a circle of at least 40x40px
- **THEN** step labels SHALL be hidden on viewports below `sm` (640px)

#### Scenario: Icons visible on desktop
- **WHEN** the user views the wizard stepper on a desktop viewport (>= 640px)
- **THEN** each step SHALL display a Material Symbol icon in a circle of at least 48x48px
- **THEN** step labels SHALL be visible below each icon

#### Scenario: Active step highlight
- **WHEN** a step is the current active step
- **THEN** the step circle SHALL have a visible ring highlight (`ring-2 ring-primary`) in addition to the gradient background
- **THEN** the active step SHALL be visually distinguishable from completed and inactive steps

#### Scenario: Completed step appearance
- **WHEN** a step is completed (valid and before the current step)
- **THEN** the step circle SHALL display a check icon
- **THEN** the circle SHALL use the primary gradient background

#### Scenario: Step touch target
- **WHEN** the user taps a step circle on mobile
- **THEN** the touch target SHALL be at least 40x40px to meet accessibility guidelines
