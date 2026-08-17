## Why

Der MealPlan hat aktuell kein eigenes Start-/Enddatum. Tage ergeben sich implizit aus den `Meal.start_datetime`-Werten. Das macht es umständlich, Tage hinzuzufügen — der User muss ein Datum über ein Date-Picker wählen. Stattdessen soll der MealPlan eigene `start_datetime`/`end_datetime`-Felder bekommen (mit Uhrzeit), sodass einfache Buttons "Tag davor" / "Tag danach" den Zeitraum erweitern und automatisch passende Meals generieren.

Die Uhrzeit bestimmt, welche Mahlzeiten am ersten/letzten Tag sinnvoll sind (z.B. Anreise 14:00 → kein Frühstück am ersten Tag; Abreise 11:00 → nur Frühstück am letzten Tag).

## What Changes

- **BREAKING**: `MealPlan`-Model bekommt `start_datetime` und `end_datetime` (DateTimeField)
- **BREAKING**: `MealPlanCreateIn` Schema: `start_datetime` + `end_datetime` ersetzen `start_date` + `num_days`
- Neue API-Aktionen: "Tag davor einfügen" (start -= 1 Tag + Meals generieren) und "Tag danach einfügen" (end += 1 Tag + Meals generieren)
- Automatische Meal-Generierung berücksichtigt Uhrzeit: erster Tag nur Meals ab Startzeit, letzter Tag nur Meals bis Endzeit, alle anderen vollen Satz
- Frontend: Settings-Panel zeigt Start/Ende als Datetime-Inputs; "Tag davor"/"Tag danach" Buttons ersetzen den Date-Picker + "Tag hinzufügen"
- Bestehende Meals bleiben erhalten — Start/Ende ist Metadatum, das bei Erweiterung neue Meals generiert

## Capabilities

### New Capabilities
- `meal-plan-timeframe`: MealPlan-Zeitraum mit Start/Ende-Datetime, automatische Meal-Generierung basierend auf Uhrzeiten, Tag davor/danach einfügen

### Modified Capabilities
- `meal-plan`: Erstell-Flow ändert sich (start_datetime/end_datetime statt start_date/num_days)

## Impact

- **Backend**: `planner/models/meal_plan.py` (Model), `planner/schemas/meal_plan.py` (Pydantic), `planner/api/meal_plan.py` (Endpoints)
- **Migration**: Neue Felder `start_datetime`, `end_datetime` auf MealPlan; bestehende Pläne brauchen Default-Werte (ableitbar aus vorhandenen Meals)
- **Frontend (food)**: `frontend-food/src/schemas/mealPlan.ts` (Zod), `frontend-food/src/api/mealPlans.ts` (Hooks), `MealEventDetailPage.tsx` (UI)
- **Pydantic-Schemas**: `MealPlanCreateIn`, `MealPlanUpdateIn`, `MealPlanOut`, `MealPlanDetailSchema`
- **Zod-Schemas**: `MealPlanSchema`, `MealPlanDetailSchema`
