## Why

„Was passt hier?“ im Menüplan liefert heute genau einen Rezeptvorschlag mit Bild (`handleRandomSuggest` in `frontend-food/src/pages/planning/MealSlot.tsx`). Das Dialog-Grid (`IntelligentSuggestionsGrid`) zeigt 9 Rezepte, kennt keine Einzelzutaten und keinen Event-Kontext (Altersstruktur, Kochmöglichkeit, Setting). Gruppenleiter brauchen schnell viele, gezielt eingegrenzte Ideen je Mahlzeit-Typ, ohne doppelte Hauptmahlzeiten im Event.

## What Changes

- „Was passt hier?“ öffnet ein Vorschlags-Panel mit 16 bildlosen Karten (4 Richtungen × 4) je Meal-Typ (Frühstück, Mittag/Abend, Snack, Getränke; Nachtisch als Zusatzrichtung bei Mittag/Abend).
- Karten mischen Rezepte und Einzelzutaten (Snack/Getränke ca. 50/50, sonst nur Rezepte); Klick übernimmt direkt mit Undo, das Panel bleibt offen.
- Assistent mit 5 festen Fragen je Meal-Typ (2–4 Optionen + „Egal“), letzte Frage ist ein Freitext-Wunsch; bekannte Kontextfelder ersetzen Fragen.
- Neue optionale Kontextfelder am `MealPlan` (Altersgruppen, Veranstaltungsart, Kochmöglichkeiten, Kühlmöglichkeit, Budget-Stufe, Jahreszeit/Wetter), editierbar im Event-Wizard und auf der Event-Seite; nutzt vorhandene `budget_per_person_per_day` und `nutritional_tags`.
- Filter-Chips über den Karten sind dieselben Antworten wie im Assistenten.
- Dubletten-Regeln: Mittag/Abend-Rezepte über alle Menüpläne des Events ausgeschlossen, Frühstück nur am selben Tag, Snacks/Getränke nie (nur nicht doppelt im selben Slot).
- Ähnlichkeit über vorhandene pgvector-Embeddings: weicher Malus gegenüber Geplantem und Diversitäts-Auswahl innerhalb der Vorschläge.
- Zauberstab: Freitext-Wunsch, ein KI-Aufruf nach Klick, sortiert um und legt fehlende Zutaten als Entwurf an (Badge „Neu“); ohne KI-Budget Stichwort-Fallback.
- Ableitung von Merkmalen (süß/herzhaft, Vorbereitung, kinderfreundlich, Kochquelle) aus vorhandenen Feldern plus neue Tags; Backfill für `is_standalone_food`.
- Leere Mengen: „Neu mischen“ und automatisches Lockern des schwächsten Kriteriums mit Hinweis; harte Kriterien (Allergien, Kochquelle) nie.
- Abdeckungs-Report als Management-Command und Test.
- **BREAKING (intern):** Der Endpoint `GET /planner/{plan}/meal/{meal}/suggestions/` (9 Rezepte) wird durch den neuen Panel-Endpoint ersetzt; `IntelligentSuggestionsGrid` und `random=true`-Zufallsvorschlag entfallen.

## Capabilities

### New Capabilities
- `meal-suggestion-panel`: Panel mit 16 Karten, Richtungen je Meal-Typ, Engine, Dubletten, Ähnlichkeit, Lockern, Übernahme mit Undo.
- `meal-suggestion-assistant`: 5-Fragen-Assistent, Filter-Chips, Freitext und Zauberstab.
- `meal-plan-suggestion-context`: Kontextfelder am MealPlan, Ableitung aus Gruppen/Teilnehmern, Event-UI, einmalige Abfrage.
- `suggestion-trait-derivation`: Abgeleitete Merkmale und Backfills für Rezepte und Zutaten.
- `suggestion-coverage-report`: Abdeckungsanalyse je Meal-Typ × Richtung × Filter.

### Modified Capabilities
<!-- Keine Änderung bestehender Anforderungen; context-recipe-suggestions und meal-plan-suggestions bleiben, der 9-Rezepte-Dienst wird in design.md ersetzt. -->

## Impact

- Backend `planner`: `services/intelligent_suggestions_service.py` (ersetzt durch `suggestion_panel/`-Package), `api/meal_plan.py`, `schemas/meal_plan.py`, `models/meal_plan.py` (+ Migration für Kontextfelder). `supply`/`recipe`: Merkmals-Tags, Backfill-Commands (Migrationen/Data-Migrations). `event`: Wizard-/Detail-Schemas für die Kontextfelder. `core/services/gemini.py` für Zauberstab.
- Pydantic ↔ Zod synchron: neue Schemas `SuggestionPanelResponse`, `SuggestionCard`, `SuggestionFilters`, `PlanSuggestionContext`, `MagicWandRequest` in `backend/planner/schemas/` und `frontend-food/src/schemas/suggestions.ts` / `mealPlan.ts`.
- Frontend `frontend-food/`: `MealSlot.tsx`, `RecipeSearchDialog.tsx`, neue Komponenten für Panel/Assistent/Chips, Hook in `src/api/mealPlans.ts`, Event-Wizard-Felder. Das Haupt-Frontend bleibt unberührt.
- Migrationen: 1 Schema-Migration (MealPlan), Data-Migration/Command für `is_standalone_food` und neue Tags; Prod-Schritte erst per Dry-run, dann nur nach OK.
