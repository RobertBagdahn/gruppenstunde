import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';

interface StaffGuardProps {
  children: React.ReactNode;
}

export default function StaffGuard({ children }: StaffGuardProps) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-muted-foreground">
          progress_activity
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_staff) {
    return <Navigate to="/recipes" replace />;
  }

  return <>{children}</>;
}
