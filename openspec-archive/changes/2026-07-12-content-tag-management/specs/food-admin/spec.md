## ADDED Requirements

### Requirement: Equipment Stammdaten-Tab

Der Admin-Bereich unter `/admin` SHALL einen neuen Tab "Equipment" enthalten, der zwischen "Abteilungen" und "Ernährungstags" in der Navigation erscheint. Der Tab SHALL eine CRUD-Tabelle für Equipment-Einträge (Topf, Pfanne, Ofen, etc.) anzeigen.

#### Scenario: Equipment-Tab sichtbar für Staff
- **WHEN** Staff-User die Admin-Seite öffnet
- **THEN** ist der "Equipment"-Tab in der Tab-Navigation sichtbar

#### Scenario: Equipment Tab-Navigation
- **WHEN** Staff-User auf den "Equipment"-Tab klickt
- **THEN** ändert sich die URL zu `/admin/equipment`
- **AND** die Equipment-CRUD-Tabelle wird angezeigt

### Requirement: Tag Stammdaten-Tab

Der Admin-Bereich unter `/admin` SHALL einen neuen Tab "Tags" enthalten, der zwischen "Ernährungstags" und "Regeln" in der Navigation erscheint. Der Tab SHALL eine CRUD-Tabelle für content.Tag-Einträge anzeigen.

#### Scenario: Tags-Tab sichtbar für Staff
- **WHEN** Staff-User die Admin-Seite öffnet
- **THEN** ist der "Tags"-Tab in der Tab-Navigation sichtbar

#### Scenario: Tags-Tab versteckt für Nicht-Staff
- **WHEN** ein Nicht-Staff-User die Admin-Seite aufruft (was zur Weiterleitung führt)
- **THEN** ist der Tags-Tab nicht erreichbar

#### Scenario: Tags Tab-Navigation
- **WHEN** Staff-User auf den "Tags"-Tab klickt
- **THEN** ändert sich die URL zu `/admin/tags`
- **AND** die Tag-CRUD-Tabelle wird angezeigt

### Requirement: Tag Detailseite in Admin

Das System SHALL für jeden Tag eine Detailseite unter `/admin/tag/{id}` bereitstellen. Die Seite SHALL die Tag-Details sowie Listen der verknüpften Rezepte und Zutaten anzeigen.

#### Scenario: Zur Detailseite navigieren
- **WHEN** Staff-User in der Tag-Tabelle auf einen Tag-Namen klickt
- **THEN** wird `/admin/tag/{id}` geöffnet
- **AND** die Seite zeigt den Tag-Namen, Slug, Beschreibung, Gruppe und Icon an
- **AND** die Seite zeigt Listen der verknüpften Rezepte und Zutaten

#### Scenario: Anzeige der Rezept-Zählung
- **WHEN** ein Tag von 12 Rezepten verwendet wird
- **THEN** zeigt die Detailseite "12 Rezepte" mit einer paginierten Liste der Rezepte

#### Scenario: Anzeige der Zutaten-Zählung
- **WHEN** ein Tag von 5 Zutaten verwendet wird
- **THEN** zeigt die Detailseite "5 Zutaten" mit einer paginierten Liste der Zutaten

## REMOVED Requirements

### Requirement: Frühstückstage-Tab im Admin

**Reason**: Der Frühstückstage-Tab basierte auf einem Missverständnis ("Tags" wurden mit "Tagen" verwechselt). Die gesamte Frühstückstage-Funktionalität wird entfernt.

**Migration**: Der "Frühstückstage"-Tab in AdminPage.tsx wird durch den "Tags"-Tab ersetzt. BreakfastDayManager.tsx wird gelöscht. Die Backend-API `/api/supply/breakfast-days/` wird gelöscht. Bestehende breakfast_day-Tags bleiben in der Datenbank (können über den neuen Tags-Tab gelöscht werden).
