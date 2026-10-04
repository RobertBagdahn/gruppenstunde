## ADDED Requirements

### Requirement: Eingeloggte Nutzer sehen keine Anmeldeaufforderung
`/login` und `/register` SHALL eingeloggte Nutzer auf das `next`-Ziel oder die Startseite weiterleiten (außer im Re-Auth-Modus). Tool-Landingpages MUST keinen Anmelde-Button für eingeloggte Nutzer anzeigen.

#### Scenario: Eingeloggt auf /login
- **WHEN** ein eingeloggter Nutzer `/login` öffnet
- **THEN** wird er weitergeleitet

#### Scenario: Landingpage eingeloggt
- **WHEN** ein eingeloggter Nutzer `/meal-plans` öffnet
- **THEN** fehlt der Button „Kostenlos anmelden“

#### Scenario: Re-Auth
- **WHEN** die Sitzung eine erneute Anmeldung verlangt
- **THEN** bleibt das Anmeldeformular erreichbar
