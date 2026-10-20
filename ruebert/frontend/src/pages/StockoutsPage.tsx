import { useDecidePhase, usePhases } from '@/api/queries';
import { DataTable, type Column } from '@/components/blocks/DataTable';
import { Page } from '@/components/layout/Page';
import { SidebarSection } from '@/components/layout/Sidebar';
import { SegmentControl } from '@/components/layout/SidebarControls';
import { QueryState } from '@/components/shared/QueryState';
import { QuestionPin } from '@/components/shared/QuestionPin';
import { formatInt } from '@/lib/format';
import { useUrlParam } from '@/lib/urlState';

type Phase = {
  phase_id: string;
  sku: string;
  start_date: string;
  end_date: string | null;
  duration_days: number;
  shipped_during: number;
  status: 'offen' | 'bestätigt' | 'abgelehnt';
  question_id: string;
};

/** Stock-out phases are hypotheses from the bookings until a person confirms them (Q-101). */
export function StockoutsPage() {
  const [status, setStatus] = useUrlParam('status', 'offen');
  const query = usePhases({ status: status as 'offen', page_size: 100 });

  const columns: Column<Phase>[] = [
    { key: 'sku', header: 'Artikel', width: '112px', render: (p) => p.sku },
    { key: 'start', header: 'Von', width: '112px', render: (p) => p.start_date },
    { key: 'end', header: 'Bis', width: '112px', render: (p) => p.end_date ?? 'noch offen' },
    { key: 'days', header: 'Tage', width: '72px', align: 'right', render: (p) => formatInt(p.duration_days) },
    { key: 'shipped', header: 'Versand in Phase', width: '128px', align: 'right', render: (p) => formatInt(p.shipped_during) },
    { key: 'status', header: 'Status', width: '112px', render: (p) => p.status },
    {
      key: 'action',
      header: 'Entscheidung',
      width: '200px',
      render: (p) => (p.status === 'offen' ? <PhaseActions phaseId={p.phase_id} /> : <span className="text-caption text-muted-foreground">entschieden</span>),
    },
  ];

  return (
    <Page
      area="Daten"
      page="OOS-Monitor"
      filters={
        <SidebarSection title="Status">
          <SegmentControl
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'offen', label: 'Offen' },
              { value: 'bestätigt', label: 'Bestätigt' },
              { value: 'abgelehnt', label: 'Abgelehnt' },
            ]}
          />
        </SidebarSection>
      }
    >
      <div className="flex flex-col gap-4 p-6">
        <p className="m-0 text-dense text-foreground-2">
          Ausverkaufsphasen aus den Buchungen sind Hypothesen. Bestätigen oder ablehnen schreibt ins Journal.
        </p>
        <QuestionPin pin="stockoutPhase" />
        <QueryState error={query.error} isLoading={query.isLoading}>
          {query.data && <DataTable caption="Ausverkaufsphasen" rows={query.data.items} rowKey={(p) => p.phase_id} columns={columns} />}
        </QueryState>
      </div>
    </Page>
  );
}

/** Confirm or reject one phase; the mutation is bound to this row's phase id. */
function PhaseActions({ phaseId }: { phaseId: string }) {
  const decide = useDecidePhase(phaseId);
  return (
    <span className="flex flex-wrap gap-2">
      <button type="button" onClick={() => decide.mutate({ choice: 'bestätigen' })} className="h-7 rounded-md border border-border-strong px-2 text-caption">
        Bestätigen
      </button>
      <button type="button" onClick={() => decide.mutate({ choice: 'ablehnen' })} className="h-7 rounded-md border border-border-strong px-2 text-caption">
        Ablehnen
      </button>
    </span>
  );
}
