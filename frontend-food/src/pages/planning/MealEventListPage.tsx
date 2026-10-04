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
  Wallet,
  UserRound,
  Lock,
  Globe,
} from 'lucide-react';
import { useMealPlans, useCreateMealPlan, useDeleteMealPlan, useDuplicateMealPlan } from '@/api/mealPlans';
import { useCurrentUser } from '@/api/auth';
import { getNextWeekend } from '@/lib/dateUtils';
import { MEALPLAN_SORT_OPTIONS } from '@/schemas/mealPlan';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import ListPageHero from '@/components/shared/ListPageHero';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import ActiveFiltersHint from '@/components/shared/ActiveFiltersHint';
import { MealPlanListStateSchema } from '@/schemas/listState';
import { usePersistedListState, useDebouncedSearchInput } from '@/hooks/usePersistedListState';
import { CardTable, DataCardRow } from '@/components/shared/CardTable';
import {
  matchesMealPlanFilters,
  sortMealPlansByDate,
  planTiming,
  planDurationDays,
  monthKey,
  monthLabel,
  type PlanTiming,
} from '@/lib/mealPlanListFilters';
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
import { formatNumber, formatEuro } from '@/lib/format';
import { sourceBadgeHelp } from '@/lib/sourceBadgeHelp';
import { Icon } from '@/components/ui/icon';

const BADGE_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  verified: {
    label: 'Inspi-verifiziert',
    bg: 'bg-primary/10 border border-primary/20',
    text: 'text-primary',
    icon: 'verified',
  },
  community: {
    label: 'Community',
    bg: 'bg-info-soft border border-info-border',
    text: 'text-info',
    icon: 'groups',
  },
  personal: {
    label: 'Mein Plan',
    bg: 'bg-warning-soft border border-warning-border',
    text: 'text-warning',
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
  const { isLoading: userLoading } = useCurrentUser();

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

  // Visitors see public, verified and template plans; "Meine"/"Geteilt" tabs stay empty for them.
  return <MealPlanListPageInner />;
}

const MEAL_PLAN_LIST_DEFAULTS = {
  origin: 'all',
  sort: 'date_upcoming',
  when: 'all',
  size: 'all',
  duration: 'all',
  visibility: 'all',
} as const;

const TIMING_LABEL: Record<PlanTiming, string | null> = {
  upcoming: null,
  running: 'Läuft gerade',
  past: 'Vorbei',
  undated: 'Ohne Datum',
};

const VISIBILITY_LABEL: Record<string, { label: string; icon: typeof Lock } | undefined> = {
  private: { label: 'Privat', icon: Lock },
  group: { label: 'Gruppe', icon: Users },
  public: { label: 'Öffentlich', icon: Globe },
};

const DAY_MS = 24 * 60 * 60 * 1000;

function relativeStart(plan: MealPlan, now: number): string | null {
  if (!plan.start_datetime || planTiming(plan, now) !== 'upcoming') return null;
  const days = Math.ceil((new Date(plan.start_datetime).getTime() - now) / DAY_MS);
  if (days <= 1) return 'Morgen oder früher';
  if (days < 14) return `in ${days} Tagen`;
  if (days < 70) return `in ${Math.round(days / 7)} Wochen`;
  return `in ${Math.round(days / 30)} Monaten`;
};

