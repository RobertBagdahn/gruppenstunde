import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOffensiveSummary } from '@/api/dataOffensive';
import type { OffensiveFilters, PackageSuggestionFilters, PackageSuggestionStatus } from '@/schemas/dataOffensive';
import { Button } from '@/components/ui/button';
import OffensivePipeline from '@/components/data-offensive/OffensivePipeline';
import OffensiveKpiGrid from '@/components/data-offensive/OffensiveKpiGrid';
import OffensiveWorkList from '@/components/data-offensive/OffensiveWorkList';
import DuplicateGroupsPanel from '@/components/data-offensive/DuplicateGroupsPanel';
import RecipeCleanupPanel from '@/components/data-offensive/RecipeCleanupPanel';
import PackageSuggestionsPanel from '@/components/data-offensive/PackageSuggestionsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PAGE_SIZE = 25;
const PACKAGE_PAGE_SIZE = 50;
const PACKAGE_STATUSES: PackageSuggestionStatus[] = ['pending', 'accepted', 'rejected'];

type CockpitTab = 'ingredients' | 'packages';

function readTab(params: URLSearchParams): CockpitTab {
  return params.get('tab') === 'packages' ? 'packages' : 'ingredients';
}

/** Package-suggestion filters live in the URL with a `p` prefix so both tabs keep their state. */
function readPackageFilters(params: URLSearchParams): PackageSuggestionFilters {
  const status = params.get('pstatus') as PackageSuggestionStatus | null;
  const confidence = Number(params.get('pconf'));
  const section = params.get('psection');
  const page = Number(params.get('ppage') ?? '1');
  return {
    status: status && PACKAGE_STATUSES.includes(status) ? status : 'pending',
    min_confidence: Number.isFinite(confidence) && confidence > 0 && confidence <= 1 ? confidence : undefined,
    section_id: section ? Number(section) : undefined,
    search: params.get('pq') ?? undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    page_size: PACKAGE_PAGE_SIZE,
  };
}

function writePackageFilters(params: URLSearchParams, filters: PackageSuggestionFilters): void {
  if (filters.status && filters.status !== 'pending') params.set('pstatus', filters.status);
  if (filters.min_confidence !== undefined) params.set('pconf', String(filters.min_confidence));
  if (filters.section_id) params.set('psection', String(filters.section_id));
  if (filters.search) params.set('pq', filters.search);
  if (filters.page && filters.page > 1) params.set('ppage', String(filters.page));
}

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

function writeFilters(filters: OffensiveFilters, params = new URLSearchParams()): URLSearchParams {
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
  const packageFilters = useMemo(() => readPackageFilters(searchParams), [searchParams]);
  const tab = readTab(searchParams);
  const { data: summary, isLoading, error, refetch } = useOffensiveSummary();

  const writeState = useCallback(
    (nextTab: CockpitTab, nextFilters: OffensiveFilters, nextPackageFilters: PackageSuggestionFilters) => {
      const params = writeFilters(nextFilters);
      writePackageFilters(params, nextPackageFilters);
      if (nextTab === 'packages') params.set('tab', 'packages');
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );
  const setFilters = useCallback(
    (next: OffensiveFilters) => writeState(tab, next, packageFilters),
    [writeState, tab, packageFilters]
  );
  const setPackageFilters = useCallback(
    (next: PackageSuggestionFilters) => writeState(tab, filters, next),
    [writeState, tab, filters]
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
        <p className="text-body text-muted-foreground">Analysiere alle Zutaten …</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive space-y-2">
        <p className="font-semibold">Cockpit konnte nicht geladen werden</p>
        <p className="text-body">{error?.message}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => writeState(value === 'packages' ? 'packages' : 'ingredients', filters, packageFilters)}
      className="space-y-6"
    >
      <TabsList>
        <TabsTrigger value="ingredients">Zutaten</TabsTrigger>
        <TabsTrigger value="packages">Packungen</TabsTrigger>
      </TabsList>
      <TabsContent value="ingredients" className="space-y-8">
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
      </TabsContent>
      <TabsContent value="packages">
        <PackageSuggestionsPanel filters={packageFilters} onFiltersChange={setPackageFilters} onNotify={notify} />
      </TabsContent>
    </Tabs>
  );
}
