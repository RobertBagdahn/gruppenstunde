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
import PlanungPage from './pages/PlanungPage';
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
import Layout from './components/Layout';

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
        <Route path="/my-dashboard" element={<MyDashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/name" element={<NamePage />} />
        <Route path="/profile/name/:userId" element={<NamePage />} />
        <Route path="/profile/groups" element={<GruppenPage />} />
        <Route path="/groups/:slug" element={<GroupDetailPage />} />
        <Route path="/profile/settings" element={<EinstellungenPage />} />
        <Route path="/profile/persons" element={<PersonsPage />} />
        <Route path="/planning" element={<PlanungPage />}>
          <Route path="planner" element={<PlannerPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/new" element={<NewEventPage />} />
          <Route path="idea-of-the-week" element={<IdeaOfTheWeekPage />} />
        </Route>
        <Route path="/admin" element={<AdminPage />}>
          <Route index element={null} />
          <Route path=":section" element={null} />
        </Route>
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
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
