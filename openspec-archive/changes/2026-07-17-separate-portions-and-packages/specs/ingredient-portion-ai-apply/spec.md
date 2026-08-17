## REMOVED Requirements

### Requirement: System-Gramm-Portion wird nach replace_all verpflichtend neu angelegt

**Reason**: `system_gramm` existiert nicht mehr. `replace_all` löscht bestehende Portionen und Packages, ohne eine "g"-Portion nachzulegen.

**Migration**: `replace_all` löscht alle Portionen (Soft-Delete) und alle Packages (Soft-Delete), erstellt dann die ausgewählten neu. Kein impliziter "g"-Fallback.

## MODIFIED Requirements

### Requirement: Atomarer Endpoint zum Übernehmen von KI-Portionsvorschlägen

Das System SHALL einen POST-Endpoint `POST /api/ingredients/{slug}/ai-apply/` bereitstellen, der ausgewählte KI-Portionsvorschläge UND Package-Vorschläge in einer einzigen Datenbank-Transaktion anlegt. Der Endpoint SHALL einen optionalen Parameter `replace_all: bool` (Standard: `false`) akzeptieren.

#### Scenario: Ausgewählte Portionen und Packages werden atomar angelegt

- **WHEN** ein authentifizierter Nutzer `POST /{slug}/ai-apply/` mit `{ "portions": [...], "packages": [...], "replace_all": false }` sendet
- **THEN** SHALL alle ausgewählten Portionen als `Portion`-Rows und alle Packages als `Package`-Rows in einer Transaktion angelegt werden
- **THEN** SHALL `measuring_unit_id` für jede Portion serverseitig aus `measuring_unit_name` aufgelöst werden
- **THEN** SHALL Packages OHNE `measuring_unit` angelegt werden (nur `name`, `weight_g`, `rank`)
- **THEN** SHALL bei einem Fehler die gesamte Transaktion zurückgerollt werden und HTTP 422 zurückgegeben werden

#### Scenario: replace_all löscht bestehende Portionen und Packages per Soft-Delete

- **WHEN** `replace_all=true` gesendet wird
- **THEN** SHALL alle bestehenden, nicht bereits gelöschten Portionen der Zutat per Soft-Delete markiert werden
- **THEN** SHALL alle bestehenden, nicht bereits gelöschten Packages der Zutat per Soft-Delete markiert werden
- **THEN** SHALL KEINE automatische System-Portion ("g") neu angelegt werden

#### Scenario: replace_all=false lässt bestehende Portionen und Packages unangetastet

- **WHEN** `replace_all=false` (oder nicht angegeben) gesendet wird
- **THEN** SHALL keine bestehende Portion oder Package gelöscht werden
- **THEN** SHALL nur die ausgewählten, noch nicht existierenden Entitäten neu angelegt werden

#### Scenario: KI-Vorschläge ohne system_gramm

- **WHEN** die KI Portions- und Package-Vorschläge generiert
- **THEN** SHALL der Prompt KEINE `system_gramm`-Kategorie mehr anfordern
- **THEN** SHALL die KI-Response nur `portions` (rezeptportionen, belag, backmengen) und `packages` (packungen) enthalten
- **THEN** SHALL `packungen` aus der KI-Response als `Package`-Rows angelegt werden, nicht als `Portion`-Rows

#### Scenario: Nicht-authentifizierter Nutzer

- **WHEN** ein nicht-authentifizierter Nutzer `POST /{slug}/ai-apply/` aufruft
- **THEN** SHALL das System HTTP 403 zurückgeben

#### Scenario: Zutat nicht gefunden

- **WHEN** ein Nutzer mit einem nicht-existenten Slug anfragt
- **THEN** SHALL das System HTTP 404 zurückgeben
