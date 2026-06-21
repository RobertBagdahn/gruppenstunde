import { useCurrentUser } from '@/api/auth';

export type UserRole = 'user' | 'staff';

export function usePermissions() {
  const { data: user } = useCurrentUser();
  const isAuthenticated = !!user;
  const isStaffOrAdmin = user?.is_staff === true;

  return {
    role: (user?.is_staff ? 'staff' : 'user') as UserRole,
    isAuthenticated,
    isStaffOrAdmin,
    isAdmin: false,
  };
}
