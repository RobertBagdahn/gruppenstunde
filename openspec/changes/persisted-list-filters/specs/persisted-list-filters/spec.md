## ADDED Requirements

### Requirement: URL ist führende Quelle für Listenzustand
Listenseiten SHALL Filter, Sortierung, Suchtext, Ansichtsmodus und Seitenzahl als URL-Query-Parameter abbilden. Enthält die URL beim Öffnen mindestens einen Parameter, der zum Listenzustand gehört, MUST ausschließlich die URL den Zustand bestimmen.

#### Scenario: Geteilter Link gewinnt gegen gespeicherten Stand
- **GIVEN** im Browser ist für die Rezeptliste `origin=mine&sort=newest` gespeichert
- **WHEN** der Nutzer den Link `/recipes?recipe_type=breakfast` öffnet
- **THEN** zeigt die Liste nur Frühstücksrezepte mit Standardsortierung
- **THEN** wird `recipe_type=breakfast` zum neuen gespeicherten Stand

#### Scenario: Browser-Zurück stellt vorherige Filter her
- **WHEN** der Nutzer Filter ändert, ein Rezept öffnet und den Browser-Zurück-Button nutzt
- **THEN** zeigt die Liste denselben Zustand wie vor dem Öffnen

### Requirement: Wiederherstellung aus dem Browser-Speicher
Enthält die URL beim Öffnen einer Listenseite keine Zustandsparameter, SHALL die Seite den zuletzt gespeicherten Zustand aus `localStorage` laden und per `replace` in die URL schreiben. Jede Zustandsänderung MUST sowohl in die URL als auch in den Speicher geschrieben werden.

#### Scenario: Zurück über Breadcrumb behält Filter
- **GIVEN** ein angemeldeter Nutzer hat die Rezeptliste auf „Meine Rezepte“, Sortierung „Neueste“ gestellt
- **WHEN** er ein Rezept öffnet und im Breadcrumb auf „Rezepte“ klickt
- **THEN** zeigt die Liste „Meine Rezepte“ sortiert nach „Neueste“
- **THEN** enthält die URL `origin=mine&sort=newest`

#### Scenario: Wiederherstellung nach Browser-Neustart
- **WHEN** der Nutzer den Browser schließt, später erneut `/meal-plans/app` öffnet
- **THEN** sind Herkunftsfilter, Sortierung und Suchtext der Essensplan-Liste wie zuletzt gesetzt

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer Filter in der Zutatenliste setzt und die Seite später erneut öffnet
- **THEN** werden die Filter aus dem Speicherbereich `anon` wiederhergestellt

### Requirement: Seitenzahl wird nicht gespeichert
Die Seitenzahl SHALL in der URL stehen, MUST aber nicht in den Browser-Speicher geschrieben werden. Eine Wiederherstellung aus dem Speicher MUST immer auf Seite 1 beginnen.

#### Scenario: Wiederherstellung startet auf Seite 1
- **GIVEN** der Nutzer war zuletzt auf Seite 4 der gefilterten Rezeptliste
- **WHEN** er `/recipes` ohne Parameter öffnet
- **THEN** sind die Filter wiederhergestellt und die Liste zeigt Seite 1

### Requirement: Nutzergetrennte Speicherung
Der Speicherschlüssel MUST die ID des angemeldeten Nutzers enthalten (`inspi-food:list-state:v1:<userId>:<listKey>`), für nicht angemeldete Nutzer `anon`. Ein Nutzer MUST niemals den gespeicherten Zustand eines anderen Nutzers erhalten.

#### Scenario: Zwei Konten im selben Browser
- **GIVEN** Nutzer A hat „Meine Rezepte“ gespeichert, meldet sich ab
- **WHEN** Nutzer B sich im selben Browser anmeldet und `/recipes` öffnet
- **THEN** sieht B seinen eigenen gespeicherten Stand oder die Standardwerte, nicht den von A

#### Scenario: Warten auf Nutzerdaten
- **WHEN** die Listenseite geladen wird, bevor `useCurrentUser` aufgelöst ist
- **THEN** MUST die Wiederherstellung warten, bis feststeht, ob ein Nutzer angemeldet ist, und darf nicht vorschnell den `anon`-Stand laden

### Requirement: Validierung des gespeicherten Zustands
Gespeicherte Zustände SHALL beim Laden gegen ein Zod-Schema der jeweiligen Liste validiert werden. Ungültige Felder MUST verworfen werden; ist der gesamte Eintrag unlesbar, MUST die Liste mit Standardwerten starten. Zugriffe auf `localStorage` MUST in `try/catch` erfolgen.

#### Scenario: Veralteter Filterwert
- **GIVEN** im Speicher steht `sort=rating`, das es nicht mehr gibt
- **WHEN** die Rezeptliste geladen wird
- **THEN** wird die Standardsortierung verwendet und die übrigen gültigen Filter bleiben erhalten

#### Scenario: Ungültiger Zutat-Status
- **GIVEN** im Speicher der Zutatenliste steht `status=published`
- **WHEN** die Zutatenliste geladen wird
- **THEN** wird der Statusfilter verworfen; zulässig sind nur `draft` und `verified`

#### Scenario: Speicher nicht verfügbar
- **WHEN** `localStorage` eine Exception wirft (privater Modus)
- **THEN** funktioniert die Liste mit URL-State und Standardwerten ohne Fehlermeldung

### Requirement: Hinweis auf aktive Filter und Zurücksetzen
Weicht der wiederhergestellte oder aktuelle Zustand von den Standardwerten ab, SHALL die Liste einen Hinweis „N Filter aktiv · Zurücksetzen“ anzeigen. „Zurücksetzen“ MUST den Zustand auf Standardwerte setzen und den gespeicherten Eintrag entfernen.

#### Scenario: Hinweis nach Wiederherstellung
- **WHEN** die Rezeptliste zwei wiederhergestellte Filter und eine abweichende Sortierung hat
- **THEN** zeigt sie „3 Filter aktiv · Zurücksetzen“

#### Scenario: Zurücksetzen leert Speicher
- **WHEN** der Nutzer „Zurücksetzen“ klickt und später `/recipes` öffnet
- **THEN** startet die Liste mit Standardwerten

### Requirement: Abgedeckte Seiten
Folgende Seiten MUST den gemeinsamen Mechanismus nutzen: Rezeptliste, Zutatenliste, Essensplan-Liste, Einkaufslisten-Übersicht, Zutaten-Statistik-Filter, Datenqualität-Zutaten (aktiver Tab), Essensplan-Detail (Karten-/Tabellenansicht).

#### Scenario: Einkaufsliste merkt „Meine Daten“
- **WHEN** der Nutzer in der Einkaufslisten-Übersicht „Meine Daten“ aktiviert, nach „Name A-Z“ sortiert und die Seite neu lädt
- **THEN** sind beide Einstellungen erhalten und stehen in der URL

#### Scenario: Essensplan-Ansicht wird gemerkt
- **WHEN** der Nutzer im Essensplan die Tabellenansicht wählt und später einen anderen Essensplan öffnet
- **THEN** wird dieser ebenfalls in der Tabellenansicht geöffnet
