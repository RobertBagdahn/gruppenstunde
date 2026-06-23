## ADDED Requirements

### Requirement: Vegan/Vegetarisch-Filter in der Mahlzeiten-Rezeptsuche

Die Rezeptsuche beim Hinzufügen eines Rezepts zu einer Mahlzeit SHALL Filter für Ernährungseigenschaften enthalten.

#### Scenario: Vegan-Filter aktiv

- **WHEN** der Nutzer den Filter „vegan" in der Mahlzeiten-Rezeptsuche aktiviert
- **THEN** werden nur Rezepte angezeigt deren `nutritional_tags` „vegan" enthält

#### Scenario: Vegetarisch-Filter aktiv

- **WHEN** der Nutzer den Filter „vegetarisch" in der Mahlzeiten-Rezeptsuche aktiviert
- **THEN** werden nur Rezepte angezeigt deren `nutritional_tags` „vegetarisch" oder „vegan" enthält

#### Scenario: Mehrere Filter kombinierbar

- **WHEN** der Nutzer „glutenfrei" und „vegetarisch" kombiniert
- **THEN** werden nur Rezepte angezeigt die beide Tags haben

#### Scenario: Filter-Label spricht Deutsch

- **WHEN** die Filter-Optionen angezeigt werden
- **THEN** sind die Labels: „Vegan", „Vegetarisch", „Laktosefrei", „Glutenfrei"
- **THEN** gibt es keinen Filter namens „Diät" (umbenennen zu „Ernährungsweise" oder als Eigenschafts-Filter)
