# recipe-exchanges Specification

> **⚠️ MODIFIED — Varianten statt Splits**
> Exchange-Gruppen existieren weiterhin. Die Planung verwendet jetzt `MealItem.active_recipe_item_ids`
> statt `MealItemSplit`. Siehe `openspec/changes/variant-items/`.

## Purpose
Anforderungen an recipe exchanges: Rezeptautor kann Exchange-Gruppen anlegen; Exchange-Gruppen in der Rezeptansicht anzeigen; Fork kopiert Exchange-Gruppen vollständig.
## Requirements
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

#### Scenario: Exchange-Gruppe löschen ohne aktive Varianten

- **WHEN** der Autor eine Exchange-Gruppe löscht und keine Varianten-Items (`MealItem.active_recipe_item_ids`) auf ihre Mitglieder verweisen
- **THEN** löscht die API-Logik die Nicht-Default-Glieder (exchange_position > 0) und setzt das Original-RecipeItem (position 0) auf `exchange_group=NULL` zurück, sodass es als normale Zutat erhalten bleibt

#### Scenario: Löschen eines Ketten-Glieds mit aktiven Varianten blockiert

- **WHEN** der Autor versucht, ein Ketten-Glied zu löschen, auf das aktive Varianten-Items (`MealItem.active_recipe_item_ids`) verweisen
- **THEN** prüft das Backend, ob `MealItem.active_recipe_item_ids` auf dieses RecipeItem verweisen; falls ja, gibt es HTTP 409 zurück mit Fehlermeldung "Diese Zutat wird in aktiven Essensplänen verwendet und kann nicht gelöscht werden."

#### Scenario: Rezept mit aktiven Varianten nicht löschbar

- **WHEN** ein Autor versucht, ein ganzes Rezept zu löschen, dessen RecipeItems in aktiven `MealItem.active_recipe_item_ids`-Listen referenziert werden
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

#### Scenario: Exchange-Gruppe löschen (API) — aktive Varianten blockieren

- **WHEN** `DELETE /{recipe_id}/exchanges/{group_id}/` aufgerufen wird und Varianten-Items auf Glieder verweisen
- **THEN** antwortet das Backend mit HTTP 409 und einer deutschen Fehlermeldung

### Requirement: Delete-Protection über active_recipe_item_ids

Die Delete-Protection für Exchange-Gruppen-Mitglieder und Rezepte SHALL über eine JSON-Contains-Query auf `MealItem.active_recipe_item_ids` erfolgen (statt über den früheren `MealItemSplit`-FK mit PROTECT).

#### Scenario: RecipeItem-Edit mit aktiven Varianten blockiert

- **WHEN** der Autor `is_optional` oder `exchange_group_id` eines RecipeItems ändern will, das in `active_recipe_item_ids` referenziert wird
- **THEN** prüft das Backend `MealItem.objects.filter(active_recipe_item_ids__contains=[item.id]).exists()` und gibt HTTP 409 zurück mit Fehlermeldung "Diese Zutat wird in aktiven Essensplänen verwendet und kann nicht geändert werden."

#### Scenario: Rezept löschen mit aktiven MealItems blockiert

- **WHEN** ein Autor versucht, ein Rezept zu löschen, für das `MealItem.objects.filter(recipe=recipe).exists()` wahr ist
- **THEN** gibt das Backend HTTP 409 zurück mit Fehlermeldung "Dieses Rezept wird in Essensplänen verwendet und kann nicht gelöscht werden."

### Requirement: Accessible draft ingredients may be recipe alternatives
An authenticated user who can edit a recipe SHALL be able to add an Ingredient as an exchange alternative while that Ingredient is in `draft` status, provided the Ingredient is readable by that user under the existing Food access policy. The operation MUST NOT change the Ingredient's verification status or visibility. Draft status alone MUST NOT block an otherwise authorized recipe alternative.

#### Scenario: Add an owned draft ingredient as an alternative
- **GIVEN** the user can edit a recipe and can read an Ingredient in `draft` status
- **WHEN** the user selects that Ingredient as an exchange alternative
- **THEN** the alternative SHALL be added without requiring the Ingredient to be verified
- **THEN** the Ingredient's status and visibility SHALL remain unchanged

#### Scenario: Private draft ingredient of another user
- **WHEN** a user tries to add a private draft Ingredient they cannot read
- **THEN** the API SHALL reject the request without revealing that Ingredient's data
- **THEN** no exchange group or RecipeItem SHALL be created or changed

### Requirement: Alternative creation is atomic and has a valid ingredient portion
The backend SHALL provide one atomic operation for adding an exchange alternative to a RecipeItem. The operation MUST verify edit permission for the recipe, access to the Ingredient that owns the selected active Portion, and that the Portion belongs to that Ingredient. It MUST create or reuse the exchange group, assign the source item, and create the alternative RecipeItem in one transaction. It MUST reject a missing, inactive, or mismatched Portion and MUST leave the recipe unchanged on failure. An exchange alternative MUST NOT be persisted without a resolvable Ingredient name.

#### Scenario: Alternative is added successfully
- **WHEN** the user submits an accessible draft or verified Ingredient with one of its active Portions
- **THEN** the source and new RecipeItem SHALL belong to the same exchange group at the correct positions
- **THEN** the new RecipeItem SHALL retain that Portion and return the Ingredient name

#### Scenario: Portion is missing or does not belong to the selected Ingredient
- **WHEN** the user submits an alternative with no valid active Portion or a Portion belonging to a different Ingredient
- **THEN** the API SHALL return a structured client error
- **THEN** no group membership or RecipeItem changes SHALL be committed

#### Scenario: A mutation fails during alternative creation
- **WHEN** any validation or database operation fails while adding an alternative
- **THEN** the transaction SHALL roll back all group and item changes
- **THEN** the existing source item SHALL remain in its pre-request state
