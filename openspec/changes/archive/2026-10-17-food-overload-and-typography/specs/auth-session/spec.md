## ADDED Requirements

### Requirement: Eine überlastete Anmeldeprüfung ist keine Abmeldung
Die Food-Frontend-Anwendung SHALL die Anmeldeprüfung `GET /api/auth/me/` bei Überlastung (429), Serverfehlern (5xx) oder Netzfehlern wiederholen, bevor sie einen Nutzer als abgemeldet behandelt. Die Anmeldeaufforderung MUST nur bei `is_authenticated: false` oder HTTP 401 erscheinen.

#### Scenario: Kurze Überlastung meldet niemanden ab
- **GIVEN** ein angemeldeter Nutzer öffnet eine Einkaufsliste
- **WHEN** die ersten beiden Anmeldeprüfungen HTTP 429 liefern und die dritte erfolgreich ist
- **THEN** sieht der Nutzer die Liste
- **AND** die Anmeldeaufforderung erscheint nicht

#### Scenario: Dauerhafte Überlastung zeigt eine Wiederholung
- **GIVEN** alle Anmeldeprüfungen liefern HTTP 429
- **WHEN** die Wiederholungen erschöpft sind
- **THEN** zeigt die Seite „Anmeldung gerade nicht prüfbar“ mit „Erneut versuchen“
- **AND** nicht die Anmeldeaufforderung

#### Scenario: Erneut versuchen nach Überlastung
- **GIVEN** die Seite zeigt „Anmeldung gerade nicht prüfbar“
- **WHEN** der Nutzer „Erneut versuchen“ wählt und die Prüfung gelingt
- **THEN** erscheint die Liste

#### Scenario: Echte Abmeldung bleibt erkennbar
- **WHEN** `GET /api/auth/me/` eine Antwort mit `is_authenticated: false` liefert
- **THEN** zeigt die Seite die Anmeldeaufforderung

#### Scenario: Gast bleibt auf der Liste
- **GIVEN** ein Gast besitzt ein gültiges Gast-Token
- **WHEN** die Anmeldeprüfung fehlschlägt
- **THEN** bleibt die Liste sichtbar
