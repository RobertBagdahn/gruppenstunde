# Design

## Context

Motivation und Umfang: siehe `proposal.md`. Verhalten: siehe die Specs `shopping-trip-planning`, `shopping-stores`, `shopping-list-overview` und die Deltas.

Heutiger Stand, der den Ansatz bestimmt:

- `ShoppingList` (`backend/shopping/models.py`) kennt seine Quelle nur über `source_type` und `source_id` als einfache Zahl, ohne Fremdschlüssel. Event, Laden und Datum gibt es nicht.
- `create_from_meal_plan` (`backend/shopping/api.py:1078`) ruft `generate_shopping_list(meal_plan)` auf und speichert das Ergebnis als Snapshot. `generate_shopping_list` (`backend/supply/services/shopping_service.py:220`) setzt sich aus `collect_ingredient_contributions` und `aggregate_contributions` zusammen. Jeder Beitrag kennt sein `meal_item` und damit `meal.start_datetime`. Die Reserve ist ein einziger Faktor pro Plan (`CollectedContributions.reserve_factor`).
- Verbrauchsmaterial kommt über `meal_plan_material_entries` (`supply/services/material_aggregation.py:175`) als Paare `(recipe, servings)`, ohne Mahlzeit.
- Events: `EventMealPlanRelation` erlaubt n Pläne pro Event und genau 1 Event pro Plan. `Event.user_can_manage` prüft Ersteller, `responsible_persons` und Staff. `POST /api/events/` kann über `meal_plan_id` gleich verknüpfen (`event/api/events.py:295`). `_sync_meal_plan_relation` macht dabei ein `update_or_create` und würde einen schon verknüpften Plan stillschweigend umhängen.
- Rechte von Einkaufslisten: `shopping/services/access.py` (`resolve_actor`: Mitglied, dann Gast, sonst 404).
- Last: Die Detailantwort einer Planliste kostete im Oktober 5–9 s. Das Board ist pro Listenstand gecacht (`shopping/services/board.py`). Eine Planungsseite, die bei jedem Aufruf alle Pläne eines Events durchrechnet, wäre derselbe Engpass.
- Lokale Daten: 0 von 31 Plänen hängen an einem Event, 4 von 177 Mahlzeiten haben keine Startzeit. Die Produktionsdaten sind nicht geprüft.

## Goals / Non-Goals

**Goals:**
- Es gibt genau eine Zuordnungs-Engine, die Vorschau, „Liste erstellen“ und Differenz gemeinsam nutzen. So zeigen alle drei dieselben Mengen.
- Die Planungsseite antwortet bei unverändertem Stand aus dem Cache, ohne die Pläne neu zu berechnen.
- Die Mengen pro Zutat entsprechen der Summe dessen, was der Einkaufen-Tab der einzelnen Pläne zeigen würde.

**Non-Goals:**
- Haltbarkeit, Vorratseinkauf, Kühlung, Vorrat, gemeinsame Reserve und Packungsanrechnung (Etappe 2). Packungsrundung und Reserve bleiben in Etappe 1 pro Einkauf und Plan wie heute.
- Teilkauf im Laden, Zuweisen, Race-Fix (Etappe 3), Polling und Kosten (Etappe 4), WebSockets (eigener Change).
- Änderungen am Haupt-Frontend.

## Decisions

### D1 Datenmodell

```
Store(id, owner FK User CASCADE, name ≤80, created_at)
  UniqueConstraint(owner, Lower(name))

ShoppingList  (bestehend) +
  event          FK event.Event, null, on_delete=SET_NULL, related_name="shopping_trips"
  store          FK Store, null, on_delete=PROTECT
  scheduled_at   DateTimeField, null, db_index
  materialized_at DateTimeField, null      # „Liste erstellen“
  plan_synced_at DateTimeField, null       # materialize oder „Änderungen übernehmen“
  source_type    + EVENT_TRIP = "event_trip"
  Index(event, scheduled_at, id)

ShoppingAllocationRule(id, event FK CASCADE, target FK ShoppingList CASCADE,
  ingredient FK null, material FK null, meal FK planner.Meal null CASCADE,
  quantity FloatField null (g bzw. Stück), created_by FK, created_at, updated_at)
  CheckConstraint: genau eines von ingredient/material
```

