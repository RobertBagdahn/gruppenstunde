## MODIFIED Requirements

### Requirement: Seed Data

Das System MUSS Seed-Daten für gängige deutsche Küchenumrechnungen enthalten (EL zu g, TL zu ml, Tasse zu ml, Prise zu g, etc.), die mit den korrigierten MeasuringUnit-Typen konsistent sind.

#### Scenario: Seed data available after migration
- **WHEN** die Data-Migration angewendet wurde
- **THEN** SHALL das System Standard-Umrechnungen für EL (15 ml→g), TL (5 ml→g), Tasse (250 ml→g), Prise, Messerspitze enthalten
- **AND** die Umrechnungen SHALL mit den korrigierten MeasuringUnit-Typen (`unit="ml"` für EL/TL/Tasse) konsistent sein

## REMOVED Requirements

### Requirement: Fehlende Küchenmaßeinheiten

**Reason**: „Handvoll" und „Tropfen" wurden nie als MeasuringUnit angelegt und passen nicht in das bereinigte System (Handvoll ist eine Formbeschreibung, Tropfen ist extrem spezifisch mit vernachlässigbarem Nutzen).

**Migration**: Keine — die Einheiten existierten nie in der DB. Der entsprechende Seed-Data-Code wird entfernt.
