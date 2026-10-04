## 1. Backend: Kontextfelder

- [x] 1.1 `MealPlan` um `age_groups`, `setting`, `cooking_sources`, `cooling`, `season_hint` erweitern (`backend/planner/models/meal_plan.py`) und Migration erzeugen
- [x] 1.2 Pydantic-Schemas und Plan-Update-API für die Felder erweitern (`backend/planner/schemas/`, `api/meal_plan.py`)
- [x] 1.3 Ableitung Altersgruppe aus GroupMember/Teilnehmern und Jahreszeit aus Startdatum implementieren
- [x] 1.4 Schreibweg für Event-Wizard und Event-Seite: Felder über `PATCH /meal-plans/{id}/` am verknüpften Plan (kein Event-Schema nötig, Event-UI in 6.7)
- [x] 1.5 Tests für Felder, Ableitung und Event-Durchreichung

## 2. Backend: Merkmale und Backfills

- [x] 2.1 `traits.py` mit Ableitung süß/herzhaft, Vorbereitung, kinderfreundlich, Kochquelle, frisch/haltbar; Platzhalter-`child_score` ignorieren
- [x] 2.2 Keine neuen Tags nötig: Merkmale werden aus Feldern und Stichwörtern abgeleitet (`traits.py`); Tag-Seed entfällt
- [x] 2.3 Command `backfill_standalone_food` mit Dry-run-Default und Review-Liste
- [x] 2.4 Tests für Backfill (`test_backfill_standalone_food.py`) und Ableitung über die Panel-Tests

## 3. Backend: Vorschlags-Engine

- [x] 3.1 Package `planner/services/suggestion_panel/` mit `directions.py` (Richtungen je Meal-Typ als Daten)
- [x] 3.2 Kandidaten und harte Filter (Status, Allergien, Kochquelle, Kühlung, Dubletten je Meal-Typ, Event-weiter Scope)
- [x] 3.3 Scoring (Saison, Beliebtheit, Preis, Kontext) und unbekannte Merkmale abwerten
- [x] 3.4 Embedding-Malus und MMR-Diversität (`diversity.py`)
- [x] 3.5 Typ-Mischung Rezept/Zutat und Auffüllen
- [x] 3.6 Lockern der weichen Kriterien (`relax.py`) und Seed für „Neu mischen“
- [x] 3.7 Gemini-Umsortieren nur explizit über den Zauberstab (4.1), kein automatischer Aufruf; Fallback ohne KI
- [x] 3.8 Endpoint `POST /planner/{plan}/meal/{meal}/suggestions/`, Pydantic-Schemas, alten Endpoint und `IntelligentSuggestionsService` entfernen
- [x] 3.9 Tests: Dubletten je Meal-Typ, Typ-Mischung, Lockern, Auth, Fallback ohne KI

## 4. Backend: Zauberstab

- [x] 4.1 `wand.py` mit einem Gemini-Aufruf, Rangfolge und Vorschlägen neuer Zutaten
- [x] 4.2 Neue Zutaten über vorhandenen KI-Anlage-Flow als Entwurf mit `is_standalone_food=True`
- [x] 4.3 Stichwort-Fallback ohne KI-Budget
- [x] 4.4 Endpoint `POST .../suggestions/wand/` und Tests (Budget, Duplikat-Check)

## 5. Frontend: Schemas und Hooks

- [x] 5.1 Zod-Schemas synchron zu Pydantic (`frontend-food/src/schemas/suggestions.ts`, `mealPlan.ts`) inkl. Kontextfelder
- [x] 5.2 TanStack-Query-Hooks in `src/api/mealPlans.ts` (Panel, Zauberstab, Kontext-Update)
- [x] 5.3 Schema-Contract-Tests ergänzen

## 6. Frontend: UI

- [x] 6.1 Panel-Komponente mit 4 Richtungen × 4 bildlosen Karten (mobile-first ab 320 px)
- [x] 6.2 Filter-Chips, „Neu mischen“, Hinweis bei gelockerten Filtern
- [x] 6.3 Assistent mit 5 Fragen, Zurück, Fortschritt, Kontext-Überspringen und Freitext
- [x] 6.4 Zauberstab-Button, Badge „Neu“, Fallback-Hinweis
- [x] 6.5 Übernahme per Klick mit Undo, Panel bleibt offen
- [x] 6.6 `MealSlot.tsx` und `RecipeSearchDialog.tsx` umstellen, `IntelligentSuggestionsGrid` und Zufallsvorschlag entfernen
- [x] 6.7 Kontextfelder im Event-Wizard und auf der Event-Seite (deutsche UI-Texte mit Umlauten)
- [x] 6.8 Komponententests und Prüfung im Browser bei 320 px

## 7. Abdeckungsanalyse

- [x] 7.1 Command `report_suggestion_coverage` mit Markdown/JSON-Ausgabe
- [x] 7.2 Mindestabdeckungs-Test auf Fixtures
- [x] 7.3 Report auf Prod laufen lassen und Seed-Backlog ableiten (read-only, Ergebnis: `coverage-prod-2026-10-04.md`)

## 8. Abschluss

- [x] 8.1 Specs geprüft: `context-recipe-suggestions` (alter 9-Rezepte-Endpoint) per REMOVED-Delta entfernt, `meal-plan-suggestions` (Plan-Check-Regeln) unberührt
- [x] 8.2 Prod-Rollout: Migration `0012` und `backfill_standalone_food` am 04.10.2026 mit Freigabe angewendet (Snapshot `1791106629796`); Eintrag in `docs/prod-runbook.md`
