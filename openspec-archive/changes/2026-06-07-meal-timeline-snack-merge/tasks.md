## 1. Backend — Model & Migration

- [x] 1.1 `MealTypeChoices`: `DRINKS` entfernen, auf 4 Types reduzieren
- [x] 1.2 `Meal.display_name`: neues `CharField(max_length=200, blank=True, default="")` hinzufügen
- [x] 1.3 `MealPlan.meal_default_times`: neues `JSONField(default=default_meal_default_times)` hinzufügen (Helper-Funktion `default_meal_default_times()` in `meal_plan.py`)
- [x] 1.4 `Meal.clean()`: Unique-Validation für snack lockern (snack von der Prüfung ausnehmen)
- [x] 1.5 `MealPlan.save()`: `day_part_factor`-Propagation entfernen (kompletten `if not is_new and old_day_part_factors...` Block löschen)
- [x] 1.6 `DEFAULT_MEAL_TYPES` auf `[breakfast, lunch, dinner, snack]` reduzieren
- [x] 1.7 `MEAL_TYPE_DAY_FACTORS` auf 4 Einträge reduzieren
- [x] 1.8 Migration erstellen: `uv run python manage.py makemigrations planner`
- [x] 1.9 Migration anpassen: Data-Migration `meal_type='drinks'` → `meal_type='snack'`, `day_part_factor=0.00`, `display_name='Getränke'`

## 2. Backend — API & Schemas

- [x] 2.1 `MealOut`: `display_name: str` Feld hinzufügen (default `""`)
- [x] 2.2 `MealCreateIn`: `display_name: str | None = None` Feld hinzufügen
- [x] 2.3 `MealUpdateIn`: `display_name: str | None = None` Feld hinzufügen
- [x] 2.4 `MealPlanDetailOut`: `meal_default_times: dict[str, list[str]]` Feld hinzufügen
- [x] 2.5 `MealPlanUpdateIn`: `meal_default_times` Feld hinzufügen
- [x] 2.6 `MealItemOut.resolve_energy_kj`: Drinks-Check (`if obj.meal.meal_type == "drinks"`) entfernen
- [x] 2.7 `MealOut.resolve_total_energy_kj`: Drinks-Check (`if obj.meal_type == "drinks"`) entfernen
- [x] 2.8 API-Endpunkt zum Erstellen eines Meals: `display_name` aus Request akzeptieren; Snack mehrfach/Tag erlaubt (keine Zusatzlogik nötig, unique-check bereits in 1.4 gelockert)
- [x] 2.9 `create_default_meals_for_date`: nur noch 1 snack statt snack+drinks erzeugen

## 3. Frontend — Zod Schemas & Konstanten

- [x] 3.1 `MealSchema`: `display_name: z.string()` Feld hinzufügen
- [x] 3.2 `MealPlanDetailSchema`: `meal_default_times: z.record(z.string(), z.tuple([z.string(), z.string()]))` hinzufügen
- [x] 3.3 `MEAL_TYPE_ORDER` auf `['breakfast', 'lunch', 'dinner', 'snack']` reduzieren
- [x] 3.4 `MEAL_TYPE_LABELS`: drinks entfernen
- [x] 3.5 `MEAL_TYPE_ICONS`: drinks entfernen
- [x] 3.6 `MEAL_TYPE_COLORS`: drinks entfernen
- [x] 3.7 `MEAL_TYPE_DEFAULT_TIMES` als Fallback-Konstante behalten, aber primär aus API-`meal_default_times` lesen
- [x] 3.8 `getDayCoverage()`: Filter `m.meal_type !== 'drinks'` durch `m.day_part_factor > 0` ersetzen (oder entfernen, da drinks nicht mehr existieren)
- [x] 3.9 Snack-Coverage: prüfen ob `day_part_factor=0.00` korrekt behandelt wird (Soll-Kcal=0, Coverage-Skip)

## 4. Frontend — SettingsPanel

- [x] 4.1 Neue Sektion "Standard-Uhrzeiten" unter den `day_part_factors` hinzufügen
- [x] 4.2 Pro Mahlzeit-Typ zwei `time`-Inputs (Start/Ende) rendern
- [x] 4.3 `meal_default_times` aus `plan`-Prop lesen, bei Änderung in `onSave()` mitsenden
- [x] 4.4 `day_part_factors` für snack editierbar lassen (nicht mehr 0.00 forced)

## 5. Frontend — DayPlanView & MealSlot

- [x] 5.1 `MealSlot`: `display_name` prominent anzeigen (falls gesetzt, sonst `MEAL_TYPE_LABELS`)
- [x] 5.2 `MealSlot`: Uhrzeit (start-end) als Badge/Text anzeigen, z.B. "18:00 – 19:00"
- [x] 5.3 `MealSlot`: Snack ohne Uhrzeit? Nein — alle Meals zeigen Uhrzeit (laut spec)
- [x] 5.4 `DayPlanView`: Snack mehrfach pro Tag hinzufügbar (Filter-Logik `!group.meals.some(m => m.meal_type === mt)` für snack anpassen — snack immer anzeigen)
- [x] 5.5 `DayPlanView`: Add-Meal-Buttons für snack nicht ausblenden wenn bereits ein snack existiert

## 6. Frontend — TableView (4 Spalten)

- [x] 6.1 Tabellen-Header von 5 auf 4 Spalten reduzieren (drinks entfernen)
- [x] 6.2 Snack-Zelle: mehrere snack-Meals pro Tag untereinander darstellen
- [x] 6.3 Snack-Zelle: jedes Sub-Meal mit `display_name` + Uhrzeit labeln
- [x] 6.4 Mobile Darstellung prüfen (sticky left column)

## 7. Frontend — ScheduleView (neue Timeline-Komponente)

- [x] 7.1 `ScheduleView.tsx` erstellen: neue Komponente in `frontend-food/src/pages/planning/`
- [x] 7.2 Tabs in `MealEventDetailPage` erweitern: "Zeitplan" zwischen "Tagesplan" und "Tabelle"
- [x] 7.3 Pro Tag: Meals chronologisch nach `start_datetime` sortieren
- [x] 7.4 Jedes Meal: Time-Badge ("18:00 – 19:00") + `display_name`/Typ + Items
- [x] 7.5 Komprimierte Zwischenräume (min 16px, max ~32px)
- [x] 7.6 Tag-Header mit Datum, Coverage-Badge, Kcal (Soll/Ist)
- [x] 7.7 Gleiche Interaktionen wie DayPlanView (Rezepte adden, löschen, editieren)
- [x] 7.8 Mobile: vertikal scrollbar, Uhrzeit links, Inhalt rechts

## 8. Integration & Schema-Sync

- [x] 8.1 Pydantic-Schemas ↔ Zod-Schemas sync prüfen (`display_name`, `meal_default_times`)
- [x] 8.2 Backend-API testen: `uv run python manage.py test planner.tests`
- [x] 8.3 TypeScript-Check: `npx tsc --noEmit` in `frontend-food/`
- [x] 8.4 Build-Test: `npm run build` in `frontend-food/`
- [x] 8.5 Migration testen: rückwärts + vorwärts
