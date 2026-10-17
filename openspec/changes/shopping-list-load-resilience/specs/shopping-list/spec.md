## ADDED Requirements

### Requirement: Schlanke Listenantwort
Die Detailantwort `GET /api/shopping-lists/{id}/` SHALL nur Daten enthalten, die die Listenansicht ohne Nutzeraktion darstellt, und MUST je Eintrag ein Größenbudget einhalten: Eine Testliste mit 50 Einträgen (Rezept- und Essensplan-Quellen, Portionen, Packungen) MUST als JSON höchstens 4 KB je Eintrag ergeben, ein Test MUST das prüfen. Portions- und Packungsoptionen eines Eintrags SHALL über `GET /api/shopping-lists/{id}/items/{item_id}/options/` nachgeladen werden, wenn der Mengen-Dialog des Eintrags geöffnet wird; der Endpunkt hat dieselben Zugriffsregeln wie `PATCH …/items/{item_id}/`. Der Mengen-Dialog MUST dieselben Optionen und dieselbe Vorauswahl zeigen wie zuvor. Die Antwort SHALL komprimiert ausgeliefert werden, wenn der Client `Accept-Encoding: gzip` sendet.

#### Scenario: Große Liste
- **GIVEN** eine Liste mit 50 Einträgen aus Essensplan und Rezepten
- **WHEN** ein Mitglied die Detailantwort abruft
- **THEN** ist die JSON-Antwort höchstens 200 KB groß
- **AND** enthält keine `portion_options` und `package_options`

#### Scenario: Mengen-Dialog öffnen
- **WHEN** ein Mitglied bei „Mehl“ den Mengen-Dialog öffnet
- **THEN** lädt die Seite `GET …/items/{item_id}/options/` und zeigt Portionen und Packungen mit der bisherigen Vorauswahl

#### Scenario: Optionen ohne Berechtigung
- **WHEN** ein anonymer Nutzer ohne Gast-Token die Optionen abruft
- **THEN** antwortet die API mit 401, bei fremdem Gast-Token mit 404

#### Scenario: Komprimierte Antwort
- **WHEN** der Browser die Detailantwort mit `Accept-Encoding: gzip` abruft
- **THEN** ist die übertragene Größe kleiner als die JSON-Größe und `Content-Encoding` ist `gzip`
