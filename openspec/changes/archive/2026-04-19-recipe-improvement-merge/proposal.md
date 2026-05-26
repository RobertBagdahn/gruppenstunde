## Why

Auf der Rezept-Detailseite existieren aktuell **zwei parallele Listen** mit Verbesserungsvorschlägen, die sich inhaltlich überschneiden, aber unterschiedliche Datenquellen und UI haben:

1. **`NutriImprovementCards`** (Backend `nutri_improvement_service.py`) — berechnet, welche Parameteränderung den Nutri-Score am meisten verbessert, hardcoded auf Top-3 (`candidates[:3]`), ohne klare Schwellenwert-Referenz.
2. **Recipe Hints** (Backend `RecipeHint`-Modell + `match_recipe_hints` + `useRecipeHints`) — liefert konfigurierbare Ampel-Hinweise mit echten Thresholds (`min_value`/`max_value`, `improvement_text`, `hint_level`), aber isoliert als zweite Liste darunter.

Für den Nutzer entsteht Verwirrung: Zwei Blöcke mit Verbesserungsvorschlägen direkt untereinander, unterschiedliche Visualisierung, teils widersprüchliche Priorisierung. Zusätzlich fehlt in beiden Listen eine saubere Darstellung von **aktuellem Wert → Schwellenwert → Delta**, die dem Nutzer zeigt, wie weit entfernt das Rezept tatsächlich von „gut" ist.

Ziel: Eine einzige, priorisierte **Top-5-Liste** mit Current/Threshold/Delta-Darstellung ablösen beide alten Listen.

## What Changes

### Merge-Logik (Backend)
- Neuer Service `improvement_ranking_service.py` in `recipe/services/` mergt die Kandidaten aus beiden Quellen zu einer einheitlichen Liste
- Jede Verbesserung hat die Felder: `parameter` (string, z.B. `salt_g`), `parameter_label` (de), `current_value`, `threshold_value`, `delta` (wie weit drüber/drunter), `unit`, `direction` (`reduce` / `increase`), `impact_score` (0–100, für Ranking), `suggested_ingredients` (Top-3 Zutaten, die am meisten zum Parameter beitragen), `source` (`nutri_score` | `recipe_hint` | `merged`), `recommendation_text` (de)
- Ranking-Algorithmus kombiniert `impact_score` aus Nutri-Score-Simulation und `severity` aus RecipeHint-Überschreitung, normalisiert auf eine Skala. Deterministisch (keine KI).
- Deduplizierung: Wenn beide Quellen denselben Parameter vorschlagen (z.B. "Zucker reduzieren"), werden sie zu einem Eintrag gemergt, der höhere `impact_score` gewinnt, Texte werden kombiniert.
- Limit: Top-5 Einträge, sortiert nach `impact_score` desc
- Wenn Rezept keine Verbesserungen hat (Nutri-Score A + alle RecipeHints im grünen Bereich): leere Liste + `all_good_message`

### API
- **BREAKING** Neuer Endpoint `GET /api/recipes/{id}/improvements/` ersetzt `GET /api/recipes/{id}/nutri-improvements/`
- **BREAKING** Endpoint `GET /api/recipes/{id}/recipe-hints/` wird entfernt (die Daten fließen in den neuen Endpoint ein)
- Response-Format: `{ items: ImprovementOut[], all_good: bool, message: str | null }`

### Frontend
- Neue Komponente `RecipeImprovements.tsx` ersetzt `NutriImprovementCards.tsx` **und** den Recipe-Hints-JSX-Block
- Jede Karte zeigt: Icon (Parameter), Parameter-Label, aktueller Wert + Einheit, Zielwert + Einheit, Delta-Visualisierung (z.B. Fortschrittsbalken oder "−2,3 g bis Schwellwert"), Top-Zutaten-Chips, Recommendation-Text, optional „Details"-Button (öffnet bestehenden `HintDetailModal` wenn RecipeHint-Quelle)
- All-Good-Zustand: Erfolgs-Card „Alle Werte im grünen Bereich" statt leerer Liste

