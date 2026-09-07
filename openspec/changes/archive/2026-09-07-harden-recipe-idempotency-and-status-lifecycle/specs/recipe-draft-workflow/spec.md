## MODIFIED Requirements

### Requirement: Draft-Status-Lifecycle
Ein Rezept durchläuft folgende Status-Übergänge: `draft` nach Erstellung, `submitted` wenn ein Besitzer ein Rezept mit `visibility=public` fertigstellt, und `approved` nach erfolgreicher Staff-Moderation. Bei `visibility=private` oder `visibility=group` bleibt der Status auch nach Fertigstellung `draft`. Jeder öffentliche Übergang SHALL weiterhin die vorhandenen Zutaten- und Berechtigungsregeln erfüllen.

#### Scenario: Öffentliches Rezept wird eingereicht
- **WHEN** der Besitzer in Step 4 „Fertigstellen“ klickt und `visibility="public"` gesetzt ist
- **THEN** der Status SHALL auf `submitted` gesetzt werden
- **THEN** das Rezept SHALL nicht sofort als öffentlich genehmigt erscheinen

#### Scenario: Privates Rezept bleibt Draft
- **WHEN** der Besitzer ein Rezept mit `visibility="private"` fertigstellt
- **THEN** der Status SHALL `draft` bleiben
- **THEN** das Rezept SHALL nur für den Besitzer sichtbar bleiben

#### Scenario: Gruppenrezept bleibt Draft
- **WHEN** der Besitzer ein Rezept mit `visibility="group"` fertigstellt
- **THEN** der Status SHALL `draft` bleiben
- **THEN** die öffentliche Suche SHALL das Rezept nicht als genehmigtes Rezept ausliefern

#### Scenario: Öffentliche Einreichung ohne Zutaten wird abgelehnt
- **WHEN** der Besitzer ein öffentliches Rezept ohne RecipeItems einreichen will
- **THEN** die API SHALL die Anfrage mit einer deutschen Validierungsfehlermeldung ablehnen
- **THEN** der Status SHALL `draft` bleiben

#### Scenario: Staff genehmigt eingereichtes Rezept
- **WHEN** ein berechtigter Staff-Nutzer ein gültiges `submitted`-Rezept bestätigt
- **THEN** der Status SHALL auf `approved` wechseln
- **THEN** das Rezept DARF danach in öffentlichen genehmigten Listen erscheinen
