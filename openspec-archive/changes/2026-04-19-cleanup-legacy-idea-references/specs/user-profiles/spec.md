## MODIFIED Requirements

### Requirement: Eigene Inhalte auflisten
Das System SHALL Benutzern das Anzeigen ihrer eigenen erstellten Inhalte ermöglichen, unter Verwendung der "content"-Terminologie.

#### Scenario: Eigene Inhalte auflisten
- **WHEN** ein authentifizierter Benutzer GET `/api/profile/me/content/` aufruft
- **THEN** SHALL alle vom Benutzer erstellten Inhalte zurückgegeben werden (einschließlich Entwürfe)
- **THEN** SHALL die Antwort `{ id, title, slug, content_type, summary, status, image_url, created_at, updated_at }` pro Item enthalten
- **THEN** SHALL `content_type` Werte wie `session`, `blog`, `game`, `recipe` verwenden

#### Scenario: Legacy-Endpoint Redirect
- **WHEN** ein Client GET `/api/profile/me/ideas/` aufruft
- **THEN** SHALL der Endpoint weiterhin funktionieren (Rückwärtskompatibilität im Übergang)

## REMOVED Requirements

### Requirement: MyIdeaOut und PublicIdeaOut Aliases
**Reason**: Die Aliases `MyIdeaOut = MyContentOut` und `PublicIdeaOut = PublicContentOut` in `profiles/schemas/` werden entfernt. Stattdessen sollen `MyContentOut` und `PublicContentOut` direkt verwendet werden.
**Migration**: Alle Imports von `MyIdeaOut`/`PublicIdeaOut` durch `MyContentOut`/`PublicContentOut` ersetzen.
