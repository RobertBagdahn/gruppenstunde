## Context

Der aktuelle Essensplan-Create-Dialog lebt in `frontend-food/src/pages/planning/MealEventListPage.tsx:472` als einfaches `<Dialog>` mit 5 Feldern. Alle weiteren Settings (Reservefaktor, Budget, Tagesanteil-Faktoren, Essenszeiten, Beschreibung, Sichtbarkeit) werden erst nach der Erstellung im `SettingsPanel.tsx` gesetzt.

Der Frühstücks-Wizard in `frontend-food/src/pages/planning/breakfast/` etabliert bereits ein Wizard-Pattern mit Custom Hook (`useWizardState.ts`), Step-Komponenten, ShareSlider und einem atomic-replace API-Endpoint. An dieses Pattern lehnen wir uns an.

Existierende Infrastruktur:
- `MealPlanCreateIn` (Pydantic) und `useCreateMealPlan` (TanStack) für einfache Erstellung
- `POST /api/meal-plans/{id}/duplicate/` für Deep-Copy mit Datum-Offset
- Gemini AI-Service in `content/services/ai_service.py` mit gemini_call
- Recipe-Suche via `GET /api/meal-plans/recipes/search/`
- NutritionalTags für dietary constraints (vegan, glutenfrei, etc.)

## Goals / Non-Goals

**Goals:**
- Full-Page Wizard unter `/meal-plans/new` mit 4 Schritten (Basis → Strategie → Prompt (optional) → Cockpit)
- Einfach/Erweitert-Toggle: Kernfelder sichtbar, alle Settings über „Erweiterte Einstellungen" aufklappbar
- Drei Befüllungs-Strategien: Leeres Gerüst, Referenz-Kopie, KI-Generierung
- KI generiert Vorschläge NUR aus existierenden Rezepten (keine Halluzination neuer Rezepte)
- Annehmen/Verwerfen für KI-Vorschläge (pro Gesamtplan, nicht granular pro Mahlzeit)
- Basis-Cockpit mit Zusammenfassung (keine Nährwert-Berechnung)
- localStorage-Persistenz bei Refresh
- Login-Pflicht, keine Gast-Nutzung
- Kein neues Datenmodell, keine Migration

**Non-Goals:**
- Kein selektives Kopieren einzelner Tage/Mahlzeiten aus Referenz-Plänen
- Keine Nährwert- oder Kosten-Vorschau im Cockpit
- Keine AI-Kreation neuer Rezepte
- Keine Event-Integration (Wizard lebt nur in frontend-food)
- Kein Editier-Modus (nur Creation)
- Keine Änderung an bestehenden API-Endpoints

## Decisions

### 1. State Management: Custom Hook (wie Breakfast Wizard)

| Option | Bewertung |
|--------|-----------|
| Custom Hook (useWizardState) | ✅ Frühstücks-Wizard beweist das Pattern, kein globaler State nötig |
| Zustand Store | ❌ Überschwere Lösung für einen einmaligen Create-Flow |
| Context | ❌ Weniger testbar als Hook |

→ **useMealPlanWizardState** analog zu `frontend-food/src/pages/planning/breakfast/useWizardState.ts`

### 2. Persistenz: localStorage + session Key

Bei jedem Step-Change wird der State in `localStorage` geschrieben (Schlüssel: `meal-plan-wizard`). Bei erfolgreicher Erstellung oder explizitem Abbrechen wird der Eintrag gelöscht. Kein Debouncing nötig – Schreiboperationen sind synchron und billig.

### 3. Einfach/Erweitert-Toggle

Der Toggle steuert Sichtbarkeit einer `ErweiterteSettings`-Sektion innerhalb von Step 1. Die Expanded-Ansicht zeigt alle Felder. Der Toggle-Zustand wird NICHT persistiert (bewusste Entscheidung – jeder Durchgang startet einfach).

Einfach-Modus zeigt:
- Name, Personen, Start/Ende-Datum, Ernährungstags

Erweitert-Modus zeigt zusätzlich:
- Beschreibung, Reservefaktor, Budget, Tagesanteil-Faktoren, Essenszeiten, Sichtbarkeit, Ist-Vorlage

### 4. KI-Backend: Eigenständiger Service in planner

Der Gemini-Call für Meal Plan Generation bekommt einen eigenen Service `planner/services/meal_plan_ai_service.py` statt im generischen `content/services/ai_service.py` zu landen. Grund: Die Logik ist planner-spezifisch (Tage konstruieren, Rezepte zuordnen, Meal-Struktur aufbauen).

### 5. KI-API Endpoint: POST /api/meal-plans/ai-suggest/

