## 1. Backend – Dashboard API

- [x] 1.1 Create Pydantic schema `FoodDashboardOut` in `backend/recipe/schemas/dashboard.py`
- [x] 1.2 Create API endpoint `GET /api/food/dashboard/` in `backend/recipe/api/dashboard.py` with COUNT queries for recipes, ingredients, meal plans, shopping lists + insights aggregation
- [x] 1.3 Register dashboard router in `backend/recipe/api/__init__.py`
- [x] 1.4 Verify endpoint works via manual test (`uv run python manage.py runserver` + curl)

## 2. Frontend – Schema & API Hook

- [x] 2.1 Create Zod schema `src/schemas/dashboard.ts` matching `FoodDashboardOut` 1:1
- [x] 2.2 Create TanStack Query hook `src/api/dashboard.ts` with `useFoodDashboard()` (staleTime: 5min)

## 3. Frontend – Homepage Component

- [x] 3.1 Create `src/pages/HomePage.tsx` with hero section, stat cards (4-column grid), module feature cards (2-column grid), and insights section
- [x] 3.2 Include links to: Rezepte (`/recipes`), Zutaten (`/ingredients`), Essensplan (`/meal-plans/app`), Einkaufslisten (`/shopping-lists`), Norm-Portion-Simulator (`/tools/norm-portion-simulator`)
- [x] 3.3 Add loading skeletons for stat cards while API is pending
- [x] 3.4 Handle empty/null insights gracefully (hide items with no data)

## 4. Frontend – Routing & Navigation

- [x] 4.1 Update `src/App.tsx`: Replace `<Navigate to="/recipes">` with `<HomePage />` for route `/`
- [x] 4.2 Update `src/components/layout/FoodLayout.tsx`: Change "Essensplan" desktop nav link from `/meal-plans` to `/meal-plans/app`
- [x] 4.3 Update mobile bottom nav "Start" to navigate to `/` (homepage)
- [x] 4.4 Add Norm-Portion-Simulator link on MealEventListPage (`/meal-plans/app`)

## 5. Verification

- [x] 5.1 Test homepage renders on mobile (320px) and desktop with correct grid layouts
- [x] 5.2 Verify all navigation links work correctly (Essensplan → /meal-plans/app, Start → homepage)
