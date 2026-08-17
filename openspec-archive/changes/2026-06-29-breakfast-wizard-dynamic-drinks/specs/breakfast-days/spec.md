## ADDED Requirements

### Requirement: Frühstückstag-Tags auf Rezepten

Das System SHALL Rezepte mit Frühstückstag-Tags (content.Tag mit `group="breakfast_day"`) markierbar machen. Ein Rezept KANN mehreren Frühstückstagen zugeordnet sein. Rezepte ohne Frühstückstag-Tag werden immer angezeigt (gelten als "für alle Tage").

#### Scenario: Rezept einem Frühstückstag zuordnen
- **WHEN** der Nutzer im Recipe-Edit-Formular das Rezept "Pfefferminztee" mit dem Tag "Tag 3" markiert
- **THEN** hat das Rezept einen content.Tag mit `name="Tag 3"` und `group="breakfast_day"` in seiner tag-Liste

#### Scenario: Rezept mehreren Tagen zuordnen
- **WHEN** der Nutzer "Filterkaffee" mit "Tag 1" und "Tag 2" markiert
- **THEN** hat das Rezept beide Tags in seiner tag-Liste

#### Scenario: Rezept ohne Frühstückstag
- **WHEN** ein Rezept keinen `group="breakfast_day"`-Tag hat
- **THEN** wird es bei ungefilterter Suche immer angezeigt

### Requirement: Frühstückstag-Verwaltung (CRUD)

Das System SHALL eine Benutzeroberfläche zur Verwaltung von Frühstückstag-Tags bereitstellen. Nutzer KÖNNEN neue Tage anlegen, umbenennen und löschen. Beim Löschen MUSS das System prüfen, ob der Tag noch von Rezepten verwendet wird, und ggf. warnen.

#### Scenario: Neuen Frühstückstag anlegen
- **WHEN** der Nutzer im Tag-Manager "Tag 4" als neuen Frühstückstag anlegt
- **THEN** existiert ein content.Tag mit `name="Tag 4"`, `slug="tag-4"` und `group="breakfast_day"`

#### Scenario: Frühstückstag umbenennen
- **WHEN** der Nutzer "Tag 1" in "Erster Tag" umbenennt
- **THEN** bleibt der Tag allen zugeordneten Rezepten erhalten, aber der angezeigte Name ändert sich

#### Scenario: Verwendeten Tag löschen
- **WHEN** der Nutzer "Tag 3" löscht und dieser Tag von 5 Rezepten verwendet wird
- **THEN** zeigt das System eine Warnung mit der Anzahl betroffener Rezepte
- **AND** der Nutzer muss die Löschung bestätigen
- **AND** nach Bestätigung wird der Tag aus allen Rezepten entfernt und gelöscht

### Requirement: Frühstückstag-API

Das System SHALL eine API bereitstellen, um Frühstückstag-Tags zu listen und zu verwalten.

#### Scenario: Frühstückstage listen
- **WHEN** der Client `GET /api/content/tags/?group=breakfast_day` aufruft
- **THEN** werden alle Tags mit `group="breakfast_day"` zurückgegeben
- **AND** die Response enthält `id`, `name`, `slug`, `sort_order`

#### Scenario: Neuen Tag via API anlegen
- **WHEN** der Client `POST /api/content/tags/` mit `{ name: "Tag 4", group: "breakfast_day" }` aufruft
- **THEN** wird ein neuer Tag mit `group="breakfast_day"` erstellt
- **AND** der Slug wird automatisch aus dem Namen generiert

### Requirement: Frühstückstag-Filter im RecipeSearchDialog

Das System SHALL im RecipeSearchDialog eine Filter-Pill-Reihe für Frühstückstage anzeigen, wenn der Dialog aus dem Frühstücksassistenten geöffnet wird. Die Filter-Pills SHALL die verfügbaren Frühstückstage anzeigen. Ein Klick auf eine Pill filtert die Suchergebnisse auf Rezepte mit diesem Tag. Ein erneuter Klick oder Klick auf "Alle" entfernt den Filter.

#### Scenario: Frühstückstag-Pills sichtbar
- **WHEN** der Nutzer im Frühstücksassistenten-Schritt 4 auf "[+ Getränk]" klickt
- **THEN** wird der RecipeSearchDialog geöffnet
- **AND** unter den CategoryPills erscheint eine Filter-Reihe "Frühstückstag: [Tag 1] [Tag 2] [Tag 3] [Alle]"
- **AND** standardmäßig ist kein Tag ausgewählt ("Alle" aktiv)

#### Scenario: Nach Frühstückstag filtern
- **WHEN** der Nutzer auf "Tag 3" klickt
- **THEN** werden nur Rezepte angezeigt, die den Tag "Tag 3" haben
- **AND** die Pill "Tag 3" wird aktiv hervorgehoben

#### Scenario: Filter entfernen
- **WHEN** der Nutzer erneut auf die aktive Pill "Tag 3" klickt
- **THEN** wird der Tag-Filter entfernt und alle Rezepte werden wieder angezeigt
- **AND** "Alle" wird wieder aktiv

### Requirement: Frühstückstage im Recipe-Edit-Formular

Das System SHALL im Recipe-Edit-Formular eine Multi-Select-Auswahl für Frühstückstag-Tags anzeigen. Die Auswahl SHALL auf Tags mit `group="breakfast_day"` beschränkt sein.

#### Scenario: Frühstückstage im Recipe-Edit
- **WHEN** der Nutzer ein Rezept bearbeitet
- **THEN** sieht er eine Sektion "Frühstückstage" mit Checkboxen oder Tags für alle verfügbaren Frühstückstage
- **AND** er kann beliebig viele Tage auswählen oder abwählen
