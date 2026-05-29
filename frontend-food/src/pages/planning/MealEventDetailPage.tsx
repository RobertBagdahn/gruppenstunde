import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackButton } from '@/components/shared/BackButton';
import { toast } from 'sonner';
import { useCreateFromMealPlan } from '@/api/shoppingLists';
import { useCurrentUser } from '@/api/auth';
import {
  useMealPlan,
  useUpdateMealPlan,
  useAddDayBefore,
  useAddDayAfter,
  useRemoveDay,
  useAddMeal,
  useRemoveMeal,
  useAddMealItem,
  useRemoveMealItem,
  useNutritionSummary,
  useShoppingList,
  useRecipeSearch,
} from '@/api/mealPlans';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, MEAL_TYPE_COLORS, getCoverageStatus } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useMealPlanCockpit, useDayCockpit, useMealCockpit } from '@/api/cockpit';
import { CockpitDashboard as CockpitDashboardComponent, TrafficLightIndicator } from '@/components/cockpit';
import EmptyState from '@/components/shared/EmptyState';
import RecipeSearchDialog from './RecipeSearchDialog';
import TableView from './TableView';
import CostDashboard from './CostDashboard';

const LazyNutrientBalanceChart = lazy(() => import('@/components/charts/NutrientBalanceChart'));

/** Group a flat list of meals by date (from start_datetime), preserving sort order. */
function groupMealsByDate(meals: Meal[]): { date: string; meals: Meal[] }[] {
  const groups: Record<string, Meal[]> = {};
  for (const meal of meals) {
    const date = meal.start_datetime.slice(0, 10); // "YYYY-MM-DD"
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(meal);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, meals]) => ({ date, meals }));
}

