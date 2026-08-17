## Why

Im Food-Frontend (`frontend-food/`) gibt es aktuell drei unterschiedliche
Namen für dasselbe Konzept (`image_url`, `image`, `recipe_image`), die alle
live `recipe.image.url` abbilden, sowie drei unterschiedliche
Fallback-Strategien wenn ein Rezept kein Bild hat (Platzhalterbild,
Icon-in-Box, gar kein Bild-Element). Konkret sichtbar wird das auf der
Zutaten-Detailseite (`/ingredients/:slug`, Sektion "Rezepte mit dieser
Zutat"), die weder das etablierte Platzhalterbild noch die volle
`RecipeCard`-Darstellung nutzt. Zusätzlich existieren vier Endpunkte in
`planner/api/meal_plan.py`, die rohe `dict`-Responses statt typisierter
Pydantic-Schemas zurückgeben (Verstoß gegen das Type-Safety-Prinzip aus
AGENTS.md) und dabei ebenfalls das Bildfeld unter dem Namen `image` führen.

Diese Inkonsistenz erschwert Wartung (vier Stellen zum Anpassen statt einer),
führt zu sichtbar unterschiedlichem UX-Verhalten je nach Seite und lässt an
fünf Stellen potenziell kaputte Bild-Icons im Browser entstehen, wenn
`image`/`recipe_image`/`image_url` fälschlich ein leerer String statt
`null`/`undefined` ist.

## What Changes

- Neue gemeinsame Frontend-Komponente `RecipeThumbnail` (`frontend-food/src/components/recipe/RecipeThumbnail.tsx`), die Bild + Fallback (`/images/inspi_cook.png`) + Größen-/Aspect-Ratio-Varianten kapselt.
- Migration der drei Kernkomponenten `RecipeCard`, `RecipeTableRow` und `IntelligentSuggestionsGrid` (SuggestionCard) auf `RecipeThumbnail` statt dupliziertem `<img src={x || '/images/inspi_cook.png'}>`-Code.
- `IngredientDetailPage.RecipesSection` ("Rezepte mit dieser Zutat") rendert Rezepte künftig über die bestehende `RecipeCard`-Komponente statt einer eigenen minimalistischen Karte mit Icon-Fallback (`ChefHat`).
- Fallback nachziehen an den fünf Stellen ohne jegliches Fallback-Verhalten: `MealSlot.tsx` (zwei Vorkommen), `RecipePreviewInline.tsx`, `RecipePreviewDialog.tsx`, `ProfilePage.tsx`, `RecipeImportPage.tsx` — alle nutzen künftig `RecipeThumbnail`.
- **BREAKING**: Backend-Feld `recipe_image` in `MealItemOut` und `CookingScheduleRecipeBlockOut` (`backend/planner/schemas/meal_plan.py`) wird zu `image_url` umbenannt (bricht bewusst die lokale Präfix-Konvention `recipe_title`/`recipe_slug` zugunsten App-weiter Konsistenz).
- **BREAKING**: Vier `response=dict`-Endpunkte in `backend/planner/api/meal_plan.py` (Popular Recipes, Recently Used, Recipe-Suche/Autocomplete, Suggestions) bekommen echte Pydantic-Response-Schemas; das Feld `image` wird zu `image_url`.
- Entsprechende Zod-Schemas in `frontend-food/src/schemas/` werden synchron angepasst (`image`/`recipe_image` → `image_url`), alle Frontend-Konsumenten (`useRecipesByIngredient`, `useMealPlan`-Hooks, Recipe-Search-Hooks) werden auf den neuen Feldnamen umgestellt.
- `planner/services/cooking_schedule_service.py` (PDF-Export-Dataclass) wird ebenfalls auf `image_url` umbenannt, um Konsistenz mit dem zugehörigen Schema zu wahren.

## Capabilities

### New Capabilities
- `recipe-thumbnail`: Gemeinsame Bild+Fallback-Darstellung für Rezept-Vorschaubilder im Food-Frontend (Komponente, Varianten, Fallback-Regel).

### Modified Capabilities
- `meal-planner-recipe-search`: Response-Schema für Popular/Recently-Used/Suchergebnisse wird von rohem `dict` auf typisiertes Pydantic-Schema mit `image_url`-Feld umgestellt.
- `meal-plan`: `MealItemOut`/`CookingScheduleRecipeBlockOut` liefern `image_url` statt `recipe_image`.
- `ingredient-database`: "Rezepte mit dieser Zutat"-Sektion auf `IngredientDetailPage` rendert Ergebnisse über `RecipeCard`/`RecipeThumbnail` statt eigener minimalistischer Karte.

## Impact

**Backend (Django Apps: `planner`, `recipe`):**
- `backend/planner/schemas/meal_plan.py` — `MealItemOut.recipe_image` → `image_url`, `CookingScheduleRecipeBlockOut.recipe_image` → `image_url`
- `backend/planner/api/meal_plan.py` — vier `response=dict`-Endpunkte (Zeilen ~1743, 1784, 1837, 2062) bekommen neue Pydantic-Out-Schemas; Feld `image` → `image_url`
- `backend/planner/services/cooking_schedule_service.py` — Dataclass-Feld `recipe_image` → `image_url`
- Keine Migration nötig — alle betroffenen Felder sind live berechnete Resolver-Felder, kein DB-Feld ändert sich.

**Frontend (`frontend-food/`):**
- Neue Komponente: `frontend-food/src/components/recipe/RecipeThumbnail.tsx`
- Angepasst: `RecipeCard.tsx`, `RecipeTableRow.tsx`, `IntelligentSuggestionsGrid.tsx`, `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx` (`RecipesSection`), `frontend-food/src/pages/planning/RecipePreviewInline.tsx`, `frontend-food/src/pages/planning/RecipePreviewDialog.tsx`, `frontend-food/src/pages/planning/MealSlot.tsx`, `frontend-food/src/pages/profile/ProfilePage.tsx`, `frontend-food/src/pages/recipes/RecipeImportPage.tsx`
- Zod-Schemas: `frontend-food/src/schemas/recipe.ts`, `frontend-food/src/schemas/mealPlan.ts` (Feldnamen-Anpassung `image`/`recipe_image` → `image_url`)
- API-Hooks: `frontend-food/src/api/supplies.ts` (`useRecipesByIngredient`, unverändert im Schema), `frontend-food/src/api/mealPlan.ts` bzw. äquivalente Hook-Datei für Recipe-Search/Popular/Recently-Used (Feldzugriffe anpassen)

**Kein Impact auf `frontend/`** (Haupt-Frontend enthält laut AGENTS.md keinen Food-Code).
</content>
