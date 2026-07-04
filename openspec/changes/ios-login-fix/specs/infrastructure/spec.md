## ADDED Requirements

### Requirement: Same-Origin API-Routing

Frontend-API-Calls SHALL über den nginx-Proxy der eigenen Cloud-Run-Service laufen, nicht direkt per Cross-Origin-Request zum Backend.

#### Scenario: API-Call durch nginx-Proxy

- **GIVEN** ein User ruft `essensplan.app` oder `gruppenstunde.de` auf
- **WHEN** das Frontend einen API-Call an `/api/auth/me/` sendet
- **THEN** geht der Request durch den nginx-Proxy (`location /api/`)
- **AND** der nginx leitet an `${BACKEND_URL}/api/auth/me/` weiter
- **AND** der Browser sieht die Antwort als same-origin (vom Frontend-Domain)

#### Scenario: Kein VITE_API_URL

- **GIVEN** der Frontend-Build-Prozess
- **WHEN** das Docker-Image gebaut wird
- **THEN** SHALL `VITE_API_URL` leer sein (Default, kein Build-Arg gesetzt)
- **AND** die React-App verwendet relative URLs (`/api/...`)

### Requirement: Cookie-SameSite für Same-Origin

Die Backend-Session- und CSRF-Cookies SHALL `SameSite=Lax` in Produktion verwenden, da API-Calls same-origin durch den nginx-Proxy laufen. `SameSite=None` ist nicht erforderlich und SHALL NICHT verwendet werden.

#### Scenario: Session-Cookie mit SameSite=Lax

- **GIVEN** ein erfolgreicher Login über den nginx-Proxy
- **WHEN** der Backend `Set-Cookie: sessionid=...` sendet
- **THEN** hat das Cookie `SameSite=Lax` (nicht `None`)
- **AND** das Cookie hat `Secure=true`
- **AND** der Browser speichert es für das Frontend-Domain (same-origin)

### Requirement: Kein proxy_cookie_path-Hack

Der nginx-Proxy SHALL NICHT `proxy_cookie_path` zur Manipulation von Cookie-Attributen verwenden. Die Cookie-Settings werden allein vom Backend gesteuert.

#### Scenario: Cookie-Pass-Through

- **GIVEN** eine Anfrage durch den nginx-Proxy
- **WHEN** das Backend `Set-Cookie`-Header setzt
- **THEN** gibt der nginx diese Header unverändert an den Client weiter
- **AND** es wird kein `proxy_cookie_path` angewendet
