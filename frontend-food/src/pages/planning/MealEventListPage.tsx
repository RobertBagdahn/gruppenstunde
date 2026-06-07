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
  User as UserIcon,
  FileUp,
} from 'lucide-react';
import { useMealPlans, useCreateMealPlan, useDeleteMealPlan, useDuplicateMealPlan } from '@/api/mealPlans';
import { useCurrentUser } from '@/api/auth';
import { getNextWeekend } from '@/lib/dateUtils';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import UnauthGate from '@/components/shared/UnauthGate';
import ListPageHero from '@/components/shared/ListPageHero';
import ListPageSearchBar from '@/components/shared/ListPageSearchBar';
import EmptyState from '@/components/shared/EmptyState';
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

const SORT_OPTIONS = [
  { value: 'newest', label: 'Neueste' },
  { value: 'oldest', label: 'Älteste' },
  { value: 'name_asc', label: 'Name A-Z' },
];

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
  const { data: user } = useCurrentUser();
  const { data: mealPlans, error, isLoading, refetch } = useMealPlans();
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
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('newest');
  const [myDataOnly, setMyDataOnly] = useState(false);

  // Client-side filtering & sorting (API returns full array)
  const filteredPlans = useMemo(() => {
    if (!mealPlans) return [];
    let items = [...mealPlans];

    // Search filter
    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.event_name && p.event_name.toLowerCase().includes(q)),
      );
    }

    // My Data filter
    if (myDataOnly && user) {
      items = items.filter((p) => p.created_by_id === user.id);
    }

    // Sort
    if (sort === 'newest') items.sort((a, b) => b.id - a.id);
    else if (sort === 'oldest') items.sort((a, b) => a.id - b.id);
    else if (sort === 'name_asc') items.sort((a, b) => a.name.localeCompare(b.name));

    return items;
  }, [mealPlans, searchInput, sort, myDataOnly, user]);

  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

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

  const resetCreateForm = () => {
    const w = getNextWeekend();
    setCreateName('Neuer Essensplan');
    setCreateStartDatetime(w.friday);
    setCreateEndDatetime(w.sunday);
    setCreatePortions(10);
    setCopyEnabled(false);
    setCopySourceId(null);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 font-sans">
      {/* Hero */}
      <ListPageHero
        title="Essenspläne"
        description="Plane Mahlzeiten für Lager, Fahrten und Gruppenstunden."
        icon="restaurant_menu"
        gradientClasses="gradient-primary"
        totalCount={mealPlans?.length}
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
        onSubmit={() => {}}
        createLabel="Neuer Essensplan"
        onCreateClick={() => setShowCreate(true)}
        gradientClasses=""
      />

      {/* Sort + My Data filter */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setMyDataOnly(!myDataOnly)}
          className={[
            'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold border transition-all shadow-soft',
            myDataOnly
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40',
          ].join(' ')}
        >
          <UserIcon className="w-4 h-4" />
          Meine Daten
        </button>
        <div className="flex items-center gap-2 bg-gradient-to-r from-primary/5 to-transparent px-4 py-2 rounded-xl">
          <ArrowUpDown className="w-4 h-4 text-primary" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3.5 py-1.5 rounded-xl border border-border text-sm bg-card focus:ring-2 focus:ring-primary focus:outline-none font-semibold shadow-soft"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gradient-to-br from-primary/10 via-muted/50 to-primary/5 animate-pulse" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon="restaurant_menu"
          title="Noch keine Essenspläne"
          description={
            searchInput
              ? 'Keine Essenspläne für diese Suche gefunden.'
              : 'Erstelle deinen ersten Essensplan für eine Fahrt oder den Gruppenalltag.'
          }
          ctaLabel="Neuen Essensplan erstellen"
          onCtaClick={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => navigate(`/meal-plans/${plan.id}`)}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 shadow-soft transition-all cursor-pointer border-l-4 border-l-primary"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
                    {plan.name}
                  </h3>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs font-semibold text-muted-foreground">
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
          ))}
        </div>
      )}

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
                      <FileUp className="w-3.5 h-3.5" />
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
