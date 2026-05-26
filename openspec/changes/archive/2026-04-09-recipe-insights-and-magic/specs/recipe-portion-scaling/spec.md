## MODIFIED Requirements

### Requirement: Portions-Skalierung mit Magic-Button-Integration

Die bestehende Portions-Skalierung MUSS mit dem Magic-Button-System integriert werden, sodass die Normalisierungs-Funktion den gleichen Zustand-Store nutzt.

#### Scenario: Skalierung über PortionScaler
- **WHEN** ein User den PortionScaler nutzt um die Portionenzahl zu ändern
- **THEN** MÜSSEN die Zutatmengen proportional skaliert werden
- **THEN** MUSS die Änderung im gleichen Zustand-Store wie Magic-Button-Änderungen gespeichert werden
- **THEN** MUSS die Skalierung als eigenständige Modification im Änderungs-Log erscheinen

#### Scenario: Skalierung nach Magic-Button-Änderung
- **WHEN** ein User zuerst eine Magic-Button-Änderung (z.B. Zutat hinzufügen) und dann eine Portions-Skalierung vornimmt
- **THEN** MUSS die Skalierung auf den modifizierten Mengen basieren (nicht den Originalmengen)
- **THEN** MUSS das System beide Änderungen korrekt nacheinander anwenden

#### Scenario: Auto-Normalisierung
- **WHEN** das System erkennt, dass eine Portion zu groß ist (>150% DGE-Referenz)
- **THEN** MUSS es den bestehenden PortionScaler nutzen um den Normalisierungsfaktor anzuwenden
- **THEN** MUSS der PortionScaler-Wert auf 1 gesetzt werden nach der Normalisierung
