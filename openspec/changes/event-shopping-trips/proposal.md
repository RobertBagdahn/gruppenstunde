## Why

Bei einem Lager wird nicht einmal eingekauft, sondern mehrmals in verschiedenen Läden (Metro vorab, Rewe alle zwei Tage, Metzger, DM). Heute erzeugt ein Essensplan genau eine Einkaufsliste für den ganzen Zeitraum. Es gibt keinen Laden, kein Datum und keinen Bezug zum Event. Wer frisch einkaufen will, muss die Liste von Hand zerlegen. Ändert sich der Plan, entsteht eine neue Liste. Dieser Change ist Etappe 1 von 4 der Strukturumstellung und führt das Grundgerüst ein: **Einkäufe pro Event, jeweils mit Laden und Zeitpunkt, und eine automatische Verteilung des Bedarfs nach Datum.**

## What Changes

- **Einstieg über das Event:** Die Startseite `/shopping-lists` zeigt zuerst die Event-Auswahl (Events mit Essensplan, auf die man Zugriff hat). Darunter stehen die Einkaufslisten ohne Event: freie Listen und Rezept-Einkäufe.
- **Einkauf = Einkaufsliste (1:1):** Eine Einkaufsliste bekommt optional ein Event, einen **Laden** (wiederverwendbarer Name wie „Metro“ oder „Metzger Müller“) und einen **Zeitpunkt** (Datum und Uhrzeit). Board, Gast-Link, Abhaken und „Ich hole das“ bleiben pro Einkauf erhalten.
- **Seite „Einkäufe planen“ pro Event** (`/shopping-lists/events/:eventSlug`): Man legt dort Einkäufe an, ändert und löscht sie. Für jeden Einkauf gibt es eine live berechnete Vorschau des Bedarfs.
- **Einkäufe im Essensplan markieren:** Die Tagesansicht des Essensplans zeigt die Einkäufe zwischen den Mahlzeiten. Man kann dort einen Einkauf einfügen oder seinen Zeitpunkt ändern.
- **Automatische Zuordnung nach Datum:** Jeder Bedarf (Zutat und Menge einer Mahlzeit) geht an den letzten Einkauf, dessen Zeitpunkt vor dem Mahlzeitbeginn liegt oder genau darauf fällt. Bedarf vor dem ersten Einkauf wird als „nicht gedeckt“ gezeigt, Mahlzeiten ohne Startzeit als Hinweis. Alle Essenspläne eines Events fließen zusammen.
- **Manuelle Verschiebung in der Planung:** Man kann eine Zutat ganz oder teilweise in einen anderen Einkauf verschieben, für alle Mahlzeiten oder nur für eine. Die Verschiebung wird als Regel gespeichert und bleibt bei Änderungen am Plan oder an den Terminen erhalten.
- **„Liste erstellen“:** Damit wird ein Einkauf zum Snapshot. Ändert sich danach der Plan, zeigt der Einkauf „Essensplan wurde geändert“ mit der Differenz. Die Differenz kann man übernehmen, ohne dass abgehakte Einträge verändert werden.
- **Rezept-Einkauf ohne Plan:** Ein Einkauf ohne Event mit Laden und Zeitpunkt, in den man ein oder mehrere Rezepte mit Portionen übernimmt (z. B. für eine Gruppenstunde).
- **Plan ohne Event:** Wer für einen solchen Plan Einkäufe planen will, legt im Dialog ein Event an (Name und Zeitraum aus dem Plan vorbelegt) oder wählt ein bestehendes. Danach wird der Plan verknüpft.
- **Rechte:** Event-Verantwortliche und Bearbeiter der Essenspläne des Events verwalten alle Einkäufe dieses Events, ohne eigene Einladung. Mitkäufer und Gäste werden weiterhin pro Einkauf eingeladen.
- **BREAKING** `POST /api/shopping-lists/from-meal-plan/{id}/` entfällt. Listen aus Essensplänen entstehen nur noch über Einkäufe. Der Einkaufen-Tab im Essensplan zeigt den Gesamtbedarf und führt zu „Einkäufe planen“.
- **BREAKING** `POST /api/shopping-lists/from-recipe/{id}/` verlangt Laden und Zeitpunkt. Ein Rezept kann alternativ einer bestehenden Liste hinzugefügt werden.

