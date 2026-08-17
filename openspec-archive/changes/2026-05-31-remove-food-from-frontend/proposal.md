## Why

Das Haupt-Frontend (`frontend/`) enthält umfangreichen Food-Code (Rezepte, Zutaten, Essenspläne, Einkaufslisten, Ernährungsrechner), der 1:1 im Food-Frontend (`frontend-food/`) existiert. Diese Duplizierung führt zu Verwirrung, doppeltem Wartungsaufwand und widerspricht der Architektur-Entscheidung, dass alle Food-Funktionalität im eigenständigen Food-Frontend lebt.

## What Changes

- **BREAKING**: Alle Food-bezogenen Pages aus `frontend/` entfernen (Recipes, MealPlans, Shopping Lists, Ingredients)
- **BREAKING**: Alle Food-bezogenen Components entfernen (`recipe/`, `shopping/`, `supply/IngredientList`)
- **BREAKING**: Alle Food-bezogenen API-Hooks entfernen (recipes, ingredients, mealPlans, mealEvents, shoppingLists, normPerson, recipeHints)
- **BREAKING**: Alle Food-bezogenen Zod-Schemas entfernen (recipe, ingredient, mealPlan, mealEvent, shoppingList)
- **BREAKING**: Food-bezogene Stores, Utils und Hooks entfernen (useRecipeModificationStore, nutritionCalculator, parseRecipeSteps, useShoppingListWebSocket)
- **BREAKING**: Food-Routen aus `App.tsx` entfernen
- **BREAKING**: `recipe` aus ApprovalQueuePage im Haupt-Frontend entfernen
- `'recipe'` Referenz aus TitleImageEditor im Haupt-Frontend entfernen
- Recipe Approval Queue im Food-Frontend hinzufügen
- `frontend/AGENTS.md` und `AGENTS.md` aktualisieren mit klarer Trennungsregel

## Capabilities

### New Capabilities

- `food-approval-queue`: Approval Queue für Rezepte im Food-Frontend (Admin-Seite zur Moderation von Rezepten)

### Modified Capabilities

- `food-frontend-app`: Entfernung aller Food-Code-Duplikate aus dem Haupt-Frontend, klare Abgrenzung der beiden Frontends

## Impact

- **Frontend (`frontend/`)**: ~46 Dateien werden gelöscht (Pages, Components, API, Schemas, Stores, Utils, Hooks). Routen-Konfiguration und Admin-Page werden angepasst.
- **Frontend-Food (`frontend-food/`)**: Neue Admin-Approval-Queue-Seite wird hinzugefügt.
- **AGENTS.md**: Neue Regel zur klaren Trennung, damit kein Food-Code im Haupt-Frontend landet.
- **Keine Backend-Änderungen** — APIs bleiben unverändert, beide Frontends nutzen dasselbe Backend.
- **Keine Migrations nötig** — reine Frontend-Änderung.
- **Keine Schema-Änderungen** — Pydantic-Schemas im Backend bleiben, Zod-Schemas werden nur im Haupt-Frontend gelöscht (existieren bereits im Food-Frontend).
