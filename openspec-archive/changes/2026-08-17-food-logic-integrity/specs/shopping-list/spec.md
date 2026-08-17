## MODIFIED Requirements

### Requirement: Aktive Gewichtsauflösung

Direkt- und Rezeptzutaten SHALL denselben kanonischen Gewichts-Helper verwenden. Soft-gelöschte
Portionen und Packungen sind keine Fallbacks; fehlendes gültiges Gewicht darf nicht als
`measuring_unit.quantity` interpretiert werden. Details zur gemeinsamen Berechnung stehen in
`food-calculation-consistency`.

#### Scenario: Gelöschte Portion wird ignoriert
- **WHEN** die bevorzugte Portion soft-gelöscht ist
- **THEN** verwendet die Einkaufsliste keine gelöschte Portion als Fallback
