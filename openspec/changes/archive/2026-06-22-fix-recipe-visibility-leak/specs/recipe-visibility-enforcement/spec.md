## ADDED Requirements

### Requirement: Alle Recipe-Subaccessoren prüfen Visibility

Jeder API-Endpunkt, der ein `Recipe`-Objekt abruft, muss denselben Visibility-Filter anwenden wie die Haupt-Listing-Endpunkte.

#### Scenario: Unauthentifizierter Zugriff auf private Recipe-Items
- **WHEN** ein unauthentifizierter Nutzer `GET /api/recipes/{id}/recipe-items/` aufruft und das Rezept privat ist
- **THEN** antwortet der Server mit `403 Forbidden`

#### Scenario: Authentifizierter Zugriff auf fremdes privates Rezept
- **WHEN** ein eingeloggter Nutzer `GET /api/recipes/{id}/recipe-items/` aufruft und das Rezept einem anderen Nutzer gehört und privat ist
- **THEN** antwortet der Server mit `404 Not Found`

#### Scenario: Legitimer Zugriff auf eigenes Rezept
- **WHEN** der Owner eines privaten Rezepts `GET /api/recipes/{id}/recipe-items/` aufruft
- **THEN** liefert der Server die Zutaten korrekt zurück

### Requirement: suggest_ingredients hat Limit-Obergrenze

#### Scenario: Überhöhtes Limit abgewiesen
- **WHEN** ein Nutzer `GET /api/ingredients/suggest/?limit=10000` aufruft
- **THEN** antwortet der Server mit `422 Unprocessable Entity`

#### Scenario: Unauthentifizierter Zugriff auf suggest_ingredients
- **WHEN** ein unauthentifizierter Nutzer `/api/ingredients/suggest/` aufruft
- **THEN** antwortet der Server mit `403 Forbidden`
