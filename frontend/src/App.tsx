import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import IdeaPage from './pages/IdeaPage';
import MaterialPage from './pages/MaterialPage';
import NewIdeaPage from './pages/NewIdeaPage';
import CreateHubPage from './pages/CreateHubPage';
import ProfilePage from './pages/ProfilePage';
import MyDashboardPage from './pages/MyDashboardPage';
import NamePage from './pages/NamePage';
import GruppenPage from './pages/GruppenPage';
import GroupDetailPage from './pages/GroupDetailPage';
import EinstellungenPage from './pages/EinstellungenPage';
import PlannerPage from './pages/PlannerPage';
import EventsPage from './pages/EventsPage';
import NewEventPage from './pages/NewEventPage';
import AdminPage from './pages/AdminPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import IdeaOfTheWeekPage from './pages/IdeaOfTheWeekPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AboutPage from './pages/AboutPage';
import ImpressumPage from './pages/ImpressumPage';
import DatenschutzPage from './pages/DatenschutzPage';
import UserProfilePage from './pages/UserProfilePage';
import PersonsPage from './pages/PersonsPage';
import PackingListsPage from './pages/PackingListsPage';
import PackingListDetailPage from './pages/PackingListDetailPage';
import IngredientListPage from './pages/ingredients/IngredientListPage';
import IngredientDetailPage from './pages/ingredients/IngredientDetailPage';
import IngredientCreatePage from './pages/ingredients/IngredientCreatePage';
import MealPlanListPage from './pages/planning/MealPlanListPage';
import MealPlanDetailPage from './pages/planning/MealPlanDetailPage';
import RecipeListPage from './pages/recipes/RecipeListPage';
import RecipeDetailPage from './pages/recipes/RecipeDetailPage';
import CreateRecipePage from './pages/recipes/CreateRecipePage';
import EditRecipePage from './pages/recipes/EditRecipePage';
import Layout from './components/Layout';

// Tool Landing Pages
import EventsLandingPage from './pages/tools/EventsLandingPage';
import MealPlanLandingPage from './pages/tools/MealPlanLandingPage';
import SessionPlannerLandingPage from './pages/tools/SessionPlannerLandingPage';
import PackingListLandingPage from './pages/tools/PackingListLandingPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/idea/:slug" element={<IdeaPage />} />
        <Route path="/material/:slug" element={<MaterialPage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/create" element={<CreateHubPage />} />
        <Route path="/create/:ideaType" element={<NewIdeaPage />} />
        <Route path="/recipes" element={<RecipeListPage />} />
        <Route path="/recipes/new" element={<CreateRecipePage />} />
        <Route path="/recipes/:slug/edit" element={<EditRecipePage />} />
        <Route path="/recipes/:slug" element={<RecipeDetailPage />} />
        <Route path="/my-dashboard" element={<MyDashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/name" element={<NamePage />} />
        <Route path="/profile/name/:userId" element={<NamePage />} />
        <Route path="/profile/groups" element={<GruppenPage />} />
        <Route path="/groups/:slug" element={<GroupDetailPage />} />
        <Route path="/profile/settings" element={<EinstellungenPage />} />
        <Route path="/profile/persons" element={<PersonsPage />} />

        {/* Tool: Events / Veranstaltungen */}
        <Route path="/events" element={<EventsLandingPage />} />
        <Route path="/events/app" element={<EventsPage />} />
        <Route path="/events/app/new" element={<NewEventPage />} />

        {/* Tool: Essensplan */}
        <Route path="/meal-plans" element={<MealPlanLandingPage />} />
        <Route path="/meal-plans/app" element={<MealPlanListPage />} />
        <Route path="/meal-plans/:id" element={<MealPlanDetailPage />} />

        {/* Tool: Gruppenstundenplan */}
        <Route path="/session-planner" element={<SessionPlannerLandingPage />} />
        <Route path="/session-planner/app" element={<PlannerPage />} />

        {/* Tool: Packlisten */}
        <Route path="/packing-lists" element={<PackingListLandingPage />} />
        <Route path="/packing-lists/app" element={<PackingListsPage />} />
        <Route path="/packing-lists/:id" element={<PackingListDetailPage />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminPage />}>
          <Route index element={null} />
          <Route path=":section" element={null} />
        </Route>
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
        <Route path="/admin/idea-of-the-week" element={<IdeaOfTheWeekPage />} />

        {/* Ingredients */}
        <Route path="/ingredients" element={<IngredientListPage />} />
        <Route path="/ingredients/new" element={<IngredientCreatePage />} />
        <Route path="/ingredients/:slug" element={<IngredientDetailPage />} />

        {/* Auth & Static */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/imprint" element={<ImpressumPage />} />
        <Route path="/privacy" element={<DatenschutzPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
