## MODIFIED Requirements

### Requirement: Bereinigte MeasuringUnit-Referenzdaten
Das System SHALL die kanonischen MeasuringUnits mit korrekten Typen und Umrechnungsfaktoren bereitstellen. Die Portions-KI SHALL diese Referenzdaten nutzen und darf keine stückartige Einheit als Gramm behandeln, wenn eine echte kanonische Zuordnung vorhanden ist.

#### Scenario: Gramm als Basis-Masseneinheit
- **WHEN** die MeasuringUnit „Gramm" abgefragt wird
- **THEN** SHALL `unit` `"g"` sein und `quantity` `1.0`

#### Scenario: Stückartige KI-Antwort wird aufgelöst
- **WHEN** die KI einen stückartigen Einheitentext liefert
- **THEN** SHALL die Auflösung eine vorhandene kanonische Einheit oder die etablierte named-portion-Grammbasis verwenden
- **THEN** SHALL kein unbekannter Datensatz angelegt werden

### Requirement: KI-Knowledge referenziert nur existierende MeasuringUnits
Die KI-Wissensbasis und der Portions-Zauberstab SHALL nur kanonische oder deterministisch auflösbare Einheiten verwenden. Phantomnamen und nicht vorhandene Einheiten dürfen nicht als gültige Apply-Operationen zurückgegeben werden.

#### Scenario: Keine Phantom-Einheit in einer KI-Antwort
- **WHEN** Gemini einen nicht vorhandenen Einheitennamen liefert
- **THEN** SHALL die Antwort validiert und als ungültig markiert oder verworfen werden
- **THEN** SHALL keine Portion mit dieser Einheit gespeichert werden
