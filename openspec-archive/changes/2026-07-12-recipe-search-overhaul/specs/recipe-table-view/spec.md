# Spec: Recipe Table View

Tabellenansicht als Alternative zum Kachel-Grid in der Rezeptsuche mit localStorage-Persistenz.

## ADDED Requirements

### Requirement: View toggle between grid and table
Die Rezeptsuche SHALL einen Toggle-Button bereitstellen, der zwischen Kachel-Ansicht (Grid) und Tabellen-Ansicht (Table) umschaltet.

#### Scenario: Default view is grid
- **WHEN** ein Nutzer die Rezeptsuche zum ersten Mal öffnet (kein localStorage-Wert)
- **THEN** wird die Kachel-Ansicht angezeigt
- **THEN** der Toggle-Button zeigt das Kachel-Icon als aktiv

#### Scenario: Switch to table view
- **WHEN** ein Nutzer auf den Tabellen-Toggle klickt
- **THEN** wird die Ergebnis-Liste als Tabelle dargestellt
- **THEN** der Toggle-Button zeigt das Tabellen-Icon als aktiv
- **THEN** die Präferenz wird in `localStorage` gespeichert

#### Scenario: localStorage persistence
- **WHEN** ein Nutzer zur Tabellenansicht wechselt und die Seite neu lädt
- **THEN** wird automatisch die Tabellenansicht geladen (aus localStorage)

### Requirement: Table columns for recipe search
Die Tabellenansicht SHALL folgende Spalten in dieser Reihenfolge anzeigen: Bild (Thumbnail), Titel, Dauer, Schwierigkeit, Likes, Kosten.

#### Scenario: Table row renders all columns
- **WHEN** die Tabellenansicht aktiv ist
- **THEN** jede Zeile zeigt: Thumbnail (48x48px), Rezept-Titel (verlinkt), Dauer-Label, Schwierigkeit-Label, Like-Score mit Herz-Icon, Preis formatiert (z.B. "3,50 €")

#### Scenario: Table row is clickable
- **WHEN** ein Nutzer auf eine Tabellenzeile klickt (außer auf Action-Buttons)
- **THEN** wird zur Rezept-Detailseite navigiert

#### Scenario: Table shows draft badge
- **WHEN** ein eigenes Draft-Rezept in der Tabellenansicht erscheint
- **THEN** wird ein "Entwurf"-Badge hinter dem Titel angezeigt

#### Scenario: Table row actions for own recipes
- **WHEN** der Nutzer ein eigenes Rezept in der Tabellenansicht sieht
- **THEN** werden Edit- und Delete-Actions am Ende der Zeile angezeigt (als Icon-Buttons)

### Requirement: Empty table state
Wenn keine Rezepte gefunden werden, SHALL die Tabellenansicht den gleichen Empty-State wie die Kachel-Ansicht anzeigen.

#### Scenario: Empty table with no results
- **WHEN** die Tabellenansicht aktiv ist und keine Ergebnisse vorliegen
- **THEN** wird der EmptyState-Komponente mit "Keine Rezepte gefunden" angezeigt

### Requirement: Table loading state
Während des Ladens SHALL die Tabellenansicht Skeleton-Zeilen anzeigen.

#### Scenario: Table skeleton rows
- **WHEN** die Rezeptsuche lädt und die Tabellenansicht aktiv ist
- **THEN** werden 6 Skeleton-Zeilen mit animierten Platzhalter-Inhalten angezeigt

### Requirement: Responsive table
Die Tabellenansicht SHALL auf mobilen Geräten (< 768px) auf eine kompaktere Darstellung umschalten.

#### Scenario: Mobile table layout
- **WHEN** die Tabellenansicht auf einem Viewport < 768px aktiv ist
- **THEN** werden die Spalten Schwierigkeit und Kosten ausgeblendet
- **THEN** bleibt Bild, Titel, Dauer und Likes sichtbar
