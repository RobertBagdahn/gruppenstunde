import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Calendar,
  Users,
  Sparkles,
  MoreVertical,
  Copy,
  Trash2,
  Calculator,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useMealPlans, useCreateMealPlan, useDeleteMealPlan, useDuplicateMealPlan } from '@/api/mealPlans';
import { useCurrentUser } from '@/api/auth';
import { getNextWeekend } from '@/lib/dateUtils';
import { MEALPLAN_SORT_OPTIONS } from '@/schemas/mealPlan';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import UnauthGate from '@/components/shared/UnauthGate';
import ListPageHero from '@/components/shared/ListPageHero';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import EmptyState from '@/components/shared/EmptyState';
import MealPlanFilterSidebar from '@/components/planning/MealPlanFilterSidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MealPlan } from '@/schemas/mealPlan';
import NutritionalTagMultiSelect from '@/components/recipe/NutritionalTagMultiSelect';

const BADGE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  verified: {
    label: 'Inspi-verifiziert',
    bg: 'bg-primary/10 border border-primary/20',
    text: 'text-primary',
    icon: 'verified',
  },
  community: {
    label: 'Community',
    bg: 'bg-[hsl(var(--chart-3))]/10 border border-[hsl(var(--chart-3))]/20',
    text: 'text-[hsl(var(--chart-3))]',
    icon: 'groups',
  },
  personal: {
    label: 'Mein Plan',
    bg: 'bg-[hsl(var(--chart-2))]/10 border border-[hsl(var(--chart-2))]/20',
    text: 'text-[hsl(var(--chart-2))]',
    icon: 'person',
  },
};

function getPlanBadge(plan: MealPlan): string | null {
  if (plan.owner_id === null) return 'verified';
  if (plan.visibility === 'public') return 'community';
  if (plan.is_owner) return 'personal';
  return null;
}

export default function MealPlanListPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();

  if (userLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <UnauthGate
        title="Essenspläne"
        description="Melde dich an, um deine Essenspläne zu verwalten."
      />
    );
  }

  return <MealPlanListPageInner />;
}

