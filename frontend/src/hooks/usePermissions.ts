/**
 * usePermissions — Unified permission hook.
 * Reads the user role from useCurrentUser() and provides
 * helper functions for permission checks throughout the UI.
 */
import { useCurrentUser } from '@/api/auth';

export function usePermissions() {
  const { data: user, isLoading } = useCurrentUser();

  const isAuthenticated = !!user;
  const role = user?.role ?? 'user';
  const isStaff = role === 'staff' || role === 'admin';
  const isAdmin = role === 'admin';
  const isLoadingPermissions = isLoading;

  return {
    isAuthenticated,
    role,
    isStaff,
    isAdmin,
    isLoading: isLoadingPermissions,
  };
}
