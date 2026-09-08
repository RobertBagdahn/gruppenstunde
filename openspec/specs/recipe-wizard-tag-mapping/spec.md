# Spec: Recipe Wizard Tag Mapping

Dual-sided Tag-Auflösung und -Zuordnung für den RecipeWizard.

## Purpose
Sichert die persistente und fehlerfreie Zuordnung von Tags während der mehrschrittigen Rezept-Erstellung und -Bearbeitung.

## Requirements

### Requirement: Dual-Sided Tag Robustness im RecipeWizard
Das System SHALL sicherstellen, dass bei der Rezepterstellung im Wizard ausgewählte Tags zuverlässig persistiert werden. Tag-Bezeichner SHALL durchgängig als Zeichenketten übertragen werden, da `Tag.id` ein UUID-Feld ist. Das Pydantic-Antwortschema und das Zod-Schema im Food-Frontend MUST für Tag-Bezeichner typgleich sein. Das Backend SHALL tolerant sowohl UUIDs als auch Tag-Slugs akzeptieren und auflösen.

#### Scenario: Tag-Auswahl und Speichern im Wizard
- **GIVEN** ein Nutzer wählt im Wizard Tags über den `TagMultiSelect` aus
- **WHEN** der Wizard zum nächsten Schritt wechselt oder das Rezept gespeichert wird
- **THEN** SHALL das Backend alle angegebenen Tags auflösen und mit dem Rezept verknüpfen, ohne einen Validierungsfehler oder HTTP 500 auszulösen

#### Scenario: Tag-Bezeichner in der Analyse-Antwort
- **GIVEN** die Smart-Eingabe-Analyse liefert Tag-Bezeichner
- **WHEN** das Frontend die Antwort validiert
- **THEN** SHALL die Validierung Zeichenketten erwarten
- **AND** SHALL die Validierung erfolgreich sein

#### Scenario: Antwort mit mindestens einem Tag
- **GIVEN** die Analyse-Antwort enthält mindestens einen Tag
- **WHEN** das Frontend die Antwort verarbeitet
- **THEN** SHALL kein Validierungsfehler auftreten
- **AND** SHALL keine Fehlermeldung angezeigt werden

#### Scenario: Antwort ohne Tags
- **GIVEN** die Analyse-Antwort enthält keine Tags
- **WHEN** das Frontend die Antwort verarbeitet
- **THEN** SHALL eine leere Tag-Liste verwendet werden
- **AND** SHALL kein Fehler auftreten

### Requirement: Vertragstest für Tag-Bezeichner
Die Testsuite SHALL einen Vertragstest enthalten, der eine aus dem Backend-Schema abgeleitete Beispielantwort mit Tag-Bezeichnern gegen das Zod-Schema prüft.

#### Scenario: Vertragstest schlägt bei Typabweichung fehl
- **WHEN** der Typ der Tag-Bezeichner zwischen Backend und Frontend divergiert
- **THEN** SHALL der Vertragstest fehlschlagen

#### Scenario: Vertragstest bestätigt Synchronität
- **WHEN** Backend- und Frontend-Schema für Tag-Bezeichner typgleich sind
- **THEN** SHALL der Vertragstest erfolgreich sein
