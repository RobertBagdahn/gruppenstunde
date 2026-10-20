import type { ReactNode } from 'react';

import { Sidebar, type SidebarProps } from './Sidebar';
import { Topbar, type PipelineStage } from './Topbar';

export type AppLayoutProps = {
  /** Breadcrumb area, e.g. "Arbeiten", "Analyse", "Daten". */
  area: string;
  /** Breadcrumb page title. */
  page: string;
  /** Data freshness stages for the top bar. */
  stages: PipelineStage[];
  today: string;
  sidebar: Omit<SidebarProps, 'filters' | 'settings'>;
  /** Page filters rendered in the sidebar (never in the content area). */
  filters?: ReactNode;
  /** Page view settings rendered in the sidebar. */
  settings?: ReactNode;
  children: ReactNode;
};

/**
 * App shell of layout D: sidebar (navigation, filters, view settings) and top bar (breadcrumb, data
 * freshness). On narrow screens the sidebar wraps above the content instead of overlaying it.
 */
export function AppLayout({ area, page, stages, today, sidebar, filters, settings, children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-wrap items-stretch bg-background font-sans text-body text-foreground">
      <Sidebar {...sidebar} filters={filters} settings={settings} />
      <div className="flex min-w-0 flex-[999_1_640px] flex-col">
        <Topbar area={area} page={page} stages={stages} today={today} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
