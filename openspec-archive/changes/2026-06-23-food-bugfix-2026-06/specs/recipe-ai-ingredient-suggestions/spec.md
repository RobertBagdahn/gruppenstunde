## MODIFIED Requirements

### Requirement: Bereits enthaltene Zutaten aus AI-Vorschlägen ausschließen

Die AI-Zutaten-Vorschläge SHALL keine Zutaten vorschlagen die bereits im Rezept enthalten sind. Das Matching berücksichtigt Singular/Plural-Varianten über die Synonymtabelle.

#### Scenario: Vorhandene Zutat erscheint nicht im Vorschlag

- **WHEN** ein Rezept bereits „Zwiebel" als Zutat enthält
- **AND** die AI Zutaten-Vorschläge generiert
- **THEN** erscheint „Zwiebeln" NICHT in den Vorschlägen
- **THEN** erscheint „Zwiebel" NICHT in den Vorschlägen

#### Scenario: Singular/Plural-Matching über Synonymtabelle

- **WHEN** die Synonymtabelle „Zwiebeln" als Synonym von „Zwiebel" enthält
- **THEN** werden beide Formen beim Ausschluss als identisch behandelt

#### Scenario: Spezifische vs. generische Zutaten

- **WHEN** ein Rezept „Fusilli trocken" enthält
- **THEN** erscheint „Nudeln" in den Vorschlägen als neuer (anderer) Begriff
- **WHEN** ein Rezept „Nudeln" enthält (generisch)
- **THEN** erscheinen spezifische Formen wie „Fusilli trocken" weiterhin als Vorschlag
