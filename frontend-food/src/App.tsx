import { Routes, Route, Navigate } from 'react-router-dom';
import FoodLayout from './components/layout/FoodLayout';

// Home
import HomePage from './pages/HomePage';

// Recipe pages
import RecipeListPage from './pages/recipes/RecipeListPage';
import MyRecipesPage from './pages/recipes/MyRecipesPage';
import RecipeFoldersPage from './pages/recipes/RecipeFoldersPage';
import CreateRecipePage from './pages/recipes/CreateRecipePage';
import EditRecipePage from './pages/recipes/EditRecipePage';
import RecipeDetailPage from './pages/recipes/RecipeDetailPage';
import RecipeImportPage from './pages/recipes/RecipeImportPage';

// Ingredient pages
import IngredientListPage from './pages/ingredients/IngredientListPage';
import CreateIngredientPage from './pages/ingredients/CreateIngredientPage';
import IngredientEditPage from './pages/ingredients/IngredientEditPage';
import IngredientDetailPage from './pages/ingredients/IngredientDetailPage';
import IngredientStatisticsPage from './pages/ingredients/statistics/IngredientStatisticsPage';

// Meal plan pages
import MealPlanLandingPage from './pages/tools/MealEventLandingPage';
import MealPlanListPage from './pages/planning/MealEventListPage';
import MealPlanDetailPage from './pages/planning/MealEventDetailPage';
import MealPlanPrintPage from './pages/planning/MealPlanPrintPage';
import CookingSchedulePage from './pages/planning/CookingSchedulePage';
import CookingSchedulePrintPage from './pages/planning/CookingSchedulePrintPage';
import CookingScheduleKitchenPage from './pages/planning/CookingScheduleKitchenPage';
import RefMealEditorPage from './pages/planning/RefMealEditorPage';
import BreakfastWizardPage from './pages/planning/breakfast/BreakfastWizardPage';
import MealPlanWizardPage from './pages/planning/wizard/MealPlanWizardPage';

// Print pages (no layout)
import RecipePrintPage from './pages/recipes/RecipePrintPage';

// Shopping list pages
import ShoppingListPage from './pages/shopping/ShoppingListPage';
import ShoppingListDetailPage from './pages/shopping/ShoppingListDetailPage';

// Tools
import NormPortionSimulatorPage from './pages/tools/NormPortionSimulatorPage';

// Admin
import AdminPage from './pages/admin/AdminPage';
import DataQualityPage from './pages/admin/DataQualityPage';
import StaffGuard from './components/admin/StaffGuard';

// Data Quality (public)
import DataDistributionsPage from './pages/DataDistributionsPage';

// Styleguide
import StyleguidePage from './pages/StyleguidePage';

// Legal
import ImpressumPage from './pages/legal/ImpressumPage';
import DatenschutzPage from './pages/legal/DatenschutzPage';

// Profile
import ProfilePage from './pages/profile/ProfilePage';
import MyProfilePage from './pages/profile/MyProfilePage';

// Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

export default function App() {
  return (
    <Routes>
      {/* Auth routes (no layout) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Print routes (no layout — standalone druckoptimierte Ansichten) */}
      <Route path="/recipes/:slug/print" element={<RecipePrintPage />} />
      <Route path="/meal-plans/:id/print" element={<MealPlanPrintPage />} />
      <Route path="/meal-plans/:id/cooking-schedule/print" element={<CookingSchedulePrintPage />} />

      {/* Main layout routes */}
      <Route element={<FoodLayout />}>
        {/* Home */}
        <Route path="/" element={<HomePage />} />

        {/* Recipes */}
        <Route path="/recipes" element={<RecipeListPage />} />
        <Route path="/recipes/my-recipes" element={<MyRecipesPage />} />
        <Route path="/recipes/folders" element={<RecipeFoldersPage />} />
        <Route path="/recipes/import" element={<RecipeImportPage />} />
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
        <Route path="/meal-plans/:id/*" element={<MealPlanDetailPage />} />
        <Route path="/meal-plans/:id/cooking-schedule" element={<CookingSchedulePage />} />
        <Route path="/meal-plans/:id/cooking-schedule/kitchen" element={<CookingScheduleKitchenPage />} />
        <Route path="/meal-plans/:id/ref-meals/:mealType" element={<RefMealEditorPage />} />
        <Route path="/meal-plans/:id/ref-meals/breakfast/wizard" element={<BreakfastWizardPage />} />
        <Route path="/meal-plans/:id/meals/:mealId/breakfast-wizard" element={<BreakfastWizardPage />} />
        <Route path="/meal-events/*" element={<Navigate to="/meal-plans" replace />} />

        {/* Shopping Lists */}
        <Route path="/shopping-lists" element={<ShoppingListPage />} />
        <Route path="/shopping-lists/:id" element={<ShoppingListDetailPage />} />

        {/* Tools */}
        <Route path="/tools/norm-portion-simulator" element={<NormPortionSimulatorPage />} />

        {/* Profile */}
        <Route path="/profile" element={<MyProfilePage />} />
        <Route path="/profile/name/:slug" element={<ProfilePage />} />

        {/* Legal */}
        <Route path="/privacy" element={<DatenschutzPage />} />
        <Route path="/imprint" element={<ImpressumPage />} />

        {/* Styleguide */}
        <Route path="/styleguide" element={<StyleguidePage />} />

        {/* Admin */}
        <Route path="/admin" element={<StaffGuard><AdminPage /></StaffGuard>} />
        <Route path="/admin/:section" element={<StaffGuard><AdminPage /></StaffGuard>} />
        <Route path="/admin/data-quality" element={<StaffGuard><DataQualityPage /></StaffGuard>} />
        <Route path="/admin/data-quality/:section" element={<StaffGuard><DataQualityPage /></StaffGuard>} />

        {/* Data Quality Distributions (public) */}
        <Route path="/data-quality/distributions" element={<DataDistributionsPage />} />
      </Route>
    </Routes>
  );
}
