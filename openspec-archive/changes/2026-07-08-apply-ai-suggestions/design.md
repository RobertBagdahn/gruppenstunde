## Context

Der MealPlan-Wizard generiert per Gemini KI-Vorschläge (`AiSuggestOut`: `{ days: [{ date, meals: [{ meal_type, recipe_id, recipe_title }] }] }`). Diese werden im StepAiPrompt und StepCockpit angezeigt. Beim Klick "Essensplan erstellen" (`handleCreate` in `MealPlanWizardPage.tsx`) wird nur ein leerer Plan erstellt — die Vorschläge werden **niemals persistiert**. Es gibt keinen Endpunkt dafür.

## Goals / Non-Goals

**Goals:**
- Backend-Endpunkt zum Übernehmen von AI-Vorschlägen (Meals + MealItems in einer Transaktion)
- Frontend `handleCreate` reparieren, sodass AI-Vorschläge nach Plan-Erstellung persistiert werden
- Testabdeckung für den neuen Endpunkt und den Wizard-Pfad

**Non-Goals:**
- Kein neues Modell oder DB-Migrationen — `Meal` und `MealItem` existieren bereits
- Keine Änderung am Gemini-Prompt oder der AI-Generierung selbst
- Kein UI-Redesign des Wizards — nur der `handleCreate`-Pfad wird korrigiert

## Decisions

### Decision 1: Neuer Endpunkt vs. Endpunkt erweitern

**Gewählt: Neuer Endpunkt `POST /api/meal-plans/{id}/apply-ai/`**

Alternativen:
- `POST /api/meal-plans/{id}/meals/` erweitern: Geht nicht sauber, da mehrere Tage/Mahlzeiten auf einmal
- `POST /api/meal-plans/` um `ai_suggestions`-Feld erweitern: Müsste `MealPlanCreateIn` ändern, Plan-Erstellung + Apply in einem Request — erhöht Komplexität und Risiko
- Neuer Endpunkt: Saubere Trennung, einfacher zu testen, Fehlerbehandlung pro Schritt, Wiederverwendbar (z.B. "Apply" Button später in der UI)

### Decision 2: Transactional Bulk Apply

Der gesamte Apply-Vorgang läuft in einer `atomic()`-Transaktion. Wenn ein nicht-existenter Tag/Meal-Slot nicht gefunden wird, wird dieser Eintrag übersprungen (kein Rollback). Nur bei kritischen Fehlern (Plan nicht gefunden, keine Permission) wird die Transaktion komplett zurückgerollt.

### Decision 3: Schema reuse

Das bestehende `AiSuggestOut` wird als Schema für den Apply-Endpunkt wiederverwendet (oder ein Subset `AiApplyIn`). Kein neues Datenformat — was die KI liefert, wird 1:1 übernommen. Das vereinfacht den Frontend-Code deutlich.

### Decision 4: Frontend — sequentielle Mutations

`handleCreate` wird zu einer sequentiellen Abfolge:
1. `createMutation.mutateAsync()` → Plan erstellen
2. `applyMutation.mutateAsync(plan.id, suggestions)` → Vorschläge übernehmen
3. Navigate

Der zweite Schritt ist optional — bei Fehler wird trotzdem navigiert (partial success). Das verhindert, dass der User den Plan verliert, wenn die Apply-API mal fehlschlägt.

## Risks / Trade-offs

- **[Idempotenz]** Wiederholtes Applyen der gleichen Vorschläge erzeugt Duplikat-MealItems. Die Spec definiert dies als akzeptiertes Verhalten (kein Upsert, da MealItems unterscheidbar sein müssen). **Mitigation**: Frontend ruft Apply nur einmal auf (nach create), nie wieder.
- **[Recipe-ID Gültigkeit]** Die KI könnte eine recipe_id vorschlagen, die zwischenzeitlich gelöscht wurde. **Mitigation**: Der Service prüft Existenz und überspringt fehlende → Rückmeldung in `skipped_items`.
- **[Meal-Slot Existenz]** Der Plan hat per Default Meal-Slots für breakfast/lunch/dinner. Die KI könnte `meal_type` Werte vorschlagen, die keinem existierenden Slot entsprechen. **Mitigation**: Der Service erstellt keine neuen Meals — überspringt unbekannte meal_types.
- **[Kein Rollback bei Apply-Fehler]** Wenn Apply fehlschlägt, bleibt der leere Plan bestehen. **Mitigation**: Der User wird per Toast informiert und kann manuell Rezepte zuweisen.
