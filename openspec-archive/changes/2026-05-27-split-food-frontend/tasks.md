## 1. Scaffold Food App

- [x] 1.1 Create `frontend-food/` directory with `package.json` (copy dependencies from `frontend/package.json`, same versions)
- [x] 1.2 Copy config files: `vite.config.ts` (change port to 5174), `tailwind.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `components.json`, `index.html`
- [x] 1.3 Create `src/main.tsx` and `src/index.css` (copy from frontend)
- [x] 1.4 Copy `src/lib/` (utils.ts, cn helper)
- [x] 1.5 Copy `src/components/ui/` (all shadcn components)
- [x] 1.6 Run `npm install` to verify setup works

## 2. Auth & API Layer

- [x] 2.1 Copy `src/api/client.ts` (axios/fetch setup with credentials)
- [x] 2.2 Copy `src/api/recipes.ts` and `src/api/ingredients.ts`
- [x] 2.3 Copy meal-plan and shopping-list API hooks (if they exist)
- [x] 2.4 Copy `src/schemas/recipe.ts` and `src/schemas/ingredient.ts`
- [x] 2.5 Copy auth-related hooks and store (`src/store/`, `src/hooks/useAuth`)
- [x] 2.6 Copy auth pages (Login, Register) or create minimal auth redirect

## 3. Layout & Navigation

- [x] 3.1 Create `src/components/layout/FoodLayout.tsx` with food-only navigation (Rezepte, Zutaten, Essensplan, Einkaufslisten)
- [x] 3.2 Add mobile bottom nav with food-relevant items
- [x] 3.3 Add user profile dropdown (same as main app)

## 4. Pages Migration

- [x] 4.1 Copy recipe pages: RecipeListPage, MyRecipesPage, CreateRecipePage, EditRecipePage, RecipeDetailPage, RecipeImportPage, RecipeCookingMode
- [x] 4.2 Copy `src/components/recipe/` directory (recipe-specific components)
- [x] 4.3 Copy ingredient pages: IngredientListPage, IngredientCreatePage, IngredientDetailPage
- [x] 4.4 Copy meal plan pages: MealPlanLandingPage, MealPlanListPage, MealPlanDetailPage (from `src/pages/planning/`)
- [x] 4.5 Copy shopping list pages: ShoppingListPage, ShoppingListDetailPage
- [x] 4.6 Copy NormPortionSimulatorPage and MealEventLandingPage

## 5. Router Setup

- [x] 5.1 Create `src/App.tsx` with React Router containing all food routes
- [x] 5.2 Wire up FoodLayout as parent route
- [x] 5.3 Add auth-guarded routes where needed
- [x] 5.4 Verify all pages render without errors

## 6. Makefile & Dev Workflow

- [x] 6.1 Add `install-food` target to Makefile
- [x] 6.2 Add `food` target to Makefile (`cd frontend-food && npm run dev`)
- [x] 6.3 Test `make food` starts app on port 5174 and API proxy works

## 7. Clean Up Main App

- [x] 7.1 Remove food routes from `frontend/src/App.tsx` (recipes, ingredients, meal-plans, shopping-lists, norm-portion-simulator)
- [x] 7.2 Remove food navigation entries from `frontend/src/components/layout/Layout.tsx` (Rezepte, Zutaten, Essensplan, Einkaufslisten from menus)
- [x] 7.3 Remove food pages from `frontend/src/pages/` (recipes/, ingredients/, planning/Meal*, shopping/, tools/NormPortion*, tools/MealEvent*)
- [x] 7.4 Remove unused food API hooks and schemas from main app (if no other references)
- [x] 7.5 Verify main app still builds and runs without errors
