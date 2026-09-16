## ADDED Requirements

### Requirement: Kostenübersicht mit Preisabdeckung
Meal-Plan-Kosten SHALL nur bestätigte positive Zutatenpreise verwenden und die Preisabdeckung über alle aktiven Zutaten transparent ausgeben.

#### Scenario: KI-Preis noch ausstehend
- **WHEN** eine Zutat nur einen pending KI-Preisvorschlag besitzt
- **THEN** SHALL sie als unbepreist gelten
- **THEN** SHALL der Meal-Plan keinen unbestätigten Preis in Summen verwenden

#### Scenario: Preis nach Bestätigung
- **WHEN** der Preisvorschlag bestätigt wurde
- **THEN** SHALL die Kostenberechnung den globalen Preis verwenden
- **THEN** SHALL die Preisabdeckung aktualisiert erscheinen