### Entfernungen
- **BREAKING** `frontend/src/components/recipe/NutriImprovementCards.tsx` gelöscht
- **BREAKING** `frontend/src/api/recipes.ts`: `useRecipeHints`, `useNutriImprovements` entfernt; neuer Hook `useRecipeImprovements`
- **BREAKING** Zod-Schemas `NutriImprovementSchema`, `RecipeHintMatchSchema` ersetzt durch `ImprovementSchema`
- **BREAKING** `backend/recipe/services/nutri_improvement_service.py` — Hardcoded `[:3]` Aufruf entfällt, Service wird vom neuen Ranking-Service als Datenquelle genutzt (Funktionen bleiben als Helper erhalten)

## Capabilities

### Modified Capabilities
- `recipe`: Requirement "Nutri-Score-Verbesserungsvorschläge" wird modifiziert (Top-3 → Top-5, neuer Endpoint, Current/Threshold/Delta-Format, gemergt mit RecipeHint-Hinweisen). Requirement "Klickbare Verbesserungsvorschläge" wird erhalten, aber auf das neue Datenformat angepasst. Requirement "Recipe hints include improvement text" wird auf den neuen Merge-Endpoint modifiziert.

## Impact

### Abhängigkeiten
- **Blockiert durch**: `recipe-detail-cleanup` (Change #1) — dieser Change baut auf der bereits bereinigten Detailseite auf. Wenn #1 noch nicht archiviert ist, wird beim Merge das bereits entfernte `InspiScore`-Referenzmaterial nicht reaktiviert.

### Betroffene Backend-Dateien
- `backend/recipe/services/improvement_ranking_service.py` — **neu**
- `backend/recipe/services/nutri_improvement_service.py` — Hardcoded `[:3]` entfernen, als Helper-Library behalten
- `backend/recipe/services/recipe_checks.py` — `match_recipe_hints` bleibt als Helper, wird vom Ranking-Service genutzt
- `backend/recipe/api/nutrition.py` — Endpoint `/improvements/` hinzufügen, `/nutri-improvements/` und `/recipe-hints/` entfernen
- `backend/recipe/schemas/nutrition.py` — `ImprovementOut`, `ImprovementListOut`, `SuggestedIngredientOut` neu; `NutriImprovementOut`, `RecipeHintMatchOut` entfernt
- `backend/recipe/tests/test_improvement_ranking.py` — **neu** (Ranking-Algorithmus, Deduplizierung, All-Good-Case)

### Betroffene Frontend-Dateien
- `frontend/src/components/recipe/RecipeImprovements.tsx` — **neu**
- `frontend/src/components/recipe/NutriImprovementCards.tsx` — **gelöscht**
- `frontend/src/pages/recipes/RecipeDetailPage.tsx` — zwei alte Blöcke ersetzt durch einen `<RecipeImprovements />` Render
- `frontend/src/api/recipes.ts` — alte Hooks raus, `useRecipeImprovements` rein
- `frontend/src/schemas/recipe.ts` — `ImprovementSchema` neu, alte Schemas entfernt
- `frontend/src/components/recipe/HintDetailModal.tsx` — bleibt, wird von neuer Karte genutzt, wenn `source === 'recipe_hint'` oder `'merged'`

### API-Änderungen (BREAKING)
- **Neu**: `GET /api/recipes/{id}/improvements/`
- **Entfernt**: `GET /api/recipes/{id}/nutri-improvements/` (404)
- **Entfernt**: `GET /api/recipes/{id}/recipe-hints/` (404)

### Migrations
- Keine DB-Migrationen; RecipeHint-Modell bleibt unverändert, wird weiter als Konfigurationsquelle genutzt.

### Schema-Sync
- Pydantic `ImprovementOut` ↔ Zod `ImprovementSchema` exakt synchron.
