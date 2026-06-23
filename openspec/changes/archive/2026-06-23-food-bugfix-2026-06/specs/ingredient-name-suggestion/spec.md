## MODIFIED Requirements

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
