## MODIFIED Requirements

### Requirement: Portion-Deduplizierung pro Zutat

Innerhalb einer Zutat MUST das System Portionen über alle Erzeugungspfade hinweg über `(ingredient, name, measuring_unit, quantity)` eindeutig halten. Ein abweichendes `weight_g` DARF eine referenzierte Portion nicht verändern; dafür MUSS eine neue Portion angelegt werden.

#### Scenario: URL-Import legt keine Duplikat-Portion an
- **WHEN** der URL-Import eine identische Portion erzeugen will
- **THEN** MUSS die bestehende Portion wiederverwendet werden

#### Scenario: Referenzierte Portion mit anderem Gewicht
- **WHEN** der URL-Import dieselbe fachliche Portion mit abweichendem Gewicht findet und die alte Portion referenziert ist
- **THEN** bleibt das Gewicht der alten Portion unverändert
- **THEN** wird eine separate Portion für das neue Gewicht verwendet oder angelegt