function MealPlanListPageInner() {
  const navigate = useNavigate();
  const { state, patch, reset, activeCount, restored } = usePersistedListState({
    key: 'meal-plans',
    schema: MealPlanListStateSchema,
    defaults: MEAL_PLAN_LIST_DEFAULTS,
  });
  const { origin, sort, when, size, duration, visibility, q: searchQuery } = state;
  const withMembers = state.with_members === '1';
  const withEvent = state.with_event === '1';
  const selectedTags = useMemo(() => state.tags ?? [], [state.tags]);
  const search = useDebouncedSearchInput(searchQuery ?? '', (value) => {
    patch({ q: value.trim() || undefined }, { replace: true });
  });

  const filters = useMemo(() => ({
    origin: origin === 'all' ? undefined : origin,
    // Date order is applied on the client so that upcoming plans come first.
    sort: sort.startsWith('date_') ? undefined : sort,
    search: searchQuery || undefined,
  }), [origin, sort, searchQuery]);

  const { data: mealPlans, error, isLoading, refetch } = useMealPlans(filters, { enabled: restored });
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
  const deletePlan = mealPlans?.find((plan) => plan.id === deleteId) ?? null;
  const [nutritionalTagIds, setNutritionalTagIds] = useState<number[]>([]);

  const now = useMemo(() => Date.now(), []);

  const availableTags = useMemo(() => {
    const names = new Set<string>(selectedTags);
    for (const plan of mealPlans ?? []) plan.nutritional_tag_names.forEach((name) => names.add(name));
    return [...names].sort((a, b) => a.localeCompare(b, 'de'));
  }, [mealPlans, selectedTags]);

  const visiblePlans = useMemo(() => {
    if (!mealPlans) return [];
    const filters = { when, size, duration, visibility, withMembers, withEvent, tags: selectedTags };
    const matching = mealPlans.filter((plan) => matchesMealPlanFilters(plan, filters, now));
    return sort.startsWith('date_') ? sortMealPlansByDate(matching, sort, now) : matching;
  }, [mealPlans, when, size, duration, visibility, withMembers, withEvent, selectedTags, sort, now]);

  const monthGroups = useMemo(() => {
    if (!sort.startsWith('date_')) return [{ key: '', plans: visiblePlans }];
    const groups: { key: string; plans: MealPlan[] }[] = [];
    for (const plan of visiblePlans) {
      const key = monthKey(plan);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.plans.push(plan);
      else groups.push({ key, plans: [plan] });
    }
    return groups;
  }, [visiblePlans, sort]);

  const totalCount = visiblePlans.length;

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
  }, [copySource, createStartDatetime]);

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
          name: createName.trim(),
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

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(',', '');

  const formatDay = (value: string) =>
    new Date(value).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatDateRange = (plan: MealPlan) => {
    const { start_datetime: start, end_datetime: end } = plan;
    if (!start && !end) return null;
    if (start && end) {
      if (new Date(start).toDateString() === new Date(end).toDateString()) return formatDateTime(start);
      return `${formatDay(start)} – ${formatDay(end)}`;
    }
    if (start) return `ab ${formatDay(start)}`;
    return `bis ${formatDay(end as string)}`;
  };

  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  const PlanRow = ({ plan }: { plan: MealPlan }) => {
    const badge = getPlanBadge(plan);
    const badgeConfig = badge ? BADGE_CONFIG[badge] : null;
    const dateRange = formatDateRange(plan);
    const timing = planTiming(plan, now);
    const timingLabel = TIMING_LABEL[timing] ?? relativeStart(plan, now);
    const days = planDurationDays(plan);
    const visibilityInfo = VISIBILITY_LABEL[plan.visibility];
    const startDate = plan.start_datetime ?? plan.end_datetime;
    const dateBlock = startDate ? new Date(startDate) : null;
    const tagNames = plan.nutritional_tag_names;
    const budgetPerDay = plan.budget_per_person_per_day;

    return (
      <DataCardRow
        clickable
        onClick={() => navigate(`/meal-plans/${plan.id}`)}
        className={`group border-l-4 ${timing === 'past' ? 'border-l-border opacity-80' : 'border-l-primary'}`}
      >
        <div
          className="hidden md:flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 py-1.5 text-primary"
          aria-hidden="true"
        >
          {dateBlock ? (
            <>
              <span className="font-display font-bold text-section leading-none">{dateBlock.getDate()}</span>
              <span className="text-caption font-semibold uppercase">
                {dateBlock.toLocaleDateString('de-DE', { month: 'short' }).replace('.', '')}
              </span>
            </>
          ) : (
            <Calendar className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3
              title={plan.name}
              className="font-display font-bold text-emphasis text-foreground line-clamp-2 break-words group-hover:text-primary transition-colors"
            >
              {plan.name}
            </h3>
            {badgeConfig && (
              <span title={badge ? sourceBadgeHelp(badge) : undefined} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold ${badgeConfig.bg} ${badgeConfig.text}`}>
                <Icon name={badgeConfig.icon} size={16} />
                {badgeConfig.label}
              </span>
            )}
            {timingLabel && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption font-bold ${timing === 'running' ? 'bg-success-soft border border-success-border text-success' : 'bg-muted text-muted-foreground'}`}>
                {timingLabel}
              </span>
            )}
          </div>

          {dateRange && (
            <p className="text-body text-muted-foreground font-medium">
              {dateRange}
              {days !== null && days > 1 && <span className="text-caption"> · {days} Tage</span>}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {plan.meals_count} {plan.meals_count === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-4 h-4" />
              {formatNumber(plan.norm_portions, { maxDecimals: 1 })} Portionen
            </span>
            {plan.has_group_members && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="w-4 h-4" />
                {plan.group_members_count} in der Teilnehmerliste
              </span>
            )}
            {budgetPerDay !== null && (
              <span className="inline-flex items-center gap-1">
                <Wallet className="w-4 h-4" />
                {formatEuro(budgetPerDay)} p. P./Tag
              </span>
            )}
            {plan.event_name && (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                {plan.event_name}
              </span>
            )}
            {visibilityInfo && (
              <span className="inline-flex items-center gap-1">
                <visibilityInfo.icon className="w-4 h-4" />
                {visibilityInfo.label}
              </span>
            )}
            {plan.owner_name && !plan.is_owner && (
              <span className="inline-flex items-center gap-1">
                <UserRound className="w-4 h-4" />
                von {plan.owner_name}
              </span>
            )}
            {plan.collaborators_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="w-4 h-4" />
                {plan.collaborators_count} {plan.collaborators_count === 1 ? 'Mitarbeiter' : 'Mitarbeitende'}
              </span>
            )}
          </div>

          {tagNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagNames.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-caption font-medium text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="self-start md:self-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                aria-label={`Aktionen für ${plan.name}`}
                className="p-1.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-border shadow-soft">
              {plan.start_datetime && plan.end_datetime && plan.can_edit && (
                <DropdownMenuItem
                  className="font-semibold text-caption"
                  onClick={(e) => {
                    e.stopPropagation();
                    const w = getNextWeekend();
                    // Only a suggestion in the name field: the submitted name is used as typed.
                    setCreateName(`${plan.name} (Kopie)`);
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
              {plan.can_delete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId(plan.id);
                  }}
                  className="text-destructive focus:text-destructive font-semibold text-caption"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DataCardRow>
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
        countLabel={{ one: 'Plan', other: 'Pläne' }}
        countIcon="restaurant_menu"
      />

      {/* Tool Link */}
      <div className="mb-4">
        <Link
          to="/tools/norm-portion-simulator"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/25 bg-primary/5 text-primary text-body font-semibold hover:bg-primary/10 shadow-soft transition-all"
        >
          <Calculator className="w-4 h-4" />
          Norm-Portion-Simulator
        </Link>
      </div>

      {/* Search Bar */}
              <ListPageSearchBar
                placeholder="Essensplan suchen..."
                value={search.input}
                onChange={search.setInput}
                onSubmit={search.submit}
                createLabel="Neuer Essensplan"
                onCreateClick={() => navigate('/meal-plans/new')}
                gradientClasses=""
              />

      <div className="flex flex-col md:flex-row gap-4 md:gap-8">
        {/* Filter Sidebar */}
        <MealPlanFilterSidebar
          values={{ origin, when, size, duration, visibility, withMembers, withEvent, tags: selectedTags }}
          availableTags={availableTags}
          activeCount={activeCount}
          onChange={(partial) =>
            patch({
              ...(partial.origin !== undefined && { origin: MealPlanListStateSchema.shape.origin.parse(partial.origin) }),
              ...(partial.when !== undefined && { when: MealPlanListStateSchema.shape.when.parse(partial.when) }),
              ...(partial.size !== undefined && { size: MealPlanListStateSchema.shape.size.parse(partial.size) }),
              ...(partial.duration !== undefined && { duration: MealPlanListStateSchema.shape.duration.parse(partial.duration) }),
              ...(partial.visibility !== undefined && { visibility: MealPlanListStateSchema.shape.visibility.parse(partial.visibility) }),
              ...(partial.withMembers !== undefined && { with_members: partial.withMembers ? ('1' as const) : undefined }),
              ...(partial.withEvent !== undefined && { with_event: partial.withEvent ? ('1' as const) : undefined }),
              ...(partial.tags !== undefined && { tags: partial.tags }),
            })
          }
          onReset={reset}
        />

        {/* Results */}
        <div className="flex-1 min-w-0">
          <ActiveFiltersHint activeCount={activeCount} onReset={reset} />
          {/* Sort */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-caption text-muted-foreground font-semibold">
              {totalCount ?? 0} {totalCount === 1 ? 'Plan' : 'Pläne'}
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-primary/5 to-transparent px-4 py-2 rounded-xl">
              <ArrowUpDown className="w-4 h-4 text-primary" />
              <select
                value={sort}
                onChange={(e) => patch({ sort: MealPlanListStateSchema.shape.sort.parse(e.target.value) })}
                className="px-3.5 py-1.5 rounded-xl border border-border text-body bg-card focus:ring-2 focus:ring-primary focus:outline-none font-semibold shadow-soft"
              >
                {MEALPLAN_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading || !restored ? (
            <CardTable>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-gradient-to-br from-primary/10 via-muted/50 to-primary/5 animate-pulse" />
              ))}
            </CardTable>
          ) : visiblePlans.length === 0 ? (
            <EmptyState
              icon="restaurant_menu"
              title="Keine Essenspläne gefunden"
              description={
                activeCount > 0
                  ? 'Mit dieser Suche und diesen Filtern gibt es keine Treffer.'
                  : 'Erstelle deinen ersten Essensplan für eine Fahrt oder den Gruppenalltag.'
              }
              ctaLabel={activeCount > 0 ? 'Filter zurücksetzen' : 'Neuen Essensplan erstellen'}
              onCtaClick={activeCount > 0 ? reset : () => navigate('/meal-plans/new')}
            />
          ) : (
            <div className="space-y-6">
              {monthGroups.map((group) => (
                <section key={group.key || 'all'}>
                  {group.key && (
                    <h2 className="mb-3 flex items-center gap-2 text-body font-bold text-muted-foreground">
                      {monthLabel(group.key)}
                      <span className="text-caption font-semibold">({group.plans.length})</span>
                    </h2>
                  )}
                  <CardTable>
                    {group.plans.map((plan) => (
                      <PlanRow key={plan.id} plan={plan} />
                    ))}
                  </CardTable>
                </section>
              ))}
            </div>
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
        <DialogContent className="sm:max-w-md rounded-xl border-border p-6 shadow-soft">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-section text-foreground">Neuen Essensplan erstellen</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div className="sm:col-span-2">
              <label className="block text-caption font-bold uppercase tracking-wider text-muted-foreground mb-1">Name *</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="z.B. Sommerlager 2026"
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-body font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
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
                  className="rounded-lg border-border text-primary focus:ring-primary/50"
                />
                <span className="text-caption font-bold uppercase tracking-wider text-muted-foreground">
                  Von bestehendem Plan kopieren
                </span>
              </label>
            </div>

            {copyEnabled && (
              <>
                <div className="sm:col-span-2">
                  <label className="block text-caption font-bold uppercase tracking-wider text-muted-foreground mb-1">Quelle</label>
                  <select
                    value={copySourceId ?? ''}
                    onChange={(e) => setCopySourceId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-body font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
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
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-caption font-semibold text-primary">
                      <Copy className="w-3.5 h-3.5" />
                      Vorlage: {copySource.name} ({copySource.meals_count} Mahlzeiten)
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-caption font-bold uppercase tracking-wider text-muted-foreground mb-1">Start (Datum & Uhrzeit)</label>
              <input
                type="datetime-local"
                value={createStartDatetime}
                onChange={(e) => setCreateStartDatetime(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-body font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              />
            </div>
            <div>
              <label className="block text-caption font-bold uppercase tracking-wider text-muted-foreground mb-1">Ende (Datum & Uhrzeit)</label>
              <input
                type="datetime-local"
                value={createEndDatetime}
                onChange={(e) => setCreateEndDatetime(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-body font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-caption font-bold uppercase tracking-wider text-muted-foreground mb-1">Portionen (Personen)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={createPortions}
                onChange={(e) => setCreatePortions(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-body font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-soft"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-caption font-bold uppercase tracking-wider text-muted-foreground mb-1">Ernährungstags</label>
              <NutritionalTagMultiSelect selectedTagIds={nutritionalTagIds} onToggle={toggleTag} />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <button
              onClick={() => {
                setShowCreate(false);
                resetCreateForm();
              }}
              className="px-4 py-2.5 rounded-xl border border-border text-body font-semibold hover:bg-muted transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={!createName.trim() || createMutation.isPending || duplicateMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-body font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-soft"
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
        title={deletePlan ? `Essensplan „${deletePlan.name}“ löschen?` : 'Essensplan löschen?'}
        description="Der Essensplan und alle zugehörigen Tage, Mahlzeiten und Rezeptzuordnungen werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
