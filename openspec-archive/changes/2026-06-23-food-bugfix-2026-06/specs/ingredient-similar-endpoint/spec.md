## MODIFIED Requirements

### Requirement: Ähnlichkeitsschwelle verhindert falsche Duplikat-Vorschläge

Die vektorbasierte Duplikaterkennung für Zutaten SHALL eine höhere Ähnlichkeitsschwelle verwenden, um falsche Positiv-Treffer zu vermeiden. Verschiedene Fleischstücke (z.B. Schweinebauch vs. Schweinenacken) DÜRFEN NICHT als Duplikate vorgeschlagen werden. Kein Auto-Merge — alle Vorschläge erfordern manuelle Bestätigung.

#### Scenario: Verschiedene Fleischstücke werden nicht zusammengelegt

- **WHEN** die Ähnlichkeitsanalyse ausgeführt wird
- **THEN** erscheinen „Schweinebauch" und „Schweinenacken" NICHT als Duplikat-Vorschlag
- **THEN** erscheinen „Zwiebeln rot" und „Rote Zwiebeln" als Duplikat-Vorschlag (gleiche Zutat, anderer Name)

#### Scenario: Manueller Bestätigungsschritt vor Zusammenführen

- **WHEN** der Nutzer zwei Zutaten zusammenführen möchte
- **THEN** erscheint ein Bestätigungsdialog: „Welche Zutat ist das Hauptrezept, welche wird zusammengeführt?"
- **THEN** erfolgt kein automatisches Zusammenführen ohne Bestätigung

#### Scenario: API-Fehler wird korrekt angezeigt

- **WHEN** der Ähnlichkeits-Endpunkt einen Fehler zurückgibt
- **THEN** zeigt die Datenqualitäts-Seite einen Fehlerstate mit Meldung statt eines leeren weißen Screens

## ADDED Requirements

### Requirement: Ähnliche Rezepte in der Datenqualitäts-Ansicht

Das System SHALL auf der Datenqualitäts-Seite eine Ansicht für semantisch ähnliche Rezepte bereitstellen — analog zur bestehenden Ansicht für ähnliche Zutaten.

#### Scenario: Ähnliche Rezepte werden gefunden

- **WHEN** die Ähnlichkeitsanalyse für Rezepte ausgeführt wird
- **THEN** werden Rezeptpaare mit hoher semantischer Ähnlichkeit aufgelistet (z.B. „Nudeln mit Tomatensoße" ≈ „Pasta Bolognese")

#### Scenario: Rezepte zusammenlegen

- **WHEN** der Admin zwei ähnliche Rezepte zusammenlegen möchte
- **THEN** gibt es einen „Zusammenlegen"-Button mit Bestätigungsdialog
- **THEN** der Dialog fragt: welches Rezept ist das Hauptrezept, welches wird als Alias markiert oder gelöscht
