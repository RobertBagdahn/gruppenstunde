/**
 * usePermissions — Unified permission hook.
 * Derives permission flags from the authenticated user (is_staff / is_superuser)
 * and provides helper values for permission checks throughout the UI.
 */
import { useCurrentUser } from '@/api/auth';

export function usePermissions() {
  const { data: user, isLoading } = useCurrentUser();

  const isAuthenticated = !!user;
  const isStaff = !!user?.is_staff;
  const isAdmin = !!user?.is_superuser;
  const role: 'admin' | 'staff' | 'user' = isAdmin ? 'admin' : isStaff ? 'staff' : 'user';
  const isLoadingPermissions = isLoading;

  return {
    isAuthenticated,
    role,
    isStaff,
    isAdmin,
    isLoading: isLoadingPermissions,
  };
}
