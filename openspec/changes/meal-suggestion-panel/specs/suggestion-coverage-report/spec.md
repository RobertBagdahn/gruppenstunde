## ADDED Requirements

### Requirement: Coverage report
Ein Management-Command `report_suggestion_coverage` SHALL für jede Kombination aus Meal-Typ × Richtung × Einzelfilter die Trefferzahl berechnen, Kombinationen mit weniger als 4 Treffern als Lücke markieren und einen Seed-Backlog als Markdown oder JSON ausgeben.

#### Scenario: Gap flagged
- **WHEN** für Getränke × Fertiggetränk nur 2 Treffer existieren
- **THEN** erscheint die Kombination als Lücke mit Trefferzahl 2

### Requirement: Minimum coverage test
Ein automatisierter Test SHALL für Test-Fixtures eine Mindestabdeckung je Meal-Typ und Richtung prüfen.

#### Scenario: Test fails on empty direction
- **WHEN** eine Richtung im Fixture-Datensatz 0 Treffer hat
- **THEN** schlägt der Test fehl und nennt Meal-Typ und Richtung