Nicht unter `/api/ai/` (zu generisch) und nicht als Erweiterung von `POST /api/meal-plans/` (zu spezifisch). Der Endpoint ist ein reiner Suggest-Endpoint – er erstellt keinen Plan, sondern gibt eine strukturierte Liste von Vorschlägen zurück.

```
Request:
{
  prompt: "Sommerlager Dänemark, 30 Pfadfinder, herzhafte deutsche Küche, ein Tag Grillabend",
  num_persons: 30,
  num_days: 7,
  start_date: "2026-08-14",
  nutritional_tag_ids: [1, 3],     // vegan, glutenfrei
  budget_per_person_per_day: 8.00
}

Response:
{
  days: [
    {
      date: "2026-08-14",
      meals: [
        { meal_type: "breakfast", recipe_id: 42, recipe_title: "Haferporridge" },
        { meal_type: "lunch", recipe_id: 128, recipe_title: "Kartoffelsuppe" },
        { meal_type: "dinner", recipe_id: 256, recipe_title: "Veganes Curry" }
      ]
    },
    // ... weitere Tage
  ]
}
```

### 6. Referenz-Kopie: Nutzt existierenden duplicate-Endpoint

Der Wizard ruft beim Erstellen mit Referenz-Strategie `POST /api/meal-plans/{id}/duplicate/` auf (existiert bereits). Keine Änderung am Backend nötig. Der User wählt im Wizard einen Quell-Plan aus und gibt einen neuen Namen + Start-Datum ein.

### 7. Cockpit: Einfache Zusammenfassungsseite

Letzter Schritt zeigt alle getroffenen Einstellungen als lesbare Karte. Bei KI-Strategie: kompakte Liste der generierten Vorschläge („Tag 1: Porridge, Suppe, Curry …"). Bei Referenz: Quell-Plan-Name. Bei Leer: Hinweis dass kein Inhalt vorbefüllt wird.

### 8. Wizard-Struktur (Schritte)

Der Wizard hat nur 3-4 Schritte – bewusst schlank:

```
Step 1: Basic Settings (Name, Daten, Personen, Ernährung + optional erweitert)
Step 2: Strategy (Leer / Referenz / KI)
  └─ Step 2a (nur KI): Prompt + Generieren + Vorschau
Step 3: Cockpit (Zusammenfassung + Erstellen)
```

## Wizard-Architektur

```
frontend-food/src/
├── pages/
│   └── planning/
│       └── wizard/
│           ├── MealPlanWizardPage.tsx      ← Main page, orchestriert Steps
│           ├── useMealPlanWizardState.ts   ← Custom Hook (State + Navigation + Persistenz)
│           ├── StepBasicSettings.tsx        ← Step 1: Name, Personen, Datum, Ernährung + Erweitert
│           ├── StepStrategy.tsx             ← Step 2: Drei Optionen (Leer/Ref/KI)
│           ├── StepAiPrompt.tsx             ← Step 2a (nur KI): Prompt + Generieren
│           ├── StepCockpit.tsx              ← Step 3: Zusammenfassung + Erstellen
│           └── ExtendedSettingsSection.tsx  ← Aufklappbare erweiterte Settings

backend/planner/
├── services/
│   └── meal_plan_ai_service.py             ← Gemini-Prompt + Response-Parsing
├── schemas/
│   ├── meal_plan.py                        ← unverändert (MealPlanCreateIn)
│   └── ai_generation.py                    ← NEU: AiSuggestIn, AiSuggestDay, AiSuggestMeal
├── api/
│   ├── meal_plan.py                        ← unverändert
│   └── ai_generation.py                    ← NEU: POST /api/meal-plans/ai-suggest/
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Gemini halluziniert Recipe-IDs, die nicht existieren | Backend validiert jede recipe_id nach dem Parsen; nicht-existente löschen oder durch ähnliche ersetzen |
| Gemini-Response ist zu langsam (>30s) | Timeout 60s setzen; UI zeigt Loading-Spinner; bei Timeout Fehlermeldung + erneuter Versuch |
| localStorage-Daten sind nicht versionssicher (Schema-Änderungen brechen gespeicherte States) | `useMealPlanWizardState` prüft beim Laden die Version des gespeicherten States; bei mismatch wird verworfen |
| Wizard wird zu lang bei vielen Feldern | Nur 3-4 Schritte + Einfach-Modus reduziert Override massiv |
| User schließt Browser im AI-Step, verliert generierte Vorschläge | Prompt-Text wird persistiert, aber AI-Response nicht (zu groß). User muss neu generieren |
