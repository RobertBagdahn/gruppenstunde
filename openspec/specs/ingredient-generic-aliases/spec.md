## Purpose
Das System soll generische Alias-Namen (wie „Pfeffer", „Salz", „Nudeln") unterstützen, die absichtlich an mehreren konkreten Zutaten hängen dürfen, während nicht-generische Aliase eindeutig pro Zutat bleiben und gegen Race Conditions geschützt sind.
## Requirements
### Requirement: Generisches Alias-Flag
Das System SHALL auf dem `IngredientAlias`-Modell ein Feld `is_generic` (Boolean, Default `false`) bereitstellen. Ein Alias mit `is_generic = true` kennzeichnet einen generischen Begriff (z.B. „Pfeffer", „Salz", „Nudeln"), der bewusst an mehreren konkreten Zutaten hängen darf.

#### Scenario: Generischer Alias an mehreren Zutaten
- **WHEN** ein generischer Alias „Nudeln" (`is_generic = true`) für die Zutat „Fusilli trocken" existiert
- **AND** derselbe generische Alias „Nudeln" für die Zutat „Spaghetti" angelegt wird
- **THEN** SHALL das System beide Aliase akzeptieren, ohne einen Eindeutigkeitsfehler zu werfen

#### Scenario: Nicht-generischer Alias bleibt eindeutig
- **WHEN** ein nicht-generischer Alias „Speisestärke" (`is_generic = false`) bereits für eine Zutat existiert
- **AND** derselbe nicht-generische Alias-Name für eine andere Zutat angelegt werden soll
- **THEN** SHALL das System die Anlage mit einem Eindeutigkeitsfehler ablehnen

### Requirement: Eindeutigkeits-Constraint nur für nicht-generische Aliase
Das System SHALL eine partielle Datenbank-Constraint durchsetzen, die `IngredientAlias.name` nur dann eindeutig hält, wenn `is_generic = false`. Generische Aliase unterliegen keiner Namens-Eindeutigkeit.

#### Scenario: Migration setzt partielle Constraint
- **WHEN** die Migration für `is_generic` angewendet wird
- **THEN** SHALL die bisherige globale Unique-Constraint auf `name` durch eine partielle Constraint (`unique` nur bei `is_generic = false`) ersetzt werden

### Requirement: Generische Aliase im Schema
Das System SHALL das Feld `is_generic` in den Pydantic-Alias-Schemas (Lesen und Schreiben) und 1:1 im Zod-Schema (`frontend-food/src/schemas/supply.ts`) abbilden.

#### Scenario: Alias-Response enthält is_generic
- **WHEN** ein authentifizierter Nutzer Aliase einer Zutat über die API abruft
- **THEN** SHALL jedes Alias-Objekt das Feld `is_generic` (boolean) enthalten

#### Scenario: Alias anlegen mit is_generic
- **WHEN** ein berechtigter Nutzer einen Alias mit `is_generic = true` anlegt
- **THEN** SHALL das System den Alias als generisch speichern

### Requirement: Liste generischer Begriffe als Single Source of Truth
The list of generic terms SHALL be derived from all `IngredientAlias` rows with `is_generic = true` (distinct, case-insensitive). This list serves as the single source of truth for generic term classification, name validation, and import concretization.

The seed data SHALL contain ~70-90 generic terms (all single-word food names without qualifiers), distributed 1:N across all matching concrete ingredients. This replaces the previous minimum of 6 terms.

#### Scenario: Generic terms populated from seed data
- **WHEN** `import_prod_data --only food` is executed
- **THEN** `IngredientAlias.objects.filter(is_generic=True)` returns ~70-90 distinct names
- **AND** each generic term exists on ALL matching concrete ingredients (e.g., "Salz" on Jodsalz, Meersalz, Steinsalz)

#### Scenario: Generic term spans multiple ingredients
- **WHEN** the generic term "Nudeln" exists as a generic alias
- **THEN** it is attached to Fusilli trocken, Spaghetti, Penne, Farfalle, and other pasta variants
- **AND** all carry `is_generic=True`
- **AND** searching "Nudeln" returns all of them

### Requirement: Eindeutigkeit pro Zutat
Das System SHALL verhindern, dass für dieselbe Zutat zweimal derselbe Alias-Name (case-insensitive) angelegt wird — unabhängig vom `is_generic`-Flag. Dies wird durch einen Datenbank-`UniqueConstraint` auf (`ingredient`, `Lower(name)`) durchgesetzt, nicht nur durch eine applikationsseitige Prüfung.

#### Scenario: Doppelter Alias-Name für dieselbe Zutat wird abgelehnt
- **WHEN** für die Zutat „Fusilli trocken" bereits ein Alias „Nudeln" existiert
- **AND** derselbe Alias-Name „nudeln" (andere Groß-/Kleinschreibung) erneut für „Fusilli trocken" angelegt werden soll
- **THEN** SHALL das System die Anlage ablehnen, auch wenn `is_generic = true` gesetzt ist

#### Scenario: Paralleler Request erzeugt kein stilles Duplikat
- **GIVEN** zwei parallele Requests legen gleichzeitig denselben Alias-Namen für dieselbe Zutat an
- **WHEN** beide Requests die applikationsseitige Duplikat-Prüfung passieren, bevor der erste committed hat
- **THEN** SHALL die Datenbank-Constraint den zweiten Schreibversuch mit einem Fehler ablehnen
- **AND** SHALL das System diesen Fehler in eine verständliche 409-Fehlermeldung übersetzen, statt ihn unbehandelt durchzureichen

#### Scenario: Gleicher generischer Alias an verschiedenen Zutaten bleibt erlaubt
- **WHEN** ein generischer Alias „Nudeln" (`is_generic = true`) für die Zutat „Fusilli trocken" existiert
- **AND** derselbe generische Alias „Nudeln" für die Zutat „Spaghetti" angelegt wird
- **THEN** SHALL das System beide Aliase akzeptieren (unverändert gegenüber bestehendem Verhalten — die neue Constraint gilt pro Zutat, nicht global)

### Requirement: Generic Aliases in Fixtures
Generic aliases SHALL be stored directly in the `supply_ingredientalias.json` fixture file, not created at runtime by a separate seed command.

#### Scenario: Aliases loaded from fixture
- **WHEN** `import_prod_data` imports food data
- **THEN** all generic and non-generic aliases are loaded from supply_ingredientalias.json
- **AND** no additional seed command is needed

### Requirement: Non-Generic Alias Completeness
Every ingredient SHALL have comprehensive non-generic aliases including synonyms, plural forms, regional variants, and REWE product names where applicable.

#### Scenario: Ingredient has synonym aliases
- **WHEN** viewing aliases for "gemahlener schwarzer Pfeffer"
- **THEN** non-generic aliases include "schwarzer Pfeffer", "Pfeffer gemahlen"
- **AND** if REWE products match, their names are added as aliases

