## ADDED Requirements

### Requirement: Zwei-Wege-Auswahl (KI und Manuell)

Das System MUST dem Benutzer auf `/create/idea` und `/create/knowledge` zwei gleichwertige Erstellungswege anbieten: KI-gestützt (primär) und manuell (sekundär).

#### Scenario: Seite laden zeigt Auswahl

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer `/create/idea` oder `/create/knowledge` aufruft
- THEN werden zwei Optionen angezeigt: "Mit KI erstellen" (Primary-Button) und "Manuell erstellen" (Secondary-Button)
- AND beide Optionen sind ohne Scrollen sichtbar (above the fold, Mobile-First)

#### Scenario: KI-Weg wählen

- GIVEN der Benutzer sieht die Zwei-Wege-Auswahl
- WHEN der Benutzer "Mit KI erstellen" klickt
- THEN wird das Freitext-Eingabefeld (Step 0 "Beschreiben") angezeigt
- AND der bestehende 3-Schritt-Wizard-Ablauf wird fortgesetzt

#### Scenario: Manuellen Weg wählen

- GIVEN der Benutzer sieht die Zwei-Wege-Auswahl
- WHEN der Benutzer "Manuell erstellen" klickt
- THEN wird direkt das leere Bearbeitungsformular (Step 1 "Bearbeiten") angezeigt
- AND alle Felder haben Standardwerte (difficulty: easy, costs_rating: free, execution_time: less_30, preparation_time: none)
- AND kein KI-Call wird ausgelöst
- AND der Benutzer kann das Formular manuell ausfüllen und zur Vorschau (Step 2) weitergehen

### Requirement: Abbrechbarer KI-Call

Das System MUST dem Benutzer ermöglichen, einen laufenden KI-Refurbish-Call abzubrechen.

#### Scenario: Abbrechen-Button während KI-Verarbeitung

- GIVEN ein Refurbish-Request läuft (Spinner wird angezeigt)
- WHEN der Benutzer den "Abbrechen"-Button klickt
- THEN wird der HTTP-Request per `AbortController.abort()` abgebrochen
- AND das Frontend wechselt zurück zum Freitext-Eingabefeld (Step 0)
- AND der eingegebene Freitext bleibt erhalten
- AND eine Info-Nachricht wird angezeigt: "KI-Verarbeitung abgebrochen"

#### Scenario: Nach Abbruch Optionen anbieten

- GIVEN der Benutzer hat den KI-Call abgebrochen
- WHEN die Info-Nachricht angezeigt wird
- THEN werden zwei Optionen angeboten: "Erneut versuchen" (wiederholt den Refurbish-Call) und "Manuell erstellen" (wechselt zum leeren Formular)

### Requirement: Wartezeit-Anzeige

Das Frontend MUST dem Benutzer während eines laufenden KI-Calls eine geschätzte Wartezeit anzeigen.

#### Scenario: Spinner mit Zeitschätzung

- GIVEN ein Refurbish-Request wurde gesendet
- WHEN der Spinner angezeigt wird
- THEN zeigt das Frontend die geschätzte Wartezeit an: "KI arbeitet... (ca. 10-20 Sekunden)"
- AND die Zeitschätzung ist ein UX-Hint im Frontend (keine Geschäftslogik)

### Requirement: Fehleranzeige mit Fallback-Optionen

Das Frontend MUST bei KI-Fehlern eine verständliche Meldung mit zwei Handlungsoptionen anzeigen.

#### Scenario: KI-Fehler mit Optionen

- GIVEN ein KI-Fehler wird vom Backend zurückgegeben (HTTP 502, 503, 504 oder 500 mit `error_code`)
- WHEN das Frontend den Fehler empfängt
- THEN wird eine Fehler-Komponente angezeigt mit der `detail`-Meldung aus der Backend-Response
- AND es werden zwei Buttons angezeigt: "Erneut versuchen" und "Manuell erstellen"
- AND der eingegebene Freitext bleibt erhalten (kein Datenverlust)

#### Scenario: Netzwerk-Fehler

- GIVEN der Client hat keine Internetverbindung oder der Server antwortet nicht
- WHEN ein Refurbish-Call fehlschlägt
- THEN wird eine Fehlermeldung angezeigt: "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung."
- AND die Buttons "Erneut versuchen" und "Manuell erstellen" werden angezeigt

### Requirement: Manuelle Bildgenerierung in Step 2

Die Bildgenerierung MUST vom Refurbish-Call entkoppelt sein und nur manuell per Button in Step 2 ausgelöst werden.

#### Scenario: Kein automatisches Bild bei Refurbish

- GIVEN ein Refurbish-Call wurde erfolgreich abgeschlossen
- WHEN das Frontend die Response empfängt
- THEN enthält die Response `image_url: null` und `image_urls: []`
- AND kein automatischer Bild-Call wird ausgelöst
- AND der `image_prompt` aus der Refurbish-Response wird im Frontend-State gespeichert

#### Scenario: Manuell Bilder generieren in Step 2

- GIVEN der Benutzer ist in Step 2 (Vorschau & Speichern)
- WHEN der Benutzer den "Bilder generieren"-Button klickt
- THEN wird `POST /api/ai/generate-image/` aufgerufen mit dem `image_prompt` aus dem Refurbish-Ergebnis
- AND 4 Bilder werden generiert und in einer 2x2-Grid-Auswahl angezeigt
- AND der Benutzer kann ein Bild auswählen oder ohne Bild speichern
