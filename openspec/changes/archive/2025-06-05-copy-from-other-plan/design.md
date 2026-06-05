## Context

Der Essensplaner in Inspi hat eine "Eintrag kopieren"-Funktion, die aktuell nur innerhalb desselben Plans funktioniert (`POST /{plan_id}/meal-items/{item_id}/copy/`). Der zugehörige `CopyMealItemDialog` erlaubt die Auswahl einer Ziel-Meal innerhalb desselben Plans. Dies soll durch eine planübergreifende Kopierfunktion ersetzt werden.

Betroffene Architektur:
- **Backend** `backend/planner/`: MealPlan, Meal, MealItem Modelle + API + Schemas
- **Frontend** `frontend-food/`: `MealEventDetailPage`, `MealSlot`, `MealActionsMenu`, `CopyMealItemDialog`, API-Hooks, Zod-Schemas

## Goals / Non-Goals

**Goals:**
- Aus jedem beliebigen Essensplan (mit Lese-Zugriff) Items in die aktuelle Meal kopieren
- Mehrstufiger Dialog: Plan → Tag → Mahlzeit → Items (einzeln auswählbar)
- Zugänglich sowohl pro Mahlzeit (MealActionsMenu) als auch pro Item (Copy-Button)
- Alte Single-Plan-Kopierfunktion vollständig ersetzen

**Non-Goals:**
- Kein Kopieren ganzer Pläne (existiert bereits als `duplicate`)
- Keine Änderung am RefMeal-System
- Kein Batch-Kopieren über mehrere Meals hinweg

## Decisions

### 1. Neuer API-Endpoint statt Erweiterung des alten

**Entscheidung:** Neuer Endpoint `POST /{plan_id}/meals/{meal_id}/copy-items-from/` mit `{ source_plan_id, source_meal_id, item_ids }`.

**Begründung:**
- Der alte Endpoint hat Source und Target durch die URL-Parameter `plan_id` und `item_id` auf denselben Plan fixiert
- Ein neuer Endpoint mit `source_plan_id` im Body ist sauberer als ein breaking Redesign des alten
- Rückgabe ist `list[MealItemOut]` (alle kopierten Items auf einmal)

**Alternative verworfen:** Den alten Endpoint um `source_plan_id` zu erweitern. Dies wäre verwirrend, da die URL bereits zwei IDs kodiert und die Semantik der Route sich fundamental ändert.

### 2. Query-Parameter statt Body-ID für Quell-Plan-Detail

**Entscheidung:** Der Frontend-Dialog lädt `useMealPlan(sourcePlanId)` um Tage/Meals/Items zu erhalten.

**Begründung:** `GET /api/meal-plans/{id}/` existiert bereits und liefert `MealPlanDetailOut` mit allen Meals + Items. Kein neuer Endpoint nötig.

### 3. Dialog als drei-Stufen-Wizard

**Entscheidung:** Der Dialog zeigt drei aufeinander aufbauende Schritte in einer einzigen Dialog-Instanz:

```
Stufe 1: Plan-Liste (useMealPlans, eigener Plan ausgegraut/gefiltert)
Stufe 2: Tag-Auswahl (aus useMealPlan(selectedPlanId))
Stufe 3: Meal-Auswahl + Item-Checkboxen (aus dem gewählten Tag/Meal)
```

**Begründung:**
- Übersichtlicher als ein großer Flat-Liste aller Items
- Nutzer kennen die Struktur ihrer Pläne (Tag → Mahlzeit) und navigieren so intuitiv
- Kein externer Wizard-Zustand nötig (alles in einem Dialog-State)

### 4. Eintritts-Punkte

- **MealActionsMenu**: Neuer Eintrag "Aus anderem Plan kopieren" → Dialog mit Mode `meal`, null `itemIds`
- **MealSlot Item-Copy-Button**: Ersetzt den alten Copy-Button → Dialog mit Mode `item`, leerer `itemIds`-Liste

## Risks / Trade-offs

- **Große Pläne**: Ein Plan mit vielen Tagen und Meals kann den Dialog laden. Das Laden von `useMealPlan(planId)` liefert alle Meals auf einmal → für sehr große Pläne (~50+ Tage) potenziell langsam. → **Mitigation**: Kein Problem für aktuelles Nutzungsprofil; falls nötig später lazy loading für Tage.
- **Berechtigungen**: Der User muss Lese-Zugriff auf den Quell-Plan haben. Der Backend-Endpoint prüft `_require_access`. → **Akzeptiert**, da `_require_access` nur View-Zugriff braucht.
- **Synced Meals als Quelle**: Items aus `is_synced` Meals sind kopierbar (nur das Target wird in der alten Implementation blockiert). → **Akzeptiert**, die Items existieren ja und sind gültig.