export default function MealPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const mealPlanId = Number(id) || 0;

  const { data: plan, error, isLoading, refetch } = useMealPlan(mealPlanId);
  const updateMutation = useUpdateMealPlan(mealPlanId);
  const addDayBeforeMutation = useAddDayBefore(mealPlanId);
  const addDayAfterMutation = useAddDayAfter(mealPlanId);
  const removeDayMutation = useRemoveDay(mealPlanId);
  const addMealMutation = useAddMeal(mealPlanId);
  const removeMealMutation = useRemoveMeal(mealPlanId);
  const addMealItemMutation = useAddMealItem(mealPlanId);
  const removeMealItemMutation = useRemoveMealItem(mealPlanId);

  // Tab state
  const [activeTab, setActiveTab] = useState<'plan' | 'table' | 'nutrition' | 'costs' | 'shopping' | 'cockpit'>('plan');

  // Delete confirmations
  const [deleteDayDate, setDeleteDayDate] = useState<string | null>(null);
  const [deleteMealId, setDeleteMealId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  // Edit settings
  const [showSettings, setShowSettings] = useState(false);

  // Group meals by date for display
  const dayGroups = useMemo(() => {
    if (!plan) return [];
    return groupMealsByDate(plan.meals);
  }, [plan]);

  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!plan) return <ErrorDisplay error={new Error('Essensplan nicht gefunden')} />;

  const handleAddDayBefore = () => {
    addDayBeforeMutation.mutate(undefined, {
      onSuccess: () => toast.success('Tag davor hinzugefügt'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  const handleAddDayAfter = () => {
    addDayAfterMutation.mutate(undefined, {
      onSuccess: () => toast.success('Tag danach hinzugefügt'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  /** Default start/end times per meal type (HH:mm) */
  const MEAL_TYPE_DEFAULT_TIMES: Record<string, [string, string]> = {
    breakfast: ['08:00', '09:00'],
    lunch: ['12:00', '13:00'],
    dinner: ['18:00', '19:00'],
    snack: ['15:00', '15:30'],
    dessert: ['19:30', '20:00'],
  };

  const handleAddMealType = (date: string, mealType: string) => {
    const [startTime, endTime] = MEAL_TYPE_DEFAULT_TIMES[mealType] ?? ['12:00', '13:00'];
    addMealMutation.mutate(
      {
        start_datetime: `${date}T${startTime}:00`,
        end_datetime: `${date}T${endTime}:00`,
        meal_type: mealType,
      },
      {
        onSuccess: () => toast.success('Mahlzeit hinzugefügt'),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleAddRecipe = (mealId: number, recipeId: number) => {
    addMealItemMutation.mutate(
      { mealId, recipe_id: recipeId },
      {
        onSuccess: () => {
          toast.success('Rezept hinzugefügt');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleAddIngredient = (mealId: number, ingredientId: number, _portionId: number | null, measuringUnitId: number | null, quantity: number) => {
    addMealItemMutation.mutate(
      { mealId, ingredient_id: ingredientId, measuring_unit_id: measuringUnitId ?? undefined, quantity },
      {
        onSuccess: () => {
          toast.success('Zutat hinzugefügt');
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleSaveSettings = (data: {
    name?: string;
    description?: string;
    norm_portions?: number;
    activity_factor?: number;
    reserve_factor?: number;
    start_datetime?: string | null;
    end_datetime?: string | null;
  }) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Einstellungen gespeichert');
        setShowSettings(false);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton to="/meal-plans/app" />
        <div className="border-l pl-3 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{plan.name}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">group</span>
              {plan.norm_portions} Portionen
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">speed</span>
              PAL {plan.activity_factor}
            </span>
            {plan.event_name && (
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">celebration</span>
                {plan.event_name}
              </span>
            )}
          </div>
        </div>
        {plan.can_edit && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors self-start"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            Einstellungen
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && plan.can_edit && (
        <SettingsPanel plan={plan} onSave={handleSaveSettings} isPending={updateMutation.isPending} />
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {[
          { key: 'plan' as const, icon: 'calendar_month', label: 'Tagesplan' },
          { key: 'table' as const, icon: 'grid_on', label: 'Tabelle' },
          { key: 'nutrition' as const, icon: 'nutrition', label: 'Nährwerte' },
          { key: 'costs' as const, icon: 'payments', label: 'Kosten' },
          { key: 'shopping' as const, icon: 'shopping_cart', label: 'Einkaufsliste' },
          { key: 'cockpit' as const, icon: 'speed', label: 'Cockpit' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'plan' && (
        <DayPlanView
          mealPlanId={mealPlanId}
          dayGroups={dayGroups}
          canEdit={plan.can_edit}
          hasTimeframe={!!(plan.start_datetime && plan.end_datetime)}
          activityFactor={plan.activity_factor}
          onAddDayBefore={handleAddDayBefore}
          addDayBeforePending={addDayBeforeMutation.isPending}
          onAddDayAfter={handleAddDayAfter}
          addDayAfterPending={addDayAfterMutation.isPending}
          onDeleteDay={setDeleteDayDate}
          onAddMealType={handleAddMealType}
          onDeleteMeal={setDeleteMealId}
          onAddRecipe={handleAddRecipe}
          onAddIngredient={handleAddIngredient}
          onDeleteItem={setDeleteItemId}
        />
      )}
      {activeTab === 'nutrition' && <NutritionView mealPlanId={mealPlanId} />}
      {activeTab === 'table' && <TableView meals={plan.meals} normPortions={plan.norm_portions} />}
      {activeTab === 'costs' && <CostDashboard mealPlanId={mealPlanId} />}
      {activeTab === 'shopping' && <ShoppingView mealPlanId={mealPlanId} />}
      {activeTab === 'cockpit' && <CockpitView mealPlanId={mealPlanId} />}

      {/* Delete Day Confirm */}
      <ConfirmDialog
        open={deleteDayDate !== null}
        onConfirm={() => {
          if (deleteDayDate === null) return;
          removeDayMutation.mutate(deleteDayDate, {
            onSuccess: () => {
              toast.success('Tag gelöscht');
              setDeleteDayDate(null);
            },
            onError: (err) => toast.error('Fehler', { description: err.message }),
          });
        }}
        onCancel={() => setDeleteDayDate(null)}
        title="Tag löschen?"
        description="Alle Mahlzeiten und Rezeptzuordnungen dieses Tages werden gelöscht."
        confirmLabel="Löschen"
        loading={removeDayMutation.isPending}
      />

      {/* Delete Meal Confirm */}
      <ConfirmDialog
        open={deleteMealId !== null}
        onConfirm={() => {
          if (deleteMealId === null) return;
          removeMealMutation.mutate(deleteMealId, {
            onSuccess: () => {
              toast.success('Mahlzeit gelöscht');
              setDeleteMealId(null);
            },
            onError: (err) => toast.error('Fehler', { description: err.message }),
          });
        }}
        onCancel={() => setDeleteMealId(null)}
        title="Mahlzeit löschen?"
        description="Alle zugeordneten Rezepte werden entfernt."
        confirmLabel="Löschen"
        loading={removeMealMutation.isPending}
      />

      {/* Delete Item Confirm */}
      <ConfirmDialog
        open={deleteItemId !== null}
        onConfirm={() => {
          if (deleteItemId === null) return;
          removeMealItemMutation.mutate(deleteItemId, {
            onSuccess: () => {
              toast.success('Rezept entfernt');
              setDeleteItemId(null);
            },
            onError: (err) => toast.error('Fehler', { description: err.message }),
          });
        }}
        onCancel={() => setDeleteItemId(null)}
        title="Rezept entfernen?"
        description="Das Rezept wird aus der Mahlzeit entfernt."
        confirmLabel="Entfernen"
        loading={removeMealItemMutation.isPending}
      />
    </div>
  );
}

// ==========================================================================
// Settings Panel
// ==========================================================================

function SettingsPanel({
  plan,
  onSave,
  isPending,
}: {
  plan: { name: string; description: string; norm_portions: number; activity_factor: number; reserve_factor: number; start_datetime: string | null; end_datetime: string | null };
  onSave: (data: {
    name?: string;
    description?: string;
    norm_portions?: number;
    activity_factor?: number;
    reserve_factor?: number;
    start_datetime?: string | null;
    end_datetime?: string | null;
  }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [portions, setPortions] = useState(plan.norm_portions);
  const [activity, setActivity] = useState(plan.activity_factor);
  const [reserve, setReserve] = useState(plan.reserve_factor);
  const [startDatetime, setStartDatetime] = useState(plan.start_datetime ? plan.start_datetime.slice(0, 16) : '');
  const [endDatetime, setEndDatetime] = useState(plan.end_datetime ? plan.end_datetime.slice(0, 16) : '');

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6 space-y-4">
      <h3 className="font-semibold">Einstellungen</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Beschreibung</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Portionen (Personen)</label>
          <input
            type="number"
            min={1}
            value={portions}
            onChange={(e) => setPortions(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Aktivitätsfaktor (PAL)</label>
          <input
            type="number"
            min={1.0}
            max={3.0}
            step={0.1}
            value={activity}
            onChange={(e) => setActivity(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Reservefaktor</label>
          <input
            type="number"
            min={1.0}
            max={2.0}
            step={0.05}
            value={reserve}
            onChange={(e) => setReserve(Number(e.target.value))}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start (Datum & Uhrzeit)</label>
          <input
            type="datetime-local"
            value={startDatetime}
            onChange={(e) => setStartDatetime(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ende (Datum & Uhrzeit)</label>
          <input
            type="datetime-local"
            value={endDatetime}
            onChange={(e) => setEndDatetime(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => onSave({
            name,
            description,
            norm_portions: portions,
            activity_factor: activity,
            reserve_factor: reserve,
            start_datetime: startDatetime ? startDatetime + ':00' : null,
            end_datetime: endDatetime ? endDatetime + ':00' : null,
          })}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

// ==========================================================================
// Day Plan View
// ==========================================================================

function DayPlanView({
  mealPlanId,
  dayGroups,
  canEdit,
  hasTimeframe,
  activityFactor,
  onAddDayBefore,
  addDayBeforePending,
  onAddDayAfter,
  addDayAfterPending,
  onDeleteDay,
  onAddMealType,
  onDeleteMeal,
  onAddRecipe,
  onAddIngredient,
  onDeleteItem,
}: {
  mealPlanId: number;
  dayGroups: { date: string; meals: Meal[] }[];
  canEdit: boolean;
  hasTimeframe: boolean;
  activityFactor: number;
  onAddDayBefore: () => void;
  addDayBeforePending: boolean;
  onAddDayAfter: () => void;
  addDayAfterPending: boolean;
  onDeleteDay: (date: string) => void;
  onAddMealType: (date: string, mealType: string) => void;
  onDeleteMeal: (id: number) => void;
  onAddRecipe: (mealId: number, recipeId: number) => void;
  onAddIngredient: (mealId: number, ingredientId: number, portionId: number | null, measuringUnitId: number | null, quantity: number) => void;
  onDeleteItem: (id: number) => void;
}) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'];

  return (
    <div className="space-y-6">
      {/* Add Day Before */}
      {canEdit && hasTimeframe && (
        <div className="flex justify-center">
          <button
            onClick={onAddDayBefore}
            disabled={addDayBeforePending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-200 text-sm text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tag davor
          </button>
        </div>
      )}

      {/* Days */}
      {dayGroups.length === 0 ? (
        <EmptyState
          icon="event"
          title="Noch keine Tage vorhanden"
          description="Füge einen Tag hinzu, um mit der Planung zu beginnen."
        />
      ) : (
        dayGroups.map((group) => (
          <div key={group.date} className="rounded-xl border bg-card overflow-hidden">
            {/* Day Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="font-bold text-base sm:text-lg">{formatDate(group.date)}</h3>
                <DayCockpitDots mealPlanId={mealPlanId} date={group.date} />
              </div>
              {canEdit && (
                <button
                  onClick={() => onDeleteDay(group.date)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Tag löschen"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>

            {/* Meals */}
            <div className="divide-y">
              {group.meals.map((meal) => (
                <MealSlot
                  key={meal.id}
                  meal={meal}
                  canEdit={canEdit}
                  activityFactor={activityFactor}
                  onDeleteMeal={onDeleteMeal}
                  onAddRecipe={onAddRecipe}
                  onAddIngredient={onAddIngredient}
                  onDeleteItem={onDeleteItem}
                />
              ))}
            </div>

            {/* Add Meal */}
            {canEdit && (
              <div className="px-4 py-2 border-t bg-muted/30">
                <div className="flex flex-wrap gap-1">
                  {mealTypes
                    .filter((mt) => !group.meals.some((m) => m.meal_type === mt))
                    .map((mt) => (
                      <button
                        key={mt}
                        onClick={() => onAddMealType(group.date, mt)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm text-green-600 hover:bg-green-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">{MEAL_TYPE_ICONS[mt] || 'add'}</span>
                        {MEAL_TYPE_LABELS[mt] || mt}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Add Day After */}
      {canEdit && hasTimeframe && (
        <div className="flex justify-center">
          <button
            onClick={onAddDayAfter}
            disabled={addDayAfterPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-green-200 text-sm text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Tag danach
          </button>
        </div>
      )}
    </div>
  );
}

const RECIPE_TYPE_LABELS_SHORT: Record<string, string> = {
  breakfast: 'Frühstück',
  warm_meal: 'Warm',
  cold_meal: 'Kalt',
  dessert: 'Dessert',
  side_dish: 'Beilage',
  snack: 'Snack',
  drink: 'Getränk',
  simple_meal: 'Einfach',
};

function MealSlot({
  meal,
  canEdit,
  activityFactor,
  onDeleteMeal,
  onAddRecipe,
  onAddIngredient,
  onDeleteItem,
}: {
  meal: Meal;
  canEdit: boolean;
  activityFactor: number;
  onDeleteMeal: (id: number) => void;
  onAddRecipe: (mealId: number, recipeId: number) => void;
  onAddIngredient: (mealId: number, ingredientId: number, portionId: number | null, measuringUnitId: number | null, quantity: number) => void;
  onDeleteItem: (id: number) => void;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults } = useRecipeSearch({ q: debouncedQuery });

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchResults]);

  const handleSelect = (recipeId: number) => {
    onAddRecipe(meal.id, recipeId);
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const recipeResults = searchResults?.recipes ?? [];
    if (!recipeResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, recipeResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(recipeResults[highlightedIndex].id);
    } else if (e.key === 'Escape') {
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  const mealColors = MEAL_TYPE_COLORS[meal.meal_type] || MEAL_TYPE_COLORS.snack;
  const isEmpty = meal.items.length === 0;
  const coverage = getCoverageStatus(meal.total_energy_kj, meal.day_part_factor, activityFactor);
  const coverageColorClass = coverage.status === 'good' ? 'text-green-600' : coverage.status === 'warning' ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className={`px-4 py-3 border-l-4 ${isEmpty ? 'border-red-400 bg-red-50/50' : mealColors.border}`}>
      {/* Meal Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-[20px] ${isEmpty ? 'text-red-500' : mealColors.text}`}>
            {isEmpty ? 'warning' : (MEAL_TYPE_ICONS[meal.meal_type] || 'restaurant')}
          </span>
          <span className="font-semibold text-base">
            {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
          </span>
          <span className="text-sm text-muted-foreground">
            ({Math.round(meal.day_part_factor * 100)}%)
          </span>
          {!isEmpty && meal.total_energy_kj > 0 && (
            <span className={`text-sm font-medium ${coverageColorClass}`}>
              {coverage.percent}%
            </span>
          )}
          <MealCockpitDots mealId={meal.id} />
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <button
                onClick={() => {
                  setIsSearching(!isSearching);
                  setSearchQuery('');
                }}
                className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors"
                title="Rezept hinzufügen"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
              </button>
              <button
                onClick={() => onDeleteMeal(meal.id)}
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Mahlzeit löschen"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Meal Items */}
      {isEmpty && !isSearching && (
        <p className="text-sm text-red-500 italic pl-7 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">error</span>
          Noch kein Rezept zugeordnet
        </p>
      )}
      {meal.items.map((item) => (
        <div key={item.id} className="flex items-start gap-2 pl-7 py-1.5 group">
          {item.recipe_image && (
            <img
              src={item.recipe_image}
              alt={item.recipe_title}
              className="w-10 h-10 rounded object-cover flex-shrink-0"
              loading="lazy"
            />
          )}
          <div className="flex-1 min-w-0">
            <Link
              to={`/recipes/${item.recipe_slug}`}
              className="text-base hover:text-primary transition-colors truncate block"
            >
              {item.recipe_title}
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {item.energy_kj != null && (
                <span>{Math.round(item.energy_kj / 4.184)} kcal</span>
              )}
              {item.cost_eur != null && (
                <span>{item.cost_eur.toFixed(2)} €</span>
              )}
              {item.factor !== 1.0 && (
                <span>&times;{item.factor}</span>
              )}
            </div>
          </div>
          {canEdit && (
            <button
              onClick={() => onDeleteItem(item.id)}
              className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
              title="Entfernen"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      ))}

      {/* Recipe Search */}
      {isSearching && (
        <div className="pl-7 mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rezept suchen..."
              autoFocus
              className="flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={() => setDialogOpen(true)}
              className="p-1.5 rounded-lg border text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Detailsuche"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
            </button>
          </div>
          {searchResults && searchResults.recipes.length > 0 && (
            <div className="rounded-lg border bg-card max-h-40 overflow-y-auto divide-y">
              {searchResults.recipes.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                    idx === highlightedIndex ? 'bg-muted' : 'hover:bg-muted'
                  }`}
                >
                  <span>{r.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {RECIPE_TYPE_LABELS_SHORT[r.recipe_type] ?? ''}
                  </span>
                </button>
              ))}
            </div>
          )}
          {debouncedQuery.length >= 2 && searchResults && searchResults.recipes.length === 0 && (
            <p className="text-xs text-muted-foreground">Keine Rezepte gefunden</p>
          )}
        </div>
      )}

      {/* Recipe Search Dialog */}
      <RecipeSearchDialog
        mealType={meal.meal_type}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={(recipeId) => handleSelect(recipeId)}
        onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity) => {
          onAddIngredient(meal.id, ingredientId, portionId, measuringUnitId, quantity);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

// ==========================================================================
// Nutrition View
// ==========================================================================

function NutritionView({ mealPlanId }: { mealPlanId: number }) {
  const { data, error, isLoading, refetch } = useNutritionSummary(mealPlanId);
  const [showPerPortion, setShowPerPortion] = useState(false);

  if (error) return <ErrorDisplay error={error} variant="inline" onRetry={() => refetch()} />;
  if (isLoading) return <div className="h-48 bg-muted rounded-xl animate-pulse" />;
  if (!data) return null;

  const rows = showPerPortion
    ? [
        { label: 'Energie', value: `${Math.round(data.per_portion_energy_kj)} kJ`, icon: 'local_fire_department' },
        { label: 'Protein', value: `${data.per_portion_protein_g.toFixed(1)} g`, icon: 'fitness_center' },
        { label: 'Fett', value: `${data.per_portion_fat_g.toFixed(1)} g`, icon: 'water_drop' },
        { label: 'Kohlenhydrate', value: `${data.per_portion_carbohydrate_g.toFixed(1)} g`, icon: 'grain' },
        { label: 'Zucker', value: `${data.per_portion_sugar_g.toFixed(1)} g`, icon: 'cake' },
        { label: 'Ballaststoffe', value: `${data.per_portion_fibre_g.toFixed(1)} g`, icon: 'eco' },
        { label: 'Salz', value: `${data.per_portion_salt_g.toFixed(1)} g`, icon: 'water_drop' },
      ]
    : [
        { label: 'Energie', value: `${Math.round(data.energy_kj)} kJ`, icon: 'local_fire_department' },
        { label: 'Protein', value: `${data.protein_g.toFixed(1)} g`, icon: 'fitness_center' },
        { label: 'Fett', value: `${data.fat_g.toFixed(1)} g`, icon: 'water_drop' },
        { label: 'Kohlenhydrate', value: `${data.carbohydrate_g.toFixed(1)} g`, icon: 'grain' },
        { label: 'Zucker', value: `${data.sugar_g.toFixed(1)} g`, icon: 'cake' },
        { label: 'Ballaststoffe', value: `${data.fibre_g.toFixed(1)} g`, icon: 'eco' },
        { label: 'Salz', value: `${data.salt_g.toFixed(1)} g`, icon: 'water_drop' },
      ];

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">nutrition</span>
          Nährwert-Zusammenfassung {showPerPortion ? '(pro Normportion)' : '(gesamt)'}
        </h3>
        <button
          type="button"
          onClick={() => setShowPerPortion(!showPerPortion)}
          className="text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted/50 transition-colors font-medium"
        >
          {showPerPortion ? 'Gesamt anzeigen' : `Pro Portion (${data.norm_portions})`}
        </button>
      </div>
      <div className="divide-y">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
            <span className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">{row.icon}</span>
              {row.label}
            </span>
            <span className="text-sm font-medium">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Nutrient Balance Chart */}
      {(data.protein_g > 0 || data.fat_g > 0 || data.carbohydrate_g > 0) && (
        <div className="px-4 py-4 border-t">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            Nährstoff-Verteilung {showPerPortion ? '(pro Portion)' : '(gesamt)'}
          </h4>
          <Suspense fallback={<div className="h-[260px] bg-muted rounded-xl animate-pulse" />}>
            <LazyNutrientBalanceChart
              proteinG={showPerPortion ? data.per_portion_protein_g : data.protein_g}
              fatG={showPerPortion ? data.per_portion_fat_g : data.fat_g}
              carbsG={showPerPortion ? data.per_portion_carbohydrate_g : data.carbohydrate_g}
              sugarG={showPerPortion ? data.per_portion_sugar_g : data.sugar_g}
              fibreG={showPerPortion ? data.per_portion_fibre_g : data.fibre_g}
              saltG={showPerPortion ? data.per_portion_salt_g : data.salt_g}
              label={showPerPortion ? 'Pro Normportion' : 'Gesamt'}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Shopping Item with Sources (Expand/Collapse)
// ==========================================================================

interface TransientShoppingItem {
  ingredient_name: string;
  ingredient_slug?: string;
  total_quantity_g: number;
  unit: string;
  retail_section: string;
  estimated_price_eur: number | null;
  display_quantity?: string;
  display_text?: string;
  natural_portions?: string;
  sources?: Array<{ recipe_id: number; recipe_name?: string; recipe_slug?: string; meal_label?: string; quantity_g?: number }>;
}

function ShoppingItemWithSources({ item }: { item: TransientShoppingItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasSources = item.sources && item.sources.length > 0;

  return (
    <div>
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => hasSources && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {hasSources && (
            <span className={`material-symbols-outlined text-[16px] text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}>
              chevron_right
            </span>
          )}
          {item.ingredient_slug ? (
            <Link
              to={`/ingredients/${item.ingredient_slug}`}
              className="text-sm hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {item.ingredient_name}
            </Link>
          ) : (
            <span className="text-sm">{item.ingredient_name}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{item.display_quantity || item.display_text || `${Math.round(item.total_quantity_g)} ${item.unit}`}</span>
          {item.estimated_price_eur !== null ? (
            <span className="text-foreground font-medium">
              {item.estimated_price_eur.toFixed(2)} EUR
            </span>
          ) : (
            <span className="text-red-400 text-xs">kein Preis</span>
          )}
        </div>
      </div>
      {expanded && hasSources && (
        <div className="pl-10 pr-4 pb-2 space-y-1">
          {item.sources!.map((source, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/60">&#8226;</span>
                {source.recipe_slug ? (
                  <Link
                    to={`/recipes/${source.recipe_slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {source.recipe_name}
                  </Link>
                ) : (
                  <span>{source.recipe_name}</span>
                )}
                {source.meal_label && (
                  <span className="text-muted-foreground/60">({source.meal_label})</span>
                )}
              </div>
              <span>{Math.round(source.quantity_g || 0)} g</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Shopping View
// ==========================================================================

function ShoppingView({ mealPlanId }: { mealPlanId: number }) {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data, error, isLoading, refetch } = useShoppingList(mealPlanId);
  const createFromMealPlan = useCreateFromMealPlan();

  if (error) return <ErrorDisplay error={error} variant="inline" onRetry={() => refetch()} />;
  if (isLoading) return <div className="h-48 bg-muted rounded-xl animate-pulse" />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="shopping_cart"
        title="Noch keine Zutaten"
        description="Füge Rezepte zu den Mahlzeiten hinzu, um die Einkaufsliste zu sehen."
      />
    );
  }

  // Group by retail section
  const grouped: Record<string, typeof data> = {};
  for (const item of data) {
    const section = item.retail_section || 'Sonstiges';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(item);
  }

  const totalPrice = data.reduce((sum, item) => sum + (item.estimated_price_eur || 0), 0);

  return (
    <div className="space-y-4">
      {/* Export to persistent shopping list */}
      {currentUser && (
        <button
          type="button"
          disabled={createFromMealPlan.isPending}
          onClick={() => {
            createFromMealPlan.mutate(mealPlanId, {
              onSuccess: (created) => {
                toast.success('Einkaufsliste erstellt');
                navigate(`/shopping-lists/${created.id}`);
              },
              onError: (err) =>
                toast.error('Fehler', { description: err.message }),
            });
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full justify-center disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">
            {createFromMealPlan.isPending ? 'hourglass_empty' : 'shopping_cart'}
          </span>
          {createFromMealPlan.isPending
            ? 'Erstelle Einkaufsliste...'
            : 'Einkaufsliste erstellen'}
        </button>
      )}

      {Object.entries(grouped).map(([section, items]) => (
        <div key={section} className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/50 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">storefront</span>
              {section}
            </h3>
          </div>
          <div className="divide-y">
            {items.map((item, idx) => (
              <ShoppingItemWithSources key={idx} item={item} />
            ))}
          </div>
        </div>
      ))}

      {/* Total */}
      {totalPrice > 0 && (
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
          <span className="font-semibold">Geschätzter Gesamtpreis</span>
          <span className="font-bold text-lg">{totalPrice.toFixed(2)} EUR</span>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Day Cockpit Dots — compact traffic light dots for a single day
// ==========================================================================

function DayCockpitDots({ mealPlanId, date }: { mealPlanId: number; date: string }) {
  const { data: cockpit } = useDayCockpit(mealPlanId, date);

  if (!cockpit || cockpit.evaluations.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {cockpit.evaluations.map((evaluation) => (
        <TrafficLightIndicator
          key={evaluation.rule_id}
          evaluation={evaluation}
          compact
        />
      ))}
    </div>
  );
}

// ==========================================================================
// Meal Cockpit Dots — compact traffic light dots for a single meal
// ==========================================================================

function MealCockpitDots({ mealId }: { mealId: number }) {
  const { data: cockpit } = useMealCockpit(mealId);

  if (!cockpit || cockpit.evaluations.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {cockpit.evaluations.map((evaluation) => (
        <TrafficLightIndicator
          key={evaluation.rule_id}
          evaluation={evaluation}
          compact
        />
      ))}
    </div>
  );
}

// ==========================================================================
// CockpitView — Health rule traffic lights (full dashboard)
// ==========================================================================

function CockpitView({ mealPlanId }: { mealPlanId: number }) {
  const { data: cockpit, error, isLoading } = useMealPlanCockpit(mealPlanId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <span className="material-symbols-outlined text-4xl mb-2 block">error</span>
        <p>Cockpit konnte nicht geladen werden.</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (!cockpit) return null;

  return (
    <CockpitDashboardComponent
      dashboard={cockpit}
      title="Gesamtstatus"
      showTips
    />
  );
}
