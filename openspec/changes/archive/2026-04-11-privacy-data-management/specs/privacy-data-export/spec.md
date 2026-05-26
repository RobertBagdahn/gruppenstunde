## ADDED Requirements

### Requirement: Vollständiger Datenexport als JSON

Das System MUSS authentifizierten Nutzern ermöglichen, alle zu ihrer Person gespeicherten Daten als JSON-Datei herunterzuladen. Der Export MUSS alle Kategorien aus der Datenübersicht enthalten, ergänzt um Detail-Daten:

- Alle Profil-Felder inklusive Präferenzen
- Vollständige Event-Registrierungsdaten mit Personen, Teilnehmern, Buchungsoptionen, Zahlungen und Custom-Fields
- Alle erstellten Inhalte mit Titel, Typ und Erstellungsdatum
- Alle Kommentare mit Text und Zeitstempel
- Alle Emotionen/Reaktionen
- Planner, Packlisten und Einkaufslisten mit Items
- Analytics-Zusammenfassung (Anzahl Views, Anzahl Suchanfragen)

Der Export MUSS als Download mit dem Content-Type `application/json` und dem Header `Content-Disposition: attachment; filename="inspi-datenexport-{datum}.json"` ausgeliefert werden.

#### Scenario: Nutzer exportiert alle eigenen Daten
- **WHEN** ein authentifizierter Nutzer `POST /api/auth/privacy/data-export/` aufruft
- **THEN** gibt das System HTTP 200 mit einer JSON-Datei als Download zurück, die alle personenbezogenen Daten des Nutzers enthält

#### Scenario: Export-Dateiname enthält aktuelles Datum
- **WHEN** der Export am 15.03.2025 durchgeführt wird
- **THEN** hat die Datei den Namen `inspi-datenexport-2025-03-15.json`

#### Scenario: Nicht authentifizierter Nutzer kann nicht exportieren
- **WHEN** ein nicht authentifizierter Nutzer `POST /api/auth/privacy/data-export/` aufruft
- **THEN** gibt das System HTTP 401 zurück

### Requirement: Export enthält Metadaten

Jeder Datenexport MUSS einen `metadata`-Block enthalten mit:
- `exported_at`: ISO-8601 Zeitstempel (UTC)
- `user_email`: Email-Adresse des Nutzers
- `platform`: "Inspi (gruppenstunde.de)"
- `data_categories`: Liste der enthaltenen Kategorien

#### Scenario: Metadaten sind im Export enthalten
- **WHEN** ein Nutzer seinen Datenexport öffnet
- **THEN** enthält das JSON-Root-Objekt ein `metadata`-Feld mit `exported_at`, `user_email`, `platform` und `data_categories`

### Requirement: Export-Performance

Der Datenexport MUSS innerhalb von 30 Sekunden abgeschlossen sein. Das System MUSS optimierte Datenbankabfragen mit `select_related` und `prefetch_related` verwenden.

#### Scenario: Export unter 30 Sekunden
- **WHEN** ein Nutzer mit durchschnittlicher Datenmenge (50 Event-Registrierungen, 100 Kommentare, 20 Inhalte) den Export auslöst
- **THEN** ist der Download innerhalb von 30 Sekunden abgeschlossen
