## MODIFIED Requirements

### Requirement: Verified badge on ingredient detail page
Die Zutatendetailseite SHALL ein "Inspi Verified"-Badge anzeigen, wenn die Zutat den Status "verified" hat.

#### Scenario: Verified badge shown
- **WHEN** eine Zutat `status: "verified"` hat
- **THEN** wird ein grünes "✓ Inspi Verified"-Badge im Header angezeigt

#### Scenario: Verified badge hidden for non-verified
- **WHEN** eine Zutat `status: "draft"` hat
- **THEN** wird das Verified-Badge NICHT angezeigt, stattdessen ein "Entwurf"-Badge

### Requirement: Staff can verify an ingredient
Staff-Nutzer SHALL eine Zutat als "verified" markieren können. Die Sichtbarkeit des Buttons MUST sich ausschließlich nach dem API-Feld `can_verify` richten. Das Backend MUST den Statuswechsel für Nicht-Staff-Nutzer mit HTTP 403 ablehnen, unabhängig von der Oberfläche.

#### Scenario: Verify button for staff
- **WHEN** ein Nutzer eine nicht-verifizierte Zutat ansieht und die API `can_verify: true` liefert
- **THEN** wird ein Button "Verifizieren" angezeigt

#### Scenario: Verify action
- **WHEN** ein Staff-Nutzer auf "Verifizieren" klickt
- **THEN** wird der Status auf "verified" gesetzt und das Verified-Badge erscheint

#### Scenario: Verify button hidden for non-staff
- **WHEN** die API `can_verify: false` liefert
- **THEN** wird kein "Verifizieren"-Button angezeigt

#### Scenario: Non-staff sends status via API
- **WHEN** ein angemeldeter Nicht-Staff-Nutzer `PATCH /api/ingredients/{slug}/` mit `status: "verified"` sendet
- **THEN** antwortet die API mit HTTP 403