- **Einkauf = `ShoppingList`** statt eines eigenen Models `ShoppingTrip`. Board, Teilen, Gäste, Pulse, REWE-Export und die Rechte hängen schon an der Liste. Ein eigenes Model mit 1:1-Bezug würde jede dieser Stellen verdoppeln. *Alternative:* `ShoppingTrip` mit OneToOne auf die Liste. Verworfen, weil es nur Indirektion bringt.
- **`trip_status`** wird abgeleitet: `planned`, wenn `event_id` gesetzt ist und `materialized_at` leer, `created`, wenn `materialized_at` gesetzt ist, sonst `null`. So gibt es kein zweites Statusfeld, das auseinanderlaufen kann.
- **`event` mit `SET_NULL`** statt `CASCADE`: Gekaufte Listen bleiben als Historie erhalten. Geplante (noch nicht erstellte) Einkäufe werden beim Löschen des Events per `pre_delete`-Signal mitgelöscht. Das Paar `source_type = event_trip` und `event = null` ergibt `source_status = deleted`.
- **`plan_synced_at` getrennt von `materialized_at`**, weil „Änderungen übernehmen“ den Status wieder auf `current` setzt, der Erstellzeitpunkt aber erhalten bleiben soll.
- **Store gehört einer Person.** Die Läden des Teams kommen über die Einkäufe des Events in die Auswahl (Spec `shopping-stores`). *Alternative:* Läden pro Gruppe. Verworfen, weil Events nicht zwingend eine Gruppe haben.

### D2 Bedarf (Demand) aus allen Plänen

Neues Package `backend/shopping/services/trips/` mit den Modulen `demand.py`, `allocation.py`, `plan.py`, `materialize.py` und `diff.py`. `__init__.py` re-exportiert die öffentlichen Namen.

`demand.py` baut für ein Event eine Liste von `DemandUnit(plan_id, meal_id, need_at, ingredient_id | material_id, quantity, contributions)`:

- Für jeden Plan des Events wird `collect_ingredient_contributions(plan)` aufgerufen und nach `(meal_id, ingredient_id)` gruppiert. `need_at` ist `meal.start_datetime`. Dafür kommt `select_related("meal")` in den Collector, falls es fehlt.
- Material: `meal_plan_material_entries` liefert künftig zusätzlich die Mahlzeit, als neue Funktion `meal_plan_material_entries_by_meal`. Die bestehende Funktion bleibt für den Einkaufen-Tab. Je Mahlzeit wird `aggregate_materials` aufgerufen. Geräte entfallen wie bisher.
- **Reserve pro Plan:** `aggregate_contributions` bekommt die Möglichkeit, den Reservefaktor pro Beitrag zu nehmen (Feld am `IngredientContribution`). Bei mehreren Plänen mit verschiedenen Faktoren stimmt die Aufschlüsselung in Netto und Reserve dann pro Zeile. *Alternative:* der Faktor des ersten Plans. Verworfen, weil das falsche Reserve-Anzeigen liefert.

### D3 Zuordnungsalgorithmus

`allocation.allocate(event, trips, rules, demand, snapshots) -> Allocation` ist eine reine Funktion ohne DB-Zugriffe und deshalb gut testbar:

1. **Gepinnt:** Für jeden erstellten Einkauf ergeben dessen `ShoppingListItemSource`-Zeilen eine Menge `(meal_id, ingredient_id|material_id)`. DemandUnits mit diesem Schlüssel gehören fest zu diesem Einkauf und landen in dessen Differenz statt in der Vorschau. Das erfüllt das Szenario „Erstellter Einkauf bleibt Ziel seiner Bedarfe“.
2. **Regeln** werden in dieser Reihenfolge angewendet: zuerst Mahlzeit-Regeln, dann Zutat-Regeln, innerhalb beider nach `created_at`. Eine Regel ohne `quantity` nimmt alle passenden, nicht gepinnten Units. Eine Regel mit `quantity` nimmt Units in aufsteigender `need_at`-Reihenfolge, bis die Menge erreicht ist, und teilt die letzte Unit anteilig. Die Quellen werden dabei proportional skaliert. Bleibt Restmenge der Regel übrig, entsteht der Hinweis „Regel größer als Bedarf“. Liegt der Zieleinkauf nach `need_at`, entsteht der Hinweis „Einkauf liegt nach der Mahlzeit“. Ist das Ziel schon erstellt, landet die Menge in dessen Differenz.
3. **Standard** für den Rest: der letzte Einkauf mit `scheduled_at <= need_at`. Bei Gleichstand gewinnt die kleinste `id`. Gibt es keinen, ist der Bedarf „nicht gedeckt“. Ist `need_at` leer, gibt es einen Hinweis „Mahlzeit ohne Uhrzeit“.
4. Pro Einkauf werden die zugeordneten Contributions mit `aggregate_contributions` zu Zeilen zusammengefasst. So bleiben Packungs-, Stück- und Einheitenanzeige identisch zum Einkaufen-Tab.

