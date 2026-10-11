# Design: Aktualitätshinweis für planbasierte Einkaufslisten

## Kontext

`POST /api/shopping-lists/from-meal-plan/{meal_plan_id}/` (`backend/shopping/api.py`, `create_from_meal_plan`) legt eine `ShoppingList` mit `source_type=meal_event` und `source_id=<plan>` an und kopiert die berechneten Einträge. `ShoppingList.created_at` ist der Erstellzeitpunkt. `MealPlan.updated_at` (`auto_now`) ändert sich nur beim Speichern der Plan-Zeile, nicht bei Änderungen an `Meal` oder `MealItem`.

## Entscheidungen

1. **Snapshot mit Hinweis (Owner-Entscheidung 6).** Die Liste wird nie aus dem Plan verändert. Veraltet heißt: `MealPlan.updated_at > ShoppingList.created_at`. Kein zusätzliches Feld, keine Migration.
2. **Plan-Änderungen setzen `updated_at`.** Neuer Service `planner/services/plan_touch.py` mit `touch_meal_plan(meal_plan_id: int) -> None` (`MealPlan.objects.filter(id=…).update(updated_at=timezone.now())`). Aufrufer:
   - `post_save`/`post_delete`-Signale für `Meal` und `MealItem` in `backend/planner/signals.py`;
   - Pfade mit `bulk_create`, `bulk_update` oder `QuerySet.update/delete`, die keine Signale auslösen (Einträge kopieren, Plan duplizieren, Wizard-Bulk, Buffet speichern, Referenzmahlzeit-Sync), rufen `touch_meal_plan` am Ende der Transaktion einmal auf.
   - Änderungen an Plan-Einstellungen (Normportionen, Reserve, Gruppenmitglieder) speichern den Plan bereits und setzen `updated_at` über `auto_now`.
3. **Status als berechnetes Feld.** `ShoppingListOut` und `ShoppingListDetailOut` erhalten:
   - `source_status: Literal["current", "changed", "deleted"] | None` – `None` für manuelle und rezeptbasierte Listen und wenn der Nutzer den Plan nicht mehr lesen darf (keine Informationen über fremde Pläne);
   - `source_updated_at: datetime | None` – `MealPlan.updated_at` bei `current`/`changed`, sonst `None`.
   Die Listen-Übersicht lädt die Pläne gebündelt (eine Abfrage über alle `source_id` der Seite), damit kein N+1 entsteht.
4. **Neuerstellung über den bestehenden Endpunkt.** „Neue Liste erstellen“ ruft `POST /api/shopping-lists/from-meal-plan/{source_id}/` auf und navigiert zur neuen Liste. Die alte Liste bleibt unverändert; ihr Hinweis bleibt sichtbar, bis sie gelöscht wird.
5. **Doppelte Listen (Vorschlag, Owner-Freigabe offen).** `ShoppingView.tsx` zeigt vorhandene Listen des Plans (Filter `source_type=meal_event&source_id=<plan>` auf `GET /api/shopping-lists/`) mit Status. Existiert eine Liste mit `current`, fragt ein Bestätigungsdialog „Für diesen Plan gibt es bereits eine aktuelle Einkaufsliste. Trotzdem eine neue erstellen?“. Das Backend bleibt ohne Sperre, damit bewusste Neuerstellung möglich bleibt.

## API-Änderungen

| Methode | Pfad | Änderung |
|---|---|---|
| GET | `/api/shopping-lists/` | Items mit `source_status`, `source_updated_at`; neue optionale Filter `source_type`, `source_id` (Pagination unverändert: `page`, `page_size`) |
| GET | `/api/shopping-lists/{id}/` | `source_status`, `source_updated_at` |
| POST | `/api/shopping-lists/from-meal-plan/{meal_plan_id}/` | unverändert; Antwort enthält `source_status="current"` |

WebSocket-Payloads ändern sich nicht.

## Betroffene Dateien

- Backend: `backend/planner/services/plan_touch.py` (neu), `backend/planner/signals.py`, `backend/planner/api/meal_plan.py` (Kopier-, Duplizier- und Bulk-Pfade), `backend/planner/api/buffet.py`, `backend/planner/api/ref_meal.py`, `backend/shopping/schemas.py`, `backend/shopping/api.py`.
- Frontend: `frontend-food/src/schemas/shoppingList.ts`, `frontend-food/src/api/shoppingLists.ts`, `frontend-food/src/pages/shopping/ShoppingListDetailPage.tsx`, `frontend-food/src/pages/shopping/ShoppingListPage.tsx`, `frontend-food/src/pages/planning/ShoppingView.tsx`.

## Migrationen

Keine.

## Risiken

- `MealPlan.updated_at` ändert sich künftig häufiger. Sortierungen nach „zuletzt bearbeitet“ spiegeln dann auch Änderungen an Mahlzeiten wider; das ist gewollt, muss aber in den Listen-Tests berücksichtigt werden.
- Pfade ohne Signale, die `touch_meal_plan` vergessen, erzeugen fälschlich „aktuell“. Ein Test pro Schreibpfad sichert das ab.

## Offene Fragen an den Owner

1. Soll die Bestätigung vor einer weiteren Liste (Entscheidung 5) umgesetzt werden?
2. Soll der Hinweis auch für Collaborators der Liste erscheinen, die den Plan lesen dürfen (Vorschlag: ja), oder nur für den Besitzer?
