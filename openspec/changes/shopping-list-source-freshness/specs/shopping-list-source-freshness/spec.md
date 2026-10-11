## ADDED Requirements

### Requirement: Planbasierte Einkaufslisten sind Snapshots
Eine aus einem Essensplan erzeugte Einkaufsliste SHALL ein unveränderlicher Snapshot der Planmengen zum Erstellzeitpunkt sein. Änderungen am Essensplan MUST NOT Einträge, abgehakte Positionen, manuelle Ergänzungen oder Quellenzuordnungen der Liste verändern.

#### Scenario: Plan ändert sich nach Erstellung
- **GIVEN** ein angemeldeter Nutzer hat aus einem Plan eine Liste erstellt und zwei Einträge abgehakt
- **WHEN** im Plan eine Mahlzeit gelöscht wird
- **THEN** bleiben alle Einträge der Liste mit Mengen und Häkchen unverändert

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
`GET /api/shopping-lists/` (paginiert mit `page` und `page_size`) und `GET /api/shopping-lists/{id}/` SHALL für Listen mit `source_type = meal_event` die Felder `source_status` und `source_updated_at` liefern. `source_status` SHALL `changed` sein, wenn `MealPlan.updated_at` nach `ShoppingList.created_at` liegt, sonst `current`; `deleted`, wenn der Plan nicht mehr existiert. Für manuelle und rezeptbasierte Listen und wenn der Nutzer den Plan nicht lesen darf, SHALL `source_status` `null` sein. Die Listen-Übersicht MUST die Quellpläne ohne eine Abfrage pro Liste laden.

#### Scenario: Liste ist aktuell
- **WHEN** ein angemeldeter Nutzer direkt nach dem Erstellen die Liste abruft
- **THEN** ist `source_status = "current"`

#### Scenario: Plan wurde geändert
- **GIVEN** nach dem Erstellen der Liste wurde ein Eintrag im Plan geändert
- **WHEN** der Nutzer die Liste abruft
- **THEN** ist `source_status = "changed"` und `source_updated_at` ist der Änderungszeitpunkt des Plans

#### Scenario: Plan gelöscht
- **GIVEN** der Quellplan wurde gelöscht
- **WHEN** der Nutzer die Liste abruft
- **THEN** ist `source_status = "deleted"` und `source_updated_at` ist `null`

#### Scenario: Kein Lesezugriff auf den Plan
- **GIVEN** ein Collaborator der Liste darf den Quellplan nicht lesen
- **WHEN** er die Liste abruft
- **THEN** ist `source_status = null` und die Antwort enthält keine Plandaten

#### Scenario: Nicht angemeldet
- **WHEN** ein nicht angemeldeter Client `GET /api/shopping-lists/{id}/` aufruft
- **THEN** antwortet das System wie bisher mit HTTP 401

### Requirement: Hinweis und Neuerstellung im Food-Frontend
Die Einkaufslisten-Detailseite und die Listen-Übersicht SHALL bei `source_status = "changed"` den Hinweis „Essensplan wurde seit Erstellung geändert“ mit der Aktion „Neue Liste erstellen“ zeigen. Die Aktion SHALL über `POST /api/shopping-lists/from-meal-plan/{source_id}/` eine neue Liste anlegen und zu ihr navigieren; die bisherige Liste bleibt unverändert. Bei `deleted` SHALL „Der Essensplan wurde gelöscht.“ ohne Aktion erscheinen. Der Hinweis MUST ab 320 px ohne horizontales Scrollen lesbar sein.

#### Scenario: Neue Liste aus geändertem Plan
- **GIVEN** eine Liste mit `source_status = "changed"`
- **WHEN** der Nutzer „Neue Liste erstellen“ wählt
- **THEN** wird eine neue Liste aus dem aktuellen Plan angelegt und geöffnet
- **AND** die alte Liste existiert weiter mit ihren Häkchen

#### Scenario: Kein Hinweis bei aktueller Liste
- **WHEN** die Liste `source_status = "current"` hat
- **THEN** erscheint kein Hinweis

#### Scenario: Neuerstellung ohne Planzugriff
- **GIVEN** der Nutzer hat die Leseberechtigung für den Plan verloren
- **WHEN** die Liste angezeigt wird
- **THEN** erscheint weder Hinweis noch Aktion

### Requirement: Rückfrage vor einer weiteren aktuellen Liste
Dieses Requirement ist ein Vorschlag zur Owner-Freigabe. Die Erstellaktion im Essensplan (`ShoppingView`) SHALL vorhandene Listen des Plans mit Status anzeigen. Existiert bereits eine Liste mit `source_status = "current"`, SHALL vor dem Anlegen einer weiteren Liste ein Bestätigungsdialog erscheinen.

#### Scenario: Aktuelle Liste existiert
- **GIVEN** für den Plan gibt es eine aktuelle Liste
- **WHEN** der Nutzer erneut „Einkaufsliste erstellen“ wählt
- **THEN** fragt ein Dialog „Für diesen Plan gibt es bereits eine aktuelle Einkaufsliste. Trotzdem eine neue erstellen?“
- **AND** ohne Bestätigung wird keine Liste angelegt
