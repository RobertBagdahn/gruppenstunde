import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { PageSkeleton } from '@/components/ui/skeleton';

interface StaffGuardProps {
  children: React.ReactNode;
}

export default function StaffGuard({ children }: StaffGuardProps) {
  const { data: user, error, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <PageSkeleton label="Seite wird geladen" />
    );
  }

  if (!user || (error instanceof Error && 'status' in error && error.status === 401)) {
    return <Navigate to={`/login?next=${encodeURIComponent(window.location.pathname)}`} replace />;
  }

  if (!user.is_staff) {
    return <Navigate to="/recipes" replace />;
  }

  return <>{children}</>;
}
