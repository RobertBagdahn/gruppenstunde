## Purpose

Temporärer Personen-Kontext für die Eingabe, Anzeige und Speicherung von Rezeptmengen.

## Requirements

### Requirement: Temporärer Personen-Kontext vor der Zutatenbearbeitung
Das System SHALL vor dem Öffnen der Zutatenbearbeitung einen ganzzahligen Eingabekontext zwischen 1 und 100 Personen festlegen. Der Kontext SHALL standardmäßig 1 sein, SHALL nach Beginn der Zutatenbearbeitung gesperrt sein und SHALL nicht dauerhaft am Rezept gespeichert werden.

#### Scenario: Manueller Rezeptentwurf startet mit Standardwert
- **WHEN** ein Nutzer ein Rezept manuell erstellt und den Zutaten-Schritt öffnet
- **THEN** wird der Personen-Kontext mit 1 vorbelegt angezeigt
- **AND** der Nutzer kann einen Wert zwischen 1 und 100 festlegen, bevor die Zutaten bearbeitet werden

#### Scenario: Personenzahl ist nach Bearbeitungsbeginn gesperrt
- **WHEN** der Nutzer den Zutateneditor nach Festlegung des Personen-Kontexts öffnet
- **THEN** zeigt der Editor eine feste Zusammenfassung wie „Gesamtmengen für 4 Personen“
- **AND** enthält diese Zusammenfassung kein änderbares Personenzahl-Eingabefeld

#### Scenario: Kontext wird nicht dauerhaft gespeichert
- **WHEN** der Nutzer die Bearbeitung abbricht oder später erneut öffnet
- **THEN** wird der vorherige Personen-Kontext nicht aus dem Rezept geladen
- **AND** der Bearbeitungsvorgang startet erneut mit 1 beziehungsweise fordert bei fehlender Importzahl eine Auswahl

### Requirement: Gesamtmengen im gewählten Eingabekontext
Das System SHALL Zutatenmengen im Editor als Gesamtmengen für den festgelegten Personen-Kontext behandeln. Bei bestehenden Rezepten SHALL es die gespeicherten Pro-1-Person-Mengen erst nach der Kontextauswahl für die Anzeige multiplizieren. Bereits kontextbezogene neue oder importierte Mengen SHALL nicht ein zweites Mal multipliziert werden.

#### Scenario: Bestehendes Rezept für vier Personen bearbeiten
- **GIVEN** ein Rezept mit technisch gespeicherten Pro-1-Person-Mengen
- **WHEN** der Nutzer vor dem Öffnen des Editors 4 Personen auswählt
- **THEN** zeigt der Editor jede bestehende Menge als Gesamtmenge für 4 Personen an

#### Scenario: Neue Mengen für vier Personen eingeben
- **GIVEN** der festgelegte Personen-Kontext beträgt 4
- **WHEN** der Nutzer 500 g Mehl eingibt
- **THEN** wird 500 g als Gesamtmenge für 4 Personen behandelt
- **AND** die Menge wird nicht zusätzlich durch einen weiteren Personenfaktor vervierfacht

#### Scenario: Personenzahl nach Öffnen des Editors ändern
- **GIVEN** der Zutateneditor wurde mit einem festgelegten Personen-Kontext geöffnet
- **WHEN** der Nutzer versucht, die Personenzahl zu ändern
- **THEN** bleibt die Personenzahl gesperrt
- **AND** bestehende Mengen werden nicht automatisch in einen anderen Kontext umgerechnet

### Requirement: Normierung beim Speichern
Das System SHALL Gesamtmengen beim Speichern durch den temporären Personen-Kontext teilen und weiterhin Pro-1-Person-Mengen in `RecipeItem.quantity` speichern. `Recipe.portions` SHALL dabei weiterhin auf 1 normiert bleiben.

#### Scenario: Vier-Personen-Menge wird gespeichert
- **GIVEN** der Kontext beträgt 4 und der Nutzer gibt 500 g als Gesamtmenge ein
- **WHEN** der Nutzer den Speichervorgang bestätigt
- **THEN** wird intern eine Pro-1-Person-Menge von 125 g gespeichert
- **AND** das Rezept behält `portions=1`

