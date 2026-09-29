/**
 * Guards save actions: runs them for logged-in users, otherwise stores the draft
 * and opens the login dialog with a contextual reason.
 */
import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import { saveDraft, withRestoreParam } from '@/hooks/useDraft';
import { useLoginPrompt } from '@/store/loginPromptStore';

interface GuardOptions<T> {
  reason: string;
  draftKey?: string;
  draftValue?: T;
}

export function useRequireLogin() {
  const { data: user } = useCurrentUser();
  const location = useLocation();
  const show = useLoginPrompt((state) => state.show);

  const guard = useCallback(
    <T,>(action: () => void, options: GuardOptions<T>) => {
      if (user) {
        action();
        return;
      }
      const currentPath = location.pathname + location.search;
      if (options.draftKey !== undefined && options.draftValue !== undefined) {
        saveDraft(options.draftKey, options.draftValue);
      }
      show({
        reason: options.reason,
        next: options.draftKey ? withRestoreParam(currentPath, options.draftKey) : currentPath,
      });
    },
    [user, location.pathname, location.search, show],
  );

  return { guard, isAuthenticated: !!user };
}
