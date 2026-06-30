## Context

Der Duplicate-Endpunkt `POST /api/meal-plans/{id}/duplicate/` verwendet einen Offset-Algorithmus: alle Mahlzeiten des Quellplans werden um `(new_start - source_start)` verschoben. Das setzt voraus, dass der Quellplan `start_datetime` hat — andernfalls 400. Zudem ist der Offset unsinnig bei unterschiedlichen Tageszeiten und bruchig über DST.

Der Quellplan hat 563 Zeilen, der Algorithmus (430–515) lädt mit `prefetch_related("meals__items__overrides")` vor und klont per `transaction.atomic()`. Der Endpunkt ist ungetestet.

## Goals / Non-Goals

**Goals:**
- Tag-basierter Algorithmus: Tag N des Quellplans → Tag N des neuen Plans, Uhrzeiten bleiben exakt
- `end_datetime` im Request-Payload validieren (Tagesanzahl muss matchen)
- `start_datetime` auf `MealPlan` wird `null=False` (Pflichtfeld, inkl. Migration)
- Frontend blendet Duplicate-Button aus, wenn Quellplan keine Daten hat
- Response enthält `meals_copied`, `items_copied`, `overrides_copied`

**Non-Goals:**
- Keine Änderung an `MealPlanUpdateIn` (Update bleibt optional)
- Keine Event-Verknüpfung (optionales Event-Feld bleibt)
- Kein Template-System (`is_template` wird nicht angetastet)
- Keine Änderung am Meal-Layout oder MealItem-Modell

## Decisions

### 1. Algorithmus: Day-Index statt Offset

```python
# ALT: Offset
offset = new_start - source.start
new_meal_start = meal.start + offset
# Problem: 08:00 Frühstück wird zu 14:00 wenn neuer Plan später startet

# NEU: Day-Index
source_start_date = source.start_datetime.date()
for meal in source.meals:
    day_index = (meal.start_datetime.date() - source_start_date).days
    new_date = new_start.date() + timedelta(days=day_index)
    new_meal_start = datetime.combine(new_date, meal.start_datetime.time())
    new_meal_end   = datetime.combine(new_date, meal.end_datetime.time())
```

**Rationale**: Intuitiv ("gleiche Uhrzeiten, andere Daten"), DST-sicher (kein Offset über Zeitumstellung), Quell-unabhängig (kein `start_datetime` im Quellplan nötig, sobald es Pflicht ist).

### 2. Schema-Erweiterungen

| Schema | Änderung |
|--------|----------|
| `MealPlanDuplicateIn` | `end_datetime: dt.datetime` neu (Pflicht). Validierung im View. |
| `MealPlanOut` | `meals_copied: int = 0`, `items_copied: int = 0`, `overrides_copied: int = 0` neu |
| `MealPlanCreateIn` | `start_datetime: dt.datetime` (kein `None` mehr). `end_datetime: dt.datetime` bleibt optional für einfache Erstellung. |

### 3. start_datetime required im Model

```python
# ALT
start_datetime = models.DateTimeField(null=True, blank=True)
# NEU
start_datetime = models.DateTimeField()
```

**Migration**: Bestehende `NULL`-Einträge bekommen einen Heuristik-Wert (z.B. `created_at` minus Offset oder `2000-01-01`). Ein Data-Migration-Step setzt `created_at`-Datum, falls vorhanden.

### 4. Guards

- **Backend**: Day-Mismatch → `HttpError(400, "Tagesanzahl muss übereinstimmen")`
- **Frontend**: Button unsichtbar, wenn `!plan.start_datetime || !plan.end_datetime`

### 5. Response Meta-Felder

```python
class MealPlanOut(Schema):
    # ... bestehende Felder ...
    meals_copied: int = 0
    items_copied: int = 0
    overrides_copied: int = 0
```

Befüllt im View nach dem Klonen:

```python
new_plan.meals_copied = meals_count
new_plan.items_copied = items_count
new_plan.overrides_copied = overrides_count
```

### 6. Frontend-Änderungen

- `MealPlanDuplicateInSchema`: `end_datetime: z.string().min(1)` neu
- `useDuplicateMealPlan`: neues Body-Feld `end_datetime` mitsenden
- `MealEventListPage` / `MealPlanWizardPage`: Button nur rendern wenn `plan.start_datetime && plan.end_datetime`
- Create-Dialog: `start_datetime` als Pflichtfeld (kein optional mehr)
- Zod-`MealPlanSchema`: `meals_copied`, `items_copied`, `overrides_copied` optional (für alte Responses)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Data Loss**: Bestehende `NULL`-`start_datetime` in Produktion | Data-Migration mit defensivem Default (`created_at`-Datum). Vorher `SELECT COUNT(*)` auf Produktion prüfen. |
| **Day-Mismatch UX**: Benutzer wählt 5-Tage-Quelle aber gibt 3-Tage-Ziel ein | Klarer 400-Fehler + Frontend-Vorabvalidierung (Anzahl Tage im Dialog anzeigen) |
| **Meal ohne end_datetime**: Ein Meal hat `start` aber `None` als `end` | Der Algorithmus `continue`-t diese (bestehende Logik). Bei leerem end: `end = start + 1h` als Fallback. |
| **RefMeals**: `is_reference=True`-Meals haben `null`-Datetimes | Filter `is_reference=False` bleibt bestehen — nicht betroffen |

## Migration Plan

1. Data-Migration: `MealPlan.objects.filter(start_datetime__isnull=True).update(start_datetime=F("created_at"))`
2. Schema-Migration: `models.DateTimeField(null=False, blank=False)`
3. Deployment-Reihenfolge: Backend deployen → bestehende Daten migrieren → Frontend deployen

## Open Questions

- Soll `end_datetime` im `MealPlanCreateIn` auch required werden? (Entscheidung: nein — einfaches Anlegen ohne Enddatum soll möglich bleiben, Ende kann später gesetzt werden.)
- Wie mit `MealPlanWizardPage` umgehen? Sie ruft `duplicateMutation.mutateAsync` auf und hat keinen Zwischenschritt für `end_datetime`. → Im Wizard-Formular `end_datetime`-Feld ergänzen, berechnet aus `start + (source.end - source.start)`.
