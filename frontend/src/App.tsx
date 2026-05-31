import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import CreateHubPage from './pages/CreateHubPage';
import ProfilePage from './pages/ProfilePage';
import MyDashboardPage from './pages/MyDashboardPage';
import GruppenPage from './pages/GruppenPage';
import GroupDetailPage from './pages/GroupDetailPage';
import GroupCorporateIdentityPage from './pages/GroupCorporateIdentityPage';
import PlannerPage from './pages/PlannerPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import EventDashboardPage from './pages/EventDashboardPage';
import NewEventPage from './pages/NewEventPage';
import GuestRegistrationPage from './pages/GuestRegistrationPage';
import QRCodePage from './pages/QRCodePage';
import ParentPage from './pages/ParentPage';
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
import PackingListSharePage from './pages/PackingListSharePage';
import PackingListWizardPage from './pages/PackingListWizardPage';
import PackingListLandingPage from './pages/tools/PackingListLandingPage';
import PrivacyPage from './pages/profile/PrivacyPage';
import CreateSessionPage from './pages/sessions/CreateSessionPage';
import CreateBlogPage from './pages/blogs/CreateBlogPage';
import CreateGamePage from './pages/games/CreateGamePage';
import EventsLandingPage from './pages/tools/EventsLandingPage';
import SessionPlannerLandingPage from './pages/tools/SessionPlannerLandingPage';

import SessionListPage from './pages/sessions/SessionListPage';
import SessionDetailPage from './pages/sessions/SessionDetailPage';
import BlogListPage from './pages/blogs/BlogListPage';
import BlogDetailPage from './pages/blogs/BlogDetailPage';
import GameListPage from './pages/games/GameListPage';
import GameDetailPage from './pages/games/GameDetailPage';
import MaterialListPage from './pages/supplies/MaterialListPage';
import MaterialDetailPage from './pages/supplies/MaterialDetailPage';


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

        {/* Legacy redirects: old /idea/:slug and /create/:type → redirect */}
        <Route path="/idea/:slug" element={<Navigate to="/search" replace />} />
        <Route path="/create/:contentType" element={<Navigate to="/create" replace />} />
        <Route path="/my-dashboard" element={<MyDashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/name" element={<Navigate to="/profile" replace />} />
        <Route path="/profile/name/:userId" element={<Navigate to="/profile" replace />} />
        <Route path="/profile/groups" element={<GruppenPage />} />
        <Route path="/groups/:slug" element={<GroupDetailPage />} />
        <Route path="/groups/:slug/settings/corporate-identity" element={<GroupCorporateIdentityPage />} />
        <Route path="/profile/settings" element={<Navigate to="/profile" replace />} />
        <Route path="/profile/privacy" element={<PrivacyPage />} />
        <Route path="/profile/persons" element={<PersonsPage />} />

        {/* Tool: Events / Veranstaltungen */}
        <Route path="/events" element={<EventsLandingPage />} />
        <Route path="/events/app" element={<EventsPage />} />
        <Route path="/events/app/new" element={<NewEventPage />} />
        <Route path="/events/app/persons" element={<PersonsPage />} />
        <Route path="/events/app/:slug/qr-code" element={<QRCodePage />} />
        <Route path="/events/app/:slug" element={<EventDashboardPage />} />
        <Route path="/events/:slug/register" element={<GuestRegistrationPage />} />
        <Route path="/events/:slug/parent/:token" element={<ParentPage />} />
        <Route path="/events/:slug" element={<EventDetailPage />} />

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
        <Route path="/packing-lists/new" element={<PackingListWizardPage />} />
        <Route path="/packing-lists/shared/:token" element={<PackingListSharePage />} />
        <Route path="/packing-lists/:id" element={<PackingListDetailPage />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminPage />}>
          <Route index element={null} />
          <Route path=":section" element={null} />
        </Route>
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
        <Route path="/admin/idea-of-the-week" element={<IdeaOfTheWeekPage />} />

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
