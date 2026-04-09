import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import CreateHubPage from './pages/CreateHubPage';
import ProfilePage from './pages/ProfilePage';
import MyDashboardPage from './pages/MyDashboardPage';
import NamePage from './pages/NamePage';
import GruppenPage from './pages/GruppenPage';
import GroupDetailPage from './pages/GroupDetailPage';
import EinstellungenPage from './pages/EinstellungenPage';
import PlannerPage from './pages/PlannerPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import EventDashboardPage from './pages/EventDashboardPage';
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
import MealEventListPage from './pages/planning/MealEventListPage';
import MealEventDetailPage from './pages/planning/MealEventDetailPage';
import RecipeListPage from './pages/recipes/RecipeListPage';
import RecipeDetailPage from './pages/recipes/RecipeDetailPage';
import CreateRecipePage from './pages/recipes/CreateRecipePage';
import EditRecipePage from './pages/recipes/EditRecipePage';
import SessionListPage from './pages/sessions/SessionListPage';
import SessionDetailPage from './pages/sessions/SessionDetailPage';
import CreateSessionPage from './pages/sessions/CreateSessionPage';
import BlogListPage from './pages/blogs/BlogListPage';
import BlogDetailPage from './pages/blogs/BlogDetailPage';
import CreateBlogPage from './pages/blogs/CreateBlogPage';
import GameListPage from './pages/games/GameListPage';
import GameDetailPage from './pages/games/GameDetailPage';
import CreateGamePage from './pages/games/CreateGamePage';
import MaterialDetailPage from './pages/supplies/MaterialDetailPage';
import MaterialListPage from './pages/supplies/MaterialListPage';
import Layout from './components/Layout';

// Tool Landing Pages
import EventsLandingPage from './pages/tools/EventsLandingPage';
import MealEventLandingPage from './pages/tools/MealEventLandingPage';
import SessionPlannerLandingPage from './pages/tools/SessionPlannerLandingPage';
import PackingListLandingPage from './pages/tools/PackingListLandingPage';
import NormPortionSimulatorPage from './pages/tools/NormPortionSimulatorPage';
import ShoppingListPage from './pages/shopping/ShoppingListPage';
import ShoppingListDetailPage from './pages/shopping/ShoppingListDetailPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/material/:slug" element={<MaterialDetailPage />} />
        <Route path="/user/:userId" element={<UserProfilePage />} />
        <Route path="/create" element={<CreateHubPage />} />
        <Route path="/create/session" element={<CreateSessionPage />} />
        <Route path="/create/blog" element={<CreateBlogPage />} />
        <Route path="/create/game" element={<CreateGamePage />} />

        {/* Legacy redirects: old /idea/:slug → /sessions/:slug (best guess) */}
        <Route path="/idea/:slug" element={<Navigate to="/search" replace />} />
        <Route path="/create/:ideaType" element={<Navigate to="/create" replace />} />
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
        <Route path="/events/app/:slug" element={<EventDashboardPage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />

        {/* Tool: Essensplan */}
        <Route path="/meal-events" element={<MealEventLandingPage />} />
        <Route path="/meal-events/app" element={<MealEventListPage />} />
        <Route path="/meal-events/:id" element={<MealEventDetailPage />} />
        {/* Legacy redirect */}
        <Route path="/meal-plans/*" element={<Navigate to="/meal-events" replace />} />

        {/* Tool: Gruppenstundenplan */}
        <Route path="/session-planner" element={<SessionPlannerLandingPage />} />
        <Route path="/session-planner/app" element={<PlannerPage />} />

        {/* Content: Gruppenstunden (new content type) */}
        <Route path="/sessions" element={<SessionListPage />} />
        <Route path="/sessions/:slug" element={<SessionDetailPage />} />

        {/* Content: Blog */}
        <Route path="/blogs" element={<BlogListPage />} />
        <Route path="/blogs/:slug" element={<BlogDetailPage />} />

        {/* Content: Games */}
        <Route path="/games" element={<GameListPage />} />
        <Route path="/games/:slug" element={<GameDetailPage />} />

        {/* Tool: Packlisten */}
        <Route path="/packing-lists" element={<PackingListLandingPage />} />
        <Route path="/packing-lists/app" element={<PackingListsPage />} />
        <Route path="/packing-lists/:id" element={<PackingListDetailPage />} />

        {/* Tool: Einkaufslisten */}
        <Route path="/shopping-lists" element={<ShoppingListPage />} />
        <Route path="/shopping-lists/:id" element={<ShoppingListDetailPage />} />

        {/* Tool: Normportion-Simulator */}
        <Route path="/tools/norm-portion-simulator" element={<NormPortionSimulatorPage />} />

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

        {/* Materials */}
        <Route path="/materials" element={<MaterialListPage />} />
        <Route path="/materials/:slug" element={<MaterialDetailPage />} />

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
