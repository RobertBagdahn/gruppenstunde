import { useCallback, useEffect, useState } from 'react';
import { CheckCheck, Loader2, Play, Search, Square, X } from 'lucide-react';
import {
  runPackageSuggestChunk,
  useDecidePackageSuggestions,
  useInvalidateOffensive,
  usePackageSuggestEstimate,
  usePackageSuggestions,
  usePatchPackageSuggestion,
  useRetailSectionOptions,
} from '@/api/dataOffensive';
import type {
  BulkAction,
  PackageSuggestionDecision,
  PackageSuggestionFilters,
  PackageSuggestionStatus,
} from '@/schemas/dataOffensive';
import { useChunkedRunner } from '@/hooks/useChunkedRunner';
import { CardTable } from '@/components/shared/CardTable';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { formatCount, formatEuro } from '@/lib/format';
import PackageSuggestionRow from './PackageSuggestionRow';
import { getApiErrorMessage } from '@/lib/api';

/** Default threshold for "accept all" when no confidence filter is set. */
export const DEFAULT_BULK_CONFIDENCE = 0.8;

const CONFIDENCE_OPTIONS = [
  { value: '', label: 'Jede Konfidenz' },
  { value: '0.5', label: 'ab 50 %' },
  { value: '0.8', label: 'ab 80 %' },
  { value: '0.9', label: 'ab 90 %' },
];

const STATUS_OPTIONS: { value: PackageSuggestionStatus; label: string }[] = [
  { value: 'pending', label: 'Offen' },
  { value: 'accepted', label: 'Übernommen' },
  { value: 'rejected', label: 'Verworfen' },
];

interface PackageSuggestionsPanelProps {
  filters: PackageSuggestionFilters;
  onFiltersChange: (filters: PackageSuggestionFilters) => void;
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
}

function describe(result: BulkAction, verb: string): string {
  const skipped = result.skipped ? ` · ${formatCount(result.skipped)} übersprungen` : '';
  return `${formatCount(result.changed)} ${verb}${skipped}`;
}

