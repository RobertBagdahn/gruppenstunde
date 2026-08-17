## MODIFIED Requirements

### Requirement: Konsistente Umlaut-Verwendung

Alle deutschen Texte in der Codebase MÜSSEN korrekte Umlaute verwenden.

#### Scenario: UI-Labels und Fehlermeldungen
- **WHEN** ein deutscher Text in einem UI-Label, Button, Tooltip oder einer Fehlermeldung angezeigt wird
- **THEN** MUSS er korrekte Umlaute verwenden: ä (nicht ae), ö (nicht oe), ü (nicht ue), ß (nicht ss, wo grammatikalisch korrekt)

#### Scenario: Seed-Daten
- **WHEN** deutsche Texte in Seed-Daten (Rezeptnamen, Zutatennamen, Beschreibungen) verwendet werden
- **THEN** MÜSSEN sie korrekte Umlaute verwenden

#### Scenario: Backend-Strings
- **WHEN** deutsche Texte in Python-Strings (Fehlermeldungen, Labels, Descriptions) verwendet werden
- **THEN** MÜSSEN sie korrekte Umlaute verwenden
- **THEN** DÜRFEN englische Variablennamen, Funktionsnamen und Kommentare NICHT geändert werden
