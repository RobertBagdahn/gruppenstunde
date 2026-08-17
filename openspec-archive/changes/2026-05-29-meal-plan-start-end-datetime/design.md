## Context

MealPlan hat aktuell keine eigenen Zeitraum-Felder. Tage werden implizit aus `Meal.start_datetime` gruppiert. Die Erstellung nutzt `start_date` + `num_days` oder Event-Daten. Das Hinzufügen von Tagen erfordert einen Date-Picker — umständlich auf Mobile.

Relevante Dateien:
- `backend/planner/models/meal_plan.py` — MealPlan, Meal Models
- `backend/planner/schemas/meal_plan.py` — Pydantic Schemas
- `backend/planner/api/meal_plan.py` — API Endpoints
- `frontend-food/src/schemas/mealPlan.ts` — Zod Schemas
- `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — Detail-UI

## Goals / Non-Goals

**Goals:**
- MealPlan bekommt `start_datetime` / `end_datetime` als eigene Felder
- Uhrzeit am ersten Tag bestimmt, welche Meals generiert werden (nur Meals mit `default_start >= plan.start_datetime.time()`)
- Uhrzeit am letzten Tag bestimmt Cut-off (nur Meals mit `default_end <= plan.end_datetime.time()`)
- Mittlere Tage bekommen immer alle Default-Meals
- Zwei Buttons "Tag davor" / "Tag danach" zum Erweitern des Plans
- Beim Erweitern: neuer Tag bekommt passende Meals, bisheriger erster/letzter Tag wird ggf. aufgefüllt

**Non-Goals:**
- Kein Entfernen von Tagen über diese Buttons (bestehendes "Tag löschen" bleibt)
- Keine Änderung der Meal-Type-Logik oder day_part_factor
- Kein automatisches Löschen von Meals wenn Zeitraum verkürzt wird

## Decisions

### 1. Model-Felder

```python
class MealPlan(models.Model):
    # NEU
    start_datetime = models.DateTimeField(null=True, blank=True)
    end_datetime = models.DateTimeField(null=True, blank=True)
```

Nullable für Rückwärtskompatibilität mit bestehenden Plänen. Migration füllt Werte aus vorhandenen Meals (min/max `start_datetime`).

### 2. Meal-Generierung bei Erstellung

Logik für einen Tag:
```python
def meals_for_day(date, is_first, is_last, start_time, end_time):
    for meal_type, (mt_start, mt_end) in MEAL_TYPE_DEFAULT_TIMES.items():
        if is_first and mt_start < start_time:
            continue  # Meal startet vor Ankunft
        if is_last and mt_end > end_time:
            continue  # Meal endet nach Abreise
        yield meal_type
```

### 3. "Tag davor" / "Tag danach" Endpoints

```
POST /api/meal-plans/{id}/add-day-before/
POST /api/meal-plans/{id}/add-day-after/
```

**add-day-before:**
1. `plan.start_datetime -= timedelta(days=1)`
2. Neuer erster Tag: Meals filtern nach `start_time >= plan.start_datetime.time()`
3. Bisheriger erster Tag: fehlende Meals auffüllen (jetzt voller Tag)

**add-day-after:**
1. `plan.end_datetime += timedelta(days=1)`
2. Neuer letzter Tag: Meals filtern nach `end_time <= plan.end_datetime.time()`
3. Bisheriger letzter Tag: fehlende Meals auffüllen (jetzt voller Tag)

### 4. Create-Schema Änderung

```python
class MealPlanCreateIn(Schema):
    name: str
    description: str = ""
    norm_portions: int = 10
    activity_factor: float = 1.5
    reserve_factor: float = 1.1
    event_id: int | None = None
    start_datetime: dt.datetime | None = None  # NEU (ersetzt start_date)
    end_datetime: dt.datetime | None = None     # NEU (ersetzt num_days)
```

Wenn Event verknüpft: `start_datetime`/`end_datetime` aus Event übernehmen.

### 5. Frontend Datetime-Inputs

Im Settings-Panel: zwei `<input type="datetime-local">` für Start und Ende. In der DayPlanView: Buttons oben ("+ Tag davor") und unten ("+ Tag danach") statt Date-Picker.

### 6. Migration bestehender Daten

```python
# Data migration
for plan in MealPlan.objects.all():
    meals = plan.meals.order_by("start_datetime")
    if meals.exists():
        plan.start_datetime = meals.first().start_datetime
        plan.end_datetime = meals.last().end_datetime
        plan.save()
```

## Risks / Trade-offs

- **Nullable Felder**: Alte Pläne ohne Start/Ende funktionieren weiter, aber UI muss damit umgehen (Buttons nur zeigen wenn Felder gesetzt)
- **Auffüllen bisheriger erster/letzter Tag**: Könnte unerwartete Meals erzeugen, die der User nicht will. Akzeptabel — User kann einzelne Meals löschen.
- **Event-Sync**: Wenn Event-Datum sich ändert, sollte MealPlan-Zeitraum aktualisiert werden. Vorerst out-of-scope (Non-Goal).
