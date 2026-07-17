### Requirement: Atomarer Endpoint zum Übernehmen von KI-Portionsvorschlägen

Das System SHALL einen POST-Endpoint `/api/ingredients/{slug}/portions/ai-apply/` bereitstellen, der ausgewählte KI-Portionsvorschläge (inkl. `measuring_unit_name`, aufgelöst zu `measuring_unit_id`) in einer einzigen Datenbank-Transaktion anlegt. Der Endpoint SHALL einen optionalen Parameter `replace_all: bool` (Standard: `false`) akzeptieren.

#### Scenario: Ausgewählte Portionen werden atomar angelegt

- **WHEN** ein authentifizierter Nutzer `POST /{slug}/portions/ai-apply/` mit einer Liste ausgewählter Portionsvorschläge sendet
- **THEN** SHALL alle ausgewählten Portionen in einer Transaktion angelegt werden
- **THEN** SHALL `measuring_unit_id` für jede Portion serverseitig aus `measuring_unit_name` aufgelöst werden (nicht vom Client übergeben)
- **THEN** SHALL bei einem Fehler (z.B. Name-Kollision) die gesamte Transaktion zurückgerollt werden und HTTP 422 mit einer verständlichen Fehlermeldung zurückgegeben werden (kein HTTP 500)

#### Scenario: replace_all löscht bestehende Portionen per Soft-Delete

- **WHEN** `replace_all=true` gesendet wird
- **THEN** SHALL alle bestehenden, nicht bereits gelöschten Portionen der Zutat per Soft-Delete (`deleted_at`) markiert werden, einschließlich System-Portionen (`is_system=true`) und Frühstücks-„Belag"-Portionen
- **THEN** SHALL referenzierende `RecipeItem`s unverändert auf die soft-gelöschten Portionen zeigen und deren Namen weiterhin korrekt anzeigen

#### Scenario: System-Gramm-Portion wird nach replace_all verpflichtend neu angelegt

- **WHEN** `replace_all=true` gesendet wurde
- **THEN** SHALL im selben Request-Zyklus, bevor weitere Portionen angelegt werden, eine neue „g"-System-Portion (`is_system=true`, `weight_g=1`) angelegt werden
- **THEN** SHALL zu keinem Zeitpunkt ein Zwischenzustand ohne aktive „g"-Portion für die Zutat nach außen sichtbar werden

#### Scenario: replace_all=false lässt bestehende Portionen unangetastet

- **WHEN** `replace_all=false` (oder nicht angegeben) gesendet wird
- **THEN** SHALL keine bestehende Portion gelöscht werden
- **THEN** SHALL nur die ausgewählten, noch nicht existierenden (case-insensitive Namensprüfung) Portionen neu angelegt werden

#### Scenario: Nicht-authentifizierter Nutzer

- **WHEN** ein nicht-authentifizierter Nutzer `POST /{slug}/portions/ai-apply/` aufruft
- **THEN** SHALL das System HTTP 403 zurückgeben

#### Scenario: Zutat nicht gefunden

- **WHEN** ein Nutzer mit einem nicht-existenten Slug anfragt
- **THEN** SHALL das System HTTP 404 zurückgeben

#### Scenario: Race-Condition durch Transaktion ausgeschlossen

- **WHEN** mehrere Portionsvorschläge mit potenziell kollidierenden Namen in einem einzigen Request übermittelt werden
- **THEN** SHALL die Verarbeitung sequenziell innerhalb derselben Transaktion erfolgen (kein paralleles Anlegen mehrerer Requests), sodass der Unique-Constraint `unique_portion_name_per_ingredient` nicht durch eine Race-Condition zwischen Prüfung und Anlegen verletzt werden kann
