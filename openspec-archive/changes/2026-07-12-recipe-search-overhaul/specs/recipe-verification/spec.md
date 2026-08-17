# Spec: Recipe Verification

Staff-Workflow zur Verifizierung von Rezepten mit Rule-Check, Warning-Dialog und Verification-Readiness-Score.

## ADDED Requirements

### Requirement: Staff verification endpoint
Ein authentifizierter Staff-User SHALL ein Rezept über `POST /api/recipes/{id}/verify/` verifizieren können. Der Endpoint SHALL das Rezept auf aktive Rules und Pflichtfelder prüfen und bei nicht erfüllten Bedingungen eine Warnung zurückgeben.

#### Scenario: Successful verification without warnings
- **WHEN** ein Staff-User `POST /api/recipes/{id}/verify/` mit `{ "confirm": true }` aufruft UND alle aktiven Rules und Pflichtfelder erfüllt sind
- **THEN** wird der Rezept-Status auf `approved` gesetzt
- **THEN** wird ein `ApprovalLog`-Eintrag mit `action="approved"` und dem Reviewer erstellt
- **THEN** gibt der Endpoint `{ "status": "approved", "warnings": [] }` zurück

#### Scenario: Verification with warnings
- **WHEN** ein Staff-User `POST /api/recipes/{id}/verify/` mit `{ "confirm": true }` aufruft UND mindestens eine aktive Rule oder ein Pflichtfeld nicht erfüllt ist
- **THEN** wird der Rezept-Status trotzdem auf `approved` gesetzt (confirm = true)
- **THEN** wird ein `ApprovalLog`-Eintrag mit `action="approved"` und den Warnungen im `reason`-Feld erstellt
- **THEN** gibt der Endpoint `{ "status": "approved", "warnings": [...] }` zurück

#### Scenario: Preview verification without confirming
- **WHEN** ein Staff-User `POST /api/recipes/{id}/verify/` mit `{ "confirm": false }` aufruft
- **THEN** wird der Status NICHT geändert
- **THEN** gibt der Endpoint `{ "can_verify": true/false, "warnings": [...], "rules_passed": X, "rules_total": Y }` zurück

#### Scenario: Non-staff user cannot verify
- **WHEN** ein nicht-Staff-User `POST /api/recipes/{id}/verify/` aufruft
- **THEN** gibt der Endpoint `403 Forbidden` zurück

#### Scenario: Unauthenticated user cannot verify
- **WHEN** ein anonymer User `POST /api/recipes/{id}/verify/` aufruft
- **THEN** gibt der Endpoint `403 Forbidden` zurück

#### Scenario: Recipe not found
- **WHEN** `POST /api/recipes/{id}/verify/` mit einer nicht existierenden ID aufgerufen wird
- **THEN** gibt der Endpoint `404 Not Found` zurück

### Requirement: Verification status endpoint
Das System SHALL einen Endpoint `GET /api/recipes/{id}/verification-status/` bereitstellen, der den aktuellen Verification-Readiness-Zustand eines Rezepts zurückgibt.

#### Scenario: Get verification status for a recipe
- **WHEN** `GET /api/recipes/{id}/verification-status/` aufgerufen wird
- **THEN** gibt der Endpoint `{ "rules_passed": 8, "rules_total": 10, "warnings": [...], "can_verify": false, "missing_fields": [...] }` zurück
- **THEN** ist `can_verify` false wenn mindestens ein kritisches Pflichtfeld fehlt

#### Scenario: Fully ready recipe
- **WHEN** ein Rezept alle aktiven Rules und Pflichtfelder erfüllt
- **THEN** gibt der Endpoint `{ "rules_passed": 10, "rules_total": 10, "warnings": [], "can_verify": true, "missing_fields": [] }` zurück

### Requirement: Verification warning dialog im Food-Frontend
Auf der Rezept-Detailseite SHALL für Staff-User ein "Verifizieren"-Button sichtbar sein. Beim Klick SHALL ein Dialog die Ergebnisse des Verification-Checks anzeigen.

#### Scenario: Staff sees verify button
- **WHEN** ein Staff-User die Rezept-Detailseite öffnet UND der Rezept-Status nicht `approved` ist
- **THEN** wird ein "Verifizieren"-Button im Action-Bereich angezeigt

#### Scenario: Staff clicks verify with warnings
- **WHEN** Staff-User auf "Verifizieren" klickt UND der Preview-Check Warnings zurückgibt
- **THEN** zeigt der Dialog: "⚠️ 2 von 10 Regeln nicht erfüllt" mit Liste der Warnungen
- **THEN** zeigt der Dialog die Buttons "Abbrechen" und "Trotzdem verifizieren"

#### Scenario: Staff clicks verify without warnings
- **WHEN** Staff-User auf "Verifizieren" klickt UND der Preview-Check keine Warnings zurückgibt
- **THEN** zeigt der Dialog: "✅ Alle Regeln erfüllt" und den Button "Verifizieren"

#### Scenario: Staff confirms verify
- **WHEN** Staff-User "Trotzdem verifizieren" oder "Verifizieren" klickt
- **THEN** wird `POST /api/recipes/{id}/verify/` mit `{ "confirm": true }` aufgerufen
- **THEN** wird der Rezept-Status im Frontend aktualisiert
- **THEN** erscheint ein Toast "Rezept verifiziert"

### Requirement: Verification readiness score on recipe detail
Die Rezept-Detailseite SHALL einen Verification-Readiness-Fortschrittsbalken anzeigen, der für Autoren und Staff sichtbar ist.

#### Scenario: Author sees readiness score
- **WHEN** der Rezept-Autor die Detailseite öffnet UND das Rezept nicht approved ist
- **THEN** wird ein Fortschrittsbalken "8/10 Regeln erfüllt" mit Icon angezeigt
- **THEN** unter dem Balken erscheint eine Liste der nicht erfüllten Regeln/Pflichtfelder

#### Scenario: Approved recipe shows no readiness score
- **WHEN** ein approved Rezept geöffnet wird
- **THEN** wird kein Fortschrittsbalken angezeigt (nur der verified-Badge)

#### Scenario: Non-author, non-staff sees no readiness score
- **WHEN** ein nicht-autorisierter User die Detailseite öffnet
- **THEN** wird kein Fortschrittsbalken angezeigt

### Requirement: Verification quality check rules
Der Verification-Check SHALL alle aktiven Rules (`is_active=True`) aus dem Recipe-Rule-System prüfen sowie definierte Pflichtfelder.

#### Scenario: Rule check covers all active rules
- **WHEN** der Verification-Check läuft
- **THEN** werden ALLE Rules mit `is_active=True` evaluiert
- **THEN** jede nicht bestandene Rule wird als Warning mit `rule_name`, `rule_description` und `hint_level` zurückgegeben

#### Scenario: Required field check
- **WHEN** der Verification-Check läuft
- **THEN** werden folgende Pflichtfelder geprüft: `image` (muss vorhanden sein), `description` (nicht leer), `recipe_items` (mindestens 1), `steps` (mindestens 1)
- **THEN** jedes fehlende Pflichtfeld wird als Warning zurückgegeben
