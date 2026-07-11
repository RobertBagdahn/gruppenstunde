## ADDED Requirements

### Requirement: Export-Token Erzeugung
Das System SHALL für eine gegebene Einkaufsliste einen kurzlebigen, personengebundenen Export-Token erzeugen, der ausschließlich Lesezugriff auf die Artikel-Exportdaten dieser Liste gewährt.

#### Scenario: Authentifizierter Nutzer erzeugt Token
- **WHEN** ein authentifizierter Nutzer mit Zugriffsrecht auf eine Einkaufsliste einen Export-Token anfordert
- **THEN** erzeugt das System einen Token mit einer Gültigkeit von maximal 5 Minuten und gibt ihn als Teil einer Export-URL zurück

#### Scenario: Nicht-authentifizierter Zugriff
- **WHEN** eine nicht-authentifizierte Anfrage einen Export-Token anfordert
- **THEN** antwortet das System mit HTTP 401

#### Scenario: Nutzer ohne Zugriffsrecht auf die Liste
- **WHEN** ein authentifizierter Nutzer ohne Lese-/Editier-Rolle auf der Einkaufsliste einen Token anfordert
- **THEN** antwortet das System mit HTTP 403

### Requirement: Artikel-Export via Token
Das System SHALL die Einkaufslisten-Artikel über einen gültigen Export-Token als kompakte, für die REWE-Übertragung nutzbare Liste bereitstellen.

#### Scenario: Gültiger Token liefert Artikel-Liste
- **WHEN** eine Anfrage mit einem gültigen, nicht abgelaufenen Export-Token gestellt wird
- **THEN** liefert das System pro Artikel Ingredient-Name, `nan_art_id_rewe` (falls vorhanden), gerundete Bestellmenge (basierend auf bestehender Portions-/Rundungslogik) und aktuellen Export-Status

#### Scenario: Abgelaufener oder ungültiger Token
- **WHEN** eine Anfrage mit einem abgelaufenen, bereits verwendeten oder unbekannten Token gestellt wird
- **THEN** antwortet das System mit HTTP 401 und einer Fehlermeldung, dass ein neuer Token erzeugt werden muss

#### Scenario: Artikel ohne REWE-Zuordnung
- **WHEN** ein Ingredient in der Liste kein `nan_art_id_rewe` hinterlegt hat
- **THEN** enthält der Export-Eintrag dieses Artikels ein Feld, das anzeigt, dass keine automatische Zuordnung möglich ist

### Requirement: Export-Status pro Artikel
Das System SHALL pro Einkaufslisten-Artikel nachverfolgen, ob dieser bereits erfolgreich in einen REWE-Warenkorb übertragen wurde, um versehentliches doppeltes Hinzufügen zu vermeiden.

#### Scenario: Artikel wurde erfolgreich übertragen
- **WHEN** ein Report-Callback für einen Artikel einen Erfolg meldet
- **THEN** markiert das System diesen Artikel als übertragen inklusive Zeitstempel

#### Scenario: Bereits übertragener Artikel wird erneut exportiert
- **WHEN** eine Einkaufsliste exportiert wird, die bereits übertragene Artikel enthält
- **THEN** enthält die Export-Antwort für diese Artikel den vorhandenen Übertragungs-Status, damit der Client sie optional überspringen kann

### Requirement: Ergebnis-Report-Callback
Das System SHALL einen authentifizierten Endpoint bereitstellen, über den der Client (Bookmarklet) nach Abschluss der Übertragung meldet, welche Artikel erfolgreich und welche fehlgeschlagen sind.

#### Scenario: Erfolgreicher Report
- **WHEN** ein Report mit einer Liste erfolgreich übertragener Artikel-IDs gesendet wird
- **THEN** aktualisiert das System den Export-Status der betroffenen `ShoppingListItem`-Einträge

#### Scenario: Report für fremde Einkaufsliste
- **WHEN** ein Report Artikel-IDs enthält, die nicht zur im Token referenzierten Einkaufsliste gehören
- **THEN** ignoriert das System diese Artikel-IDs und verarbeitet nur die zugehörigen

### Requirement: Kein serverseitiger REWE-Zugriff
Das System SHALL zu keinem Zeitpunkt REWE-Zugangsdaten, REWE-Session-Cookies oder REWE-API-Requests server-seitig verarbeiten oder speichern.

#### Scenario: Keine REWE-Anmeldedaten im Backend
- **WHEN** ein Export-Token oder Report-Callback verarbeitet wird
- **THEN** enthält weder die Anfrage noch die Antwort REWE-Zugangsdaten oder REWE-Session-Informationen
