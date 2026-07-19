## MODIFIED Requirements

### Requirement: Zutat ohne konvertierbare Einheit

Das System MUSS bei einer Zutat mit nicht-konvertierbarer Einheit KEINEN Umschalter anzeigen.

#### Scenario: Zutat ohne konvertierbare Einheit
- **WHEN** eine Zutat eine nicht-konvertierbare Einheit hat (weder `unit="g"` noch `unit="ml"`)
- **THEN** DARF kein Umschalter-Button angezeigt werden
