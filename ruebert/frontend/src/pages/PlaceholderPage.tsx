import { Construction } from 'lucide-react';

import { Page } from '@/components/layout/Page';

/** Honest stand-in for a route whose content is built in a later change. */
export function PlaceholderPage({ area, page }: { area: string; page: string }) {
  return (
    <Page area={area} page={page}>
      <div className="p-6">
        <section className="flex max-w-xl items-start gap-3 rounded-lg border border-border bg-panel p-5">
          <Construction size={20} className="mt-0.5 flex-none text-muted-foreground" aria-hidden />
          <div className="flex flex-col gap-1">
            <h1 className="m-0 text-section font-semibold text-foreground-strong">{page}</h1>
            <p className="m-0 text-body text-foreground-2">
              Diese Seite entsteht im Change <span className="font-mono">ruebert-demo-prototype</span>. Die Shell mit
              Navigation, Datenfluss und Sidebar ist bereits aktiv.
            </p>
          </div>
        </section>
      </div>
    </Page>
  );
}
