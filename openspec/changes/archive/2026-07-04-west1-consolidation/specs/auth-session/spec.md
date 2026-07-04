## MODIFIED Requirements

### Requirement: Session-basierte Authentifizierung

Das System MUST Django-Session-Authentifizierung mit HTTP-only Cookies verwenden. JWT-Token SHALL NOT verwendet werden.

#### Scenario: Erfolgreicher Login (Same-Origin)

- **GIVEN** ein Benutzer mit gültigen Zugangsdaten
- **WHEN** der Benutzer POST `/api/auth/login/` mit E-Mail und Passwort absendet
- **THEN** wird ein Session-Cookie gesetzt (HTTP-only, Secure, SameSite=Lax)
- **AND** die Benutzerdaten werden zurückgegeben: `{ id, email, first_name, last_name, is_staff }`
- **AND** das CSRF-Token wird erneuert

## ADDED Requirements

### Requirement: iOS-Kompatibilität

Session-Cookies SHALL mit SameSite=Lax gesetzt werden, damit iOS WebKit (Chrome/Safari) die Cookies akzeptiert. iOS blockiert Third-Party-Cookies — die Session darf nicht auf Cross-Origin-Cookies angewiesen sein.

#### Scenario: Login auf iOS

- **GIVEN** ein User auf iOS (Chrome oder Safari)
- **WHEN** der User sich auf `essensplan.app` oder `gruppenstunde.de` anmeldet
- **THEN** wird die Session-Cookie vom Browser akzeptiert (nicht als Third-Party blockiert)
- **AND** Folgerequests sind authentifiziert

### Requirement: CSRF-Cookie mit SameSite=Lax

CSRF-Cookies SHALL in der Produktion `SameSite=Lax` verwenden.

#### Scenario: CSRF-Schutz bei Login

- **GIVEN** der User hat die Login-Seite geladen (CSRF-Cookie gesetzt)
- **WHEN** der User das Login-Formular absendet
- **THEN** sendet das Frontend `X-CSRFToken` aus `document.cookie`
- **AND** der Server validiert das Token gegen das Cookie
- **AND** der Login wird ausgeführt