*Alternative:* die Zuordnung pro aggregierter Zutat statt pro Mahlzeit-Unit. Verworfen, weil dann weder das Datum je Mahlzeit noch die Mahlzeit-Regeln funktionieren.

### D4 Vorschau, Erstellen, Differenz

- `plan.build_shopping_plan(event)` ruft Demand und Allocation auf und liefert `TripPlanOut`: Einkäufe mit Vorschau-Zeilen, `uncovered`, `hints` und `stamp`.
- **Cache** wie beim Board: Schlüssel `shopping-plan:v1:{event_id}:{sha256(stamp)}`. Der `stamp` setzt sich zusammen aus `max(MealPlan.updated_at)` der Event-Pläne, deren Anzahl, `max(ShoppingList.updated_at)` und der Anzahl der Event-Einkäufe, `max(rule.updated_at)` und der Anzahl der Regeln sowie der Anzahl der Quellen erstellter Einkäufe. Er wird mit einer Aggregatabfrage pro Tabelle berechnet. Die Gültigkeit beträgt 1 h. `MealPlan.updated_at` wird schon bei jeder Planänderung gesetzt (Spec `shopping-list-source-freshness`).
- Die Detailseite eines geplanten Einkaufs nutzt denselben Cache und filtert auf den Einkauf.
- `materialize.materialize(trip)` läuft in `transaction.atomic()` mit `select_for_update()` auf der Liste, prüft `materialized_at is None` (sonst 409), berechnet die Zuordnung frisch (nicht aus dem Cache) und legt Items und Sources an wie bisher `create_from_meal_plan`. Gemeinsamer Code wird dafür aus `create_from_meal_plan` herausgelöst. Vorhandene manuelle Items bleiben stehen. Gesetzt werden `materialized_at` und `plan_synced_at` auf jetzt sowie `source_type = event_trip`.
- `diff.plan_diff(trip)` vergleicht pro Zutat die aktuell gepinnte und zugeordnete Menge mit der Summe der erzeugten Items. Gruppiert wird nach `is_checked`. `apply` passt nur nicht abgehakte, erzeugte Items an, legt für zusätzlichen Bedarf auf abgehakten Zeilen eine neue Zeile an, ersetzt die Sources und setzt `plan_synced_at`. Danach liefert `source_status` wieder `current`.

### D5 Rechte

Neues Modul `shopping/services/trip_access.py`:

```
event_shopping_role(event, user) -> "manage" | "read" | None
  manage: event.user_can_manage(user) oder Owner/Admin/Editor eines Plans des Events
  read:   Viewer eines Plans des Events
```

`resolve_actor` prüft bei Listen mit `event_id` zuerst die Event-Rolle: `manage` wird zur Rolle `admin`, `read` zur Rolle `viewer`. Danach kommen Collaborator und Gast wie bisher. Das Ergebnis wird pro Request in `request` zwischengespeichert, weil Board und Pulse häufig abgefragt werden. `list_stamp` bleibt unverändert, Event-Team-Rechte ändern keine Einträge.

*Alternative:* Event-Team automatisch als `ShoppingListCollaborator` eintragen. Verworfen, weil die Rechte dann veralten, sobald sich das Team ändert.

### D6 API

Alle neuen Endpunkte liegen im Shopping-Router, nicht im Event-Router mit seiner Slug-Catch-all-Route.

| Methode | Pfad | Request | Response |
|---|---|---|---|
| GET | `/api/shopping-events/` | `page, page_size, include_past` | `Paginated[ShoppingEventOut]` (id, slug, name, start, end, trips_count, next_trip) |
| GET | `/api/shopping-events/{slug}/plan/` | – | `TripPlanOut` |
| POST | `/api/shopping-events/{slug}/trips/` | `ShoppingTripIn` (store_id, scheduled_at, name?) | `ShoppingListOut` (201) |
| GET/POST | `/api/shopping-events/{slug}/rules/` | `AllocationRuleIn` (target_id, ingredient_id \| material_id, meal_id?, quantity?) | `AllocationRuleOut` |
| DELETE | `/api/shopping-rules/{id}/` | – | 204 |
| PATCH | `/api/shopping-lists/{id}/` | + `store_id`, `scheduled_at` | `ShoppingListDetailOut` |
| POST | `/api/shopping-lists/{id}/materialize/` | – | `ShoppingListDetailOut` / 409 |
| GET | `/api/shopping-lists/{id}/plan-diff/` | – | `TripDiffOut` (rows: name, unit, snapshot_open, snapshot_checked, current, kind) |
| POST | `/api/shopping-lists/{id}/plan-diff/apply/` | – | `ShoppingListDetailOut` |
| GET | `/api/shopping-lists/` | + `without_event`, `invited_trips` | wie bisher |
| POST | `/api/shopping-lists/from-recipe/{id}/` | `FromRecipeIn` (+ store_id, scheduled_at, shopping_list_id) | `ShoppingListDetailOut` |
| CRUD | `/api/shopping-stores/` | `StoreIn` | `StoreOut`, paginiert |
| PUT | `/api/meal-plans/{id}/event/` | `{event_id}` | `MealPlanOut` |
| POST | `/api/events/` | unverändert, `meal_plan_id` | 409, falls der Plan schon verknüpft ist (neu) |

