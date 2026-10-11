/**
 * Layout route that only renders its child routes for staff users.
 * Anonymous visitors are sent to the login page (returning afterwards),
 * logged-in non-staff users see a "Keine Berechtigung" notice.
 * The admin API enforces permissions server-side; this guard only keeps the UI hidden.
 */
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import ErrorDisplay from '@/components/ErrorDisplay';

export default function StaffRoute() {
  const { data: user, isLoading, isError, error, refetch } = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="container py-8" aria-busy="true" aria-label="Seite wird geladen">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-muted" />
          <div className="h-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorDisplay error={error} onRetry={() => void refetch()} />;
  }

  if (!user) {
    const next = location.pathname + location.search;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (!user.is_staff) {
    return (
      <ErrorDisplay
        error={null}
        title="Keine Berechtigung"
        description="Dieser Bereich ist nur für das Inspi-Team zugänglich."
        icon="lock"
        onBack={() => navigate('/')}
        backLabel="Zur Startseite"
      />
    );
  }

  return <Outlet />;
}
