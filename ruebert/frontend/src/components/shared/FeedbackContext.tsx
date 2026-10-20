import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { FeedbackDialog, type FeedbackStart } from './FeedbackDialog';

export type FeedbackPageContext = { page: string; referenceDate: string | null };

type FeedbackApi = { open: (start?: FeedbackStart) => void };

const FeedbackCtx = createContext<FeedbackApi | null>(null);

/** Shared feedback state: one dialog per page, opened from the button or from a question pin. */
export function FeedbackProvider({ page, referenceDate, children }: FeedbackPageContext & { children: ReactNode }) {
  const location = useLocation();
  const [start, setStart] = useState<FeedbackStart | null>(null);
  const [open, setOpen] = useState(false);
  const api = useMemo<FeedbackApi>(
    () => ({
      open: (next) => {
        setStart(next ?? null);
        setOpen(true);
      },
    }),
    [],
  );
  const close = useCallback(() => setOpen(false), []);
  const sku = /^\/products\/([^/]+)$/.exec(location.pathname)?.[1] ?? null;

  return (
    <FeedbackCtx.Provider value={api}>
      {children}
      {open && (
        <FeedbackDialog
          start={start}
          onClose={close}
          context={{ route: location.pathname, page, sku, referenceDate }}
        />
      )}
    </FeedbackCtx.Provider>
  );
}

export function useFeedback(): FeedbackApi {
  const api = useContext(FeedbackCtx);
  if (!api) throw new Error('useFeedback needs a FeedbackProvider (every page provides one).');
  return api;
}
