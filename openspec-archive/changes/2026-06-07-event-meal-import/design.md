## Context

Der bestehende `CopyFromPlanDialog` erlaubt das Kopieren von einzelnen Items aus anderen Essensplänen. Er hat keine Such-/Filterfunktion, keine Mahlzeiten-Vorschau und setzt keinen Herkunfts-Hinweis. Der Dialog wird vollständig durch eine neue Version ersetzt.

**Betroffene Dateien:**
- `frontend-food/src/pages/planning/CopyFromPlanDialog.tsx` — vollständig ersetzt
- `frontend-food/src/schemas/mealPlan.ts` — neues `MealPlanSearchResultSchema`, `CopyItemsFromPlanInSchema` um `note` erweitert
- `frontend-food/src/api/mealPlans.ts` — neuer Query `useMealPlansSearch` oder erweiterter `useMealPlans` mit Query-Parametern
- `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — ggf. minimale Anpassung (Props, Typen)
- `backend/planner/api/meal_plan.py` — `list_meal_plans` um query params `search`, `date_from`, `date_to` erweitert; `copy_items_from_plan` um `note` erweitert
- `backend/planner/schemas/meal_plan.py` — `CopyItemsFromPlanIn` um `note` erweitert

## Goals / Non-Goals

**Goals:**
- Plan-Liste im Dialog durchsuchbar machen (name, description, event_name)
- Datumsfilter (von–bis) auf die Plan-Liste
- Mahlzeiten-Vorschau mit Items-Liste und kcal-Summe vor dem Kopieren
- Automatische Note auf Ziel-Mahlzeit nach Kopiervorgang
- Immer die komplette Mahlzeit übernehmen (keine Item-Selektion mehr)

**Non-Goals:**
- Keine Änderung am RefMeal-System (Template-Sync)
- Kein Event-Zwischenschritt — Auswahl bleibt auf Plan-Ebene
- Keine Paginierung für die Plan-Liste (MealPlans sind überschaubar)

## Decisions

### 1. Query-Parameter statt eigenem Endpunkt
Der bestehende `GET /{plan_id}/` wird um optionale Query-Parameter `search`, `date_from`, `date_to` erweitert. Der `search`-Parameter matched gegen `name`, `description` und `event__name` (über Q-Objekte mit `icontains`). Kein separater Endpunkt nötig.

### 2. note wird im Copy-Endpunkt mitgegeben
Statt zwei API-Calls (copy + update note) wird `CopyItemsFromPlanIn` um ein optionales `note: str` erweitert. Der Backend-Endpunkt setzt `target_meal.note = note` nach dem Kopieren. Das ist atomarer und vermeidet Race-Conditions.

### 3. MealPreview wird client-seitig aus dem bereits gecachten Plan-Detail resolved
Der Dialog lädt `GET /{plan_id}/` via `useMealPlan()`, sobald ein Plan selektiert wurde. Die Mahlzeiten-Vorschau (Items, kcal-Summe) kommt aus den bereits gecachten `plan.meals` – kein zusätzlicher API-Call.

### 4. Dialog: 3 Schritte statt 4
Wegfall des Item-Selektions-Schritts:
```
Schritt 1: Plan-Liste (Suche + Datumsfilter)
Schritt 2: Tag-Auswahl
Schritt 3: Mahlzeit (mit Vorschau: Items + kcal) → Kopieren + Note
```

### 5. Aktueller Plan wird in der Liste gezeigt
Anders als bisher darf der aktuell bearbeitete Plan in der Liste erscheinen. Der User kann entscheiden, ob er daraus kopieren will (z.B. Mahlzeit von Tag 1 auf Tag 5 duplizieren).

## Risks / Trade-offs

- **[UX]** Keine Item-Selektion bedeutet immer "alles oder nichts" pro Mahlzeit. Falls später wieder Item-Selektion gewünscht wird, muss das Dialog-Layout erweitert werden.
- **[Backend]** Search über drei Felder mit `icontains` skaliert nicht für hunderte Pläne. Bei Performance-Problemen kann später auf PostgreSQL `SearchVector` migriert werden.
- **[Frontend]** Die Mahlzeiten-Vorschau lädt das gesamte Plan-Detail inkl. aller Mahlzeiten. Bei sehr großen Plänen (30+ Tage) kann das langsam sein. Lazy-Loading der Meal-Items pro selektierter Mahlzeit wäre eine mögliche Optimierung.
