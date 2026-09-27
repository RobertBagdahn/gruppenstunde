import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOffensiveSummary } from '@/api/dataOffensive';
import type { OffensiveFilters } from '@/schemas/dataOffensive';
import { Button } from '@/components/ui/button';
import OffensivePipeline from '@/components/data-offensive/OffensivePipeline';
import OffensiveKpiGrid from '@/components/data-offensive/OffensiveKpiGrid';
import OffensiveWorkList from '@/components/data-offensive/OffensiveWorkList';
import DuplicateGroupsPanel from '@/components/data-offensive/DuplicateGroupsPanel';
import RecipeCleanupPanel from '@/components/data-offensive/RecipeCleanupPanel';

const PAGE_SIZE = 25;

function readFilters(params: URLSearchParams): OffensiveFilters {
  const section = params.get('section');
  const page = Number(params.get('page') ?? '1');
  return {
    issue: params.get('issue') ?? undefined,
    nutrition_issue: params.get('nutrition') ?? undefined,
    section_id: section ? Number(section) : undefined,
    search: params.get('q') ?? undefined,
    used_only: params.get('used') === '1' || undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: PAGE_SIZE,
  };
}

function writeFilters(filters: OffensiveFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.issue) params.set('issue', filters.issue);
  if (filters.nutrition_issue) params.set('nutrition', filters.nutrition_issue);
  if (filters.section_id) params.set('section', String(filters.section_id));
  if (filters.search) params.set('q', filters.search);
  if (filters.used_only) params.set('used', '1');
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  return params;
}

/** Cockpit for the food data offensive: pipeline, KPIs, work list, duplicates and recipes. */
export default function DataOffensivePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const { data: summary, isLoading, error, refetch } = useOffensiveSummary();

  const setFilters = useCallback(
    (next: OffensiveFilters) => setSearchParams(writeFilters(next), { replace: true }),
    [setSearchParams]
  );

  const notify = useCallback((kind: 'success' | 'error' | 'info', message: string) => {
    if (kind === 'success') toast.success(message);
    else if (kind === 'error') toast.error(message);
    else toast.info(message);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analysiere alle Zutaten …</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive space-y-2">
        <p className="font-semibold">Cockpit konnte nicht geladen werden</p>
        <p className="text-sm">{error?.message}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <OffensivePipeline summary={summary} onNotify={notify} />
      <OffensiveKpiGrid
        summary={summary}
        activeIssue={filters.issue}
        onSelectIssue={(issue) => {
          setFilters({ ...filters, issue, nutrition_issue: undefined, page: 1 });
          document.getElementById('arbeitsliste')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />
      <OffensiveWorkList summary={summary} filters={filters} onFiltersChange={setFilters} onNotify={notify} />
      <DuplicateGroupsPanel onNotify={notify} />
      <RecipeCleanupPanel onNotify={notify} />
    </div>
  );
}
