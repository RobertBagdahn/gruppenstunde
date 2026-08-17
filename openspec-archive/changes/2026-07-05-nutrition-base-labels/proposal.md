## Why

Im Recipe-Detail werden Nährwerte aus unterschiedlichen Bezugsgrößen (pro 100g, pro Portion, gesamt) nebeneinander angezeigt, ohne dass die Basis klar gekennzeichnet ist. Das führt zu Verwirrung: Nutzer vergleichen 68 kcal (pro 100g) mit 563 kcal (gesamt) und denken an einen Rechenfehler.

## What Changes

- Einheitliches Badge-System für alle Nährwert-Sections: "pro 100g", "pro Portion", "gesamt"
- Section "Zutaten-Beiträge pro Nährwert" → umbenannt in "Zutaten-Beiträge pro Portion"
- Section "Gesamtnährwerte (pro 100g)" → entfernt "pro 100g", korrigiert zu "Gesamtnährwerte" (da DGE-Vergleich auf gesamtes Rezept basiert)
- Verbesserungsvorschläge: Alle Werte (Aktuell, Ziel, Hauptverursacher) erhalten Badge "pro Portion"
- Recipe Rules UI: "pro Portion"-Badge
- Keine Änderung an API, Schemas, Datenmodell oder Berechnungen — reine UI/Label-Änderungen

## Capabilities

### New Capabilities
- `nutrition-unit-badges`: Einheitliches System von Section-Badges, das die Bezugsgröße von Nährwerten visuell kennzeichnet ("pro 100g", "pro Portion", "gesamt")

### Modified Capabilities
<!-- No existing specs are modified — this is purely a UI change -->

## Impact

- **Frontend-Komponenten** (`frontend-food/`):
  - `NutritionTab.tsx` — Section-Header "Gesamtnährwerte (pro 100g)" korrigiert
  - `RecipeDetailHelpers.tsx` — Section-Header "Zutaten-Beiträge pro Nährwert" → "pro Portion"
  - `NutritionContributionPanel.tsx` — Werte erhalten Kontext (bereits pro Portion, nur Badge)
  - `RecipeImprovements.tsx` — Werte erhalten Badge "pro Portion"
  - `HealthTab.tsx` — bleibt unverändert (bereits korrekt)
  - `RecipeDetailPage.tsx` — Frontend-Rechner bei dirty items
- **Keine Backend-Änderungen**
- **Keine Schema-Änderungen** (Pydantic/Zod)
- **Keine Migrationen**
