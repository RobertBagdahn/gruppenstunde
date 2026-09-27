import { useEffect, useState } from 'react';
import { BadgeCheck, Check, Loader2, Search, Sparkles, Trash2, X } from 'lucide-react';
import {
  fetchOffensiveIngredientIds,
  runAiReviewChunk,
  useApplySuggestions,
  useInvalidateOffensive,
  useMergeGroup,
  useOffensiveBulkAction,
  useOffensiveIngredients,
  usePatchOffensiveIngredient,
  useRetailSectionOptions,
} from '@/api/dataOffensive';
import type { OffensiveFilters, OffensiveIngredientPatch, OffensiveSummary } from '@/schemas/dataOffensive';
import { CardTable } from '@/components/shared/CardTable';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import OffensiveIngredientRow from './OffensiveIngredientRow';
import { KPI_ISSUES } from './offensiveMeta';

interface OffensiveWorkListProps {
  summary: OffensiveSummary;
  filters: OffensiveFilters;
  onFiltersChange: (next: OffensiveFilters) => void;
  onNotify: (kind: 'success' | 'error' | 'info', message: string) => void;
}

const MAX_AI_SELECTION = 90;

export default function OffensiveWorkList({ summary, filters, onFiltersChange, onNotify }: OffensiveWorkListProps) {
  const { data, isLoading, isFetching, error, refetch } = useOffensiveIngredients(filters);
  const { data: sections = [] } = useRetailSectionOptions();
  const patch = usePatchOffensiveIngredient();
  const applySuggestions = useApplySuggestions();
  const publish = useOffensiveBulkAction('/publish/');
  const softDelete = useOffensiveBulkAction('/soft-delete/');
  const mergeGroup = useMergeGroup();
  const invalidate = useInvalidateOffensive();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [reviewing, setReviewing] = useState(false);
  const [searchDraft, setSearchDraft] = useState(filters.search ?? '');

  useEffect(() => setSearchDraft(filters.search ?? ''), [filters.search]);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((filters.search ?? '') !== searchDraft) onFiltersChange({ ...filters, search: searchDraft || undefined, page: 1 });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchDraft, filters, onFiltersChange]);

  // A new filter means a new result set; keep the selection only within one set.
  const filterKey = JSON.stringify({ ...filters, page: undefined });
  useEffect(() => setSelected(new Set()), [filterKey]);

  const setBusy = (ids: number[], busy: boolean) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (busy ? next.add(id) : next.delete(id)));
      return next;
    });

  const handlePatch = (id: number, change: OffensiveIngredientPatch) => {
    setBusy([id], true);
    patch.mutate(
      { id, patch: change },
      {
        onError: (err) => onNotify('error', err.message),
        onSettled: () => setBusy([id], false),
      }
    );
  };

  const reviewIds = async (ids: number[]) => {
    if (ids.length === 0) return;
    if (ids.length > MAX_AI_SELECTION) {
      onNotify('info', `Bitte höchstens ${MAX_AI_SELECTION} Zutaten auf einmal prüfen – für mehr die Pipeline nutzen.`);
      return;
    }
    setBusy(ids, true);
    setReviewing(true);
    try {
      const result = await runAiReviewChunk({ ids, limit: ids.length, force: true });
      const changed = Object.values(result.changed_fields).reduce((sum, n) => sum + n, 0);
      onNotify('success', `${result.reviewed} Zutaten geprüft, ${changed} Werte korrigiert.`);
      result.errors.forEach((message) => onNotify('error', message));
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'KI-Prüfung fehlgeschlagen');
    } finally {
      setBusy(ids, false);
      setReviewing(false);
      invalidate();
    }
  };

  const bulk = (action: 'suggestions' | 'publish' | 'delete', ids: number[]) => {
    if (ids.length === 0) return;
    const done = {
      onSuccess: (result: { changed: number; skipped: number; messages: string[] }) => {
        const verb = action === 'publish' ? 'veröffentlicht' : action === 'delete' ? 'gelöscht' : 'übernommen';
        onNotify('success', `${result.changed} ${verb}${result.skipped ? `, ${result.skipped} übersprungen` : ''}.`);
        result.messages.slice(0, 3).forEach((message) => onNotify('info', message));
        setSelected(new Set());
      },
      onError: (err: Error) => onNotify('error', err.message),
    };
    if (action === 'suggestions') applySuggestions.mutate({ ids, fields: ['name', 'nutrition', 'price'] }, done);
    if (action === 'publish') publish.mutate(ids, done);
    if (action === 'delete') softDelete.mutate(ids, done);
  };

  const selectAllMatches = async () => {
    try {
      const ids = await fetchOffensiveIngredientIds(filters);
      setSelected(new Set(ids));
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Auswahl fehlgeschlagen');
    }
  };

  const items = data?.items ?? [];
  const pageIds = items.map((item) => item.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const selectedIds = Array.from(selected);
  const bulkBusy = applySuggestions.isPending || publish.isPending || softDelete.isPending || reviewing;

  return (
    <section className="space-y-3" id="arbeitsliste">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Arbeitsliste</h2>
        <p className="text-xs text-muted-foreground">
          {data ? `${data.total.toLocaleString('de-DE')} Treffer` : ' '}
          {isFetching && !isLoading && ' · aktualisiere …'}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_14rem_14rem_auto]">
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
          value={filters.issue ?? ''}
          onChange={(event) => onFiltersChange({ ...filters, issue: event.target.value || undefined, nutrition_issue: undefined, page: 1 })}
          className="h-9 rounded-md border bg-background px-2 text-sm"
          aria-label="Problem filtern"
        >
          <option value="">Alle Zutaten</option>
          <option value="needs_review">Warten auf KI-Review</option>
          <option value="publishable">Bereit zum Veröffentlichen</option>
          {KPI_ISSUES.map((issue) => (
            <option key={issue} value={issue}>
              {summary.issue_labels[issue] ?? issue} ({summary.issue_counts[issue] ?? 0})
            </option>
          ))}
        </select>
        <select
          value={filters.section_id ?? ''}
          onChange={(event) =>
            onFiltersChange({ ...filters, section_id: event.target.value ? Number(event.target.value) : undefined, page: 1 })
          }
          className="h-9 rounded-md border bg-background px-2 text-sm"
          aria-label="Warengruppe filtern"
        >
          <option value="">Alle Warengruppen</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name} ({section.ingredient_count})
            </option>
          ))}
        </select>
        <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={!!filters.used_only}
            onChange={(event) => onFiltersChange({ ...filters, used_only: event.target.checked || undefined, page: 1 })}
          />
          Nur verwendete
        </label>
      </div>

      {filters.issue === 'nutrition_implausible' && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(summary.nutrition_issue_counts).map(([code, count]) => (
            <button
              key={code}
              type="button"
              onClick={() =>
                onFiltersChange({ ...filters, nutrition_issue: filters.nutrition_issue === code ? undefined : code, page: 1 })
              }
              className={`rounded-full border px-2.5 py-1 text-xs ${filters.nutrition_issue === code ? 'border-primary bg-primary/10 text-primary' : 'bg-card'}`}
            >
              {summary.nutrition_issue_labels[code] ?? code} · {count}
            </button>
          ))}
        </div>
      )}

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-card/95 p-2 backdrop-blur">
        <label className="flex items-center gap-2 px-1 text-xs font-medium">
          <input
            type="checkbox"
            checked={allPageSelected}
            onChange={() =>
              setSelected((prev) => {
                const next = new Set(prev);
                if (allPageSelected) pageIds.forEach((id) => next.delete(id));
                else pageIds.forEach((id) => next.add(id));
                return next;
              })
            }
          />
          Seite
        </label>
        {data && data.total > items.length && (
          <button type="button" onClick={selectAllMatches} className="text-xs text-primary hover:underline">
            Alle {data.total.toLocaleString('de-DE')} Treffer auswählen
          </button>
        )}
        <span className="text-xs text-muted-foreground">{selected.size > 0 && `${selected.size} ausgewählt`}</span>
        {selected.size > 0 && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => reviewIds(selectedIds)}>
              {reviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              KI prüfen
            </Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulk('suggestions', selectedIds)}>
              <Check className="h-4 w-4" /> Vorschläge übernehmen
            </Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulk('publish', selectedIds)}>
              <BadgeCheck className="h-4 w-4" /> Veröffentlichen
            </Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulk('delete', selectedIds)}>
              <Trash2 className="h-4 w-4" /> Löschen
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} aria-label="Auswahl aufheben">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" /> Lade Zutaten …
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive space-y-2">
          <p className="font-semibold">Arbeitsliste konnte nicht geladen werden</p>
          <p>{error.message}</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Erneut versuchen
          </Button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="task_alt" title="Nichts zu tun" description="Für diesen Filter gibt es keine Zutaten." />
      ) : (
        <CardTable>
          {items.map((ingredient) => (
            <OffensiveIngredientRow
              key={ingredient.id}
              ingredient={ingredient}
              selected={selected.has(ingredient.id)}
              sections={sections}
              issueLabels={summary.issue_labels}
              nutritionIssueLabels={summary.nutrition_issue_labels}
              busy={busyIds.has(ingredient.id)}
              onToggle={() =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(ingredient.id)) next.delete(ingredient.id);
                  else next.add(ingredient.id);
                  return next;
                })
              }
              onPatch={(change) => handlePatch(ingredient.id, change)}
              onReview={() => reviewIds([ingredient.id])}
              onAcceptSuggestions={() => bulk('suggestions', [ingredient.id])}
              onPublish={() => bulk('publish', [ingredient.id])}
              onDelete={() => bulk('delete', [ingredient.id])}
              onMergeInto={(targetId) =>
                mergeGroup.mutate(
                  { targetId, sourceIds: [ingredient.id] },
                  {
                    onSuccess: () => onNotify('success', `„${ingredient.name}“ zusammengeführt.`),
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
  );
}
