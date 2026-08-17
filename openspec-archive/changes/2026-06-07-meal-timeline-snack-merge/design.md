## Context

Der Essensplan hat aktuell 5 MealTypeChoices (breakfast, lunch, dinner, snack, drinks). Jeder Tag erzeugt automatisch genau ein Meal pro Typ. Snacks (factor=0.10) und Drinks (factor=0.00) sind jeweils an eine feste Default-Uhrzeit gebunden und können nicht mehrfach vorkommen. Die `day_part_factor`-Propagation in `MealPlan.save()` überschreibt alle Meal-Faktoren bei Plan-Änderung.

Das `DEFAULT_MEAL_TYPES`-Array und `create_meals_for_date_timeaware()` in `planner/models/meal_plan.py` steuern die automatische Generierung. `MEAL_TYPE_DEFAULT_TIMES` ist sowohl im Backend (meal_plan.py:40) als auch im Frontend (schemas/mealPlan.ts:322) hardcodiert.

Die Drinks-Kcal-Logik (`total_energy_kj=0` für `meal_type='drinks'`) verteilt sich über `MealOut.resolve_total_energy_kj` und `MealItemOut.resolve_energy_kj`.

## Goals / Non-Goals

**Goals:**
- `drinks` als MealTypeChoice entfernen, Snack als einzigen flexiblen Typ (mehrfach/Tag erlaubt)
- `display_name` auf Meal für benutzerdefinierte Snack-Namen (z.B. "Kaffee", "Kakao", "Obstpause")
- `meal_default_times` als JSONField auf MealPlan (editierbar im SettingsPanel)
- `day_part_factor`-Propagation aus `MealPlan.save()` entfernen
- Drinks-Kcal-Checks entfernen (alle Meals normal rechnen, `day_part_factor=0.00` steuert kcal-Ziel)
- Chronologischer Zeitplan-Tab als neue Ansicht
- TableView auf 4 Zeilen reduziert

**Non-Goals:**
- Kein neues Model (keine Sub-Slots, keine MealTimedSlot-Tabelle)
- Kein neues API-Endpunkt-Prefix (bestehende CRUD-Endpunkte bleiben)
- Keine Änderung an der CostDashboard- oder NutritionView-Kalkulation (day_part_factor=0.00 verhält sich bereits korrekt)
- Keine Änderung an der ShoppingList-Generierung

## Decisions

### Decision 1: `display_name` als einfaches CharField statt Verwendung von `note`

**Wahl:** `display_name = CharField(max_length=200, blank=True, default="")` auf Meal.

**Begründung:** `note` ist für Koch-Notizen/Anmerkungen gedacht (`note_is_published` steuert Sichtbarkeit im PDF). Ein separater `display_name` ist semantisch sauberer und kann im UI anders behandelt werden (fett, prominent). Fallback auf `MEAL_TYPE_LABELS[meal_type]` im Frontend wenn leer.

### Decision 2: `meal_default_times` als JSONField auf MealPlan (wie `day_part_factors`)

**Wahl:** `meal_default_times = JSONField(default=default_meal_default_times)` mit Shape `Record<string, [string, string]>` (z.B. `{"breakfast": ["08:00", "09:00"]}`).

**Begründung:** Gleiches Pattern wie `day_part_factors`: einfach erweiterbar, keine Migration bei neuen Mahlzeit-Typen, editierbar über das bestehende SettingsPanel. Alternatives "separates Model mit Default-Times pro Plan" wäre Overkill. JSONField erlaubt einfache Frontend-Sync.

Fallback im Frontend: wenn `meal_default_times` null/leer, auf bisherige hartcodierte Werte in `MEAL_TYPE_DEFAULT_TIMES` zurückfallen.

### Decision 3: Snack-Uniqueness nur auf (meal_plan, meal_type, start_datetime__date) für breakfast/lunch/dinner

**Wahl:** Unique Constraint für breakfast/lunch/dinner bleibt, für snack komplett aufgehoben.

**Begründung:** Mit `clean()`-Methode und `UniqueConstraint` im Model. Ein `Meta.constraints`-Eintrag für `snack` wird nicht hinzugefügt. So können beliebig viele snack-Meals pro Tag existieren. Frühstück/Mittag/Abendessen bleiben unique wie bisher.

### Decision 4: Migration — drinks → snack ohne Merge

**Wahl:** Jedes `meal_type='drinks'` wird zu `meal_type='snack'` mit `day_part_factor=0.00`. Wenn ein Tag dadurch 2 snack-Meals hat (original snack + original drinks), bleiben beide erhalten.

**Begründung:** Datenkonservierung. Ein automatischer Merge wäre komplex und würde ggf. Daten verlieren. Zwei snack-Meals am gleichen Tag sind durch das neue Design explizit erlaubt. Der `display_name` wird aus dem alten Meal-Typ abgeleitet (`"Getränke"` für ehemalige drinks).

