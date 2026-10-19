# Tasks

## 0. Voraussetzungen

- [ ] 0.1 Prüfen, dass `switchable-quantity-units`, `shopping-list-load-resilience` und `stable-backend-capacity` archiviert sind (`openspec list --json` zeigt sie nicht mehr) und der Branch auf aktuellem `main` basiert
- [ ] 0.2 Produktionszahlen schreibgeschützt erheben (nur mit OK): Pläne mit und ohne Event, Mahlzeiten ohne Startzeit, Listen mit `source_type = meal_event`. Ergebnis als Notiz im Change ablegen.

## 1. Backend: Datenmodell und Migration

- [x] 1.1 `Store` und `ShoppingAllocationRule` in `backend/shopping/models.py` (bzw. Package `shopping/models/`) anlegen, `ShoppingList` um `event`, `store`, `scheduled_at`, `materialized_at`, `plan_synced_at` und `SourceType.EVENT_TRIP` erweitern, inklusive Constraints und Index. `uv run python manage.py makemigrations shopping` erzeugt 0007, `migrate` läuft durch.
- [x] 1.2 Datenmigration 0008: Altlisten `meal_event` mit verknüpftem Plan bekommen `event`, `materialized_at` und `plan_synced_at`. Ein Migrationstest prüft Listen mit und ohne Event sowie die Idempotenz.
- [x] 1.3 `pre_delete`-Signal am Event: geplante Einkäufe löschen, erstellte behalten (`event = NULL`). Ein Test prüft beide Fälle.
- [x] 1.4 Admin für `Store` und `ShoppingAllocationRule` registrieren. Der Admin-Smoke-Test lädt die Changelists.

## 2. Backend: Bedarf und Zuordnung

- [x] 2.1 `IngredientContribution` um den Reservefaktor pro Beitrag erweitern und `aggregate_contributions` darauf umstellen. Die bestehenden Tests von `shopping_service` bleiben grün, ein neuer Test prüft zwei Pläne mit 1,1 und 1,2.
- [x] 2.2 `meal_plan_material_entries_by_meal` in `supply/services/material_aggregation.py` ergänzen. Ein Test prüft, dass die Summe gleich `meal_plan_material_entries` ist.
- [x] 2.3 `shopping/services/trips/demand.py`: DemandUnits aller Pläne eines Events bilden (externe und Referenzmahlzeiten ausgenommen, `need_at` gleich Mahlzeitbeginn). Tests decken zwei Pläne, eine externe Mahlzeit und eine Mahlzeit ohne Startzeit ab.
- [x] 2.4 `shopping/services/trips/allocation.py` als reine Funktion: Pinning, Regeln (Mahlzeit vor Zutat, Teilmenge chronologisch, anteilige Quellen), Standard (letzter Einkauf `<= need_at`, Gleichstand nach kleinster `id`), nicht gedeckt und Hinweise. Unit-Tests decken alle Szenarien aus `shopping-trip-planning` ab, inklusive Summenerhaltung bei Teilmengen und Sommer- und Winterzeit am 25.10.2026.
- [x] 2.5 `shopping/services/trips/plan.py`: `build_shopping_plan` mit Stamp und Cache. Tests: Cache-Treffer ohne Neuberechnung, Invalidierung bei Plan-, Einkaufs- und Regeländerung, Query-Count-Test (feste Obergrenze, unabhängig von der Zahl der Mahlzeiten).

## 3. Backend: Rechte

- [x] 3.1 `shopping/services/trip_access.py` mit `event_shopping_role`. Tests für Event-Verantwortliche, Ersteller, Staff, Plan-Editor, Plan-Viewer und Fremde.
- [x] 3.2 `resolve_actor` um die Event-Rolle erweitern (manage wird admin, read wird viewer), mit Zwischenspeicherung pro Request. Die bestehenden Tests in `test_sharing.py` und `test_board.py` bleiben grün, neue Tests prüfen den Zugriff des Event-Teams auf Board und Detail ohne Einladung sowie 404 für Fremde.

## 4. Backend: API und Schemas

