import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/planning/planner', icon: 'calendar_month', label: 'Quartalsplaner' },
  { to: '/planning/events', icon: 'celebration', label: 'Events' },
  { to: '/planning/idea-of-the-week', icon: 'star', label: 'Idee der Woche', staffOnly: true },
];

export default function PlanungPage() {
  const { data: user } = useCurrentUser();
  const location = useLocation();

  if (location.pathname === '/planning') {
    return <Navigate to="/planning/planner" replace />;
  }

  const visibleTabs = tabs.filter((tab) => !tab.staffOnly || user?.is_staff);

  return (
    <div className="container py-4 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">Planung</h1>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 border-b mb-4 sm:mb-6 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px',
              location.pathname === tab.to
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            )}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>

      {/* Tab Content */}
      <Outlet />
    </div>
  );
}
