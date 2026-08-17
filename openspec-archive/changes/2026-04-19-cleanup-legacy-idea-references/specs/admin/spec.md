## MODIFIED Requirements

### Requirement: Admin-Dashboard Statistiken
Das Admin-Dashboard SHALL Statistiken über alle Content-Typen anzeigen, unter Verwendung der "content"-Terminologie statt "idea".

#### Scenario: Dashboard zeigt Content-Statistiken
- **WHEN** ein Admin GET `/api/admin/stats/` aufruft
- **THEN** SHALL die Response `total_content`, `published_content` Felder enthalten (statt `total_ideas`, `published_ideas`)
- **THEN** SHALL `top_content` eine Liste der meistgesehenen Inhalte enthalten (statt `top_ideas`)
- **THEN** SHALL `recent_content` die neuesten Inhalte enthalten (statt `recent_ideas`)
- **THEN** SHALL jedes Content-Item ein `content_type` Feld haben (statt `idea_type`) mit Werten wie `session`, `blog`, `game`, `recipe`

### Requirement: Admin-Benutzerdetail zeigt Content
Das Admin-Benutzerdetail SHALL die Inhalte eines Benutzers mit korrekter Terminologie anzeigen.

#### Scenario: Benutzer-Content auflisten
- **WHEN** ein Admin GET `/api/admin/users/{id}/` aufruft
- **THEN** SHALL die Response ein `content` Array enthalten (statt `ideas`)
- **THEN** SHALL jedes Item `content_type` statt `idea_type` verwenden
