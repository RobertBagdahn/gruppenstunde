## 1. Routing & Page Setup

- [x] 1.1 Create `src/pages/tools/MealPlansPage.tsx` (empty shell with export)
- [x] 1.2 Create `src/pages/tools/CreateMealPlanPage.tsx` (empty shell with export)
- [x] 1.3 Create `src/pages/tools/MealPlanDetailPage.tsx` (empty shell with export)
- [x] 1.4 Register routes in `App.tsx`: `/meal-plans/app`, `/meal-plans/new`, `/meal-plans/:id`

## 2. Meal Plan List Page

- [x] 2.1 Implement MealPlansPage: fetch with `useMealPlans()`, display as card list with name, date, meals_count
- [x] 2.2 Add create button linking to `/meal-plans/new`
- [x] 2.3 Add click navigation to `/meal-plans/:id`

## 3. Create Meal Plan Page

- [x] 3.1 Implement CreateMealPlanPage with form: name, description, norm_portions, start_date, num_days
- [x] 3.2 Use `useCreateMealPlan()` mutation, navigate to detail on success

## 4. Meal Plan Detail Page

- [x] 4.1 Implement MealPlanDetailPage: fetch with `useMealPlan(id)`, show plan header with name/description
- [x] 4.2 Display meals grouped by day (derive days from meal start_datetime dates)
- [x] 4.3 Show meal items (recipe name, factor) within each meal card
- [x] 4.4 Add edit controls (add day, remove day, add meal item, remove meal item) gated by `can_edit`
- [x] 4.5 Add recipe search dialog for adding items (use `useRecipeSearch`)

## 5. Collaborator Section

- [x] 5.1 Create `src/components/meal-plan/CollaboratorSection.tsx` with list of collaborators + role display
- [x] 5.2 Add invite form (user search/ID input + role select) for owners/admins
- [x] 5.3 Add remove button with confirmation for each collaborator
- [x] 5.4 Add role change dropdown for each collaborator
- [x] 5.5 Integrate CollaboratorSection into MealPlanDetailPage

## 6. Polish

- [x] 6.1 Add loading skeletons and error states for all pages
- [x] 6.2 Mobile-responsive layout (320px minimum)
- [x] 6.3 Add delete meal plan action with ConfirmDialog
