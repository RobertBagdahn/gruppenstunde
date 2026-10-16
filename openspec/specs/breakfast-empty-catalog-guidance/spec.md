# breakfast-empty-catalog-guidance Specification

## Purpose
Anforderungen an breakfast empty catalog guidance: Leerer Frühstückskatalog stoppt den Assistenten.
## Requirements
### Requirement: Leerer Frühstückskatalog stoppt den Assistenten
Der Frühstücksassistent SHALL bei einem Schritt ohne verfügbare Katalog-Zutaten eine klare Meldung mit Abbruch- oder Rückweg anzeigen und MUST NOT weitere Schritte zulassen, die ohne Auswahl sinnlos sind.

#### Scenario: Keine Basis-Zutaten
- **WHEN** der Nutzer die Variante „Nur Müsli“ wählt und der Katalog keine Basis-Zutaten enthält
- **THEN** zeigt der Assistent „Keine Basis-Zutaten verfügbar“ mit Hinweis und Zurück-/Abbrechen-Aktion
- **AND** „Weiter“ ist nicht verfügbar
