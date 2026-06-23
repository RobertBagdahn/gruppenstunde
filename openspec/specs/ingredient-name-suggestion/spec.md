## ADDED Requirements

### Requirement: AI suggests improved ingredient name
The `suggest_all_fields` endpoint SHALL return a `name_suggestion` field with a more specific, disambiguated ingredient name. The suggestion SHALL NOT contain brand names, quantity/weight specifications, or marketing language. It SHALL include distinguishing characteristics (e.g. fat percentage, variety, processing form).

#### Scenario: AI suggests more specific name
- **WHEN** `POST /api/ingredients/{slug}/ai-suggest-all/` is called for an ingredient named "Milch"
- **THEN** the response SHALL include `name_suggestion: "Kuhmilch 3,5% Fett"`
- **THEN** the suggestion SHALL NOT contain brands like "Weihenstephan" or quantities like "1 Liter"

#### Scenario: AI has no better name
- **WHEN** the ingredient name is already specific and undisambiguated (e.g. "Rinderhackfleisch")
- **THEN** `name_suggestion` SHALL be null

#### Scenario: AI suggestion for generic name gets disambiguated
- **WHEN** `POST /api/ingredients/{slug}/ai-suggest-all/` is called for "Mehl"
- **THEN** the response SHALL include `name_suggestion` like "Weizenmehl Type 405" (variety + specification, not brand)

### Requirement: Name suggestion displayed in AI dialog
The `AiSuggestDialog` in the ingredient detail page SHALL display the name suggestion as a prominent field comparing the current name with the suggested name.

#### Scenario: Name suggestion shown in dialog
- **WHEN** the AI returns a `name_suggestion` that differs from `ingredient.name`
- **THEN** the dialog SHALL display a row showing ~~current name~~ → suggested name
- **THEN** the name suggestion SHALL be in its own "Name" group at the top of the dialog

#### Scenario: No name suggestion available
- **WHEN** `name_suggestion` is null or equals the current name
- **THEN** the name suggestion field SHALL NOT be displayed in the dialog

### Requirement: User can apply name suggestion
The `handleApplyAiSuggestions` function SHALL process the `name_suggestion` key and update the ingredient name via `PATCH /api/ingredients/{slug}/`.

#### Scenario: User applies name suggestion
- **WHEN** the user checks the name suggestion checkbox and clicks "Ausgewählte übernehmen"
- **THEN** the ingredient name SHALL be updated to the suggested value via PATCH
- **THEN** the slug SHALL be regenerated from the new name (automatic via model save)

#### Scenario: User rejects name suggestion
- **WHEN** the user does NOT check the name suggestion checkbox
- **THEN** the ingredient name SHALL remain unchanged

### Requirement: Name suggestion in Gemini prompt
The `suggest_all_fields` prompt SHALL instruct Gemini to suggest a better name if the current name is too generic.

#### Scenario: Prompt includes name suggestion instructions
- **WHEN** the Gemini prompt is constructed for an ingredient
- **THEN** it SHALL include instructions like: "Falls der aktuelle Name zu generisch ist, schlage einen spezifischeren Namen vor. Keine Marken, keine Mengenangaben. Nicht nur 'Milch' sondern 'Kuhmilch 3,5% Fett'."

### Requirement: AI schlägt spezifische Zutatenname mit Zustandsform vor

Der `suggest_all_fields` Endpunkt SHALL immer eine Zustandsform als Teil des `name_suggestion` Feldes liefern. Generische Namen ohne Zustandsform DÜRFEN NICHT vorgeschlagen werden. Die Zustandsform beschreibt den Verarbeitungszustand (frisch, getrocknet, TK, aus der Dose, gemahlen etc.).

#### Scenario: AI schlägt spezifischen Namen vor

- **WHEN** `POST /api/ingredients/{slug}/ai-suggest-all/` für eine Zutat namens „Erdbeere" aufgerufen wird
- **THEN** enthält die Antwort `name_suggestion: "Erdbeere frisch"` oder `"Erdbeere TK"`
- **THEN** enthält die Antwort NICHT `name_suggestion: "Erdbeere"` (zu generisch)

#### Scenario: Kein „und" im Zutatenname

- **WHEN** der AI-Import ein Rezept verarbeitet
- **THEN** enthält kein Zutatname das Wort „und" (z.B. „Salz und Pfeffer" ist verboten)
- **THEN** werden „Salz und Pfeffer" als separate Zutaten oder gar nicht importiert

#### Scenario: Spezifische Pasta-Bezeichnung

- **WHEN** ein Rezept die Zutat „Nudeln" enthält
- **THEN** schlägt die AI eine spezifische Form vor: z.B. „Fusilli trocken", „Spaghetti trocken", „Penne trocken"
