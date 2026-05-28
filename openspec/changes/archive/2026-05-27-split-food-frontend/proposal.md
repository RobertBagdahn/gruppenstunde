## Why

Die Frontend-App wächst und vermischt verschiedene Domänen (Content, Events, Food/Rezepte). Die Food-Domäne (Rezepte, Zutaten, Essensplan, Einkaufslisten) soll als eigenständige Vite-App abgetrennt werden, um unabhängige Entwicklung und Deployment zu ermöglichen und die Haupt-App schlanker zu halten.

## What Changes

- **Neue eigenständige Vite-App** `frontend-food/` mit eigenem `package.json`, Layout, Routing und Auth-Integration
- **Seiten-Migration**: Alle Recipe-, Ingredient-, MealPlan-, ShoppingList- und NormPortion-Pages werden in die neue App verschoben
- **Code-Duplikation**: shadcn/ui-Komponenten, Auth-Hooks, API-Client-Setup werden kopiert (kein shared package)
- **Eigenes Layout/Navigation**: Food-App bekommt eigenes Menü mit nur food-relevanten Einträgen
- **Makefile-Target**: `make food` startet die Food-App auf Port 5174
- **Haupt-App bereinigen**: Food-relevante Seiten, Routen und Nav-Einträge aus `frontend/` entfernen

## Capabilities

### New Capabilities
- `food-frontend-app`: Eigenständige Vite/React-App für die Food-Domäne (Rezepte, Zutaten, Essensplan, Einkaufslisten, Norm-Portionen-Simulator)

### Modified Capabilities
<!-- Keine Requirement-Änderungen an bestehenden Specs — nur Deployment/Struktur ändert sich -->

## Impact

- **Frontend-Struktur**: Neues Verzeichnis `frontend-food/` auf Root-Ebene
- **Makefile**: Neues Target `food` und `install-food`
- **Vite-Config**: Proxy auf Backend-Port für API-Calls, eigener Dev-Port 5174
- **Auth**: Session-Cookie muss für beide Apps funktionieren (gleiche Domain lokal)
- **Betroffene Pages**: RecipeListPage, MyRecipesPage, CreateRecipePage, EditRecipePage, RecipeDetailPage, RecipeImportPage, RecipeCookingMode, IngredientListPage, IngredientCreatePage, IngredientDetailPage, MealPlanLandingPage, MealPlanListPage, MealPlanDetailPage, ShoppingListPage, ShoppingListDetailPage, NormPortionSimulatorPage, MealEventLandingPage
- **Betroffene Schemas**: `recipe.ts`, `ingredient.ts` (kopiert)
- **Betroffene API-Hooks**: `recipes.ts`, `ingredients.ts` (kopiert)
- **Keine Migrations nötig** — Backend bleibt unverändert
- **Keine Schema-Änderungen** — Pydantic/Zod bleiben gleich, werden nur dupliziert
