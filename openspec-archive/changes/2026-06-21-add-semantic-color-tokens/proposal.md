## Why

Im Food-Frontend werden 33+ hartcodierte Tailwind-Farbklassen (z.B. `bg-yellow-50`, `text-emerald-700`, `bg-amber-500`) direkt in Komponenten verwendet, obwohl die `frontend-food/AGENTS.md` dies verbietet. Die `index.css` definiert nur 5 Chart-Farben + Primary/Accent, aber keine semantischen Token für Status (success/warning/danger/info). Das führt zu inkonsistenten Visuals und verhindert Theme-Wechsel.

Gleichzeitig ist der Rename `servings`→`portions` aus dem `unify-portions-vocabulary` Change nicht ins Frontend-Food migriert — dieselben Dateien, die vom Layout-Refactoring betroffen sind, brauchen den Rename zuerst.

## What Changes

**BREAKING** — Neue semantische CSS-Token und Umbenennungen:

- **index.css**: 4 neue HSL-Token: `--success` (grün), `--warning` (gelb/bernstein), `--danger` (rot), `--info` (blau)
- **Tailwind-Theme**: `success`, `warning`, `danger`, `info` als Farb-Utility-Klassen (bg-success, text-danger, etc.)
- **NUTRI_SCORE_COLORS**: Von 3 Kopien (DetailPage, MetaCard, supply) auf 1 Quelle in `@/schemas/supply` konsolidiert, Nutzung der neuen Token
- **HealthIndicator/StatusColors**: Ersetzen von hardcodierten `bg-green-50 border-green-200` durch `bg-success/10 border-success/20`
- **RecipeRulesBox**: `text-emerald-600`, `bg-amber-50`, `text-rose-600` → Status-Token
- **PortionScaler**: `bg-amber-50 border-amber-200` → `bg-warning/10 border-warning/20`
- **NutrientCard/PriceRow/AnalysisSections**: Alle hardcodierten Farben durch Chart-Token oder Status-Token ersetzen
- **servings→portions**: Frontend-Schema `recipe.ts`, alle Komponenten, API-Hooks, Store

## Capabilities

### New Capabilities
- `semantic-colors`: CSS-Token und Tailwind-Utilities für konsistente Status-Farben (success/warning/danger/info), dokumentiert im Styleguide unter `/styleguide`

### Modified Capabilities
- `food-design-system`: Neue semantische Status-Token (success/warning/danger/info), NUTRI_SCORE_COLORS ins Token-System integriert
- `recipe`: `servings`→`portions` in Zod-Schema, Type-Typen, allen Recipe-Komponenten, API-Hooks mit Hook-Namen

## Impact

- **frontend-food/src/index.css**: +4 HSL-Token + Tailwind-Config-Erweiterung
- **frontend-food/src/schemas/**: `recipe.ts` (servings→portions), `supply.ts` (NUTRI_SCORE_COLORS zentral)
- **frontend-food/src/components/recipe/**: Alle Komponenten mit hardcodierten Farben (RecipeMetaCard, PortionScaler, RecipeRulesBox, RecipeDetailPage helpers)
- **frontend-food/src/components/supply/**: IngredientList (NUTRI_SCORE_COLORS import fix)
- **frontend-food/src/pages/recipes/RecipeDetailPage.tsx**: ~30 Farb-Referenzen ersetzen + servings→portions
- **frontend-food/src/store/**: `useRecipeModificationStore` (modifiedServings → modifiedPortions)
- **frontend-food/src/api/**: Hook-Namen mit `servings`