Nicht Teil dieses Changes (Etappen 2–4, siehe design.md): Haltbarkeitsdaten und Vorratseinkauf, Kühlung vor Ort, Vorratsliste, gemeinsame Reserve und Anrechnung des Packungsüberschusses, Teilkauf im Laden mit Rest-Verschieben, Zuweisen, Race-Fix beim Übernehmen, verbessertes Polling, Bonsumme pro Einkauf.

## Capabilities

### New Capabilities
- `shopping-trip-planning`: Einkäufe eines Events planen. Umfasst Einkäufe mit Laden und Zeitpunkt, die Zuordnung des Bedarfs nach Datum, manuelle Zuordnungsregeln, die Vorschau, „Liste erstellen“, die Plan-Differenz, die Markierung im Essensplan und die Rechte des Event-Teams.
- `shopping-stores`: Wiederverwendbare Läden (Name), Auswahl und Anlage beim Planen eines Einkaufs.
- `shopping-list-overview`: Startseite der Einkaufslisten. Umfasst die Event-Auswahl, die Listen ohne Event und den Rezept-Einkauf ohne Plan.

### Modified Capabilities
- `shopping-list`: Eine Liste trägt Event, Laden und Zeitpunkt. Rezept-Einkäufe brauchen Laden und Zeitpunkt, und Rezepte lassen sich einer bestehenden Liste hinzufügen.
- `shopping-list-source-freshness`: Der Snapshot gilt pro Einkauf. Der Status bezieht sich auf die Essenspläne des Events. „Neue Liste erstellen“ wird durch „Differenz übernehmen“ ersetzt. Die Rückfrage vor einer weiteren Liste entfällt.
- `event-mealplan-relation`: Ein bestehender Essensplan kann nachträglich mit einem Event verknüpft werden, auch mit einem Event, das im selben Dialog neu angelegt wird.

## Impact

- **Backend `shopping`:** Neue Models `Store` und `ShoppingAllocationRule`. `ShoppingList` erhält `event`, `store`, `scheduled_at` und `materialized_at`. Neues Package `shopping/services/trips/` für Bedarf, Zuordnung, Vorschau, Erstellung und Differenz. Neue Router für Einkäufe und Läden. `create_from_meal_plan` entfällt, `create_from_recipe` wird angepasst. Migrationen 0007 ff., inklusive einer Datenmigration, die bestehende Plan-Listen dem Event des Plans zuordnet, soweit es eines gibt.
- **Backend `planner`/`supply`:** `collect_ingredient_contributions` (`supply/services/shopping_service.py`) liefert pro Beitrag den Mahlzeitbeginn. Neuer Endpunkt zum Verknüpfen eines Plans mit einem Event (`planner/api/meal_plan.py`).
- **Backend `event`:** Rechteprüfung über `Event.user_can_manage`. Keine Model-Änderung.
- **Pydantic** (`shopping/schemas.py`, neu `shopping/schemas_trips.py` bzw. ein Package): `ShoppingListOut` und `ShoppingListDetailOut` um `event_id`, `event_slug`, `store`, `scheduled_at` und `materialized_at` erweitern. Neu sind `StoreOut/In`, `ShoppingTripIn/Update`, `TripPlanOut` (Einkäufe, Vorschau, nicht gedeckt, Hinweise), `AllocationRuleIn/Out`, `TripDiffOut` und `FromRecipeIn` (mit `store_id`, `scheduled_at` und optional `shopping_list_id`).
- **Zod** (`frontend-food/src/schemas/shoppingList.ts`, neu `shoppingTrip.ts`): spiegelbildlich dazu.
- **Frontend `frontend-food`:** `pages/shopping/ShoppingListPage.tsx` (Event-Auswahl), neue Seite `pages/shopping/TripPlanningPage.tsx`, `pages/planning/ShoppingView.tsx` (Link statt Erstellen), Tagesansicht des Essensplans (Einkaufs-Marker), `pages/recipes/RecipeDetailPage.tsx` (Rezept-Einkauf mit Laden und Zeitpunkt), Dialog „Event verknüpfen“, Hooks in `src/api/shoppingTrips.ts`.
- **Voraussetzung:** `switchable-quantity-units`, `shopping-list-load-resilience` und `stable-backend-capacity` sind abgeschlossen und archiviert, bevor die Umsetzung beginnt.
