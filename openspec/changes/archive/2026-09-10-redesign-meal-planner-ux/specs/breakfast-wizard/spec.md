## MODIFIED Requirements

### Requirement: Verteilungen und Streichfett

Der Wizard SHALL den 1-Screen-Baukasten als Standard-Planungsoberfläche anbieten und die 6-Schritte-Aufteilung (`basis, fett, belag, extras, getraenke, cockpit`) als optionalen Expertenmodus für Feinjustierungen vorhalten. Basis-, Belag- und Fettanteile ergeben im Expertenmodus zusammen je 100 %. Basis und Fett werden mit Gramm, kcal und Kosten angezeigt und als MealItems gespeichert.

#### Scenario: Standardmäßiger 1-Screen-Einstieg
- **WHEN** der Frühstücks-Assistent geöffnet wird
- **THEN** erscheint der 1-Screen-Baukasten mit den 4 Hauptkategorien
- **AND** der 6-Schritte-Modus kann über den Experten-Schalter aktiviert werden

#### Scenario: Sechs Schritte
- **WHEN** der Expertenmodus des Wizards geöffnet wird
- **THEN** erscheinen Basis, Fett, Belag, Extras, Getränke und Cockpit in dieser Reihenfolge
