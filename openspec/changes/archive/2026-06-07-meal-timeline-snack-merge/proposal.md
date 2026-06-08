## Why

Der Essensplan hat 5 Mahlzeit-Typen (inkl. Drinks), aber Snacks und Getränke sind starr an eine Uhrzeit gebunden und können nicht mehrfach pro Tag auftauchen. In der Realität gibt es oft mehrere Snack-Momente (Kaffee, Kekse, Obst) oder Getränke-Slots, die flexibel über den Tag verteilt sein sollen. Zudem werden die Uhrzeiten der Mahlzeiten nirgendwo im UI angezeigt und sind nicht konfigurierbar. Eine chronologische Timeline-Ansicht (Zeitplan) fehlt.

## What Changes

- **BREAKING**: `drinks` als MealTypeChoices entfernen, `snack` wird zum Sammel-Typ für alle Snacks und Getränke
- **BREAKING**: `day_part_factor`-Propagation aus `MealPlan.save()` entfernen (jedes Meal behält seinen individuellen Faktor)
- **BREAKING**: Drinks-Kcal-Check in `MealItemOut.resolve_energy_kj` und `MealOut.resolve_total_energy_kj` entfernen
- `Meal.display_name`: Neues CharField für benutzerdefinierte Anzeigenamen (z.B. "Kaffee", "Saft", "Abendlicher Tee")
- `MealPlan.meal_default_times`: Neues JSONField für konfigurierbare Default-Uhrzeiten pro Mahlzeit-Typ (ähnlich `day_part_factors`)
- Unique Constraint für `meal_type='snack'` lockern: mehrere Snack-Meals pro Tag und Plan erlaubt
- Neue API-Response-Felder: `display_name`, `meal_default_times` in MealPlan-Detail
- SettingsPanel: Uhrzeit-Editoren für jeden Mahlzeit-Typ + day_part_factors bleiben erhalten
- DayPlanView: `display_name` + Uhrzeit anzeigen, Snack mehrfach pro Tag hinzufügbar
- TableView (Tabelle): 4 Spalten (breakfast, lunch, dinner, snack), Snack-merge
- **NEU**: Zeitplan-Tab (chronologische Timeline pro Tag, ohne tote Zwischenräume)
- Migration: `meal_type='drinks'` → `meal_type='snack'`, `day_part_factor=0.00`

## Capabilities

### New Capabilities
- `meal-plan-schedule`: Neue Timeline-Ansicht (Zeitplan) als chronologische Tagesübersicht mit fixen Uhrzeit-Achsen und komprimierten Zwischenräumen

### Modified Capabilities
- `meal-plan`: MealTypeChoices von 5 auf 4 reduziert (drinks entfernt), `display_name` + `meal_default_times` neue Felder, Unique Constraint gelockert, kein Drinks-Kcal-Check mehr, keine day_part_factor-Propagation
- `meal-plan-table-view`: Spalten auf 4 reduziert (snack merged)
- `meal-plan-timeframe`: Keine Drinks-Generierung mehr am ersten/letzten Tag, Snack-Filterung statt Drinks-Filter

## Impact

- **Backend**: `planner/models/meal_plan.py` (MealTypeChoices, Meal.display_name, MealPlan.meal_default_times, UniqueConstraint, save()-Propagation entfernt), `planner/schemas/meal_plan.py` (neue Felder, Drinks-Checks entfernt), Migration erforderlich
- **Frontend**: `frontend-food/src/schemas/mealPlan.ts` (Konstanten, Schemas), `SettingsPanel.tsx` (Uhrzeit-Editoren), `DayPlanView.tsx` (display_name, Uhrzeit, mehrfache Snacks), `TableView.tsx` (4 Spalten), neuer `ScheduleView.tsx` (Zeitplan)
- **Schemas**: Pydantic + Zod sync erforderlich (display_name, meal_default_times)
- **Keine neuen Abhängigkeiten**
