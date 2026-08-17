## Why

Die Rezept-Detailseite (`frontend/src/pages/recipes/RecipeDetailPage.tsx`, aktuell ~1850 Zeilen) ist über viele Features hinweg gewachsen und enthält mehrere Duplikate, redundante Bewertungen und Metadaten-Wiederholungen. Der User sieht Nutri-Score zweimal, zwei parallele Bewertungssysteme (`InspiScore` + `Recipe Checks`) mit identischen Dimensionen, eine "Zubereitungsanalyse", die nur die KPI-Boxen wiederholt, und eine prominente "Normportionen (15 J., männl., PAL 1.5)"-Box, die mehr irritiert als informiert. Die Bewertungsachsen Preis, Sättigung und Geschmack sind subjektiv und wurden als nicht sinnvoll verworfen — ihre UI muss entsprechend zurückgebaut werden.

Ziel: Die Seite verschlanken, Duplikate entfernen und für die folgenden Feature-Changes (Top-5-Verbesserungen, Desktop-Sidebar, Zutaten-Contribution) eine saubere Basis schaffen.

## What Changes

### Entfernungen (BREAKING)
- **BREAKING** `InspiScore`-Komponente und der API-Endpunkt `GET /api/recipes/{id}/inspi-score/` werden vollständig entfernt (Preis/Gesundheit/Sättigung/Geschmack-Rating)
- **BREAKING** `Recipe Checks`-Box (4-Dimensionen-Rating via `useRecipeChecks`) wird aus der Detailseite entfernt; der API-Endpunkt wird entfernt, da nirgendwo sonst genutzt
- Zweite Nutri-Score-Darstellung (eigener Block oberhalb der Zutaten) wird entfernt — Nutri-Score lebt künftig nur noch als Badge in den Info-Boxen und im Detail in der Gesundheitsanalyse
- "Zubereitungsanalyse"-`AnalysisSection` wird komplett entfernt (reines Metadaten-Duplikat)
- Info-Box "Normportionen (15 J., männl., PAL 1.5)" wird entfernt
- KPI-Box "Kosten pro Person" wird entfernt
- Text "pro Portion" wird aus Preis-Analyse, Gewichtsanalyse und Gesundheitsindikatoren entfernt; bleibt nur im Makronährstoff-Breakdown (sinnvolle Referenz)

### Änderungen
- Info-Box (vorher "Normportionen") zeigt künftig das **Nutri-Score Badge (A–E)** als prominentes Gesundheitssignal oben auf der Seite
- KPI-Box (vorher "Kosten pro Person") zeigt künftig die **Gesamtkosten in EUR** (neutraler Fakt, keine Bewertung)
- Die Zubereitungs-Section (Markdown `description`) wird zu einer einklappbaren Section im `AnalysisSection`-Stil. Default: offen auf Desktop (`≥1024px`), zu auf Mobile.

### Erhalten (wichtig — nicht entfernen)
- `PortionScaler` in der Zutatenliste bleibt funktional
- Normportion-Banner/Simulator (`ratio > 1.5` Warnung inkl. "Auf Normportion skalieren"-Button) bleibt erhalten
- `useRecipeModificationStore` inkl. `modifiedServings` und `scaleToNormPortion` bleibt erhalten
- Einkaufslisten-Export mit Portions-Dialog bleibt
- `NutriImprovementCards` in der Gesundheitsanalyse bleibt (wird in Change #2 überarbeitet)
- `Recipe Hints`-Section (`useRecipeHints`) bleibt (wird in Change #2 zusammen mit den Improvements gemergt)
- Preis-Analyse-Section (Breakdown pro Zutat) bleibt als informativer Fakt

## Capabilities

### New Capabilities
<!-- Keine neuen Capabilities — dieser Change räumt ausschließlich innerhalb bestehender Specs auf -->

### Modified Capabilities
- `recipe`: Inspi-Score-Requirements (Berechnung, API, Frontend-Darstellung) werden entfernt. Requirement "Nutri-Score-Verbesserungsvorschläge" bleibt erhalten. Requirement "Portionen-Anzeige auf Rezept-Detailseite" wird dahingehend geändert, dass die Info-Box "Normportionen" entfällt und stattdessen ein Nutri-Score-Badge erscheint. Neue Requirement für die einklappbare Zubereitungs-Section.

## Impact

### Betroffene Frontend-Dateien
- `frontend/src/pages/recipes/RecipeDetailPage.tsx` — Hauptdatei, viele Entfernungen + zwei Info-Box-Umbauten + Zubereitung einklappbar
- `frontend/src/components/recipe/InspiScore.tsx` — **gelöscht**
- `frontend/src/api/recipes.ts` — `useInspiScore` und `useRecipeChecks` Hooks **entfernt**
- `frontend/src/schemas/recipe.ts` — Zod-Schema `InspiScoreSchema` + zugehörige Types **entfernt**; `CheckSchema` **entfernt**

### Betroffene Backend-Dateien
- `backend/recipe/api/recipes.py` bzw. `api/` Package — Endpoints `inspi_score` und `recipe_checks` **entfernt**
- `backend/recipe/services/inspi_score_service.py` — **gelöscht**
- `backend/recipe/services/recipe_checks.py` — Prüfen ob `get_recipe_nutritional_values` weiter genutzt wird (ja, von `nutri_improvement_service`); nur die Check-Aggregator-Funktion entfernen, die Nutrition-Helper bleiben
- `backend/recipe/schemas/` Package — `InspiScoreOut`, `CheckOut` Schemas **entfernt**
- `backend/recipe/tests/test_inspi_score.py` — **gelöscht**

### API-Änderungen (BREAKING)
- `GET /api/recipes/{id}/inspi-score/` **entfernt** (404)
- `GET /api/recipes/{id}/checks/` **entfernt** (404)

### Migrations
- Keine Datenbank-Migrationen erforderlich. Beide entfernten Features sind reine Compute-Services, die auf bestehenden Feldern arbeiten.

### Schema-Sync
- Pydantic-Schemas (`InspiScoreOut`, `CheckOut`) und Zod-Schemas (`InspiScoreSchema`, `CheckSchema`) werden synchron entfernt.

### Dependencies
- Blockt: Change #2 (`recipe-improvement-merge`), Change #3 (`recipe-detail-sidebar-layout`), Change #4 (`recipe-health-insights`) — alle bauen auf der aufgeräumten Struktur auf.
