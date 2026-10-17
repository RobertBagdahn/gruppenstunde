## ADDED Requirements

### Requirement: Überlast-tolerante Abfragen der Einkaufsliste
Antwortet das Backend mit 429 oder 503, SHALL die Einkaufslisten-Seite vorübergehende Fehler abfangen, ohne die Liste zu verdecken. Lesende Abrufe der Liste MUST bis zu 3-mal mit wachsender Wartezeit (1 s, 2 s, 4 s, je plus Zufallsanteil bis 500 ms) wiederholt werden; ein `Retry-After`-Header hat Vorrang. Änderungen MUST nur dann automatisch wiederholt werden, wenn sie idempotent sind (`PATCH …/items/{id}/` mit ausdrücklichem `is_checked` oder `claimed`); Anlegen von Einträgen (`POST`) MUST NICHT automatisch wiederholt werden. Der Pulse MUST seinen Takt bei 429 oder 5xx verdoppeln (höchstens 60 s) und nach dem ersten erfolgreichen Abruf auf den normalen Takt zurückkehren. Scheitern alle Wiederholungen, SHALL die Seite die zuletzt geladene Liste weiter zeigen und ein Hinweisband „Gerade sind viele gleichzeitig dabei. Wir versuchen es gleich nochmal.“ anzeigen, das nach dem nächsten Erfolg verschwindet. Die Fehlerseite MUST nur erscheinen, wenn noch keine Liste geladen wurde. Andere 4xx-Fehler (401, 403, 404, 409, 422) MUST NICHT wiederholt werden.

#### Scenario: Liste laden bei 429
- **GIVEN** das Backend antwortet auf den ersten Abruf mit 429
- **WHEN** der zweite Versuch nach etwa 1 s gelingt
- **THEN** erscheint die Liste ohne Fehlermeldung

#### Scenario: Abhaken bei 429
- **WHEN** das Abhaken mit 429 abgewiesen wird
- **THEN** wiederholt der Client es bis zu 3-mal und der Haken bleibt in der Oberfläche sichtbar, bis das Ergebnis feststeht

#### Scenario: Eintrag anlegen bei 429
- **WHEN** das Anlegen eines Eintrags mit 429 abgewiesen wird
- **THEN** wiederholt der Client es nicht automatisch und die Seite bietet „Nochmal versuchen“ an
- **AND** es entsteht kein doppelter Eintrag

#### Scenario: Dauerhafte Überlast
- **GIVEN** die Liste ist geladen und alle Wiederholungen scheitern
- **THEN** bleibt die Liste sichtbar und das Hinweisband erscheint
- **AND** der Pulse fragt nur noch alle 10 s, 20 s, 40 s, dann alle 60 s ab

#### Scenario: Erholung
- **WHEN** ein Abruf wieder gelingt
- **THEN** verschwindet das Hinweisband und der Pulse kehrt zum Takt von 5 s zurück

#### Scenario: Zugang entzogen
- **WHEN** der Pulse mit 404 oder 401 antwortet
- **THEN** wird nicht wiederholt, sondern die Liste neu geladen und der Zugangsverlust angezeigt

### Requirement: Kein WebSocket-Versuch ohne Endpunkt
Der Browser SHALL in Produktion keine WebSocket-Verbindung zur Einkaufsliste aufbauen, solange kein WebSocket-Endpunkt bereitgestellt wird. Der Client MUST die Verbindung nur aufbauen, wenn die Build-Variable `VITE_SHOPPING_WEBSOCKET` den Wert `true` hat; der Standard ist aus. Ohne Verbindung MUST der Pulse-Takt dem Polling-Takt entsprechen (5 s aktiv, 15 s ruhig).

#### Scenario: Produktion ohne Schalter
- **WHEN** ein Nutzer die Liste in der Produktionsversion öffnet
- **THEN** versucht der Browser keine Verbindung zu `ws/shopping-lists/{id}/`

#### Scenario: Lokale Entwicklung mit WebSocket
- **GIVEN** `VITE_SHOPPING_WEBSOCKET=true` und ein ASGI-Server
- **WHEN** ein Nutzer die Liste öffnet
- **THEN** baut der Browser die Verbindung auf und der Pulse läuft im 20-s-Takt
