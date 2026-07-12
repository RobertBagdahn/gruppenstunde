## ADDED Requirements

### Requirement: Tag CRUD im Admin Stammdaten

Das System SHALL Staff-Usern erlauben, Tags (content.models.Tag) im Admin-Bereich unter `/admin/tags` zu erstellen, bearbeiten und löschen. Die Verwaltung SHALL dem bestehenden Stammdaten-Pattern folgen (Tabelle mit Pencil/Trash-Actions, Dialog für Create/Edit).

#### Scenario: Tags auflisten
- **WHEN** Staff-User den "Tags"-Tab im Admin öffnet
- **THEN** werden alle Tags in einer Tabelle mit Spalten für Name, Slug (read-only, auto-generiert), Beschreibung, Gruppe, Parent und Icon angezeigt
- **AND** die Tabelle folgt dem Card-Table-Pattern mit Border und Hover-Zeilen

#### Scenario: Tag erstellen
- **WHEN** Staff-User auf "Neu" klickt und Name, Beschreibung, Gruppe, Icon, optional Parent-Tag eingibt
- **THEN** wird ein neuer Tag erstellt (Slug wird automatisch aus Name generiert) und in der Tabelle angezeigt

#### Scenario: Tag bearbeiten
- **WHEN** Staff-User die Bearbeiten-Aktion eines Tags wählt
- **THEN** öffnet sich ein Dialog mit den aktuellen Werten (Slug ist read-only), der nach Speichern die Änderungen persistiert

#### Scenario: Tag löschen
- **WHEN** Staff-User die Löschen-Aktion eines Tags wählt und bestätigt
- **THEN** wird der Tag entfernt (Cascade: alle M2M-Verknüpfungen werden gelöst)

#### Scenario: Nicht-Staff abweisen
- **WHEN** ein nicht-authentifizierter oder nicht-Staff User die Admin-Tag-API aufruft
- **THEN** wird ein 403-Fehler zurückgegeben

### Requirement: Tag Detailseite mit verknüpften Einträgen

Das System SHALL für jeden Tag eine Detailseite unter `/admin/tag/{id}` (Singular) bereitstellen, die alle Rezepte und Zutaten anzeigt, die diesen Tag verwenden. Der Zugriff SHALL Staff-only sein.

#### Scenario: Verknüpfte Rezepte anzeigen
- **WHEN** Staff-User die Detailseite eines Tags aufruft
- **THEN** wird eine Liste aller Rezepte mit diesem Tag angezeigt (Titel + Link)
- **AND** die Liste ist paginiert

#### Scenario: Verknüpfte Zutaten anzeigen
- **WHEN** Staff-User die Detailseite eines Tags aufruft
- **THEN** wird eine Liste aller Zutaten mit diesem Tag angezeigt (Name + Link)
- **AND** die Liste ist paginiert

#### Scenario: Tag ohne Verknüpfungen
- **WHEN** ein Tag von keinen Rezepten und keinen Zutaten verwendet wird
- **THEN** zeigt die Detailseite "Keine Einträge gefunden" für beide Listen

#### Scenario: Navigation zur Detailseite
- **WHEN** Staff-User in der Tag-Tabelle auf den Tag-Namen oder einen Detail-Button klickt
- **THEN** wird die Detailseite `/admin/tag/{id}` geöffnet

### Requirement: Tag Admin Backend-API

Das System SHALL eine Admin-API unter `/api/admin/tags/` für Tag-CRUD und `/api/admin/tags/{id}/detail/` für die Detailansicht bereitstellen. Alle Endpunkte sind Staff-only.

#### Scenario: Tags mit Paginierung listen
- **WHEN** Staff-User `GET /api/admin/tags/?page=1&page_size=20` aufruft
- **THEN** werden Tags im Standard-Paginierungsformat `{items, total, page, page_size, total_pages}` zurückgegeben

#### Scenario: Tag erstellen (API)
- **WHEN** Staff-User `POST /api/admin/tags/` mit `{name, description, group, icon, parent_id}` aufruft (slug wird serverseitig generiert)
- **THEN** wird ein neuer Tag erstellt und mit Status 201 zurückgegeben

#### Scenario: Tag aktualisieren (API)
- **WHEN** Staff-User `PATCH /api/admin/tags/{id}/` mit `{name: "Neuer Name"}` aufruft
- **THEN** wird der Tag aktualisiert und zurückgegeben

#### Scenario: Tag löschen (API)
- **WHEN** Staff-User `DELETE /api/admin/tags/{id}/` aufruft
- **THEN** wird der Tag gelöscht und Status 204 zurückgegeben

#### Scenario: Tag-Detail (API)
- **WHEN** Staff-User `GET /api/admin/tags/{id}/detail/` aufruft
- **THEN** wird `{tag: {...}, recipes: [{id, title, slug}, ...], ingredients: [{id, name, slug}, ...]}` zurückgegeben
