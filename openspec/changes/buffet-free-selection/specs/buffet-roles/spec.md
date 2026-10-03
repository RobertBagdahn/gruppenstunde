# Buffet-Rollen

## MODIFIED Requirements

### Requirement: Buffet-Rollen als Tags
Das System SHALL die folgenden 19 Rollen-Tags mit `group="buffet"` und dem Eltern-Tag `buffet` („Buffet“) bereitstellen. Bestehende Slugs bleiben unverändert; zusätzliche Rollen werden per Datenmigration idempotent über den Slug angelegt. Die deutschen Namen SHALL echte Umlaute enthalten, wo sprachlich erforderlich. Jede neue Rolle SHALL ein gültiges Icon aus der bestehenden Icon-Menge verwenden.

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
| `buffet-cheese` | Käse |
| `buffet-salty-snack` | Knabbereien |
| `buffet-sweet-snack` | Süßes & Kekse |
| `buffet-nuts` | Nüsse & Trockenobst |
| `buffet-dip` | Dips |
| `buffet-salad` | Salate |
| `buffet-carb` | Beilagen |
| `buffet-main` | Hauptkomponente |
| `buffet-soup` | Suppen & Eintöpfe |
| `buffet-topping` | Toppings & Extras |

#### Scenario: Rollen nach Migration vorhanden
- **WHEN** die Migrationen ausgeführt wurden
- **THEN** existieren alle 19 Rollen-Tags mit den angegebenen Namen, `group="buffet"` und Eltern-Tag `buffet`

#### Scenario: Dips und Würze bleiben getrennte Rollen
- **WHEN** Staff eine Rolle für einen Artikel auswählt
- **THEN** ist `buffet-dip` ausschließlich für Dips und `buffet-condiment` für klassische Soßen und Würze vorgesehen
- **THEN** leitet die Retail-Section „Saucen & Würzsaucen“ allein keine `buffet-dip`-Zuordnung ab

#### Scenario: Migration wiederholt
- **WHEN** die Rollen-Migration erneut ausgeführt wird
- **THEN** werden keine doppelten Rollen angelegt und vorhandene Staff-Änderungen an existierenden Tags nicht überschrieben

#### Scenario: UI zeigt deutsche Namen
- **WHEN** ein Nutzer die Tags einer Zutat mit Rolle `buffet-savory` ansieht
- **THEN** wird „Belag herzhaft“ angezeigt und nicht der Slug

#### Scenario: Neue Rollen verwenden bekannte Icons
- **WHEN** die Migration eine neue Buffet-Rolle anlegt
- **THEN** erhält sie ein Icon aus der bestehenden unterstützten Icon-Menge

### Requirement: Rollen gelten für Zutaten und Rezepte
Rollen-Tags SHALL sowohl an `supply.Ingredient` als auch an `recipe.Recipe` vergeben werden können. Eine Zutat oder ein Rezept DARF mehrere Buffet-Rollen tragen. Das Rollen-Tag ist eine redaktionelle Favoriten-/Katalogzuordnung und DARF NICHT Voraussetzung für eine Auswahl im Buffet-Builder sein.

#### Scenario: Selbst gebackene Brötchen als Brot
- **WHEN** das Rezept „Quark-Hafer-Brötchen“ die Rolle `buffet-bread` trägt
- **THEN** erscheint es im Buffet-Katalog unter „Brot & Gebäck“ als Rezept-Eintrag

#### Scenario: Item trägt mehrere Rollen
- **WHEN** Staff einer Zutat oder einem Rezept mehrere Buffet-Rollen vergibt
- **THEN** erscheint das Item als Favorit in jedem zugeordneten Rollen-Katalog

#### Scenario: Freie Auswahl ohne Rollen-Tag
- **GIVEN** ein Item ist für den Nutzer sichtbar, trägt aber kein Buffet-Rollen-Tag
- **WHEN** es im Builder einer Rolle hinzugefügt und gespeichert wird
- **THEN** bleibt die globale Tag-Zuordnung unverändert und die Auswahl wird nur der betreffenden Buffet-Rolle zugeordnet

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
