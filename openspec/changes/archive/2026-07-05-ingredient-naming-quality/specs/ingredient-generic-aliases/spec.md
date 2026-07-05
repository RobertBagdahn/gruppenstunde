## ADDED Requirements

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
Das System SHALL die Menge der generischen Begriffe aus allen `IngredientAlias` mit `is_generic = true` ableiten (distinct, case-insensitive über `name`). Diese Liste dient sowohl der Namens-Validierung als auch der Import-Konkretisierung.

#### Scenario: Begriffsliste abrufbar
- **WHEN** das System die Liste generischer Begriffe ermittelt
- **THEN** SHALL sie jeden generischen Alias-Namen genau einmal (case-insensitive dedupliziert) enthalten

#### Scenario: Seed initialer Begriffe
- **WHEN** das Seed-/Management-Command für generische Begriffe ausgeführt wird
- **THEN** SHALL eine initiale Menge generischer Begriffe (mindestens „Salz", „Pfeffer", „Nudeln", „Wasser", „Öl", „Mehl") als generische Aliase vorhanden sein
