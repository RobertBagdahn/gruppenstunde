## Context

Der MealPlan hat aktuell keine expliziten Day-Modelle — Tage sind implizit via `Meal.start_datetime__date`. Der Plan speichert `start_datetime`/`end_datetime` als Rahmen, aber es gibt keine Garantie, dass jeder Tag im Rahmen auch Meals hat. Löschungen einzelner Tage oder Meals können Lücken erzeugen.

Aktuelle Endpunkte:
- `POST /{id}/days/` — beliebiges Datum, kein Range-Update
- `DELETE /{id}/days/?date=X` — beliebiges Datum, kein Range-Update
- `POST /{id}/add-day-before/` — schiebt Range, OK
- `POST /{id}/add-day-after/` — schiebt Range, OK
- `PATCH /{id}/` — akzeptiert start/end ohne Meal-Generierung

## Goals / Non-Goals

**Goals:**
- Validieren, dass jeder Tag in `[start_date, end_date]` mindestens eine Meal hat
- Day-Endpunkte passen den Range automatisch an (erweitern/schrumpfen)
- PATCH mit neuen start/end führt Smart Merge durch (alte löschen, fehlende anlegen)
- Nur Edge-Days löschbar (erster oder letzter Tag)
- Einheitliche Validierungsfunktion, von allen betroffenen Endpunkten aufgerufen

**Non-Goals:**
- Kein `MealPlanDay`-Model (Tage bleiben implizit)
- Keine Validierung auf Meal-Ebene (einzelne Meals löschen/hinzufügen wird nicht auf Lücken geprüft)
- Kein Pflichtfeld für start/end (null = timeless draft/template weiterhin erlaubt)
- Kein Repair-Endpunkt (stille Lücken durch Meal-Löschungen werden nicht automatisch geheilt)

## Decisions

### 1. Zentrale Validierungsfunktion statt Model-Constraint

- **Entscheidung**: Shared Utility-Funktion `validate_meal_plan_contiguity(meal_plan)` in `planner/services/` (oder als Module-Funktion in `planner/api/meal_plan.py`)
- **Rationale**: Ein Model-`clean()` wäre zu spät (wird nur bei `full_clean()` aufgerufen, nicht bei QuerySet-Operationen). Eine `save()`-Override wäre zu komplex (muss Bulk-Operations abfangen). Eine zentrale Funktion, die jeder relevante Endpunkt nach seiner Operation aufruft, ist wartbar und explizit.
- **Alternative verworfen**: Datenbank-Constraint (Check-Constraint mit Subquery) — PostgreSQL unterstützt keine Subqueries in CHECK-Constraints.

### 2. Smart Merge statt Reject bei PATCH-Range-Änderung

- **Entscheidung**: Wenn PATCH `start_datetime`/`end_datetime` ändert, wird `smart_merge_days()` aufgerufen, das:
  1. Meals **außerhalb** des neuen Ranges löscht
  2. Meals für **fehlende Tage** im neuen Range via `create_meals_for_date_timeaware()` anlegt
  3. Bestehende Meals unverändert lässt
- **Rationale**: Benutzerfreundlicher als Reject. Der Nutzer will das Datum ändern, nicht manuell Tage hinzufügen/löschen.
- **Alternative verworfen**: Reject mit 400 — zu unfreundlich, erzwänge Workaround über add-day/delete-day.

### 3. Edge-only Delete statt generellem Verbot

- **Entscheidung**: `remove_day` erlaubt nur das Löschen des ersten oder letzten Tages im Range. Mitteltage geben 400.
- **Rationale**: Ein Mitteltag-Löschen erzeugt zwingend eine Lücke. Der Benutzer müsste danach per `add_day` den Tag neu anlegen. Besser direkt verbieten.
- **Alternative verworfen**: Auto-Kompression (Löschen eines Mitteltages rückt alle folgenden Tage eins nach vorne) — zu destruktiv, Datenverlust riskant.

### 4. Validierung nur bei gesetzten start/end

- **Entscheidung**: Wenn `start_datetime` oder `end_datetime` None ist, wird nicht validiert.
- **Rationale**: Pläne ohne Datum (Templates, Drafts) haben keinen Range zum Prüfen. Die Validierung ergibt nur Sinn, wenn beide Felder gesetzt sind.

### 5. Gap-Definition: ≥1 Meal pro Datum

- **Entscheidung**: Ein Tag gilt als vorhanden, wenn mindestens eine `Meal` mit `start_datetime__date = d` existiert.
- **Rationale**: Flexible Definition. Ein Tag mit nur einem Snack ist gültig. Die Default-Meal-Generierung liefert ohnehin 4 Meals pro Tag, aber manuelle Löschungen einzelner Meals sollen nicht sofort die ganze Validierung zerstören.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Stille Lücken durch Meal-Level-Löschungen**: Ein Nutzer löscht alle 3 Meals eines Mitteltages einzeln → Gap bleibt unerkannt | Wird in Kauf genommen. Nächste Day-Level-Operation deckt die Lücke auf. Repair-Endpunkt kann später kommen. |
| **Performance**: `validate_meal_plan_contiguity` macht eine DISTINCT-Abfrage über alle `Meal.start_datetime__date` des Plans | Query ist indiziert (`start_datetime` hat `db_index`) und skaliert mit Tagen (max ~30-60 für ein Lager). Kein measurable Impact. |
| **Race Conditions**: Zwei gleichzeitige Requests könnten die Validierung umgehen | Transaction.atomic() in Smart Merge schützt vor Race Conditions. Validierung ist immer der letzte Schritt vor dem Return. |
| **PATCH überschreibt versehentlich Range**: Nutzer ändert nur den Namen, aber ein alter Client sendet start/end mit | Vergleich mit aktuellen Werten: Nur bei tatsächlicher Änderung von start/end wird Smart Merge getriggert. |
