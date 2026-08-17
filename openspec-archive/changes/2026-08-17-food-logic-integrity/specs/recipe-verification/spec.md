## MODIFIED Requirements

### Requirement: Staff verification endpoint
Ein authentifizierter Staff-User SHALL ein Rezept über `POST /api/recipes/{id}/verify/` verifizieren können. Der Endpoint SHALL das Rezept auf aktive Rules und Pflichtfelder prüfen und eine Freigabe nur erlauben, wenn `can_verify=true` ist.

#### Scenario: Successful verification without warnings
- **WHEN** ein Staff-User mit `{ "confirm": true }` aufruft und alle Pflichtfelder erfüllt sind
- **THEN** wird der Rezept-Status auf `approved` gesetzt und ein ApprovalLog erstellt

#### Scenario: Pflichtfeld fehlt
- **WHEN** ein Staff-User mit `{ "confirm": true }` aufruft und ein Pflichtfeld fehlt
- **THEN** bleibt der Rezept-Status unverändert
- **THEN** gibt der Endpoint `can_verify=false` und die fehlenden Felder zurück

#### Scenario: Preview verification without confirming
- **WHEN** ein Staff-User mit `{ "confirm": false }` aufruft
- **THEN** wird der Status nicht geändert und der Readiness-Zustand zurückgegeben