function MealPlanListPageInner() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('all');
  const [sort, setSort] = useState('date_newest');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = useMemo(() => ({
    origin: origin === 'all' ? undefined : origin,
    sort,
    search: searchQuery || undefined,
  }), [origin, sort, searchQuery]);

  const { data: mealPlans, error, isLoading, refetch } = useMealPlans(filters);
  const createMutation = useCreateMealPlan();
  const deleteMutation = useDeleteMealPlan();
  const duplicateMutation = useDuplicateMealPlan();

  const weekend = useMemo(() => getNextWeekend(), []);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('Neuer Essensplan');
  const [createStartDatetime, setCreateStartDatetime] = useState(weekend.friday);
  const [createEndDatetime, setCreateEndDatetime] = useState(weekend.sunday);
  const [createPortions, setCreatePortions] = useState(10);
  const [copyEnabled, setCopyEnabled] = useState(false);
  const [copySourceId, setCopySourceId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [nutritionalTagIds, setNutritionalTagIds] = useState<number[]>([]);
  const [pastOpen, setPastOpen] = useState(false);

  const now = useMemo(() => new Date().toISOString(), []);

  const { futurePlans, pastPlans } = useMemo(() => {
    if (!mealPlans) return { futurePlans: [], pastPlans: [] };
    const future: MealPlan[] = [];
    const past: MealPlan[] = [];
    for (const plan of mealPlans) {
      if (!plan.end_datetime || plan.end_datetime >= now) {
        future.push(plan);
      } else {
        past.push(plan);
      }
    }
    return { futurePlans: future, pastPlans: past };
  }, [mealPlans, now]);

  const totalCount = mealPlans?.length;

  const copySource = useMemo(
    () => (copyEnabled && copySourceId ? mealPlans?.find((p) => p.id === copySourceId) ?? null : null),
    [mealPlans, copySourceId, copyEnabled],
  );

  useEffect(() => {
    if (!copySource || !copySource.start_datetime || !copySource.end_datetime) return;
    const sourceStart = new Date(copySource.start_datetime);
    const sourceEnd = new Date(copySource.end_datetime);
    const durationMs = sourceEnd.getTime() - sourceStart.getTime();
    const currentStart = new Date(createStartDatetime);
    const newEnd = new Date(currentStart.getTime() + durationMs);
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day}T${h}:${min}`;
    };
    setCreateEndDatetime(fmt(newEnd));
    setCreatePortions(copySource.norm_portions);
  }, [copySourceId]);

  const toggleTag = (tagId: number) => {
    setNutritionalTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const resetCreateForm = () => {
    const w = getNextWeekend();
    setCreateName('Neuer Essensplan');
    setCreateStartDatetime(w.friday);
    setCreateEndDatetime(w.sunday);
    setCreatePortions(10);
    setCopyEnabled(false);
    setCopySourceId(null);
    setNutritionalTagIds([]);
  };

  const handleSubmit = () => {
    if (!createName.trim()) return;

    if (copyEnabled && copySourceId) {
      const source = mealPlans?.find((p) => p.id === copySourceId);
      if (!source) return;
      duplicateMutation.mutate(
        {
          id: copySourceId,
          name: createName.trim() + ' (Kopie)',
          start_datetime: createStartDatetime + ':00',
          end_datetime: createEndDatetime + ':00',
          norm_portions: createPortions,
        },
        {
          onSuccess: (plan) => {
            toast.success('Essensplan aus Vorlage erstellt');
            setShowCreate(false);
            resetCreateForm();
            navigate(`/meal-plans/${plan.id}`);
          },
          onError: (err) => toast.error('Fehler', { description: err.message }),
        },
      );
    } else {
      createMutation.mutate(
        {
          name: createName.trim(),
          start_datetime: createStartDatetime ? createStartDatetime + ':00' : null,
          end_datetime: createEndDatetime ? createEndDatetime + ':00' : null,
          norm_portions: createPortions,
          nutritional_tag_ids: nutritionalTagIds.length > 0 ? nutritionalTagIds : undefined,
        },
        {
          onSuccess: (plan) => {
            toast.success('Essensplan erstellt');
            setShowCreate(false);
            resetCreateForm();
            navigate(`/meal-plans/${plan.id}`);
          },
          onError: (err) => toast.error('Fehler', { description: err.message }),
        },
      );
    }
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Essensplan gelöscht');
        setDeleteId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  const formatDateRange = (plan: MealPlan) => {
    if (!plan.start_datetime && !plan.end_datetime) return null;
    const start = plan.start_datetime ? new Date(plan.start_datetime) : null;
    const end = plan.end_datetime ? new Date(plan.end_datetime) : null;
    const fmt = (d: Date) =>
      d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    if (start && end) {
      if (start.toDateString() === end.toDateString()) return fmt(start);
      return `${fmt(start)} – ${fmt(end)}`;
    }
    if (start) return `ab ${fmt(start)}`;
    if (end) return `bis ${fmt(end)}`;
    return null;
  };

  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const PlanCard = ({ plan }: { plan: MealPlan }) => {
    const badge = getPlanBadge(plan);
    const badgeConfig = badge ? BADGE_CONFIG[badge] : null;
    const dateRange = formatDateRange(plan);

    return (
      <div
        key={plan.id}
        onClick={() => navigate(`/meal-plans/${plan.id}`)}
        className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 shadow-soft transition-all cursor-pointer border-l-4 border-l-primary"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                {plan.name}
              </h3>
              {badgeConfig && (
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeConfig.bg} ${badgeConfig.text}`}>
                  <span className="material-symbols-outlined text-[12px]">{badgeConfig.icon}</span>
                  {badgeConfig.label}
                </span>
              )}
            </div>
            {dateRange && (
              <p className="text-xs text-muted-foreground font-medium mb-2">
                {dateRange}
              </p>
            )}
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {plan.meals_count} {plan.meals_count === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                {plan.norm_portions} Portionen
              </span>
              {plan.event_name && (
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  {plan.event_name}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-border shadow-soft">
              {plan.start_datetime && plan.end_datetime && (
                <DropdownMenuItem
                  className="font-semibold text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    const w = getNextWeekend();
                    setCreateName('Neuer Essensplan');
                    setCreateStartDatetime(w.friday);
                    setCreateEndDatetime(w.sunday);
                    setCreatePortions(10);
                    setCopyEnabled(true);
                    setCopySourceId(plan.id);
                    setShowCreate(true);
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Als Vorlage verwenden
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteId(plan.id);
                }}
                className="text-destructive focus:text-destructive font-semibold text-xs"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const PlanSection = ({ title, plans, open, onToggle }: { title: string; plans: MealPlan[]; open: boolean; onToggle: () => void }) => {
    if (plans.length === 0) return null;
    return (
      <div className="mb-6">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 mb-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {title}
          <span className="text-xs font-semibold text-muted-foreground">({plans.length})</span>
        </button>
        {open && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 font-sans">
      {/* Hero */}
      <ListPageHero
        title="Essenspläne"
        description="Plane Mahlzeiten für Lager, Fahrten und Gruppenstunden."
        icon="restaurant_menu"
        gradientClasses="gradient-primary"
        totalCount={totalCount}
        countLabel="Plan"
        countIcon="restaurant_menu"
      />

      {/* Tool Link */}
      <div className="mb-4">
        <Link
          to="/tools/norm-portion-simulator"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/25 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 shadow-soft transition-all"
        >
          <Calculator className="w-4 h-4" />
          Norm-Portion-Simulator
        </Link>
      </div>

      {/* Search Bar */}
              <ListPageSearchBar
                placeholder="Essensplan suchen..."
                value={searchInput}
                onChange={setSearchInput}
                onSubmit={handleSearch}
                createLabel="Neuer Essensplan"
                onCreateClick={() => navigate('/meal-plans/new')}
                gradientClasses=""
              />

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Filter Sidebar */}
        <MealPlanFilterSidebar
          origin={origin}
          onOriginChange={(o) => setOrigin(o)}
          onReset={() => setOrigin('all')}
        />

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Sort */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-muted-foreground font-semibold">
              {totalCount ?? 0} {totalCount === 1 ? 'Plan' : 'Pläne'}
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-primary/5 to-transparent px-4 py-2 rounded-xl">
              <ArrowUpDown className="w-4 h-4 text-primary" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl border border-border text-sm bg-card focus:ring-2 focus:ring-primary focus:outline-none font-semibold shadow-soft"
              >
                {MEALPLAN_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-gradient-to-br from-primary/10 via-muted/50 to-primary/5 animate-pulse" />
              ))}
            </div>
          ) : futurePlans.length === 0 && pastPlans.length === 0 ? (
            <EmptyState
              icon="restaurant_menu"
              title="Keine Essenspläne gefunden"
              description={
                searchQuery
                  ? 'Keine Essenspläne für diese Suche gefunden.'
                  : 'Erstelle deinen ersten Essensplan für eine Fahrt oder den Gruppenalltag.'
              }
              ctaLabel="Neuen Essensplan erstellen"
              onCtaClick={() => navigate('/meal-plans/new')}
            />
          ) : (
            <>
              <PlanSection title="Zukünftige Pläne" plans={futurePlans} open={true} onToggle={() => {}} />
              {pastPlans.length > 0 && (
                <PlanSection title="Vergangene Pläne" plans={pastPlans} open={pastOpen} onToggle={() => setPastOpen(!pastOpen)} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Create / Kopie Dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border-border p-6 shadow-soft">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg text-foreground">Neuen Essensplan erstellen</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Name *</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="z.B. Sommerlager 2026"
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={copyEnabled}
                  onChange={(e) => {
                    setCopyEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setCopySourceId(null);
                      const w = getNextWeekend();
                      setCreateEndDatetime(w.sunday);
                      setCreatePortions(10);
                    }
                  }}
                  className="rounded border-border text-primary focus:ring-primary/50"
                />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Von bestehendem Plan kopieren
                </span>
              </label>
            </div>

            {copyEnabled && (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Quelle</label>
                  <select
                    value={copySourceId ?? ''}
                    onChange={(e) => setCopySourceId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
                  >
                    <option value="">Plan auswählen...</option>
                    {mealPlans?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.meals_count} Mahlzeiten)
                      </option>
                    ))}
                  </select>
                </div>
                {copySource && (
                  <div className="sm:col-span-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                      <Copy className="w-3.5 h-3.5" />
                      Vorlage: {copySource.name} ({copySource.meals_count} Mahlzeiten)
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Start (Datum & Uhrzeit)</label>
              <input
                type="datetime-local"
                value={createStartDatetime}
                onChange={(e) => setCreateStartDatetime(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Ende (Datum & Uhrzeit)</label>
              <input
                type="datetime-local"
                value={createEndDatetime}
                onChange={(e) => setCreateEndDatetime(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Portionen (Personen)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={createPortions}
                onChange={(e) => setCreatePortions(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Ernährungstags</label>
              <NutritionalTagMultiSelect selectedTagIds={nutritionalTagIds} onToggle={toggleTag} />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <button
              onClick={() => {
                setShowCreate(false);
                resetCreateForm();
              }}
              className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={!createName.trim() || createMutation.isPending || duplicateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
            >
              {(createMutation.isPending || duplicateMutation.isPending) ? 'Erstelle...' : 'Erstellen'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        title="Essensplan löschen?"
        description="Der Essensplan und alle zugehörigen Tage, Mahlzeiten und Rezeptzuordnungen werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
