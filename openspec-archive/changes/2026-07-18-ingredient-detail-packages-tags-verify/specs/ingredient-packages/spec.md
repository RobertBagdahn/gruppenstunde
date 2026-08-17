## ADDED Requirements

### Requirement: Package list on ingredient detail
Die Zutatendetailseite SHALL eine Sektion "Packungen" anzeigen, die alle Packages der Zutat auflistet und CRUD-Operationen erlaubt.

#### Scenario: Packages are displayed
- **WHEN** ein Nutzer die Zutatendetailseite öffnet
- **THEN** werden alle Packages der Zutat mit Name, Gewicht und Rang angezeigt

#### Scenario: Add package
- **WHEN** ein berechtigter Nutzer auf "Packung hinzufügen" klickt und Name + Gewicht eingibt
- **THEN** wird die Packung erstellt und in der Liste angezeigt

#### Scenario: Edit package
- **WHEN** ein berechtigter Nutzer eine bestehende Packung bearbeitet
- **THEN** werden die Änderungen gespeichert und sofort angezeigt

#### Scenario: Delete package
- **WHEN** ein berechtigter Nutzer eine Packung löscht
- **THEN** wird sie aus der Liste entfernt (Soft-Delete)

#### Scenario: Reorder packages via drag and drop
- **WHEN** ein berechtigter Nutzer Packungen per Drag&Drop umsortiert
- **THEN** wird die neue Reihenfolge gespeichert

#### Scenario: No packages state
- **WHEN** eine Zutat keine Packages hat
- **THEN** wird ein Hinweis "Keine Packungen definiert" angezeigt