#### Scenario: Ein-Personen-Menge wird gespeichert
- **GIVEN** der Kontext beträgt 1 und der Nutzer gibt 125 g ein
- **WHEN** der Nutzer den Speichervorgang bestätigt
- **THEN** wird intern 125 g gespeichert
- **AND** es findet keine zusätzliche Skalierung statt

### Requirement: Bestätigung vor dem Speichern
Das System SHALL vor jedem Speichern einen Bestätigungsdialog anzeigen, der den gewählten Personen-Kontext und die anschließende interne Normierung auf Pro-1-Person-Mengen nennt. Ein Abbruch SHALL zur Bearbeitung zurückführen und SHALL die Eingaben unverändert lassen.

#### Scenario: Speichern für mehrere Personen bestätigen
- **GIVEN** der Editor wurde für 4 Personen geöffnet
- **WHEN** der Nutzer auf „Speichern“ klickt
- **THEN** zeigt das System einen Dialog mit dem Hinweis, dass die Mengen für 4 Personen gelten
- **AND** erklärt, dass sie intern auf Pro-1-Person-Mengen normiert werden

#### Scenario: Bestätigung abbrechen
- **GIVEN** der Bestätigungsdialog ist geöffnet
- **WHEN** der Nutzer „Abbrechen“ wählt
- **THEN** wird der Dialog geschlossen
- **AND** der Nutzer bleibt im Zutateneditor
- **AND** die Personenzahl bleibt für diesen Vorgang gesperrt

### Requirement: Erkannte Personenzahl bei Importen und KI-Rezepten
Das System SHALL eine verlässlich erkannte Personenzahl aus URL- oder KI-Rezeptdaten als temporären Personen-Kontext übernehmen. Wenn keine verlässliche Personenzahl vorhanden ist, SHALL das System die manuelle Auswahl erzwingen, bevor Zutaten bearbeitet werden können.

#### Scenario: URL-Import liefert vier Portionen
- **GIVEN** der URL-Import liefert `servings=4` und Mengen für das Originalrezept
- **WHEN** der Nutzer den Import bestätigt
- **THEN** wird der Zutateneditor mit dem Kontext 4 geöffnet
- **AND** die importierten Gesamtmengen werden nicht nochmals hochskaliert

#### Scenario: Import liefert keine Personenzahl
- **GIVEN** der URL-Import liefert keine verlässliche Personenzahl
- **WHEN** der Nutzer den Zutaten-Schritt öffnet
- **THEN** muss der Nutzer eine Zahl zwischen 1 und 100 auswählen
- **AND** kann die Zutatenbearbeitung erst danach beginnen

#### Scenario: KI-Rezept liefert keine Personenzahl
- **GIVEN** die KI erzeugt ein Rezept ohne eindeutige Personenzahl
- **WHEN** der Nutzer zum Zutaten-Schritt wechselt
- **THEN** muss der Nutzer den Personen-Kontext manuell festlegen
- **AND** wird die Zutatenbearbeitung bis dahin blockiert

### Requirement: Konkrete Speicherfehler anzeigen
Das System SHALL bei fehlgeschlagenen Rezept-Speicheranfragen die konkrete Backend-Fehlermeldung aus dem JSON-Response extrahieren und im bestehenden deutschen Fehlerfeedback anzeigen.

#### Scenario: Backend liefert Detailfehler
- **GIVEN** ein Rezept-PATCH antwortet mit einem Fehlerstatus und `detail`
- **WHEN** der Wizard den Fehler verarbeitet
- **THEN** zeigt der Fehlerhinweis die Nachricht aus `detail` an
- **AND** zeigt nicht ausschließlich „Speichern fehlgeschlagen“ an

#### Scenario: Backend liefert Validierungsfehlerliste
- **GIVEN** ein Rezept-PATCH antwortet mit strukturierten Validierungsfehlern
- **WHEN** der Wizard den Fehler verarbeitet
- **THEN** werden die enthaltenen Fehlermeldungen zu einem verständlichen Fehlertext zusammengeführt
- **AND** dieser Text wird dem Nutzer angezeigt
