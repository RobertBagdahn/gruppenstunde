import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useCase, useCases, useDecideCase } from '@/api/queries';
import { QueueItem } from '@/components/blocks/QueueItem';
import { RecommendationPanel } from '@/components/blocks/RecommendationPanel';
import { Page } from '@/components/layout/Page';
import { SidebarSection } from '@/components/layout/Sidebar';
import { SegmentControl } from '@/components/layout/SidebarControls';
import { QueryState } from '@/components/shared/QueryState';
import { QuestionPin } from '@/components/shared/QuestionPin';
import { formatInt } from '@/lib/format';
import { useUrlParam } from '@/lib/urlState';

/** Case inbox: data findings and anomalies are decided in the journal and never deleted (data-cases). */
export function CasesPage() {
  const [status, setStatus] = useUrlParam('status', 'open');
  const [chosen, setChosen] = useState<string | null>(null);
  const list = useCases({ status: status as 'open', page_size: 100 });
  const rows = list.data?.items ?? [];
  const selected = rows.find((r) => r.case_id === chosen) ?? rows[0] ?? null;
  const detail = useCase(selected?.case_id ?? null);
  const decide = useDecideCase(selected?.case_id ?? '');

  return (
    <Page
      area="Daten"
      page="Fall-Inbox"
      filters={
        <SidebarSection title="Status">
          <SegmentControl
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'open', label: 'Offen' },
              { value: 'decided', label: 'Entschieden' },
              { value: 'all', label: 'Alle' },
            ]}
          />
        </SidebarSection>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex">
          <QuestionPin pin="salesAnomaly" />
        </div>
      <div className="grid gap-4 min-[960px]:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)]">
        <QueryState error={list.error} isLoading={list.isLoading}>
          <section aria-label="Fälle" className="flex flex-col overflow-hidden rounded-lg border border-border bg-sunken">
            {rows.length === 0 && <p className="px-4 py-6 text-dense text-muted-foreground">Keine Fälle in dieser Ansicht.</p>}
            {rows.map((r) => (
              <QueueItem
                key={r.case_id}
                title={r.title}
                sku={r.sku}
                kind="Fall"
                context={r.decision ? `Entschieden: ${r.decision}` : r.kind_label}
                selected={selected?.case_id === r.case_id}
                onSelect={() => setChosen(r.case_id)}
              />
            ))}
          </section>
        </QueryState>

        <QueryState error={detail.error} isLoading={detail.isLoading}>
          {detail.data && (
            <section aria-label="Fall" className="flex min-w-0 flex-col gap-4">
              <header className="flex flex-col gap-1">
                <span className="text-label uppercase text-muted-foreground">{detail.data.kind_label}</span>
                <h2 className="m-0 text-section font-semibold text-foreground-strong">{detail.data.title}</h2>
                <Link to={`/products/${detail.data.sku}`} className="font-mono text-caption text-link">
                  {detail.data.sku}
                </Link>
              </header>
              <p className="m-0 text-dense text-foreground-2">{detail.data.summary}</p>
              <dl className="m-0 grid grid-cols-2 gap-2 text-dense text-foreground-2 min-[640px]:grid-cols-4">
                {detail.data.actual_qty !== null && (
                  <div>
                    <dt className="text-caption text-muted-foreground">Ist</dt>
                    <dd className="m-0 font-mono">{formatInt(detail.data.actual_qty)}</dd>
                  </div>
                )}
                {detail.data.expected_qty !== null && (
                  <div>
                    <dt className="text-caption text-muted-foreground">Üblich</dt>
                    <dd className="m-0 font-mono">{formatInt(detail.data.expected_qty)}</dd>
                  </div>
                )}
                {detail.data.question_id && (
                  <div>
                    <dt className="text-caption text-muted-foreground">Offene Frage</dt>
                    <dd className="m-0 font-mono">{detail.data.question_id}</dd>
                  </div>
                )}
              </dl>
              <RecommendationPanel
                title={detail.data.decision ? `Entschieden: ${detail.data.decision}` : 'Entscheidung treffen'}
                reason={detail.data.note ?? undefined}
                actions={detail.data.options.map((option, index) => ({
                  label: option,
                  shortcut: index === 0 ? '↵' : undefined,
                  primary: index === 0,
                  onClick: () => decide.mutate({ choice: option }),
                }))}
              />
              {decide.error && <p role="alert" className="m-0 text-dense text-warning-text">{decide.error.message}</p>}
            </section>
          )}
        </QueryState>
      </div>
      </div>
    </Page>
  );
}
