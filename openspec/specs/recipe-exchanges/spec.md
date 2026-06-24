## ADDED Requirements

### Requirement: Rezeptautor kann Exchange-Gruppen anlegen

Der Autor eines Rezepts SHALL Exchange-Gruppen anlegen können, die austauschbare Zutaten zusammenfassen. Eine Exchange-Gruppe gehört zu einem Rezept und hat einen optionalen Namen (z.B. "Käse-Ersatz"). Jedes Mitglied der Gruppe ist ein `RecipeItem` mit `exchange_group`-FK und `exchange_position` (int). `exchange_position=0` ist das Original/Default.

Eine Zutat MUST entweder `is_optional=True` ODER Teil einer Exchange-Gruppe sein — nie beides. Eine DB-CHECK-CONSTRAINT erzwingt dies als Sicherheitsnetz; die API validiert zusätzlich und gibt bei Verstoß HTTP 400 mit deutscher Fehlermeldung zurück.

#### Scenario: Exchange-Gruppe mit zwei Gliedern anlegen

- **WHEN** der Autor auf "Alternative hinzufügen" an einer Zutat klickt und eine neue Zutat wählt
- **THEN** wird eine `RecipeItemExchangeGroup` angelegt und beide `RecipeItem`-Einträge erhalten `exchange_group=<gruppe>` und `exchange_position` 0 bzw. 1

#### Scenario: Weiteres Glied einer bestehenden Gruppe hinzufügen

- **WHEN** der Autor erneut "Alternative hinzufügen" an einem bereits gruppierten RecipeItem klickt
- **THEN** wird ein neues `RecipeItem` mit `exchange_position=2` (nächste freie Position) zur bestehenden Gruppe hinzugefügt

#### Scenario: Jedes Ketten-Glied hat eigene Menge

- **WHEN** der Autor Parmesan (30g/Port.) durch Hefeflocken (20g/Port.) ersetzt
- **THEN** speichert das Hefeflocken-`RecipeItem` eine eigene `quantity` und `portion` unabhängig vom Original

#### Scenario: Exchange-Gruppe löschen ohne aktive Splits

- **WHEN** der Autor eine Exchange-Gruppe löscht und kein `MealItemSplit` auf ihre Mitglieder zeigt
- **THEN** löscht die API-Logik die Nicht-Default-Glieder (exchange_position > 0) und setzt das Original-RecipeItem (position 0) auf `exchange_group=NULL` zurück, sodass es als normale Zutat erhalten bleibt

#### Scenario: Löschen eines Ketten-Glieds mit aktiven Splits blockiert

- **WHEN** der Autor versucht, ein Ketten-Glied zu löschen, auf das ein aktiver `MealItemSplit` zeigt
- **THEN** verhindert die DB-Beziehung `MealItemSplit → RecipeItem` (PROTECT) das Löschen; das Backend gibt HTTP 409 zurück mit Fehlermeldung "Diese Zutat wird in aktiven Essensplänen verwendet und kann nicht gelöscht werden."

#### Scenario: Rezept mit aktiven Splits nicht löschbar

- **WHEN** ein Autor versucht, ein ganzes Rezept zu löschen, dessen RecipeItems aktive `MealItemSplit`-Einträge haben
- **THEN** wird das Löschen blockiert (HTTP 409) mit Fehlermeldung "Dieses Rezept wird in Essensplänen mit konfigurierten Varianten verwendet und kann nicht gelöscht werden."

### Requirement: Exchange-Gruppen in der Rezeptansicht anzeigen

Die öffentliche Rezeptansicht SHALL Exchange-Alternativen direkt in der Zutatenliste anzeigen, sodass Lesende alle Optionen auf einen Blick sehen.

#### Scenario: Alternativen in Klammern anzeigen

- **WHEN** ein Besucher die Rezeptdetailseite aufruft und das Rezept Exchange-Gruppen hat
- **THEN** erscheint jede Exchange-Gruppe als eine Zeile: `Parmesan (oder: Hefeflocken / Cashew-Creme)`

#### Scenario: Rezept ohne Exchange-Gruppen unverändert

- **WHEN** ein Besucher die Rezeptdetailseite aufruft und das Rezept keine Exchange-Gruppen hat
- **THEN** wird die Zutatenliste wie bisher ohne Änderungen angezeigt

### Requirement: Fork kopiert Exchange-Gruppen vollständig

Beim Forken eines Rezepts MUST das System alle `RecipeItemExchangeGroup`-Objekte und die zugehörigen `RecipeItem`-Flags (`exchange_group`, `exchange_position`) als neue, unabhängige Objekte kopieren.

#### Scenario: Fork mit Exchange-Gruppen

- **WHEN** ein Nutzer ein Rezept mit Exchange-Gruppen forkt
- **THEN** hat das geforkte Rezept eigene Kopien aller Exchange-Gruppen und ihrer Mitglieder; Änderungen am Original propagieren nicht in den Fork

### Requirement: Exchange-Gruppen in API

Das System SHALL CRUD-Endpunkte für Exchange-Gruppen bereitstellen, zugänglich für authentifizierte Autoren des Rezepts.

#### Scenario: Exchange-Gruppe anlegen (API)

- **WHEN** ein authentifizierter Autor `POST /{recipe_id}/exchanges/` (recipe-Router) mit optionalem `name` aufruft
- **THEN** wird eine neue `RecipeItemExchangeGroup` angelegt und mit HTTP 201 zurückgegeben

#### Scenario: Exchange-Gruppe löschen (API) — aktive Splits blockieren

- **WHEN** `DELETE /{recipe_id}/exchanges/{group_id}/` aufgerufen wird und aktive Splits auf Glieder zeigen
- **THEN** antwortet das Backend mit HTTP 409 und einer deutschen Fehlermeldung
