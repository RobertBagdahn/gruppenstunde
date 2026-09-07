import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { Loader2 } from 'lucide-react';

interface StaffGuardProps {
  children: React.ReactNode;
}

export default function StaffGuard({ children }: StaffGuardProps) {
  const { data: user, error, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-4xl text-muted-foreground" />
      </div>
    );
  }

  if (!user || (error instanceof Error && 'status' in error && error.status === 401)) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_staff) {
    return <Navigate to="/recipes" replace />;
  }

  return <>{children}</>;
}
