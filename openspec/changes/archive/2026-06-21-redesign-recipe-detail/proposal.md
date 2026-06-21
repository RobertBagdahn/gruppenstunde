## Why

Die Rezept-Detailseite (`RecipeDetailPage.tsx`, 1857 Zeilen) hat strukturelle Probleme und Runtime-Bugs aus der `servings`→`portions`-Umbenennung. Die Analyse-Sektionen sind durch einen Backend-NameError unsichtbar, Daten-Änderungen an Portionszahlen werden stillschweigend ignoriert, und die laut Spec geplanten Analyse-Tabs mit Kategorie-Benchmarking wurden nie vollständig implementiert (Tasks fälschlich als erledigt markiert).

## What Changes

**Bugfixes:**
- `nutrition.py:298-302`: `NameError` durch nicht umbenannte `servings`-Variable → Analyse-Sektionen unsichtbar
- `shopping/api.py:456`: `NameError` durch nicht umbenannte `servings`-Variable → Einkaufsliste-Erstellung zerstört
- `RecipeDetailPage.tsx:697+736`: API-Payload sendet `servings` statt `portions` → Portions-Änderungen ignoriert
- `EditRecipePage.tsx:82`: API-Payload sendet `servings` statt `portions` → Portions-Edit ignoriert

**Umsetzung der ursprünglichen Spec `recipe-detail-reorganized`:**
- 4 separate `<AnalysisSection>`-Accordions → eine Tab-basierte "Analyse"-Sektion mit Reitern (Preis | Inhaltsstoffe | Gesundheit | Gewicht) in separaten Komponenten
- Kategorie-Benchmarking in jedem Analyse-Tab via `RecipeCategoryBenchmark`/`RecipeNutriScoreDistribution`
- Fehlende Frontend-Bausteine nachliefern: `RecipeTypeStats` Zod-Schema, `useRecipeTypeStats` Hook, `NUTRI_SCORE_COLORS_BY_LETTER` Export
- `ScaleIngredientsDialog` entfernen, Faktor-Skalierung in `PortionScaler` integrieren
- Section-Reihenfolge auf Spec anpassen: Zutaten → Zubereitung(defaultOpen) → Themen/Allergene → Analyse-Tabs → Rezeptregeln
- `showFactors`-Prop am PortionScaler für Quick-Select 0.5×/1.5×/2×

## Capabilities

### New Capabilities
- `recipe-detail-reorganized`: Neues Layout und IA für die Rezept-Detailseite (besteht bereits als Spec)

### Modified Capabilities
- `recipe-detail-page`: Analyse-Tabs statt Accordions, Kategorie-Benchmarking, Bugfixes
- `recipe`: `servings`→`portions` Rename-Bugs behoben (nutrition.py, shopping/api.py)

## Impact

- **BUGFIX** `backend/recipe/api/nutrition.py`: 5× `servings` → `portions` (Lines 298-302)
- **BUGFIX** `backend/shopping/api.py`: 1× `servings` → `portions` (Line 456)
- **BUGFIX** `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`: Payload-Keys `servings` → `portions` (Lines 697, 736)
- **BUGFIX** `frontend-food/src/pages/recipes/EditRecipePage.tsx`: State + Payload `servings` → `portions`
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`: Umstellung 4 Accordions → `RecipeAnalysisTabs` mit 4 Tab-Komponenten
- `frontend-food/src/components/recipe/PriceTab.tsx` (NEU): Preis-Analyse Inhalt
- `frontend-food/src/components/recipe/NutritionTab.tsx` (NEU): Inhaltsstoff-Analyse Inhalt
- `frontend-food/src/components/recipe/HealthTab.tsx` (NEU): Gesundheits-Analyse Inhalt
- `frontend-food/src/components/recipe/WeightTab.tsx` (NEU): Gewichts-Analyse Inhalt
- `frontend-food/src/components/recipe/PortionScaler.tsx`: `showFactors`-Prop hinzufügen
- `frontend-food/src/components/recipe/ScaleIngredientsDialog.tsx`: Entfernen + Import löschen
- `frontend-food/src/schemas/recipe.ts`: `RecipeTypeStatsSchema` hinzufügen
- `frontend-food/src/schemas/supply.ts`: `NUTRI_SCORE_COLORS_BY_LETTER` hinzufügen
- `frontend-food/src/api/recipes.ts`: `useRecipeTypeStats` Hook hinzufügen
