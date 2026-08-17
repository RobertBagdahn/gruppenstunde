## ADDED Requirements

### Requirement: Eigener Einheitentyp für zählbare Einheiten
Das System SHALL einen Einheitentyp `PIECE` für zählbare Einheiten (z.B. „Stück", „Packung") bereitstellen. Die System-Einheiten „Stück" und „Packung" SHALL mit diesem Typ angelegt werden und NICHT als Masse (`g`) getarnt sein.

#### Scenario: Stück-Einheit hat Piece-Typ
- **WHEN** die System-Einheit „Stück" abgefragt wird
- **THEN** SHALL ihr Einheitentyp `PIECE` sein und NICHT `MASS`

#### Scenario: Migration bestehender Stück-Einheiten
- **WHEN** die Migration angewendet wird
- **THEN** SHALL bestehende „Stück"- und „Packung"-Einheiten auf den Typ `PIECE` umgestellt werden

### Requirement: Zuverlässiger Quellen-Filter bei Umrechnungen
Das System SHALL nur echte Masse-/Volumen-Einheiten (`g`/`ml`) als Quelle einer Mengenumrechnung zulassen. Zählbare Einheiten (`PIECE`) SHALL nicht als Umrechnungsquelle dienen.

#### Scenario: Piece-Einheit nicht als Quelle
- **WHEN** eine Umrechnung mit einer `PIECE`-Einheit als Quelle angefragt wird
- **THEN** SHALL das System keine Gramm-Umrechnung aus dieser Quelle durchführen

### Requirement: Korrekte Gramm bei Stück→Gramm
Das System SHALL Stück→Gramm über genau eine Skalierungsquelle berechnen, sodass keine Doppelskalierung (`Portion.weight_g` zusätzlich zum Umrechnungsfaktor) entsteht.

#### Scenario: Stück mit bekanntem Gewicht
- **WHEN** eine Portion „1 Stück" mit 150 g hinterlegt ist und 2 Stück angezeigt/umgerechnet werden
- **THEN** SHALL das Ergebnis 300 g sein
- **AND** SHALL NICHT ein doppelt skalierter Wert (z.B. 150 × 150) entstehen

### Requirement: Korrektes Symbol für Stück-/Verpackungsnamen
Das System SHALL bei der natürlichen Portions-Darstellung kein falsches „x"-Symbol voranstellen, wenn der Portionsname eine Stück-/Verpackungsangabe ist — auch bei zusammengesetzten Namen wie „Stück (150g)".

#### Scenario: Stück ohne x-Symbol
- **WHEN** eine Portion mit Namen „Stück (150g)" angezeigt wird
- **THEN** SHALL kein vorangestelltes „x" im angezeigten Symbol erscheinen

#### Scenario: Mehrere Stück
- **WHEN** 3 Stück eines Artikels in der Einkaufsliste angezeigt werden
- **THEN** SHALL die Darstellung eine korrekte Stück-Angabe ohne falsches „x"-Symbol zeigen
