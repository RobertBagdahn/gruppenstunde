## ADDED Requirements

### Requirement: Buffet-Rollen als Tags
Das System SHALL genau neun Rollen-Tags mit `group="buffet"` und dem Eltern-Tag `buffet` („Buffet“) bereitstellen:

| slug | name |
|---|---|
| `buffet-bread` | Brot & Gebäck |
| `buffet-fat` | Streichfett |
| `buffet-savory` | Belag herzhaft |
| `buffet-sweet` | Belag süß |
| `buffet-condiment` | Soßen & Würze |
| `buffet-fresh` | Gemüse & Obst |
| `buffet-cereal` | Müsli & Joghurt |
| `buffet-drink` | Getränke |
| `buffet-dish` | Gerichte |

Die Tags MUST per Datenmigration angelegt werden (idempotent über den Slug) und deutsche Namen mit echten Umlauten tragen.

#### Scenario: Rollen nach Migration vorhanden
- **WHEN** die Migrationen ausgeführt wurden
- **THEN** existieren die neun Rollen-Tags mit den angegebenen Namen, `group="buffet"` und Eltern-Tag `buffet`

#### Scenario: UI zeigt deutsche Namen
- **WHEN** ein Nutzer die Tags einer Zutat mit Rolle `buffet-savory` ansieht
- **THEN** wird „Belag herzhaft“ angezeigt und nicht der Slug

### Requirement: Rollen gelten für Zutaten und Rezepte
Rollen-Tags SHALL sowohl an `supply.Ingredient` als auch an `recipe.Recipe` vergeben werden können. Eine Zutat oder ein Rezept DARF mehrere Rollen tragen, SHOULD aber genau eine tragen.

#### Scenario: Selbst gebackene Brötchen als Brot
- **WHEN** das Rezept „Quark-Hafer-Brötchen“ die Rolle `buffet-bread` trägt
- **THEN** erscheint es im Buffet-Katalog in der Rolle „Brot & Gebäck“ als Rezept-Eintrag

### Requirement: Rollen-Pflege nur durch Staff
Das Setzen und Entfernen von Rollen-Tags über die bestehenden Tag-Picker an Zutat und Rezept SHALL nur Staff-Nutzern möglich sein, auch wenn ein Nicht-Staff-Nutzer die Zutat oder das Rezept sonst bearbeiten darf (z. B. Owner eines Entwurfs gemäß `food-access-policy`). Andere Tags bleiben nach den bestehenden Bearbeitungsrechten änderbar. Andere Nutzer MUST die Rollen nur lesend sehen.

#### Scenario: Staff vergibt Rolle
- **WHEN** ein Staff-Nutzer der Zutat „Salatgurke“ die Rolle „Gemüse & Obst“ gibt
- **THEN** erscheint „Salatgurke“ im Buffet-Katalog unter „Gemüse & Obst“

#### Scenario: Nicht-Staff kann Rolle nicht setzen
- **WHEN** ein angemeldeter Nicht-Staff-Nutzer per `PATCH /api/ingredients/{slug}/` die Tags mit `group="buffet"` einer Zutat verändern will
- **THEN** antwortet die API mit 403

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer versucht, einer Zutat einen Rollen-Tag hinzuzufügen
- **THEN** antwortet die API mit 403 und ändert nichts
