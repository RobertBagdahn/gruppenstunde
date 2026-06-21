## Why

Die Essensplan-Liste (`/meal-plans/app`) zeigt aktuell alle Pläne als flache, gleichförmige Karten — ohne Priorisierung, ohne Status-Übersicht, ohne die dringendsten Pläne hervorzuheben. Ein Gruppenführer mit 20 Plänen sieht nicht auf einen Blick, welcher Plan Aufmerksamkeit braucht. Die Liste unterscheidet nicht zwischen aktiven Plänen, Referenzvorlagen und vergangenen Events.

## What Changes

- **Top-5-Dashboard**: Die fünf zeitlich nächsten anstehenden Pläne erscheinen ganz oben als große Hero-Karten mit Countdown („Noch X Tage“), Fortschrittsbalken, Portionen, Budget, Ernährungstags und einer Ampel-Statusanzeige
- **Ampel (Readiness Traffic Light)**: Jeder Plan bekommt eine grüne/gelbe/rote Statusanzeige basierend auf dem Befüllungsgrad (gefüllte Mahlzeiten / Gesamtmahlzeiten)
- **Vier Sektionen mit klarer Hierarchie**: Top 5 (immer offen) → Weitere Pläne (zugeklappt) → Referenzpläne (zugeklappt) → Vergangene Pläne (zugeklappt)
- **Referenzpläne**: Community-verifizierte Pläne (`owner_id === null`) werden als kopierbare Vorlagen in eigener Sektion angezeigt
- **`filled_meals_count` im Backend**: Neue Annotation in `list_meal_plans` liefert die Anzahl befüllter Mahlzeiten für die Ampel-Berechnung — **BREAKING**: `MealPlanOut` und `MealPlanSchema` (Zod) erhalten das neue Feld
- **Neue Filter**: Quick-Filter-Chips für Zeiträume (Diese Woche, Nächste Woche, Nächster Monat) und Ampel-Status (🔴/🟡/🟢)
- **Karten-Design**: Top-5-Karten erhalten deutlich mehr Fläche und Informationen; sekundäre Sektionen verwenden kompaktere Karten

## Capabilities

### New Capabilities
- `meal-plan-list-dashboard`: Section-basierte Essensplan-Übersicht mit Top-5-Hero, Ampel-Status, Countdown, Fortschrittsbalken und Referenzplan-Sektion

### Modified Capabilities
- `meal-plan-frontend`: Listendarstellung erweitert — Karten zeigen jetzt `filled_meals_count`, Ampel, Countdown, Fortschrittsbalken. Routen-Struktur unverändert.
- `food-list-page-layout`: Layout-Patterns für die neue viergeteilte Sektionsstruktur mit unterschiedlichen Kartengrößen (Hero vs. Compact)

## Impact

- **Backend**: `backend/planner/schemas/meal_plan.py` — `MealPlanOut` erhält `filled_meals_count: int`. `backend/planner/api/meal_plan.py` — `list_meal_plans` annotiert `filled_meals_count` via `Count` mit Filter.
- **Frontend**: `frontend-food/src/schemas/mealPlan.ts` — `MealPlanSchema` (Zod) erhält `filled_meals_count`. `frontend-food/src/pages/planning/MealEventListPage.tsx` — kompletter Umbau der Listenstruktur. Neue Komponenten: `MealPlanHeroCard`, `MealPlanCompactCard`, `MealPlanSection`, `AmpelFilter`.
- **Keine Migration nötig**: `filled_meals_count` wird per Query-Annotation berechnet, kein neues DB-Feld.
- **Keine Breaking Changes für andere Seiten**: Die Änderungen betreffen nur die Listen-Seite und das List-Schema. Die Detail-Seite (`/meal-plans/:id`) bleibt unberührt.
