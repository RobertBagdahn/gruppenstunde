## Why

Die AGENTS.md-Regel "Kein Food-bezogener Code im Haupt-Frontend" wird systematisch verletzt: Food-Schemas (`supply.ts`, `normPerson.ts`), Food-API-Hooks (`supplies.ts`), Food-Utilities (`unitConversion.ts`, `portionDisplay.ts`), Food-Components (`NutrientBalanceChart`, `NutritionPieChart`, `AiSuggestDialog`) und Food-Referenzen in Suche, Privacy und CommandPalette existieren im Haupt-Frontend. Die strikte Trennung (Haupt-Frontend = Session/Blog/Game/Event, Food-Frontend = Rezept/Zutat/MealPlan) wird dadurch untergraben.

## What Changes

**BREAKING** (für Haupt-Frontend, das Food-Features nutzt — wird nicht mehr funktionieren, aber das ist laut AGENTS.md-Regel korrekt):

- **Schemas entfernen**: `frontend/src/schemas/supply.ts` (Ingredient-spezifische Teile), `frontend/src/schemas/normPerson.ts` (komplette Datei)
- **API-Hooks entfernen**: `frontend/src/api/supplies.ts` (Ingredient-CRUD, Portion-Hooks, AI-Suggest)
- **Utilities entfernen**: `frontend/src/lib/unitConversion.ts`, `frontend/src/lib/portionDisplay.ts`
- **Components entfernen**: `frontend/src/components/charts/NutrientBalanceChart.tsx`, `frontend/src/components/charts/NutritionPieChart.tsx`, `frontend/src/components/shared/AiSuggestDialog.tsx`
- **Pages entfernen**: `frontend/src/pages/MaterialPage.tsx` (verwaist)
- **Food-Referenzen bereinigen**: SearchPage recipe-spezifische Metadaten, CommandPalette recipe-Einträge, Search-Schemas recipe-Type, PrivacyPage `shopping_lists` category, SearchBar "Rezepten"-Text, PersonsPage `useNutritionalTags`-Import
- **Search-Bereinigung**: `UnifiedSearchResultSchema` behält `recipe` als result_type (Backend liefert es), aber das Haupt-Frontend hat keine Recipe-Detail-Route. Recipe-Ergebnisse werden weiterhin gelistet, aber Links zeigen zu `/recipes/:slug` (folgt dem Food-Frontend-Cross-Domain-Linking).

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

- `search`: Entfernung von Recipe-spezifischer Metadaten-Anzeige im Haupt-Frontend (Recipe bleibt als result_type, aber ohne Detail-Link). Entfernung von `tag` aus `UnifiedSearchResultSchema` (nur in Autocomplete).
- `entity-link`: Recipe wird in `EntityType` aufgenommen (folgt dem fix-critical-errors-Change), aber Recipe-Detail-Seite lebt im Food-Frontend.

## Impact

- **Frontend (Haupt)**: Mindestens 12 Dateien werden geändert oder gelöscht
- **Frontend (Food)**: Keine Änderungen (hat eigene Kopien aller entfernten Module)
- **Backend**: Keine Änderungen
- **Keine Migrationen**