- [x] 4.1 `shopping/schemas.py` in ein Package umbauen (`lists.py`, `trips.py`, `stores.py`, Re-Export in `__init__.py`), neue Schemas `StoreIn/Out`, `ShoppingTripIn`, `TripPlanOut`, `AllocationRuleIn/Out`, `TripDiffOut` und `ShoppingEventOut` anlegen, `ShoppingListOut` und `ShoppingListDetailOut` erweitern. `test_schemas.py` wird um die neuen Felder erweitert.
- [x] 4.2 Store-Endpunkte (`/api/shopping-stores/`, paginiert, `search`, `event_slug`, doppelte Namen ohne Rücksicht auf Groß- und Kleinschreibung, 409 beim Löschen in Verwendung). API-Tests für 201, 422, 401, 404 und 409.
- [x] 4.3 `GET /api/shopping-events/` (paginiert, Sortierung laufend, kommend, vergangen, `include_past`) ohne N+1. Tests für Reihenfolge, Paginierung, 401 und Query-Count.
- [x] 4.4 `GET /api/shopping-events/{slug}/plan/` und `POST …/trips/` (Pflichtfelder, Name in Europe/Berlin). Tests für 201, 422 „Bitte gib an, wann eingekauft wird.“, 403 für Viewer, 404 für Fremde und 401.
- [x] 4.5 Regel-Endpunkte (`GET/POST /api/shopping-events/{slug}/rules/`, `DELETE /api/shopping-rules/{id}/`), Validierung (genau eine von Zutat und Material, Ziel gehört zum Event). Tests für Anlegen, Löschen mit Rückfall auf den Standard und Kaskade beim Löschen des Ziels.
- [x] 4.6 `PATCH /api/shopping-lists/{id}/` um `store_id` und `scheduled_at` erweitern, Bestätigungsdaten für erstellte Einkäufe (`checked_count`) im Detail liefern. Tests für das Verschieben des Termins mit neuer Zuordnung.
- [x] 4.7 `POST /api/shopping-lists/{id}/materialize/` (atomar, `select_for_update`, 409 beim zweiten Aufruf, manuelle Items bleiben). Den gemeinsamen Erzeugungscode aus `create_from_meal_plan` herauslösen. Tests decken Snapshot-Inhalt, Quellen und 409 ab.
- [x] 4.8 `GET/POST /api/shopping-lists/{id}/plan-diff/` (neu, geändert, entfallen, abgehakt bleibt, neue Zeile bei Mehrbedarf, `plan_synced_at`). Tests für alle Szenarien aus „Differenz nach Planänderung übernehmen“.
- [x] 4.9 `source_status` für Event-Einkäufe (Vergleich mit `plan_synced_at`, `deleted` bei gelöschtem Event, `null` bei geplanten) in `shopping/services/source_status.py`. Die Tests in `test_source_freshness.py` werden angepasst und erweitert, der Query-Count der Übersicht bleibt konstant.
- [x] 4.10 `GET /api/shopping-lists/` um `without_event` und `invited_trips` erweitern. Tests für die Trennung der Abschnitte.
- [x] 4.11 `POST /api/shopping-lists/from-recipe/{id}/` auf `store_id` mit `scheduled_at` oder `shopping_list_id` umstellen (Zusammenführen offener Zeilen, neue Zeile bei abgehakten, 409 bei erstellten Event-Einkäufen, 403 für Betrachter, 422 ohne Ziel). Die Tests werden angepasst.
- [x] 4.12 `POST /api/shopping-lists/from-meal-plan/{id}/` entfernen, ebenso Tests und Aufrufer. `rg "from-meal-plan"` findet keine Treffer mehr außer im Archiv.
- [x] 4.13 `PUT /api/meal-plans/{id}/event/` in `planner/api/meal_plan.py` sowie die 409-Prüfung in `create_event` bzw. `_sync_meal_plan_relation` (atomar). Tests für 200, 403, 409, 401 und dafür, dass bei 409 kein Event entsteht.

## 5. Frontend: Schemas und Hooks (`frontend-food`)

- [x] 5.1 Zod-Schemas in `src/schemas/shoppingList.ts` erweitern, neu sind `shoppingTrip.ts` und `shoppingStore.ts`, synchron zu 4.1. Schema-Tests parsen Beispielantworten aus den Backend-Tests.
- [x] 5.2 Hooks in `src/api/shoppingTrips.ts`, `src/api/shoppingStores.ts` sowie `useLinkMealPlanEvent` und `useCreateEventForMealPlan`, mit Query-Keys und Invalidierung. Hook-Tests mit MSW prüfen Invalidierung und Fehlertexte.
- [x] 5.3 `useCreateFromMealPlan` entfernen, `useCreateFromRecipe` auf die neue Payload umstellen. `npm run typecheck` und `npm run lint` laufen fehlerfrei.

