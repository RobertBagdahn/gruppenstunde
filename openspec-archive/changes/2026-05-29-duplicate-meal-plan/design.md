## Context

Die `planner` App hat bereits ein vollständiges MealPlan-CRUD. Nutzer legen häufig ähnliche Pläne für wiederkehrende Events an. Der Duplicate-Endpunkt ergänzt den bestehenden Router um eine Kopierfunktion.

Betroffene Dateien:
- `backend/planner/api/meal_plan.py` — neuer Endpunkt
- `backend/planner/schemas/meal_plan.py` — neues Input-Schema
- `frontend-food/src/api/mealPlans.ts` — neue Mutation
- `frontend-food/src/schemas/mealPlan.ts` — neues Zod-Schema
- `frontend-food/src/pages/planning/MealEventListPage.tsx` — Dialog + Kontextmenü

## Goals / Non-Goals

**Goals:**
- Einen bestehenden MealPlan inkl. aller Meals und MealItems duplizieren
- Datum-Offset korrekt auf alle Meals anwenden
- Einfacher 3-Felder-Dialog im Frontend

**Non-Goals:**
- Teilweises Kopieren (nur bestimmte Tage/Meals auswählen)
- Kopieren von Collaborators, MealItemOverrides oder Notizen
- Template-Bibliothek / öffentliche Vorlagen

## Decisions

### 1. Eigener Endpunkt statt generischer Clone-Logik

`POST /api/meal-plans/{slug}/duplicate/` mit Body `{ name, start_datetime, norm_portions }`.

**Warum:** Spezifisch genug für klare Semantik. Ein generischer Clone müsste alle Felder optional machen und wäre komplexer.

### 2. Offset-basierte Datumsverschiebung

```
offset = new_start_datetime - old_start_datetime
new_meal.start = old_meal.start + offset
new_meal.end = old_meal.end + offset
new_plan.end = old_plan.end + offset
```

**Warum:** Bewahrt die exakte Tagesstruktur. Kein Neuberechnen von Mahlzeiten nötig.

### 3. Keine DB-Migration

Kein neues Model, kein neues Feld. Nur neuer Endpunkt + Schema.

### 4. Atomare Operation in einer Transaktion

Die gesamte Kopie (Plan + Meals + MealItems) wird in `transaction.atomic()` erstellt. Bei Fehler wird nichts gespeichert.

### 5. Response gibt den neuen Plan zurück

Response-Schema: `MealPlanOut` (bereits vorhanden). Frontend navigiert nach Erfolg zur Detail-Seite.

## Risks / Trade-offs

- **[Große Pläne]** Ein Plan mit 50+ Meals und hunderten MealItems könnte langsam sein → Akzeptabel für jetzt, da selten. Optimierung bei Bedarf.
- **[Slug-Kollision]** Neuer Plan generiert Slug aus Name. Bei Duplikat-Namen greift die bestehende Slug-Uniqueness-Logik (suffix `-2` etc.).
