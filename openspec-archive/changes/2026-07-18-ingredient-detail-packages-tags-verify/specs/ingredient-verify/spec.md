## ADDED Requirements

### Requirement: Verified badge on ingredient detail page
Die Zutatendetailseite SHALL ein "Inspi Verified"-Badge anzeigen, wenn die Zutat den Status "verified" hat.

#### Scenario: Verified badge shown
- **WHEN** eine Zutat `status: "verified"` hat
- **THEN** wird ein grünes "✓ Inspi Verified"-Badge im Header angezeigt

#### Scenario: Verified badge hidden for non-verified
- **WHEN** eine Zutat `status: "draft"` oder `status: "user_content"` hat
- **THEN** wird das Verified-Badge NICHT angezeigt, stattdessen der bisherige Status-Badge

### Requirement: Staff can verify an ingredient
Staff-Nutzer SHALL eine Zutat als "verified" markieren können.

#### Scenario: Verify button for staff
- **WHEN** ein Staff-Nutzer eine nicht-verifizierte Zutat ansieht
- **THEN** wird ein Button "Verifizieren" angezeigt

#### Scenario: Verify action
- **WHEN** ein Staff-Nutzer auf "Verifizieren" klickt
- **THEN** wird der Status auf "verified" gesetzt und das Verified-Badge erscheint

#### Scenario: Verify button hidden for non-staff
- **WHEN** ein nicht-Staff-Nutzer die Seite öffnet
- **THEN** wird kein "Verifizieren"-Button angezeigt
