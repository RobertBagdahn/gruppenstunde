## 1. Backend — Schema & API

- [x] 1.1 Add `search`, `date_from`, `date_to` query parameters to `list_meal_plans` in `backend/planner/api/meal_plan.py` — filter via `Q(name__icontains=...) | Q(description__icontains=...) | Q(event__name__icontains=...)` and date range on `start_datetime`/`end_datetime`
- [x] 1.2 Add `note: str | None = None` field to `CopyItemsFromPlanIn` in `backend/planner/schemas/meal_plan.py`; remove `item_ids` field (no longer selectable)
- [x] 1.3 Update `copy_items_from_plan` endpoint to set `target_meal.note` with the provenance note after copying
- [x] 1.4 Write backend tests for: search filter, date filter, note-setting on copy, synced target rejection, removed item_ids

## 2. Frontend — Schemas & API Hooks

- [x] 2.1 Update `CopyItemsFromPlanInSchema` in `frontend-food/src/schemas/mealPlan.ts`: remove `item_ids`, add `note: z.string().optional()`
- [x] 2.2 Add `search`, `date_from`, `date_to` params to the `useMealPlans` query in `frontend-food/src/api/mealPlans.ts` (or create a dedicated `useMealPlansSearch` hook)
- [x] 2.3 Update `useCopyItemsFromPlan` mutation to pass `note` in the body

## 3. Frontend — New CopyFromPlanDialog

- [x] 3.1 Rewrite `frontend-food/src/pages/planning/CopyFromPlanDialog.tsx` with 3-step flow: Plan-Liste → Tag → Mahlzeit (mit Vorschau)
- [x] 3.2 Step 1: Plan-Liste mit Search-Input, Date-Range-Filter (von–bis), und erweiterten Plan-Karten (name, daterange, days count, meals count, event_name)
- [x] 3.3 Step 2: Tag-Auswahl (gleicht dem bestehenden Tag-Schritt)
- [x] 3.4 Step 3: Mahlzeit-Auswahl mit Vorschau — Items-Liste mit Factor und kcal, Summe kcal, Kopieren-Button
- [x] 3.5 Setze `note` auf "Importiert aus «{plan_name}»" beim Kopiervorgang (appended an bestehende Note)
- [x] 3.6 Dialog-Navigation: Zurück-/Abbrechen-Buttons, Loading States, Error Handling

## 4. Cleanup & Sync

- [x] 4.1 Entferne die `item_ids`-Logik aus dem Dialog (es gibt keinen Item-Selektions-Schritt mehr)
- [x] 4.2 Entferne `filter((p) => p.id !== targetPlanId)` — aktueller Plan darf in der Liste erscheinen
- [x] 4.3 Entferne `filter((m) => !m.is_synced)` aus dem Meal-Filter — alle Mahlzeiten anzeigen
- [x] 4.4 Lint + Typecheck für Backend und Frontend
- [x] 4.5 Alte `meal-item-copy` spec in `openspec/specs/meal-item-copy/spec.md` ersetzen durch den Inhalt aus `openspec/changes/event-meal-import/specs/meal-item-copy/spec.md`