- **Entfällt:** `POST /api/shopping-lists/from-meal-plan/{id}/`.
- **Schemas:** Pydantic `shopping/schemas.py` wird zum Package `shopping/schemas/` (`lists.py`, `trips.py`, `stores.py`) mit Re-Export. Zod: `frontend-food/src/schemas/shoppingList.ts` wird erweitert, neu kommen `shoppingTrip.ts` und `shoppingStore.ts`.
- **Event-Anlage:** `_sync_meal_plan_relation` bekommt beim Anlegen eine Prüfung „Plan hat schon ein anderes Event“ und liefert dann 409 innerhalb derselben Transaktion. `create_event` läuft dafür in `transaction.atomic()`.

### D7 Frontend (`frontend-food`)

- **Routen:** `/shopping-lists` (Übersicht), `/shopping-lists/events/:eventSlug` (Einkäufe planen), `/shopping-lists/:id` (Einkauf). `include_past` und der ausgewählte Einkauf stehen in der URL (`?trip=`).
- **Neue Komponenten:** `pages/shopping/TripPlanningPage.tsx`, `components/shopping/trips/TripCard.tsx`, `TripFormDialog.tsx` (Laden-Combobox mit „anlegen“, Datum und Uhrzeit), `MoveAllocationDialog.tsx` (Ziel, ganz oder Teilmenge, alle Mahlzeiten oder eine), `UncoveredSection.tsx`, `PlanDiffDialog.tsx`, `components/planning/LinkEventDialog.tsx`, `StoreCombobox.tsx`.
- **Hooks** in `src/api/shoppingTrips.ts` und `src/api/shoppingStores.ts`. Mutationen invalidieren `['shopping-plan', slug]` und die Liste. Optimistische Updates gibt es nur beim Verschieben (Etappe 4 vertieft das).
- **Tagesansicht des Essensplans:** Einkaufs-Marker werden nach `scheduled_at` zwischen die Mahlzeiten-Slots einsortiert, Daten aus `['shopping-plan', slug]`. „Einkauf einfügen“ nutzt `TripFormDialog` mit vorbelegtem Tag.
- `pages/planning/ShoppingView.tsx`: Die Erstell-Aktion und der Bestätigungsdialog entfallen. Stattdessen gibt es den Link „Einkäufe planen“ bzw. „Event verknüpfen“.
- `pages/recipes/RecipeDetailPage.tsx`: Dialog „Einkaufen“ mit „Neuer Einkauf“ (Laden, Zeitpunkt) oder „Zu bestehender Liste“ (Liste wählen).
- Mobile ab 320 px: Einkäufe als gestapelte Karten, Verschieben über ein Aktionsmenü statt Drag-and-drop.

### D8 Migration

- **0007:** `Store` und `ShoppingAllocationRule`, neue Felder an `ShoppingList` und der `source_type`-Wert `event_trip`.
- **0008 (Daten):** Für Listen mit `source_type = meal_event`, deren Plan mit einem Event verknüpft ist, wird `event` gesetzt und `materialized_at = plan_synced_at = created_at`. `source_type` bleibt `meal_event`, damit sie als Altliste ohne Laden erkennbar sind. Ohne Event bleiben sie unverändert. Die Migration ist idempotent und für die Rückrichtung ist `noop` erlaubt.
- Kein Backfill von Läden.

## Risks / Trade-offs

