## ADDED Requirements

### Requirement: Einkaufslisten tragen Event, Laden und Zeitpunkt
`ShoppingListOut` und `ShoppingListDetailOut` SHALL `event_id`, `event_slug`, `event_name`, `store` (`{id, name}` oder `null`), `scheduled_at` (UTC oder `null`), `materialized_at` und `trip_status` (`planned`, `created` oder `null` für Listen ohne Event) liefern. Freie Listen MAY ohne Laden und Zeitpunkt bestehen. Die Detailseite SHALL Laden und Zeitpunkt in lokaler Zeit im Kopf zeigen und bei Event-Einkäufen auf „Einkäufe planen“ verlinken.

#### Scenario: Event-Einkauf
- **WHEN** ein Mitglied die Liste „Rewe · Sa 10:00“ abruft
- **THEN** enthält die Antwort `event_slug`, `store.name = "Rewe"` und `scheduled_at`

#### Scenario: Freie Liste
- **WHEN** eine freie Liste abgerufen wird
- **THEN** sind `event_id`, `store` und `scheduled_at` `null`

#### Scenario: Nicht angemeldet ohne Gast-Token
- **WHEN** ein anonymer Client die Liste ohne Gast-Token abruft
- **THEN** antwortet die API mit 401

### Requirement: Geplanter Einkauf zeigt Vorschau statt Einträgen
Für einen Event-Einkauf mit `trip_status = planned` SHALL die Detailseite die live berechnete Vorschau mit dem Hinweis „Vorschau – wird mit „Liste erstellen“ festgehalten“ und der Aktion „Liste erstellen“ zeigen (nur mit Planungsrecht). Abhaken, Übernehmen und der Einkaufsmodus MUST erst nach dem Erstellen verfügbar sein. Manuelle Einträge MAY schon vorher hinzugefügt werden und bleiben beim Erstellen erhalten.

#### Scenario: Geplanter Einkauf
- **WHEN** ein Event-Verantwortlicher einen geplanten Einkauf öffnet
- **THEN** sieht er die Vorschau und „Liste erstellen“, aber keine Checkboxen

#### Scenario: Manueller Eintrag vorab
- **GIVEN** im geplanten Einkauf steht der manuelle Eintrag „Grillkohle“
- **WHEN** die Liste erstellt wird
- **THEN** enthält sie die Einträge der Vorschau und „Grillkohle“

### Requirement: Rezept-Einkauf mit Laden und Zeitpunkt
`POST /api/shopping-lists/from-recipe/{recipe_id}/` SHALL `portions`, `include_consumables` und entweder `store_id` mit `scheduled_at` (neue Liste ohne Event) oder `shopping_list_id` (bestehende Liste) verlangen; fehlt beides, MUST die API 422 liefern. Die Einträge MUST ihre Rezeptquelle mit Portionen tragen. Die Rezeptseite SHALL den Dialog „Einkaufen“ mit beiden Wegen anbieten.

#### Scenario: Neuer Rezept-Einkauf
- **WHEN** ein angemeldeter Nutzer „Stockbrot“ für 12 Portionen mit „Rewe“ und Do 16:00 einkauft
- **THEN** entsteht die Liste „Rewe · Do 16:00“ ohne Event mit den Zutaten für 12 Portionen

#### Scenario: Weder Laden noch Liste
- **WHEN** weder `store_id` noch `shopping_list_id` gesendet wird
- **THEN** antwortet die API mit 422 „Bitte wähle einen Laden und einen Zeitpunkt oder eine bestehende Liste.“

#### Scenario: Nicht angemeldet
- **WHEN** ein anonymer Client ein Rezept einkauft
- **THEN** antwortet die API mit 401

### Requirement: Rezept zu einer bestehenden Liste hinzufügen
Mit `shopping_list_id` SHALL das Rezept einer bestehenden Liste hinzugefügt werden, auf die der Nutzer Bearbeitungsrecht hat. Gleiche Zutaten MUST mit vorhandenen, nicht abgehakten Einträgen zu einer Zeile zusammengeführt werden, und die Quelle wird ergänzt. Abgehakte Einträge MUST unverändert bleiben, und für sie entsteht eine neue Zeile. Erstellte Event-Einkäufe MUST abgelehnt werden (409 „Rezepte kommen bei Events über den Essensplan“).

#### Scenario: Zweites Rezept
- **GIVEN** die Liste enthält 500 g Mehl aus „Stockbrot“, nicht abgehakt
- **WHEN** „Waffeln“ mit 300 g Mehl hinzugefügt wird
- **THEN** zeigt die Liste eine Zeile „Mehl 800 g“ mit beiden Rezepten als Quelle

#### Scenario: Bereits gekauft
- **GIVEN** „Mehl 500 g“ ist abgehakt
- **WHEN** „Waffeln“ mit 300 g Mehl hinzugefügt wird
- **THEN** bleibt die abgehakte Zeile, und eine neue Zeile „Mehl 300 g“ entsteht

#### Scenario: Ohne Bearbeitungsrecht
- **WHEN** ein Betrachter der Liste ein Rezept hinzufügt
- **THEN** antwortet die API mit 403
