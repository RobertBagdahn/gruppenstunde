# food-feedback-toasts Specification

## Purpose
TBD - created by archiving change food-frontend-friendly-ux. Update Purpose after archive.
## Requirements
### Requirement: Einheitliche Toast-Sprache
Alle Toasts im Food-Frontend SHALL über den zentralen Helfer `notify` (`lib/notify.ts`) erzeugt werden. Erfolgs-Texte MUST dem Muster „<Objekt> <Partizip>“ folgen (z. B. „Zutat gespeichert“, „Rezept gelöscht“, „Essensplan angelegt“), ohne Emoji, ohne Häkchen-Zeichen und ohne Schlusspunkt. Fehler-Texte MUST dem Muster „<Objekt> konnte nicht <Verb> werden“ als Titel folgen, die Ursache steht in der Beschreibung. Direkte Aufrufe von `toast` aus `sonner` außerhalb von `lib/notify.ts` SHALL NOT vorkommen; ein Test MUST das prüfen.

#### Scenario: Zutat speichern
- **WHEN** ein angemeldeter Nutzer eine Zutat erfolgreich speichert
- **THEN** erscheint der Toast „Zutat gespeichert“

#### Scenario: Speichern schlägt fehl
- **WHEN** das Speichern einer Zutat mit einem Backend-Fehler endet
- **THEN** erscheint ein Fehler-Toast mit Titel „Zutat konnte nicht gespeichert werden“ und der deutschen Fehlerursache als Beschreibung

#### Scenario: Direkter sonner-Aufruf
- **WHEN** der Test über `src/` läuft und eine Datei außer `lib/notify.ts` `toast` aus `sonner` importiert
- **THEN** schlägt der Test fehl

### Requirement: Wann ein Toast erscheint
Speichern, Anlegen, Löschen, Kopieren/Klonen, Einladen und KI-Aktionen SHALL bei Erfolg und bei Fehler einen Toast zeigen. Häufige Mikro-Aktionen (Abhaken in Einkaufslisten, Sortieren, Mengen- oder Faktoränderung, Auf-/Zuklappen) SHALL NOT bei Erfolg einen Toast zeigen; sie MUST optimistisch aktualisieren und bei Fehler den alten Stand wiederherstellen und einen Fehler-Toast zeigen. Jede Mutation im Food-Frontend MUST entweder einen Erfolgs-Toast oder eine sofort sichtbare Änderung im UI erzeugen; Mutationen ohne jede Rückmeldung SHALL NOT existieren.

#### Scenario: Einkaufsliste abhaken
- **WHEN** der Nutzer einen Eintrag abhakt
- **THEN** wird er sofort als erledigt angezeigt, ohne Toast

#### Scenario: Abhaken schlägt fehl
- **WHEN** das Abhaken vom Server abgelehnt wird
- **THEN** wird der Eintrag wieder als offen angezeigt und ein Fehler-Toast erscheint

#### Scenario: Gruppenmitglied entfernen
- **WHEN** ein Nutzer im GroupMemberPanel eine Person entfernt
- **THEN** erscheint der Toast „Person entfernt“

### Requirement: Rückgängig statt Nachfrage
Löschungen, die das Frontend ohne neuen Backend-Endpunkt rückgängig machen kann (Eintrag aus einer Mahlzeit, Einkaufslisten-Eintrag, Zeile in der Zutatenprüfung), SHALL ohne Bestätigungsdialog ausgeführt werden und einen Toast mit Aktion „Rückgängig“ zeigen (Dauer `UNDO_DURATION_MS` = 6 Sekunden). Alle anderen Löschungen MUST über den App-Bestätigungsdialog (`ConfirmDialog`) bestätigt werden; ein Wiederherstellen soft-gelöschter Entitäten ist nicht Teil dieses Changes. `window.confirm`, `confirm`, `alert` und `prompt` SHALL NOT verwendet werden.

#### Scenario: Rezept aus Mahlzeit entfernen
- **WHEN** der Nutzer ein Rezept aus einer Mahlzeit entfernt
- **THEN** verschwindet es sofort und der Toast „Rezept entfernt“ mit „Rückgängig“ erscheint
- **AND WHEN** der Nutzer innerhalb von 6 Sekunden auf „Rückgängig“ klickt
- **THEN** ist das Rezept wieder in der Mahlzeit

#### Scenario: Ordner löschen
- **WHEN** der Nutzer einen Rezeptordner löschen will
- **THEN** erscheint der App-Dialog „Ordner löschen?“ mit dem Hinweis, dass Rezepte erhalten bleiben

### Requirement: Fortschritts-Toast für lange Aktionen
Aktionen, die typischerweise länger als 2 Sekunden dauern und keine eigene Fortschrittsanzeige im Dialog haben (z. B. „Fehlende Stammdaten mit KI ergänzen“), SHALL einen Toast zeigen, der von „<Objekt> wird … “ zu einem Erfolgs- oder Fehler-Toast wechselt (`notify.promise`). Aktionen mit eigener Fortschrittsanzeige im Dialog (KI-Bild, Import per URL, KI-Vorschläge) zeigen ihren Fortschritt dort.

#### Scenario: Stammdaten mit KI ergänzen
- **GIVEN** ein angemeldeter Nutzer mit KI-Zugang
- **WHEN** er auf der Zutat-Detailseite „Fehlende Stammdaten mit KI ergänzen“ startet
- **THEN** erscheint „Fehlende Stammdaten werden mit KI ergänzt …“ und wechselt nach Abschluss zu „N Stammdaten ergänzt: …“ oder zu einer Fehlermeldung

### Requirement: Toast-Position
Der Toaster SHALL oben mittig erscheinen (`position="top-center"`), mit Schließen-Knopf und 4 Sekunden Standarddauer. Toasts MUST NOT die mobile Aktionsleiste am unteren Rand überdecken.

#### Scenario: Mobil auf der Rezeptseite
- **GIVEN** ein Viewport von 375 px Breite
- **WHEN** ein Toast erscheint
- **THEN** liegt er am oberen Rand und die untere Aktionsleiste bleibt bedienbar