### Decision 5: ScheduleView als eigene Komponente, kein Ersatz für TableView

**Wahl:** Neuer Tab "Zeitplan" zwischen "Tagesplan" und "Tabelle" mit eigener React-Komponente `ScheduleView.tsx`.

**Begründung:** Die TableView bleibt als dichtes Grid erhalten (vorteilhaft für Vergleiche über Tage hinweg). Der ScheduleView bietet die chronologische Perspektive. Beide Ansichten haben unterschiedliche Use-Cases.

Layout pro Tag: Zeit-Achse links (nur Uhrzeiten an denen Meals existieren, keine 24h-Skala), Meals als horizontale Karten mit Time-Badge, `display_name`/Typ, Items. Zwischenrume komprimiert (min. 16px Abstand).

### Decision 6: DEFAULT_MEAL_TYPES auf 4 reduzieren, `create_meals_for_date_timeaware` anpassen

**Wahl:** `DEFAULT_MEAL_TYPES = [breakfast, lunch, dinner, snack]`. `create_default_meals_for_date` erzeugt nur noch 1 snack statt snack+drinks. Auf ersten/letzten Tagen wird `snack` wie alle anderen Typen +/- Filtern nach Zeitrahmen (standard-logik aus `create_meals_for_date_timeaware`).

**Begründung:** Konsequenz aus dem Drinks-Removal. Da snacks mehrfach pro Tag angelegt werden können, reicht ein einzelner Default-Snack. Weitere können manuell per Add-Meal-Aktion hinzugefügt werden.

### Decision 7: SettingsPanel erhält Uhrzeit-Editoren pro Mahlzeit-Typ

**Wahl:** Neue Sektion "Standard-Uhrzeiten" im SettingsPanel unter den `day_part_factors`. Zwei `time`-Inputs pro Typ (Start/Ende). Persistiert als `meal_default_times` auf dem MealPlan.

**Begründung:** Einheitlicher Ort für alle Plan-Konfigurationen. Das Pattern (JSONField + Input-Gruppe) ist identisch zu den day_part_factors.

## Risks / Trade-offs

| Risiko | Mitigation |
|---|---|
| **Bestehende Drinks-Meals verlieren Kcal=0-Logik**: Ohne den `meal_type='drinks'`-Check werden Getränke-Kcal normal gerechnet. | `day_part_factor=0.00` sorgt dafür, dass das Soll-Kcal-Ziel = 0 ist. Der Ist-Wert ist gering (Tee/Wasser). Der Coverage-Check skaliert korrekt. |
| **TableView wird breiter**: 4 statt 5 Zeilen, aber snack-Meals enthalten jetzt ggf. mehr Items (alte drinks + snacks). | Snack-Zelle wird scrollbar/höhenbegrenzt. Oder: nur erster Snack in Zelle, rest mit "+N mehr"-Badge. |
| **Mehrere Snacks pro Tag verlangsamen DayPlanView**: Jeder Snack ist ein eigener Card-Slot mit API-Calls. | Kein Problem — das ist das bestehende Pattern. Ein Tag mit 5+ Snacks ist ein Edge Case. |
| **Migration läuft schief**: Bestehende drinks-Meals werden falsch konvertiert. | Migration als reine UPDATE-Query (kein Datenverlust). Vorher Backup. |
| **`display_name` ist leer bei bestehenden Meals**: Alle bisherigen Meals haben `display_name=""`. | Frontend zeigt `MEAL_TYPE_LABELS[meal_type]` als Fallback. Für ehemalige drinks wird `display_name` in der Migration auf `"Getränke"` gesetzt. |

## Migration Plan

1. Migration #1: Neue Felder (`display_name`, `meal_default_times`) + `meal_type='drinks'` → `'snack'`
   - `MealPlan.objects.all()`: `meal_default_times` default setzen
   - `Meal.objects.filter(meal_type='drinks')`: `update(meal_type='snack', display_name='Getränke', day_part_factor=0.00)`
   - UniqueConstraint wird angepasst (snack-Kombination ausgenommen)
2. Backend-Code: `save()`-Propagation entfernen, Drinks-Checks entfernen, DEFAULT_MEAL_TYPES anpassen
3. Frontend: Schemas, Konstanten, Komponenten anpassen
4. Manuelle Tests: Bestehende Essenspläne checken, neue Snacks anlegen, time-Editoren testen

## Open Questions

- Soll der ScheduleView auch für Tage ohne Zeitrahmen (`start_datetime`/`end_datetime` null) funktionieren? (Dann sortiert nach `start_datetime` der Meals)
- Snack-Coverage in getDayCoverage(): Drinks ausgeschlossen (`m.meal_type !== 'drinks'`) – nach Merge muss das nicht mehr aktiv excludiert werden, da drinks jetzt snack sind und factor=0 haben. Reicht `m.day_part_factor > 0`?
