/**
 * Routes. Pages load on demand (food-loading-states): the layout and its
 * navigation stay visible while a page's code loads, and each page is
 * wrapped in a RouteBoundary inside the layout.
 */
import { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageSkeleton } from './components/ui/skeleton';
import FoodLayout from './components/layout/FoodLayout';
import StaffGuard from './components/admin/StaffGuard';
import { lazyPage } from './lib/lazyPage';

const HomePage = lazyPage(() => import('./pages/HomePage'));
const RecipeListPage = lazyPage(() => import('./pages/recipes/RecipeListPage'));
const MyRecipesPage = lazyPage(() => import('./pages/recipes/MyRecipesPage'));
const RecipeFoldersPage = lazyPage(() => import('./pages/recipes/RecipeFoldersPage'));
const CreateRecipePage = lazyPage(() => import('./pages/recipes/CreateRecipePage'));
const EditRecipePage = lazyPage(() => import('./pages/recipes/EditRecipePage'));
const RecipeDetailPage = lazyPage(() => import('./pages/recipes/RecipeDetailPage'));
const IngredientListPage = lazyPage(() => import('./pages/ingredients/IngredientListPage'));
const CreateIngredientPage = lazyPage(() => import('./pages/ingredients/CreateIngredientPage'));
const IngredientEditPage = lazyPage(() => import('./pages/ingredients/IngredientEditPage'));
const IngredientDetailPage = lazyPage(() => import('./pages/ingredients/IngredientDetailPage'));
const IngredientStatisticsPage = lazyPage(() => import('./pages/ingredients/statistics/IngredientStatisticsPage'));
const MealPlanLandingPage = lazyPage(() => import('./pages/tools/MealEventLandingPage'));
const MealPlanListPage = lazyPage(() => import('./pages/planning/MealEventListPage'));
const MealPlanDetailPage = lazyPage(() => import('./pages/planning/MealEventDetailPage'));
const RefMealEditorPage = lazyPage(() => import('./pages/planning/RefMealEditorPage'));
const BreakfastWizardPage = lazyPage(() => import('./pages/planning/breakfast/BreakfastWizardPage'));
const MealPlanWizardPage = lazyPage(() => import('./pages/planning/wizard/MealPlanWizardPage'));
const ShoppingListPage = lazyPage(() => import('./pages/shopping/ShoppingListPage'));
const ShoppingListDetailPage = lazyPage(() => import('./pages/shopping/ShoppingListDetailPage'));
const NormPortionSimulatorPage = lazyPage(() => import('./pages/tools/NormPortionSimulatorPage'));
const AdminPage = lazyPage(() => import('./pages/admin/AdminPage'));
const TagDetailPage = lazyPage(() => import('./pages/admin/TagDetailPage'));
const DataQualityPage = lazyPage(() => import('./pages/admin/DataQualityPage'));
const DataDistributionsPage = lazyPage(() => import('./pages/DataDistributionsPage'));
const StyleguidePage = lazyPage(() => import('./pages/StyleguidePage'));
const ImpressumPage = lazyPage(() => import('./pages/legal/ImpressumPage'));
const DatenschutzPage = lazyPage(() => import('./pages/legal/DatenschutzPage'));
const ProfilePage = lazyPage(() => import('./pages/profile/ProfilePage'));
const MyProfilePage = lazyPage(() => import('./pages/profile/MyProfilePage'));
const AccountPage = lazyPage(() => import('./pages/profile/AccountPage'));
const NotFoundPage = lazyPage(() => import('./pages/NotFoundPage'));
const LoginPage = lazyPage(() => import('./pages/LoginPage'));
const RegisterPage = lazyPage(() => import('./pages/RegisterPage'));

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
    <Routes>
      {/* Auth routes (no layout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Main layout routes */}
      <Route element={<FoodLayout />}>
        {/* Home */}
        <Route path="/" element={<HomePage />} />

        {/* Recipes */}
        <Route path="/recipes" element={<RecipeListPage />} />
        <Route path="/recipes/my-recipes" element={<MyRecipesPage />} />
        <Route path="/recipes/folders" element={<RecipeFoldersPage />} />
        <Route path="/recipes/new" element={<CreateRecipePage />} />
        <Route path="/recipes/:slug/edit" element={<EditRecipePage />} />
        <Route path="/recipes/:slug" element={<RecipeDetailPage />} />

        {/* Ingredients */}
        <Route path="/ingredients" element={<IngredientListPage />} />
        <Route path="/ingredients/new" element={<CreateIngredientPage />} />
        <Route path="/ingredients/:slug/edit" element={<IngredientEditPage />} />
        <Route path="/ingredients/:slug" element={<IngredientDetailPage />} />
        <Route path="/ingredients/statistics/:tab?" element={<IngredientStatisticsPage />} />

        {/* Meal Plans */}
        <Route path="/meal-plans" element={<MealPlanLandingPage />} />
        <Route path="/meal-plans/new" element={<MealPlanWizardPage />} />
        <Route path="/meal-plans/app" element={<MealPlanListPage />} />
        <Route path="/meal-plans/:id/ref-meals/:mealType" element={<RefMealEditorPage />} />
        <Route path="/meal-plans/:id/ref-meals/breakfast/wizard" element={<BreakfastWizardPage />} />
        <Route path="/meal-plans/:id/meals/:mealId/breakfast-wizard" element={<BreakfastWizardPage />} />
        <Route path="/meal-plans/:id/breakfast/wizard" element={<BreakfastWizardPage />} />
        <Route path="/meal-plans/:id/*" element={<MealPlanDetailPage />} />
        <Route path="/meal-events/*" element={<Navigate to="/meal-plans" replace />} />

        {/* Shopping Lists */}
        <Route path="/shopping-lists" element={<ShoppingListPage />} />
        <Route path="/shopping-lists/:id" element={<ShoppingListDetailPage />} />

        {/* Tools */}
        <Route path="/tools/norm-portion-simulator" element={<NormPortionSimulatorPage />} />

        {/* Profile */}
        <Route path="/profile" element={<MyProfilePage />} />
        <Route path="/profile/account" element={<AccountPage />} />
        <Route path="/profile/name/:slug" element={<ProfilePage />} />

        {/* Legal */}
        <Route path="/privacy" element={<DatenschutzPage />} />
        <Route path="/imprint" element={<ImpressumPage />} />

        {/* Styleguide */}
        <Route path="/styleguide" element={<StyleguidePage />} />

        {/* Admin */}
        <Route path="/admin" element={<StaffGuard><AdminPage /></StaffGuard>} />
        <Route path="/admin/tag/:id" element={<StaffGuard><TagDetailPage /></StaffGuard>} />
        <Route path="/admin/:section" element={<StaffGuard><AdminPage /></StaffGuard>} />
        <Route path="/admin/data-quality" element={<StaffGuard><DataQualityPage /></StaffGuard>} />
        <Route path="/admin/data-quality/:section" element={<StaffGuard><DataQualityPage /></StaffGuard>} />

        {/* Data Quality Distributions (public) */}
        <Route path="/data-quality/distributions" element={<DataDistributionsPage />} />

        {/* Unknown URLs */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