## 6. Frontend: Übersicht und Einkäufe planen

- [x] 6.1 `pages/shopping/ShoppingListPage.tsx`: Event-Auswahl, Abschnitt „Einkäufe, zu denen du eingeladen bist“, „Einkaufslisten ohne Event“, Aktionen „Freie Liste“ und „Einkauf aus Rezepten“, `include_past` in der URL. Komponententests für alle Szenarien aus `shopping-list-overview`, inklusive Login-Hinweis.
- [x] 6.2 `StoreCombobox` mit Suche und „„…“ anlegen“. Ein Test deckt Auswahl, Neuanlage und Fehler ab.
- [x] 6.3 `pages/shopping/TripPlanningPage.tsx` mit `TripCard`, `TripFormDialog`, `UncoveredSection` und Hinweisliste, Route `/shopping-lists/events/:eventSlug`, `?trip=` in der URL. Tests für Anlegen, Ändern, Löschen (Bestätigung mit abgehakter Anzahl) und die Read-only-Ansicht für Betrachter.
- [x] 6.4 `MoveAllocationDialog` (Ziel, ganz oder Teilmenge, alle Mahlzeiten oder eine) und das Löschen von Regeln, mit Anzeige der Regel-Hinweise. Tests für das Verschieben von Hackfleisch und von 3 kg Kartoffeln.
- [x] 6.5 Detailseite `ShoppingListDetailPage.tsx`: Kopf mit Laden und Zeitpunkt, Vorschau mit „Liste erstellen“ bei geplanten Einkäufen (keine Checkboxen und kein Einkaufsmodus), Link „Einkäufe planen“. Tests für geplant und erstellt.
- [x] 6.6 `PlanDiffDialog` und Anpassung von `SourceFreshnessNotice` („Änderungen ansehen“ und „Änderungen übernehmen“ nur mit Planungsrecht, Altlisten nur mit Hinweis, Event gelöscht). Tests für alle Szenarien aus `shopping-list-source-freshness`.
- [x] 6.7 Mobile-Prüfung bei 320 px für die Übersicht, die Planungsseite und die Dialoge (kein horizontales Scrollen). Nachweis per Screenshot in der Browser-Preview.

## 7. Frontend: Essensplan und Rezept

- [x] 7.1 `components/planning/LinkEventDialog.tsx` (Event wählen, paginiert, oder neu anlegen mit Plan-Daten, 409-Meldung). Tests für beide Wege und den Konflikt.
- [x] 7.2 `pages/planning/ShoppingView.tsx`: Erstellen und Rückfrage entfernen, Link „Einkäufe planen“ bzw. „Event verknüpfen“. `ShoppingView.test.tsx` wird angepasst.
- [x] 7.3 Tagesansicht des Essensplans: Einkaufs-Marker zwischen den Mahlzeiten, „Einkauf einfügen“ mit vorbelegtem Tag, Uhrzeit ändern, Hinweis ohne Event. Komponententest für die Einsortierung zwischen Frühstück und Mittagessen.
- [x] 7.4 `pages/recipes/RecipeDetailPage.tsx`: Dialog „Einkaufen“ mit „Neuer Einkauf“ oder „Zu bestehender Liste“. Ein Test deckt beide Wege und die 409-Meldung ab.

## 8. Integration

- [x] 8.1 E2E-Szenario in `e2e/`: Plan ohne Event → Event im Dialog anlegen → drei Einkäufe → Hackfleisch zum Metzger verschieben → „Liste erstellen“ → Plan ändern → „Änderungen übernehmen“ → Board abhaken. Läuft grün in der Food-E2E-Suite.
- [x] 8.2 Die Lastprobe aus `shopping-list-load-resilience` um den Abruf von `GET /api/shopping-events/{slug}/plan/` erweitern und lokal ausführen. p95 liegt bei Cache-Treffern unter 300 ms.
- [x] 8.3 `uv run pytest backend/shopping backend/planner backend/event backend/supply` sowie `npm test` in `frontend-food` laufen fehlerfrei. `openspec validate event-shopping-trips --strict` ist grün.

## Workflow follow-up

- Die Datenmigration 0008 in Produktion vorab als Dry-Run zählen und nur mit ausdrücklichem OK anwenden. Deploy ausschließlich über `main`.
- Danach den Change archivieren und Etappe 2 (Haltbarkeit und Vorrat) als neuen Change vorschlagen.