- [Rechenlast der Planungsseite bei großen Events (mehrere Pläne, mehr als 150 Mahlzeiten)] → Cache pro Stand (D4), Query-Count-Test, Lastprobe aus `shopping-list-load-resilience` um den Abruf der Planungsseite erweitern.
- [Teilmengen-Regeln teilen Units anteilig, das kann krumme Mengen ergeben, z. B. 333,3 g] → Die Menge wird auf 1 g bzw. 1 Stück gerundet. Der Rest bleibt beim Standard-Einkauf, damit die Summe stimmt. Ein Test sichert die Summenerhaltung ab.
- [Packungsrundung pro Einkauf führt zu Überkauf, wenn eine Zutat auf mehrere Einkäufe verteilt ist] → Bekannt und für Etappe 2 vorgesehen. Bis dahin zeigt die Planungsseite pro Zutat einen Hinweis „auf N Einkäufe verteilt“.
- [Pinning über `(meal_id, ingredient_id)` versagt, wenn eine Mahlzeit gelöscht wird (Source `meal = NULL`)] → Gelöschte Mahlzeiten erscheinen in der Differenz als „entfallen“. Der Unit-Schlüssel nutzt `meal_id` aus der Source, solange er gesetzt ist. Bei `NULL` fällt die Menge aus dem Pinning und wird als entfallen gezeigt.
- [Zeitzonen: Einkauf und Mahlzeit in UTC, Eingabe in lokaler Zeit] → Vergleiche nur in UTC. Namen und Anzeige in Europe/Berlin. Tests für Sommer- und Winterzeit am 25.10.2026.
- [Event-Team-Rechte vergrößern den Kreis derer, die Listen sehen und ändern dürfen] → Gäste-Token und Teilen bleiben auf Admin beschränkt. Das Event-Team wird über `can_manage` sichtbar gemacht. Datenschutz: Es werden nur Anzeigenamen gezeigt (`public_display_name`).
- [**BREAKING** Wegfall von `from-meal-plan`] → Das Frontend wird im selben PR umgestellt. Keine externen Clients bekannt.
- [Es gibt keine Produktionszahlen zu Plänen mit Event und Mahlzeiten ohne Startzeit] → Vor dem Rollout schreibgeschützt in Produktion zählen (nur mit OK, siehe Rollout-Regeln).

## Migration Plan

1. Voraussetzung: `switchable-quantity-units`, `shopping-list-load-resilience` und `stable-backend-capacity` sind archiviert, die Basis ist frisch von `main`.
2. Migrationen 0007/0008 lokal und auf einer Kopie testen. In CI laufen `uv run python manage.py migrate --check` und `makemigrations --check`.
3. Deploy über `main` (keine manuellen Cloud-Run-Änderungen). Die Datenmigration 0008 vorher in Produktion als Dry-Run zählen und nur mit OK anwenden.
4. Rollback: Code zurückrollen. 0007 ist additiv. Die Felder bleiben ungenutzt bestehen, eine Rückmigration ist nicht nötig.

## Ausblick Etappen 2–4 (nicht Teil dieses Changes)

- **Etappe 2 – Haltbarkeit und Vorrat:** `Ingredient.storage_type` wird bereinigt (Raum, Kühl, Tiefkühl), `durability_in_days` gepflegt, daraus wird die Klasse abgeleitet (schnell verderblich, Kühlung, Tiefkühl, haltbar). Fallback über `RetailSection`, KI-Vorschlag mit Freigabe, manuelle Werte geschützt. `ShoppingList.is_stock_trip` steuert das automatische Vorziehen von Haltbarem, wenn die Haltbarkeit reicht. Kühlung und Tiefkühler pro Event beeinflussen die Zuordnung, mit Warnung. Vorratsliste pro Event („Schon da“). Reserve einmal auf den Gesamtbedarf, der Packungsüberschuss wird auf spätere Einkäufe angerechnet. Die Allocation aus D3 bekommt dafür einen zusätzlichen Schritt zwischen Regeln und Standard.
- **Etappe 3 – Im Laden:** Teilkauf mit „Rest verschieben“ in einen bestehenden oder direkt neu angelegten Einkauf (`ShoppingListItem.split_from`). Zuständigkeit als ein Feld mit zwei Wegen: selbst übernehmen oder zuweisen durch Besitzer bzw. Admin (`claim_assigned_by`). Race-Fix für Übernehmen und Abhaken über ein bedingtes `UPDATE … WHERE claimed_by IS NULL` bzw. `select_for_update`. `list_stamp` berücksichtigt Rollen- und Gastnamenänderungen.
- **Etappe 4 – Sync und Kosten:** Optimistische Updates, 3 s Takt während eines laufenden Einkaufs, Event-weiter Stempel für Verschiebungen. Bonsumme pro Einkauf, die ins Event-Budget fließt. Für WebSockets ein eigener späterer Change (eigener Realtime-Dienst und Pub/Sub). Bis dahin wird der bestehende Consumer abgesichert (keine Client-Events weiterleiten) oder entfernt.
