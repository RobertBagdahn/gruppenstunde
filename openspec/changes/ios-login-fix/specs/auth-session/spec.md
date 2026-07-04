## ADDED Requirements

### Requirement: Session-Cookies mit SameSite=Lax

Session-Cookies SHALL in der Produktionsumgebung `SameSite=Lax` verwenden, da API-Calls same-origin durch den nginx-Proxy laufen. iOS WebKit blockiert Third-Party-Cookies — deshalb darf die Session nicht auf Cross-Origin-Cookies angewiesen sein.

#### Scenario: Login auf iOS

- **GIVEN** ein User auf iOS (Chrome oder Safari)
- **WHEN** der User sich auf `essensplan.app` oder `gruppenstunde.de` anmeldet
- **THEN** wird die Session-Cookie vom Browser akzeptiert (nicht als Third-Party blockiert)
- **AND** Folgerequests sind authentifiziert

### Requirement: CSRF-Cookie mit SameSite=Lax

CSRF-Cookies SHALL in der Produktion `SameSite=Lax` verwenden. Der CSRF-Mechanismus (Double-Submit-Cookie) funktioniert damit zuverlässig bei same-origin-Requests durch den nginx-Proxy.

#### Scenario: CSRF-Schutz bei Login

- **GIVEN** der User hat die Login-Seite geladen (CSRF-Cookie gesetzt)
- **WHEN** der User das Login-Formular absendet
- **THEN** sendet das Frontend `X-CSRFToken` aus `document.cookie`
- **AND** der Server validiert das Token gegen das Cookie
- **AND** der Login wird ausgeführt
