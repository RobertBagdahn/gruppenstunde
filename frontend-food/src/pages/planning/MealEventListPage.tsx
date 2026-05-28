import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useMealPlans, useCreateMealPlan, useDeleteMealPlan } from '@/api/mealPlans';
import { useCurrentUser } from '@/api/auth';
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
  { value: 'oldest', label: 'Aelteste' },
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
        title="Essensplaene"
        description="Melde dich an, um deine Essensplaene zu verwalten."
      />
    );
  }

  return <MealPlanListPageInner />;
}

function MealPlanListPageInner() {
  const navigate = useNavigate();
  const { data: mealPlans, error, isLoading, refetch } = useMealPlans();
  const createMutation = useCreateMealPlan();
  const deleteMutation = useDeleteMealPlan();

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createNumDays, setCreateNumDays] = useState(3);
  const [createPortions, setCreatePortions] = useState(10);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState('newest');

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

    // Sort
    if (sort === 'newest') items.sort((a, b) => b.id - a.id);
    else if (sort === 'oldest') items.sort((a, b) => a.id - b.id);
    else if (sort === 'name_asc') items.sort((a, b) => a.name.localeCompare(b.name));

    return items;
  }, [mealPlans, searchInput, sort]);

  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  const handleCreate = () => {
    if (!createName.trim()) return;
    createMutation.mutate(
      {
        name: createName.trim(),
        start_date: createStartDate || null,
        num_days: createNumDays,
        norm_portions: createPortions,
      },
      {
        onSuccess: (plan) => {
          toast.success('Essensplan erstellt');
          setShowCreate(false);
          setCreateName('');
          setCreateStartDate('');
          setCreateNumDays(3);
          setCreatePortions(10);
          navigate(`/meal-plans/${plan.id}`);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleDelete = () => {
    if (deleteId === null) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success('Essensplan geloescht');
        setDeleteId(null);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      {/* Hero */}
      <ListPageHero
        title="Essensplaene"
        description="Plane Mahlzeiten fuer Lager, Fahrten und Gruppenstunden."
        icon="restaurant_menu"
        gradientClasses="bg-gradient-to-br from-sky-500 to-cyan-600"
        totalCount={mealPlans?.length}
        countLabel="Plan"
        countIcon="restaurant_menu"
      />

      {/* Search Bar */}
      <ListPageSearchBar
        placeholder="Essensplan suchen..."
        value={searchInput}
        onChange={setSearchInput}
        onSubmit={() => {}}
        createLabel="Neuer Essensplan"
        onCreateClick={() => setShowCreate(true)}
        gradientClasses="from-sky-500/5 via-cyan-500/5 to-sky-500/5"
      />

      {/* Sort */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2 bg-gradient-to-r from-sky-500/5 to-transparent px-4 py-2 rounded-lg">
          <span className="material-symbols-outlined text-sky-600 text-[18px]">sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm bg-card focus:ring-2 focus:ring-sky-500 focus:outline-none font-medium"
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
            <div key={i} className="h-28 rounded-xl bg-gradient-to-br from-sky-500/10 via-muted/50 to-cyan-500/10 animate-pulse" />
          ))}
        </div>
      ) : filteredPlans.length === 0 ? (
        <EmptyState
          icon="restaurant_menu"
          title="Noch keine Essensplaene"
          description={
            searchInput
              ? 'Keine Essensplaene fuer diese Suche gefunden.'
              : 'Erstelle deinen ersten Essensplan fuer eine Fahrt oder den Gruppenalltag.'
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
              className="group rounded-2xl border border-border/50 border-l-4 border-l-sky-500 bg-card p-4 hover:border-sky-500/40 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate group-hover:text-sky-700 transition-colors">
                    {plan.name}
                  </h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_month</span>
                      {plan.meals_count} {plan.meals_count === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">group</span>
                      {plan.norm_portions} Portionen
                    </span>
                    {plan.event_name && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">celebration</span>
                        {plan.event_name}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(plan.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <span className="material-symbols-outlined text-[16px] mr-2">delete</span>
                      Loeschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Essensplan erstellen</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="z.B. Sommerlager 2026"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Startdatum</label>
              <input
                type="date"
                value={createStartDate}
                onChange={(e) => setCreateStartDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Anzahl Tage</label>
              <input
                type="number"
                min={1}
                max={30}
                value={createNumDays}
                onChange={(e) => setCreateNumDays(Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Portionen (Personen)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={createPortions}
                onChange={(e) => setCreatePortions(Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleCreate}
              disabled={!createName.trim() || createMutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        title="Essensplan loeschen?"
        description="Der Essensplan und alle zugehoerigen Tage, Mahlzeiten und Rezeptzuordnungen werden unwiderruflich geloescht."
        confirmLabel="Loeschen"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
