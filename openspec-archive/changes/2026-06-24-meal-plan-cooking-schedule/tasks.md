## 1. Backend — Service & Berechnungslogik

- [x] 1.1 `planner/services/cooking_schedule_service.py` anlegen: Bucket→Minuten-Mapping (execution: 30/60/90/120, preparation: 0/15/30/60/90)
- [x] 1.2 Funktion `compute_recipe_lead_minutes(recipe)` — Summe aus prep + execution Minuten
- [x] 1.3 Funktion `build_cooking_schedule(meal_plan)` — Mahlzeiten laden, externe und `start_datetime=None` ausschließen, Rezepte je Mahlzeit sammeln
- [x] 1.4 Startzeit pro Rezept = `start_datetime − lead_minutes` berechnen
- [x] 1.5 Portionen pro Eintrag = `override_portions` oder `norm_portions`
- [x] 1.6 Gruppierung pro Tag (`start_datetime__date`), sortieren nach Startzeit, Sekundärsortierung Rezeptname
- [x] 1.7 Flag/Information, ob Mahlzeiten wegen fehlender Servierzeit ausgeschlossen wurden

## 2. Backend — Schemas & API

- [x] 2.1 Pydantic-Schemas `CookingScheduleItemOut`, `CookingScheduleDayOut`, `CookingScheduleOut` in `planner/schemas/`
- [x] 2.2 Endpunkt `GET /api/meal-plans/{id}/cooking-schedule/` im `planner` Router
- [x] 2.3 Auth-/Permission-Checks: 404 bei nicht existierendem Plan, 403 bei fehlendem Zugriff
- [x] 2.4 `__init__.py` Re-Exporte aktualisieren (Hybrid Package-Struktur)

## 3. Backend — Tests

- [x] 3.1 Test Bucket→Minuten-Mapping (alle Buckets)
- [x] 3.2 Test Rückwärtsberechnung (18:00 − 90min = 16:30)
- [x] 3.3 Test Tages-Gruppierung + Sortierung (inkl. gleiche Startzeit → Name)
- [x] 3.4 Test Ausschluss externer Mahlzeiten und Mahlzeiten ohne `start_datetime`
- [x] 3.5 Test Portionen-Ableitung (override vs. norm)
- [x] 3.6 Test API Happy-Path + 403 + 404

## 4. Frontend — Schemas & Hook

- [x] 4.1 Zod-Schemas synchron zu den Pydantic-Schemas in `frontend-food`
- [x] 4.2 TanStack-Query-Hook `useCookingSchedule(mealPlanId)`

## 5. Frontend — Interaktive Ansicht

- [x] 5.1 `CookingSchedulePage.tsx` — pro Tag gruppiert, Spalten: Startzeit, Servierzeit, Rezeptname (verlinkt), Dauer, Mahlzeit-Typ (Badge), Portionen
- [x] 5.2 Route für die Kochplan-Seite in `App.tsx` (im FoodLayout)
- [x] 5.3 Hinweis-Banner bei wegen fehlender Servierzeit ausgeschlossenen Mahlzeiten
- [x] 5.4 „Kochplan"-Button auf der Essensplan-Detailseite

## 6. Frontend — Druckansicht

- [x] 6.1 `CookingSchedulePrintPage.tsx` — A4-optimiert, ohne FoodLayout, alle Tage ausgeklappt
- [x] 6.2 Route `/meal-plans/:id/cooking-schedule/print` in `App.tsx` (ohne FoodLayout)
- [x] 6.3 „Drucken"-Button auf der Kochplan-Seite (öffnet Print-Route in neuem Tab)

## 7. Abschluss

- [x] 7.1 Mobile (320px) und Desktop testen
- [x] 7.2 Pydantic- und Zod-Schemas auf 1:1-Sync prüfen
- [x] 7.3 `openspec validate meal-plan-cooking-schedule` läuft fehlerfrei
