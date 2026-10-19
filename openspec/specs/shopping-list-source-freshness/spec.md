# shopping-list-source-freshness Specification

## Purpose
Anforderungen an shopping list source freshness: Planbasierte Einkaufslisten sind Snapshots; Plan-Änderungen aktualisieren den Änderungszeitpunkt des Plans; Einkaufslisten liefern den Aktualitätsstatus ihres Quellplans.

## Requirements

### Requirement: Planbasierte Einkaufslisten sind Snapshots
Ein Event-Einkauf SHALL ab „Liste erstellen“ ein unveränderlicher Snapshot der ihm zugeordneten Planmengen sein. Änderungen an den Essensplänen des Events, an anderen Einkäufen oder an Zuordnungsregeln MUST NOT Einträge, abgehakte Positionen, manuelle Ergänzungen oder Quellenzuordnungen eines erstellten Einkaufs verändern. Nur die ausdrückliche Aktion „Änderungen übernehmen“ (siehe `shopping-trip-planning`) DARF erzeugte, nicht abgehakte Einträge anpassen. Bestehende Listen aus der Zeit vor den Einkäufen (`source_type = meal_event`) bleiben Snapshots.

#### Scenario: Plan ändert sich nach Erstellung
- **GIVEN** ein angemeldeter Nutzer hat einen Einkauf erstellt und zwei Einträge abgehakt
- **WHEN** im Plan eine Mahlzeit gelöscht wird
- **THEN** bleiben alle Einträge der Liste mit Mengen und Häkchen unverändert

#### Scenario: Neuer Einkauf nach Erstellung
- **GIVEN** der Einkauf „Metro Fr“ ist erstellt
- **WHEN** ein weiterer Einkauf angelegt wird
- **THEN** bleiben die Einträge von „Metro Fr“ unverändert

### Requirement: Plan-Änderungen aktualisieren den Änderungszeitpunkt des Plans
Das System SHALL `MealPlan.updated_at` setzen, wenn eine Mahlzeit oder ein Eintrag des Plans angelegt, geändert oder gelöscht wird. Das gilt auch für Pfade ohne Model-Signale (Einträge kopieren, Plan duplizieren, Wizard-Bulk, Buffet speichern, Referenzmahlzeit-Sync).

#### Scenario: Eintrag geändert
- **GIVEN** ein Plan mit `updated_at` um 10:00
- **WHEN** ein Nutzer mit Bearbeitungsrecht um 10:05 die Menge eines Eintrags ändert
- **THEN** ist `updated_at` des Plans 10:05

#### Scenario: Buffet gespeichert
- **WHEN** ein Buffet einer Mahlzeit gespeichert wird
- **THEN** wird `updated_at` des Plans aktualisiert

### Requirement: Einkaufslisten liefern den Aktualitätsstatus ihres Quellplans
`GET /api/shopping-lists/` (paginiert mit `page` und `page_size`) und `GET /api/shopping-lists/{id}/` SHALL `source_status` und `source_updated_at` liefern. Bei erstellten Event-Einkäufen ist der Status `changed`, wenn ein Essensplan des Events nach `materialized_at` geändert wurde, sonst `current`; `deleted`, wenn das Event gelöscht wurde. Bei Altlisten (`meal_event` ohne Event) gilt der Vergleich mit `MealPlan.updated_at` wie bisher. Geplante Einkäufe, freie Listen und Rezept-Listen und Nutzer ohne Leserecht auf Event oder Plan erhalten `null`. Die Übersicht MUST ohne eine Abfrage pro Liste laden.

#### Scenario: Liste ist aktuell
- **WHEN** ein angemeldeter Nutzer direkt nach „Liste erstellen“ den Einkauf abruft
- **THEN** ist `source_status = "current"`

#### Scenario: Plan wurde geändert
- **GIVEN** nach dem Erstellen wurde ein Eintrag in einem Essensplan des Events geändert
- **WHEN** der Nutzer den Einkauf abruft
- **THEN** ist `source_status = "changed"` und `source_updated_at` ist der Änderungszeitpunkt des Plans

#### Scenario: Plan gelöscht
- **GIVEN** der Quellplan einer Altliste ohne Event wurde gelöscht
- **WHEN** der Nutzer die Liste abruft
- **THEN** ist `source_status = "deleted"` und `source_updated_at` ist `null`

#### Scenario: Event gelöscht
- **GIVEN** das Event des Einkaufs wurde gelöscht
- **WHEN** der Nutzer die Liste abruft
- **THEN** ist `source_status = "deleted"`, `source_updated_at` ist `null`, und die Einträge sind erhalten

#### Scenario: Geplanter Einkauf
- **WHEN** ein noch nicht erstellter Einkauf abgerufen wird
- **THEN** ist `source_status = null`, weil die Vorschau immer aktuell ist

#### Scenario: Kein Lesezugriff auf den Plan
- **GIVEN** ein eingeladener Mitkäufer darf Event und Pläne nicht lesen
- **WHEN** er die Liste abruft
- **THEN** ist `source_status = null` und die Antwort enthält keine Plandaten

#### Scenario: Nicht angemeldet
- **WHEN** ein nicht angemeldeter Client ohne Gast-Token `GET /api/shopping-lists/{id}/` aufruft
- **THEN** antwortet das System mit HTTP 401

### Requirement: Hinweis und Differenz im Food-Frontend
Detailseite und Übersicht SHALL bei `source_status = "changed"` „Essensplan wurde seit Erstellung geändert“ zeigen. Bei Event-Einkäufen MUST „Änderungen ansehen“ die Differenz öffnen und „Änderungen übernehmen“ anbieten (nur mit Planungsrecht); Altlisten ohne Event zeigen nur den Hinweis. Bei `deleted` SHALL „Das Event wurde gelöscht.“ bzw. „Der Essensplan wurde gelöscht.“ ohne Aktion erscheinen. Ab 320 px MUST alles ohne horizontales Scrollen lesbar sein.

#### Scenario: Änderungen übernehmen
- **GIVEN** ein Einkauf mit `source_status = "changed"`
- **WHEN** der Nutzer „Änderungen ansehen“ und dann „Änderungen übernehmen“ wählt
- **THEN** werden die nicht abgehakten Einträge angepasst und der Status ist wieder `current`

#### Scenario: Kein Hinweis bei aktueller Liste
- **WHEN** die Liste `source_status = "current"` hat
- **THEN** erscheint kein Hinweis

#### Scenario: Mitkäufer ohne Planungsrecht
- **GIVEN** ein Mitglied der Liste hat Leserecht auf den Plan, aber kein Planungsrecht
- **WHEN** die Liste geändert ist
- **THEN** sieht es den Hinweis und die Differenz, aber nicht „Änderungen übernehmen“
