## Why

Die aktuellen Rezeptvorschläge im Meal-Plan sind eindimensional (nur nach `usage_count` sortiert). Gruppenführer wollen aber kontextbewusste Vorschläge: passend zur Jahreszeit, zum Budget, zu Ernährungstags und ohne Wiederholung. Das reduziert die kognitive Last bei der Planung und führt zu abwechslungsreicheren Essensplänen.

## What Changes

- Neuer API-Endpunkt: `GET /api/meal-plans/{plan_id}/meal/{meal_id}/suggestions` — liefert genau 9 kategorisierte Rezeptvorschläge basierend auf Kontext
- Scoring-Engine: Gewichtung von Saison (aus Zutaten abgeleitet), Popularität, Abwechslung, Budget-Passung, zeitlicher Nähe zur letzten Verwendung
- Harte Filter: Nur `status=approved` (system) + eigene Rezepte des Users; Rezepte bereits im Plan ausgeschlossen; `nutritional_tags` des Plans als harter Filter
- Kategorisierung der 9 Ergebnisse in `top_picks`, `variety`, `discovery` (je 3)
- KI-Enhancement: Gemini rerankt die Top 15 algorithmischen Ergebnisse auf 9 finale
- Einfaches `reason`-Feld pro Rezept (`season`, `popular`, `variety`, `budget_friendly`)
- Saison-Bestimmung aus Zutaten-Saisonkalender (neues Datenmodell optional)
- Frontend: Integration in `RecipeSearchDialog` — Vorschläge als Standard-Ansicht beim Öffnen

## Capabilities

### New Capabilities
- `context-recipe-suggestions`: Kontextbewusste Rezeptvorschläge für Meal-Plan-Mahlzeiten mit Scoring, Kategorisierung und optionalem KI-Reranking

### Modified Capabilities

<!-- No existing specs need modification — this is an entirely new capability -->

## Impact

- **Backend**: Neuer Endpunkt in `planner/api/`, neue Service-Logik in `planner/services/`, optional neues Saison-Datenmodell in `supply/models/`
- **Frontend**: `RecipeSearchDialog` erweitern um Vorschlags-Ansicht, neuer API-Hook in `frontend-food/src/api/`
- **KI**: Gemini-Call für Reranking (optional, mit Fallback auf rein algorithmisch)
- **Daten**: Optional Saisonkalender-Tabelle (IngredientSeason) für saisonale Zuordnung
