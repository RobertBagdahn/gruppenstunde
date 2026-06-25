## Context

Der Frühstücks-Wizard (`BreakfastWizardPage.tsx`) erlaubt die Konfiguration eines kompletten Frühstücks über 5 Schritte. Im `handleSave` werden aus dem Wizard-State `WizardItemIn[]`-Objekte gebaut und via `useSaveBreakfastWizard`-Mutation an die RefMeal-API gesendet.

**Aktuelles Problem:**

```
ui: handleSave() → saveWizard.mutateAsync({ planId, refMealId: null, items })

    refMealId === null
        → POST /api/meal-plans/{id}/ref-meals/
          body: { meal_type: "breakfast", items: [...] }
                                        └─ RefMealCreateIn hat KEIN items-Feld
                                           → Items werden ignoriert (Pydantic extra=ignore)
                                           → RefMeal wird LEER erstellt

    refMealId !== null
        → PUT /api/meal-plans/{id}/ref-meals/{refMealId}/
          body: { items: [...] }
          → RefMealUpdateIn hat items → funktioniert ✓
```

Zusätzlich werden Getränke gar nicht aus dem Wizard-State ins `items[]` gemappt, und der Redirect nach dem Save führt zur Plan-Übersicht statt zum RefMeal-Editor.

## Goals / Non-Goals

**Goals:**
- Backend: `RefMealCreateIn` akzeptiert `items`, `create_ref_meal` erstellt MealItems in einem Request
- Frontend: Getränke (`state.drinks`) als MealItems mappen
- Frontend: Nach Save zum RefMeal-Editor navigieren statt zur Plan-Übersicht
- Bestehender Update-Pfad (PUT) bleibt unverändert — funktioniert bereits

**Non-Goals:**
- Keine Änderung am PUT-Endpunkt oder `RefMealUpdateIn`
- Keine Änderung an der Wizard-UI oder State-Logik
- Keine Schema-Änderung an `WizardState` oder den Zod-Schemas
- Keine Behandlung von Getränke-Ingredients im Breakfast-Catalog (es gibt aktuell keine "Frühstücks-Getränk"-Zutaten im Catalog)

## Decisions

### 1. POST + Items statt POST → PUT

**Entscheidung:** `RefMealCreateIn` um `items: list[RefMealItemIn] | None = None` erweitern.

**Alternativen:**
- *POST dann PUT*: Frontend macht POST (leer), extrahiert ID aus Response, dann PUT mit Items. Nachteil: Zwei Requests, kein Atomicity, Race Condition möglich.
- *Nur PUT*: Frontend erstellt RefMeal immer zuerst leer via separatem `useCreateRefMeal` Hook, dann sofort PUT. Nachteil: Drei Requests, komplexere Fehlerbehandlung.

**Begründung:** Ein Request ist atomar und einfacher. `items` ist optional → bestehende Clients, die ohne Items POSTen, bleiben ungestört. Der `create_ref_meal`-Handler spiegelt dann die Item-Create-Logik des `update_ref_meal`-Handlers.

### 2. Getränke-Mapping

**Entscheidung:** Getränke aus `state.drinks` werden als `ingredient_id + quantity`-MealItems mit `factor=1.0` gespeichert. Da aktuell keine Getränke-Zutaten im Breakfast-Catalog existieren, müssen passende Ingredient-IDs aus der DB ermittelt werden (z.B. Kaffeepulver, Kakaopulver, Teebeutel).

Alternativ können Getränke vorerst als `display_name`-Items ohne ingredient_id gespeichert werden — das erlaubt die Anzeige im Editor, aber nicht die Nährwert- oder Kostenberechnung.

**Entscheidung (vereinfacht):** Getränke werden als `display_name`-Items gespeichert (`ingredient_id=null, display_name="Kaffee/Kakao/Tee/Saft/Milch", quantity=ml`). Wenn später Getränke-Ingredients im Catalog existieren, kann auf ingredient_id umgestellt werden.

### 3. Redirect-Ziel

**Entscheidung:** Nach erfolgreichem Save navigiert der Wizard zum `RefMealEditorPage` des soeben erstellten/aktualisierten RefMeals.

**Route:** `/meal-plans/${planId}/ref-meals/${refMealId}/edit` (existierende Route im RefMealEditor).

**Für neue RefMeals:** Nach POST wird die `id` aus dem Response-Body extrahiert → `navigate(/meal-plans/${planId}/ref-meals/${response.id}/edit)`.

**Für bestehende RefMeals:** `existingRefMeal.id` wird direkt verwendet.

**Begründung:** Der Nutzer sieht nach dem Speichern direkt die gespeicherten Items, kann sie im Editor nachbearbeiten, synchronisieren und verknüpfen. Die Plan-Übersicht ist nur ein Zwischenschritt.

## Risks / Trade-offs

- **[Risiko] Getränke als display_name-Items**: Nährwerte und Kosten für Getränke werden nicht berechnet (kein ingredient_id). → **Mitigation**: Akzeptabel für den aktuellen Stand. Später können Getränke-Ingredients geseedet und `display_name` durch `ingredient_id` ersetzt werden.
- **[Risiko] id-Extraktion aus POST-Response**: Die `saveWizardRefMeal`-Funktion parsed die Response mit `RefMealSchema`, das `id: z.number()` enthält. Die Rückgabe der `mutateAsync` muss entsprechend verwendet werden. → **Mitigation**: `handleSave` bereits async/await-basiert — Einfach den Rückgabewert der Mutation nutzen.
- **[Trade-off] Kein Test für Getränke-Save**: Da Getränke-Ingredients aktuell nicht existieren, kann kein Integrationstest geschrieben werden, der ingredient_id-basierte Getränke-Items prüft. → **Mitigation**: Unit-Test für das Mapping in `handleSave` genügt.

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `backend/planner/schemas/meal_plan.py:523` | `RefMealCreateIn`: `items: list[RefMealItemIn] \| None = None` hinzufügen |
| `backend/planner/api/ref_meal.py:73-95` | `create_ref_meal`: Item-Creation nach Meal-Erstellung |
| `frontend-food/src/pages/planning/breakfast/BreakfastWizardPage.tsx:43-95` | `handleSave`: Getränke-Mapping, Redirect-Änderung, Response-ID extrahieren |
| `backend/planner/tests/test_ref_meal.py` | Test: POST mit `items` erstellt MealItems |
