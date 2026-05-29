## Why

Die Rezept-Detailseite (`/recipes/:slug`) existiert aktuell nicht — es gibt keine Route in `App.tsx` und keine Page-Komponente. Alle Analyse-Komponenten (NutriScore, Preis, Improvements, Nutrition Breakdown, Positive Traits) sowie die API-Hooks und Zod-Schemas sind vollständig implementiert, werden aber nirgends zusammengesetzt und angezeigt. Nutzer, die über Links oder die Suche auf ein Rezept navigieren, sehen eine leere Seite.

## What Changes

- Neue `RecipeDetailPage`-Komponente, die alle vorhandenen Analyse-Panels (Sidebar, Improvements, NutritionContributionPanel, PositiveTraitsBadges) zusammensetzt
- Neue `RecipeListPage`-Komponente für `/recipes` (Übersicht aller Rezepte)
- Routen `/recipes` und `/recipes/:slug` in `App.tsx` registrieren
- Vorhandene Komponenten (`RecipeSidebar`, `RecipeHeaderInfo`, `RecipeImprovements`, `NutritionContributionPanel`, `PositiveTraitsBadges`, `HintDetailModal`) werden eingebunden, nicht neu geschrieben

## Capabilities

### New Capabilities
- `recipe-detail-page`: Rezept-Detailseite mit vollständiger Nährwert-Analyse, Preis-Anzeige, NutriScore, Verbesserungsvorschlägen und Zutatenliste

### Modified Capabilities
<!-- Keine bestehenden Spec-Änderungen nötig — die Backend-APIs und Schemas existieren bereits -->

## Impact

- **Frontend**: `App.tsx` (neue Routen), neue Page-Komponenten unter `pages/recipes/`
- **Bestehende Komponenten**: `RecipeSidebar`, `RecipeHeaderInfo`, `RecipeImprovements`, `NutritionContributionPanel`, `PositiveTraitsBadges`, `HintDetailModal`, `IngredientList` — werden verwendet, nicht geändert
- **API-Hooks**: `useRecipeNutriScore`, `useRecipeImprovements`, `useRecipeNutritionBreakdown` — bereits vorhanden
- **Zod-Schemas**: `RecipeDetailSchema`, `NutriScoreDetailSchema`, `ImprovementSchema`, `RecipeNutritionBreakdownSchema` — bereits vorhanden
- **Keine Migrations** nötig (keine Model-Änderungen)
- **Keine Pydantic/Zod-Schema-Änderungen** nötig