/** Cockpit tab "Packungen": AI run with cost estimate, filterable list, single and bulk decisions. */
export default function PackageSuggestionsPanel({ filters, onFiltersChange, onNotify }: PackageSuggestionsPanelProps) {
  const { data: estimate } = usePackageSuggestEstimate();
  const { data, isLoading, isFetching, error, refetch } = usePackageSuggestions(filters);
  const { data: sections = [] } = useRetailSectionOptions();
  const accept = useDecidePackageSuggestions('accept');
  const reject = useDecidePackageSuggestions('reject');
  const patch = usePatchPackageSuggestion();
  const invalidate = useInvalidateOffensive();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');

  // Debounce the search field into the URL state.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = searchDraft.trim() || undefined;
      if (next !== filters.search) onFiltersChange({ ...filters, search: next, page: 1 });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchDraft, filters, onFiltersChange]);

  const runChunk = useCallback(async () => {
    const result = await runPackageSuggestChunk(45);
    // Only stored suggestions count as progress; unusable AI answers stay candidates.
    return { processed: result.suggested, remaining: result.remaining, errors: result.errors };
  }, []);
  const runner = useChunkedRunner(runChunk, invalidate);

  const items = data?.items ?? [];
  const pendingOnPage = items.filter((s) => s.status === 'pending').map((s) => s.id);
  const allPageSelected = pendingOnPage.length > 0 && pendingOnPage.every((id) => selected.has(id));
  const bulkThreshold = filters.min_confidence ?? DEFAULT_BULK_CONFIDENCE;
  const decisionBusy = accept.isPending || reject.isPending;

  const decide = (
    action: 'accept' | 'reject',
    decision: PackageSuggestionDecision,
    ids: number[] = decision.ids ?? [],
  ) => {
    setBusyIds((prev) => new Set([...prev, ...ids]));
    const mutation = action === 'accept' ? accept : reject;
    mutation.mutate(decision, {
      onSuccess: (result) => {
        onNotify('success', describe(result, action === 'accept' ? 'übernommen' : 'verworfen'));
        result.messages.slice(0, 3).forEach((message) => onNotify('info', message));
        setSelected((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
      },
      onError: (err) => onNotify('error', err.message),
      onSettled: () => setBusyIds((prev) => new Set([...prev].filter((id) => !ids.includes(id)))),
    });
  };

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedIds = [...selected];

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-card p-4 md:p-5 space-y-3 shadow-card">
        <div className="space-y-1">
          <h2 className="font-display text-section font-bold">Packungen per KI vorschlagen</h2>
          <p className="text-body text-muted-foreground">
            Für genutzte Zutaten ohne Standardpackung schlägt die KI die übliche Handelspackung sowie Aggregatzustand
            und Dichte vor. Die Vorschläge werden nur gespeichert; erst deine Freigabe legt die Packung an.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body" data-testid="package-estimate">
            {estimate ? (
              <>
                <span className="font-semibold">{formatCount(estimate.candidates)} Zutaten</span> ohne Standardpackung ·{' '}
                {formatCount(estimate.estimated_calls)} KI-Aufrufe · ≈ {formatEuro(estimate.estimated_cost_eur)}
              </>
            ) : (
              <span className="text-muted-foreground">Kosten werden geschätzt …</span>
            )}
          </p>
          {runner.running ? (
            <Button size="sm" variant="outline" onClick={runner.stop}>
              <Square className="h-4 w-4" /> Anhalten
            </Button>
          ) : (
            <Button size="sm" disabled={!estimate || estimate.candidates === 0} onClick={runner.start}>
              <Play className="h-4 w-4" /> Packungen vorschlagen
            </Button>
          )}
        </div>
        {(runner.running || runner.processed > 0) && (
          <div className="space-y-1">
            <Progress value={runner.progress} className="h-2" />
            <p className="text-caption text-muted-foreground text-right">
              {formatCount(runner.processed)} Vorschläge
              {runner.remaining !== null && ` · ${formatCount(runner.remaining)} offen`}
              {runner.errors.length > 0 && ` · ${runner.errors.length} Fehler`}
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-section font-bold">Vorschläge</h2>
          <p className="text-caption text-muted-foreground">
            {data ? `${formatCount(data.total)} Treffer` : ' '}
            {isFetching && !isLoading && ' · aktualisiere …'}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_10rem_10rem_14rem]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Zutat suchen …"
              className="pl-9 h-9"
              aria-label="Zutat suchen"
            />
          </div>
          <select
            value={filters.status ?? 'pending'}
            onChange={(event) =>
              onFiltersChange({ ...filters, status: event.target.value as PackageSuggestionStatus, page: 1 })
            }
            className="h-9 rounded-lg border bg-background px-2 text-body"
            aria-label="Status filtern"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.min_confidence !== undefined ? String(filters.min_confidence) : ''}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                min_confidence: event.target.value ? Number(event.target.value) : undefined,
                page: 1,
              })
            }
            className="h-9 rounded-lg border bg-background px-2 text-body"
            aria-label="Konfidenz filtern"
          >
            {CONFIDENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.section_id ?? ''}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                section_id: event.target.value ? Number(event.target.value) : undefined,
                page: 1,
              })
            }
            className="h-9 rounded-lg border bg-background px-2 text-body"
            aria-label="Warengruppe filtern"
          >
            <option value="">Alle Warengruppen</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </div>

        {(filters.status ?? 'pending') === 'pending' && (
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-2 backdrop-blur">
            <label className="flex items-center gap-2 px-1 text-caption font-medium">
              <input
                type="checkbox"
                checked={allPageSelected}
                disabled={pendingOnPage.length === 0}
                onChange={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (allPageSelected) pendingOnPage.forEach((id) => next.delete(id));
                    else pendingOnPage.forEach((id) => next.add(id));
                    return next;
                  })
                }
              />
              Seite
            </label>
            {selected.size > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-caption text-muted-foreground">{formatCount(selected.size)} ausgewählt</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decisionBusy}
                  onClick={() => decide('accept', { ids: selectedIds })}
                >
                  Auswahl übernehmen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decisionBusy}
                  onClick={() => decide('reject', { ids: selectedIds })}
                >
                  Auswahl verwerfen
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} aria-label="Auswahl aufheben">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <Button
              size="sm"
              className="ml-auto"
              disabled={decisionBusy || !data || data.total === 0}
              onClick={() => setConfirmBulk(true)}
            >
              <CheckCheck className="h-4 w-4" /> Alle mit Konfidenz ≥ {formatCount(bulkThreshold * 100)} % übernehmen
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-body text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Lade Vorschläge …
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-body text-destructive space-y-2">
            <p className="font-semibold">Vorschläge konnten nicht geladen werden</p>
            <p>{getApiErrorMessage(error)}</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Erneut versuchen
            </Button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="inventory_2"
            title="Keine Vorschläge"
            description="Für diesen Filter gibt es keine Packungsvorschläge."
          />
        ) : (
          <CardTable>
            {items.map((suggestion) => (
              <PackageSuggestionRow
                key={suggestion.id}
                suggestion={suggestion}
                selected={selected.has(suggestion.id)}
                busy={busyIds.has(suggestion.id)}
                onToggle={() => toggle(suggestion.id)}
                onAccept={() => decide('accept', { ids: [suggestion.id] })}
                onReject={() => decide('reject', { ids: [suggestion.id] })}
                onSave={(change) =>
                  patch.mutateAsync(
                    { id: suggestion.id, patch: change },
                    {
                      onSuccess: () => onNotify('success', 'Vorschlag gespeichert'),
                      onError: (err) => onNotify('error', err.message),
                    }
                  )
                }
              />
            ))}
          </CardTable>
        )}

        {data && data.total_pages > 1 && (
          <Pagination
            currentPage={data.page}
            totalPages={data.total_pages}
            onPageChange={(page) => onFiltersChange({ ...filters, page })}
          />
        )}
      </section>

      <ConfirmDialog
        open={confirmBulk}
        title="Vorschläge übernehmen?"
        description={`Alle offenen Vorschläge mit Konfidenz ab ${formatCount(bulkThreshold * 100)} %${
          filters.section_id ? ' in der gewählten Warengruppe' : ''
        } werden als Standardpackung angelegt. Manuell gepflegte Aggregatzustände bleiben unverändert.`}
        confirmLabel="Übernehmen"
        variant="default"
        loading={accept.isPending}
        onCancel={() => setConfirmBulk(false)}
        onConfirm={() => {
          setConfirmBulk(false);
          decide('accept', { min_confidence: bulkThreshold, section_id: filters.section_id });
        }}
      />
    </div>
  );
}
