import { useEffect, type ReactNode } from 'react';

import { shellStatusFrom, useStatus } from '@/api/status';
import { FeedbackButton } from '@/components/shared/FeedbackButton';
import { FeedbackProvider } from '@/components/shared/FeedbackContext';

import { AppLayout } from './AppLayout';

export type PageProps = {
  /** Breadcrumb area, e.g. "Arbeiten". */
  area: string;
  /** Breadcrumb page title; also used as document title. */
  page: string;
  filters?: ReactNode;
  filterTitle?: string;
  onResetFilters?: () => void;
  settings?: ReactNode;
  settingsTitle?: string;
  children: ReactNode;
};

/**
 * Renders a page inside the app shell and feeds the shell from `/api/status` (data pipeline, calendar
 * week, navigation counters). Pages only contribute their filters and view settings.
 */
export function Page({ area, page, filters, filterTitle, onResetFilters, settings, settingsTitle, children }: PageProps) {
  const status = shellStatusFrom(useStatus());

  useEffect(() => {
    document.title = `${page} · Rübert`;
  }, [page]);

  return (
    <FeedbackProvider page={page} referenceDate={status.referenceDate}>
      <AppLayout
        area={area}
        page={page}
        stages={status.stages}
        today={status.today}
        sidebar={{
          currentWeek: status.currentWeek,
          badges: status.badges,
          user: status.user,
          filterTitle,
          onResetFilters,
          settingsTitle,
        }}
        filters={filters}
        settings={settings}
      >
        {children}
      </AppLayout>
      <FeedbackButton />
    </FeedbackProvider>
  );
}
