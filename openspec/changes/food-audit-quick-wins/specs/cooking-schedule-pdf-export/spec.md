## MODIFIED Requirements

### Requirement: Kosten im Kochplan-PDF
Das Kochplan-PDF MUST gecachte Preise als konsistenten numerischen Wert verarbeiten, bevor Float-basierte Skalierungen und Formatierungen angewendet werden.

#### Scenario: Decimal-Cachewert
- **WHEN** ein Rezept einen gespeicherten Decimal-Cachepreis besitzt
- **THEN** wird sein Preis im Kochplan-PDF korrekt skaliert und formatiert, ohne Typfehler.
