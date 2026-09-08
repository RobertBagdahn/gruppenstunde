# recipe-serving-input-context Specification

## Purpose
Personen-Kontext für die Eingabe, Anzeige und Speicherung von Rezeptmengen im vereinheitlichten RecipeWizard.

## Requirements

### Requirement: Temporärer Personen-Kontext vor der Zutatenbearbeitung
Das System SHALL vor dem Öffnen der Zutatenbearbeitung einen ganzzahligen Eingabekontext zwischen 1 und 100 Personen festlegen. Der Kontext SHALL standardmäßig 1 sein, SHALL nach Beginn der Zutatenbearbeitung gesperrt sein und SHALL nicht dauerhaft am Rezept gespeichert werden.

#### Scenario: Manueller Rezeptentwurf startet mit Standardwert
- **WHEN** ein Nutzer ein Rezept manuell erstellt und den Zutaten-Schritt öffnet
- **THEN** wird der Personen-Kontext mit 1 vorbelegt angezeigt
- **AND** der Nutzer kann einen Wert zwischen 1 und 100 festlegen, bevor die Zutaten bearbeitet werden

#### Scenario: Personenzahl ist nach Bearbeitungsbeginn gesperrt
- **WHEN** der Nutzer den Zutateneditor nach Festlegung des Personen-Kontexts öffnet
- **THEN** zeigt der Editor eine feste Zusammenfassung wie „Gesamtmengen für 4 Personen"
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
Das System SHALL eine verlässlich erkannte Personenzahl aus der Smart-Eingabe-Analyse als Personen-Kontext übernehmen und im Schritt "Basis & Portionen" zur Bestätigung anzeigen, bevor Zutatenmengen dargestellt werden. Wenn keine verlässliche Personenzahl vorhanden ist, SHALL das System die manuelle Auswahl erzwingen, bevor der Schritt verlassen werden kann.

#### Scenario: URL-Eingabe liefert vier Portionen
- **GIVEN** die Analyse einer URL liefert `servings=4` und Mengen für das Originalrezept
- **WHEN** der Nutzer den Schritt "Basis & Portionen" erreicht
- **THEN** wird der Wert 4 vorbelegt angezeigt
- **AND** die importierten Gesamtmengen werden im Zutatenschritt nicht nochmals hochskaliert

#### Scenario: Analyse liefert keine Personenzahl
- **GIVEN** die Analyse liefert keine verlässliche Personenzahl
- **WHEN** der Nutzer den Schritt "Basis & Portionen" öffnet
- **THEN** muss der Nutzer eine Zahl zwischen 1 und 100 auswählen
- **AND** kann der Schritt erst danach verlassen

#### Scenario: Freitext-Idee liefert keine Personenzahl
- **GIVEN** die KI erzeugt aus einer Freitext-Idee ein Rezept ohne eindeutige Personenzahl
- **WHEN** der Nutzer den Schritt "Basis & Portionen" öffnet
- **THEN** muss der Nutzer den Personen-Kontext manuell festlegen
- **AND** wird der Zutatenschritt bis dahin nicht erreichbar

#### Scenario: Nutzer korrigiert die erkannte Personenzahl
- **GIVEN** die Analyse liefert eine falsche Personenzahl
- **WHEN** der Nutzer den Wert im Schritt "Basis & Portionen" korrigiert
- **THEN** werden die Mengen im Zutatenschritt im korrigierten Kontext angezeigt
- **AND** wird beim Speichern mit dem korrigierten Wert normiert

### Requirement: Personen-Kontext wird vor der Zutatenanzeige festgelegt
Der Personen-Kontext SHALL im Schritt "Basis & Portionen" festgelegt werden und nicht innerhalb des Zutatenschritts. Der Zutatenschritt SHALL erst mit festgelegtem Kontext erreichbar sein.

#### Scenario: Zutatenschritt ohne festgelegten Kontext
- **WHEN** der Personen-Kontext noch nicht festgelegt ist
- **THEN** SHALL der Zutatenschritt nicht erreichbar sein

#### Scenario: Zutatenschritt mit festgelegtem Kontext
- **WHEN** der Personen-Kontext festgelegt wurde
- **THEN** SHALL der Zutateneditor unmittelbar mit den Gesamtmengen für diesen Kontext geöffnet werden
- **THEN** SHALL keine erneute Abfrage der Personenzahl erscheinen

### Requirement: Hilfetext zur internen Normierung
Der Schritt "Basis & Portionen" SHALL einen deutschen Hilfetext anzeigen, der erklärt, dass Mengen intern auf eine Portion normiert werden, damit Rezepte in der Planung skaliert werden können.

#### Scenario: Hilfetext ist sichtbar
- **WHEN** der Schritt "Basis & Portionen" aktiv ist
- **THEN** SHALL ein deutscher Hilfetext die interne Normierung auf eine Portion erklären

#### Scenario: Hilfetext auf kleinen Viewports
- **WHEN** der Schritt bei einer Viewport-Breite von 320px gerendert wird
- **THEN** SHALL der Hilfetext ohne horizontales Scrollen lesbar sein

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
