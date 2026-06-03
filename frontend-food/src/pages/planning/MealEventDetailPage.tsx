import { useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BackButton } from '@/components/shared/BackButton';
import { toast } from 'sonner';
import { useCreateFromMealPlan } from '@/api/shoppingLists';
import { useCurrentUser } from '@/api/auth';
import { useUnlinkMeal, useLinkMeal, useRefMeals } from '@/api/refMeals';
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
  useUpdateMealItem,
  useUpdateMeal,
  useNutritionSummary,
  useShoppingList,
  useRecipeSuggestions,
} from '@/api/mealPlans';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, MEAL_TYPE_COLORS, getCoverageStatus, NORM_PERSON_DAILY_KCAL } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import { kjToKcal } from '@/utils/nutritionUnits';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SuggestionDashboard } from '@/components/suggestions';
import { useRules } from '@/api/suggestions';
import SollIstBar from '@/components/shared/SollIstBar';
import EmptyState from '@/components/shared/EmptyState';
import RecipeSearchDialog from './RecipeSearchDialog';
import TableView from './TableView';
import CostDashboard from './CostDashboard';

import { cn } from '@/lib/utils';
const LazyNutrientBalanceChart = lazy(() => import('@/components/charts/NutrientBalanceChart'));

/** Group a flat list of meals by date (from start_datetime), preserving sort order. */
function groupMealsByDate(meals: Meal[]): { date: string; meals: Meal[] }[] {
  const groups: Record<string, Meal[]> = {};
  for (const meal of meals) {
    if (!meal.start_datetime) continue; // Skip reference meals
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
  const updateMealItemMutation = useUpdateMealItem(mealPlanId);
  const updateMealMutation = useUpdateMeal(mealPlanId);

  // RefMeal hooks
  const { data: refMeals } = useRefMeals(mealPlanId);
  const unlinkMealMutation = useUnlinkMeal(mealPlanId);
  const linkMealMutation = useLinkMeal(mealPlanId);

  // Tab state
  const [activeTab, setActiveTab] = useState<'plan' | 'table' | 'nutrition' | 'costs' | 'shopping' | 'suggestions'>('plan');

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

  const handleUpdateItemFactor = useCallback((itemId: number, factor: number) => {
    updateMealItemMutation.mutate(
      { itemId, factor },
      {
        onError: (err: any) => toast.error('Fehler', { description: err.message }),
      },
    );
  }, [updateMealItemMutation]);

  const handleUpdateMeal = useCallback((mealId: number, data: {
    note?: string | null;
    override_portions?: number | null;
    day_part_factor?: number | null;
    is_external?: boolean | null;
    external_energy_kcal?: number | null;
  }) => {
    updateMealMutation.mutate(
      { mealId, ...data },
      {
        onError: (err: any) => toast.error('Fehler', { description: err.message }),
      },
    );
  }, [updateMealMutation]);

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

  const handleAddMealType = (date: string, mealType: string): Promise<Meal> => {
    const [startTime, endTime] = MEAL_TYPE_DEFAULT_TIMES[mealType] ?? ['12:00', '13:00'];
    return addMealMutation.mutateAsync(
      {
        start_datetime: `${date}T${startTime}:00`,
        end_datetime: `${date}T${endTime}:00`,
        meal_type: mealType,
      }
    ).then((res) => {
      toast.success('Mahlzeit hinzugefügt');
      return res;
    }).catch((err) => {
      toast.error('Fehler', { description: err.message });
      throw err;
    });
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

  const handleUnlinkMeal = (mealId: number) => {
    unlinkMealMutation.mutate(mealId, {
      onSuccess: () => toast.success('Mahlzeit entkoppelt'),
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
  };

  const handleLinkMeal = (mealId: number, mealType: string) => {
    const ref = refMeals?.find((rm) => rm.meal_type === mealType);
    if (!ref) {
      toast.error('Kein RefMeal vorhanden. Erstelle zuerst eine Referenz-Mahlzeit.');
      return;
    }
    linkMealMutation.mutate(
      { mealId, data: { ref_meal_id: ref.id } },
      {
        onSuccess: () => toast.success('Mahlzeit verknüpft und synchronisiert'),
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  const handleSaveSettings = (data: {
    name?: string;
    description?: string;
    norm_portions?: number;
    reserve_factor?: number;
    budget_per_person_per_day?: number | null;
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
            <span className="inline-flex items-center gap-1" title="Reservefaktor für Einkaufsmengen">
              <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
              Reserve: +{Math.round((plan.reserve_factor - 1) * 100)}%
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
          { key: 'suggestions' as const, icon: 'lightbulb', label: 'Vorschläge' },
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
          normPortions={plan.norm_portions}
          budgetPerPersonPerDay={plan.budget_per_person_per_day}
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
          onUpdateItemFactor={handleUpdateItemFactor}
          onUnlinkMeal={handleUnlinkMeal}
          onLinkMeal={handleLinkMeal}
          onUpdateMeal={handleUpdateMeal}
        />
      )}
      {activeTab === 'nutrition' && <NutritionView mealPlanId={mealPlanId} meals={plan.meals} />}
      {activeTab === 'table' && (
        <TableView
          meals={plan.meals}
          normPortions={plan.norm_portions}
          budgetPerPersonPerDay={plan.budget_per_person_per_day}
          canEdit={plan.can_edit}
          onAddMealType={handleAddMealType}
          onAddRecipe={handleAddRecipe}
          onAddIngredient={handleAddIngredient}
          onDeleteItem={setDeleteItemId}
          onUpdateItemFactor={handleUpdateItemFactor}
          onDeleteMeal={setDeleteMealId}
          onUpdateMeal={handleUpdateMeal}
        />
      )}
      {activeTab === 'costs' && <CostDashboard mealPlanId={mealPlanId} budgetPerPersonPerDay={plan.budget_per_person_per_day} />}
      {activeTab === 'shopping' && <ShoppingView mealPlanId={mealPlanId} />}
      {activeTab === 'suggestions' && <SuggestionDashboard mealPlanId={mealPlanId} />}

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
  plan: {
    name: string;
    description: string;
    norm_portions: number;
    reserve_factor: number;
    budget_per_person_per_day: number | null;
    start_datetime: string | null;
    end_datetime: string | null;
    day_part_factors?: Record<string, number>;
  };
  onSave: (data: {
    name?: string;
    description?: string;
    norm_portions?: number;
    reserve_factor?: number;
    budget_per_person_per_day?: number | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
    day_part_factors?: Record<string, number>;
  }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description);
  const [portions, setPortions] = useState(plan.norm_portions);
  const [reserve, setReserve] = useState(plan.reserve_factor);
  const [budget, setBudget] = useState(plan.budget_per_person_per_day ?? '');
  const [startDatetime, setStartDatetime] = useState(plan.start_datetime ? plan.start_datetime.slice(0, 16) : '');
  const [endDatetime, setEndDatetime] = useState(plan.end_datetime ? plan.end_datetime.slice(0, 16) : '');

  const defaultFactors = {
    breakfast: 0.20,
    lunch: 0.35,
    dinner: 0.35,
    snack: 0.10,
  };
  const [factors, setFactors] = useState<Record<string, number>>(plan.day_part_factors || defaultFactors);

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
          <label className="block text-sm font-medium mb-1">Budget (€/Person/Tag)</label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={budget}
            onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="z.B. 8.00"
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

      <div className="border-t pt-4">
        <h4 className="font-semibold text-sm mb-3">Tagesanteil-Faktoren für Mahlzeiten</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(factors).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1 capitalize">
                {MEAL_TYPE_LABELS[key] || key}
              </label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={value}
                onChange={(e) => {
                  const newval = Number(e.target.value);
                  setFactors(prev => ({ ...prev, [key]: newval }));
                }}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Summe der Faktoren: <span className={Math.abs(Object.values(factors).reduce((a, b) => a + b, 0) - 1.0) < 0.001 ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
            {Object.values(factors).reduce((a, b) => a + b, 0).toFixed(2)}
          </span> (Sollte idealerweise 1,00 ergeben).
        </p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onSave({
            name,
            description,
            norm_portions: portions,
            reserve_factor: reserve,
            budget_per_person_per_day: budget === '' ? null : Number(budget),
            start_datetime: startDatetime ? startDatetime + ':00' : null,
            end_datetime: endDatetime ? endDatetime + ':00' : null,
            day_part_factors: factors,
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

function FactorInput({ value, onChange }: { value: number; onChange: (factor: number) => void }) {
  const formatFactor = (v: number) => v.toFixed(1).replace('.', ',');
  const [localValue, setLocalValue] = useState(formatFactor(value));
  const lastSaved = useRef(value);

  useEffect(() => {
    if (value !== lastSaved.current) {
      setLocalValue(formatFactor(value));
      lastSaved.current = value;
    }
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(localValue.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0 && parsed !== lastSaved.current) {
      lastSaved.current = parsed;
      onChange(parsed);
    } else {
      setLocalValue(formatFactor(lastSaved.current));
    }
  };

  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="text-muted-foreground">&times;</span>
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
        className="w-14 px-1 py-0.5 text-sm border rounded bg-background text-center"
      />
    </span>
  );
}

function DayPlanView({
  mealPlanId,
  dayGroups,
  canEdit,
  hasTimeframe,
  normPortions,
  budgetPerPersonPerDay,
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
  onUpdateItemFactor,
  onUnlinkMeal,
  onLinkMeal,
  onUpdateMeal,
}: {
  mealPlanId: number;
  dayGroups: { date: string; meals: Meal[] }[];
  canEdit: boolean;
  hasTimeframe: boolean;
  normPortions: number;
  budgetPerPersonPerDay?: number | null;
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
  onUpdateItemFactor: (itemId: number, factor: number) => void;
  onUnlinkMeal: (mealId: number) => void;
  onLinkMeal: (mealId: number, mealType: string) => void;
  onUpdateMeal: (mealId: number, data: {
    note?: string | null;
    override_portions?: number | null;
    day_part_factor?: number | null;
    is_external?: boolean | null;
    external_energy_kcal?: number | null;
  }) => void;
}) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <div className="space-y-6">
      {/* RefMeal Links */}
      {canEdit && (
        <div className="flex flex-wrap gap-2 px-1">
          {['breakfast', 'snack'].map((mt) => (
            <Link
              key={mt}
              to={`/meal-plans/${mealPlanId}/ref-meals/${mt}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-accent transition-colors"
            >
              <span className="text-xs">🔗</span>
              Referenz: {MEAL_TYPE_LABELS[mt] || mt}
            </Link>
          ))}
        </div>
      )}

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
        dayGroups.map((group) => {
          const dayActualKcal = Math.round(group.meals.reduce((sum, m) => sum + kjToKcal(m.total_energy_kj / normPortions), 0));
          const dayTargetKcal = Math.round(group.meals.reduce((sum, m) => sum + NORM_PERSON_DAILY_KCAL * m.day_part_factor, 0));
          const dayActualCost = group.meals.reduce((sum, m) => sum + m.total_cost_eur / normPortions, 0);
          const dayTargetCost = budgetPerPersonPerDay ? group.meals.reduce((sum, m) => sum + budgetPerPersonPerDay * m.day_part_factor, 0) : 0;

          return (
            <div key={group.date} className="rounded-xl border bg-card overflow-hidden">
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-muted/50 border-b gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg">{formatDate(group.date)}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="bg-background px-2 py-0.5 rounded border border-border/50 font-medium">
                      🔥 Kcal: Soll {dayTargetKcal} / Ist {dayActualKcal} kcal
                    </span>
                    {budgetPerPersonPerDay != null && budgetPerPersonPerDay > 0 && (
                      <span className="bg-background px-2 py-0.5 rounded border border-border/50 font-medium">
                        💰 Preis: Soll {dayTargetCost.toFixed(2)} € / Ist {dayActualCost.toFixed(2)} €
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => onDeleteDay(group.date)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors self-end sm:self-auto"
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
                    normPortions={normPortions}
                    budgetPerPersonPerDay={budgetPerPersonPerDay}
                    onDeleteMeal={onDeleteMeal}
                    onAddRecipe={onAddRecipe}
                    onAddIngredient={onAddIngredient}
                    onDeleteItem={onDeleteItem}
                    onUpdateItemFactor={onUpdateItemFactor}
                    onUnlinkMeal={onUnlinkMeal}
                    onLinkMeal={onLinkMeal}
                    onUpdateMeal={onUpdateMeal}
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
        );
      }))}

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

function MealSlot({
  meal,
  canEdit,
  normPortions,
  budgetPerPersonPerDay,
  onDeleteMeal,
  onAddRecipe,
  onAddIngredient,
  onDeleteItem,
  onUpdateItemFactor,
  onUnlinkMeal,
  onLinkMeal,
  onUpdateMeal,
}: {
  meal: Meal;
  canEdit: boolean;
  normPortions: number;
  budgetPerPersonPerDay?: number | null;
  onDeleteMeal: (id: number) => void;
  onAddRecipe: (mealId: number, recipeId: number) => void;
  onAddIngredient: (mealId: number, ingredientId: number, portionId: number | null, measuringUnitId: number | null, quantity: number) => void;
  onDeleteItem: (id: number) => void;
  onUpdateItemFactor: (itemId: number, factor: number) => void;
  onUnlinkMeal: (mealId: number) => void;
  onLinkMeal: (mealId: number, mealType: string) => void;
  onUpdateMeal: (mealId: number, data: {
    note?: string | null;
    override_portions?: number | null;
    day_part_factor?: number | null;
    is_external?: boolean | null;
    external_energy_kcal?: number | null;
  }) => void;
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showMealSettings, setShowMealSettings] = useState(false);

  // Debounce search query (200ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: suggestions } = useRecipeSuggestions({
    mealType: meal.meal_type,
    q: debouncedQuery || undefined,
  });

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  const handleSelect = (recipeId: number) => {
    onAddRecipe(meal.id, recipeId);
    setIsSearching(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const results = suggestions ?? [];
    if (!results.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex].id);
    } else if (e.key === 'Escape') {
      setIsSearching(false);
      setSearchQuery('');
    }
  };

  const mealColors = MEAL_TYPE_COLORS[meal.meal_type] || MEAL_TYPE_COLORS.snack;
  const isEmpty = meal.items.length === 0;
  const coverage = getCoverageStatus(kjToKcal(meal.total_energy_kj / normPortions), meal.day_part_factor);
  const coverageColorClass = coverage.status === 'good' ? 'text-green-600' : coverage.status === 'warning' ? 'text-yellow-600' : 'text-red-600';

  const mealTargetKcal = Math.round(NORM_PERSON_DAILY_KCAL * meal.day_part_factor);
  const mealActualKcal = Math.round(kjToKcal(meal.total_energy_kj / normPortions));
  const actualDailyPercent = Math.round((mealActualKcal / NORM_PERSON_DAILY_KCAL) * 100);
  const mealTargetCost = budgetPerPersonPerDay ? budgetPerPersonPerDay * meal.day_part_factor : 0;
  const mealActualCost = meal.total_cost_eur / normPortions;

  return (
    <div className={`px-4 py-3 border-l-4 ${isEmpty && !meal.is_external ? 'border-red-400 bg-red-50/50' : mealColors.border}`}>
      {/* Meal Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-[20px] ${isEmpty && !meal.is_external ? 'text-red-500' : mealColors.text}`}>
            {isEmpty && !meal.is_external ? 'warning' : (MEAL_TYPE_ICONS[meal.meal_type] || 'restaurant')}
          </span>
          <span className="font-semibold text-base">
            {MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}
          </span>
          <span className="text-sm text-muted-foreground">
            Soll: {Math.round(meal.day_part_factor * 100)}%
          </span>
          {(!isEmpty || meal.is_external) && meal.total_energy_kj > 0 && (
            <span className={`text-sm font-medium ${coverageColorClass}`}>
              │ Ist: {actualDailyPercent}%
            </span>
          )}

        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <>
              <button
                onClick={() => setShowMealSettings(!showMealSettings)}
                className={`p-1 rounded transition-colors ${showMealSettings ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted/10'}`}
                title="Mahlzeit-Einstellungen"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
              {meal.is_synced ? (
                <button
                  onClick={() => onUnlinkMeal(meal.id)}
                  className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Vom RefMeal entkoppeln"
                >
                  <span className="material-symbols-outlined text-[20px]">link_off</span>
                </button>
              ) : (
                <button
                  onClick={() => onLinkMeal(meal.id, meal.meal_type)}
                  className="p-1 rounded text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Mit RefMeal verknüpfen"
                >
                  <span className="material-symbols-outlined text-[20px]">link</span>
                </button>
              )}
              {!meal.is_synced && !meal.is_external && (
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
              )}
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

      {/* Meal Soll/Ist stats */}
      {(!isEmpty || meal.is_external) && (
        <div className="pl-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
          <span className="inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/30">
            🔥 Kcal: Soll {mealTargetKcal} / <span className={`${coverageColorClass} font-medium`}>Ist {mealActualKcal} kcal</span>
          </span>
          {budgetPerPersonPerDay != null && budgetPerPersonPerDay > 0 && (
            <span className="inline-flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded border border-border/30">
              💰 Preis: Soll {mealTargetCost.toFixed(2)} € / Ist {mealActualCost.toFixed(2)} €
            </span>
          )}
        </div>
      )}

      {/* Meal Settings Panel */}
      {showMealSettings && (
        <div className="pl-7 pr-4 py-3 border rounded-lg bg-muted/20 my-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-muted-foreground">Tagesanteil-Faktor</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={meal.day_part_factor}
                onChange={(e) => onUpdateMeal(meal.id, { day_part_factor: Number(e.target.value) })}
                className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={meal.is_external}
                  onChange={(e) => onUpdateMeal(meal.id, { is_external: e.target.checked })}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-sm font-medium">Externe Mahlzeit</span>
              </label>
            </div>

            {meal.is_external && (
              <div>
                <label className="block text-xs font-semibold mb-1 text-muted-foreground">Energie (kcal)</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={meal.external_energy_kcal ?? ''}
                  onChange={(e) => onUpdateMeal(meal.id, { external_energy_kcal: e.target.value === '' ? null : Number(e.target.value) })}
                  placeholder="z.B. 450"
                  className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center text-xs text-muted-foreground border-t pt-2">
            <span>Inhalte werden bei externen Mahlzeiten ignoriert.</span>
            <button 
              onClick={() => setShowMealSettings(false)}
              className="font-medium hover:text-foreground text-primary"
            >
              Fertig
            </button>
          </div>
        </div>
      )}

      {/* Meal Items */}
      {meal.is_synced && !isEmpty && (
        <p className="text-xs text-blue-500 font-medium pl-7 flex items-center gap-1 mb-1">
          <span className="material-symbols-outlined text-[14px]">sync</span>
          Referenz-Mahlzeit
        </p>
      )}
      {isEmpty && !isSearching && (
        <p className="text-sm text-red-500 italic pl-7 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">error</span>
          Noch kein Rezept zugeordnet
        </p>
      )}
      {meal.items.map((item) => (
        <div key={item.id} className={`flex items-start gap-2 pl-7 py-1.5 group ${meal.is_synced ? 'text-muted-foreground' : ''}`}>
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
                <span>{Math.round(kjToKcal(item.energy_kj / normPortions))} kcal</span>
              )}
              {item.cost_eur != null && (
                <span>{(item.cost_eur / normPortions).toFixed(2)} €</span>
              )}
              {canEdit && !meal.is_synced ? (
                <FactorInput value={item.factor} onChange={(f) => onUpdateItemFactor(item.id, f)} />
              ) : (
                item.factor !== 1.0 && <span>&times;{item.factor.toFixed(1).replace('.', ',')}</span>
              )}
            </div>
          </div>
          {canEdit && !meal.is_synced && (
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
          {suggestions && suggestions.length > 0 && (
            <div className="rounded-lg border bg-card max-h-40 overflow-y-auto divide-y">
              {suggestions.map((r, idx) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                    idx === highlightedIndex ? 'bg-muted' : 'hover:bg-muted'
                  }`}
                >
                  <span>{r.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.usage_count}x
                  </span>
                </button>
              ))}
            </div>
          )}
          {debouncedQuery.length >= 1 && suggestions && suggestions.length === 0 && (
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

function NutritionView({ mealPlanId, meals = [] }: { mealPlanId: number; meals?: Meal[] }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { data, error, isLoading, refetch } = useNutritionSummary(mealPlanId, selectedDate || undefined);
  const { data: rules } = useRules();
  const [showPerPortion, setShowPerPortion] = useState(true);

  // Group meals by date to get unique dates
  const dayGroups = useMemo(() => groupMealsByDate(meals), [meals]);
  const uniqueDates = useMemo(() => dayGroups.map((g) => g.date), [dayGroups]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };

  if (error) return <ErrorDisplay error={error} variant="inline" onRetry={() => refetch()} />;
  if (isLoading) return <div className="h-48 bg-muted rounded-xl animate-pulse" />;
  if (!data) return null;

  const numDays = Math.max(uniqueDates.length, 1);

  function evaluateRuleStatus(
    val: number,
    min_green: number | null,
    max_green: number | null,
    min_yellow: number | null,
    max_yellow: number | null
  ): 'green' | 'yellow' | 'red' {
    if (min_yellow !== null && val < min_yellow) return 'red';
    if (max_yellow !== null && val > max_yellow) return 'red';
    if (min_green !== null && val < min_green) return 'yellow';
    if (max_green !== null && val > max_green) return 'yellow';
    return 'green';
  }

  const rows = [
    {
      label: 'Energie',
      parameter: 'energy_kj',
      totalValue: Math.round(kjToKcal(data.energy_kj)),
      perPortionValue: Math.round(kjToKcal(data.per_portion_energy_kj)),
      unit: 'kcal',
      icon: 'local_fire_department',
    },
    {
      label: 'Protein',
      parameter: 'protein_g',
      totalValue: data.protein_g,
      perPortionValue: data.per_portion_protein_g,
      unit: 'g',
      icon: 'fitness_center',
    },
    {
      label: 'Fett',
      parameter: 'fat_g',
      totalValue: data.fat_g,
      perPortionValue: data.per_portion_fat_g,
      unit: 'g',
      icon: 'water_drop',
    },
    {
      label: 'Kohlenhydrate',
      parameter: 'carbohydrate_g',
      totalValue: data.carbohydrate_g,
      perPortionValue: data.per_portion_carbohydrate_g,
      unit: 'g',
      icon: 'grain',
    },
    {
      label: 'Zucker',
      parameter: 'sugar_g',
      totalValue: data.sugar_g,
      perPortionValue: data.per_portion_sugar_g,
      unit: 'g',
      icon: 'cake',
    },
    {
      label: 'Ballaststoffe',
      parameter: 'fibre_g',
      totalValue: data.fibre_g,
      perPortionValue: data.per_portion_fibre_g,
      unit: 'g',
      icon: 'eco',
    },
    {
      label: 'Salz',
      parameter: 'salt_g',
      totalValue: data.salt_g,
      perPortionValue: data.per_portion_salt_g,
      unit: 'g',
      icon: 'water_drop',
    },
  ];

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-muted/50 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">nutrition</span>
            Nährwert-Zusammenfassung {showPerPortion ? '(pro Normportion)' : '(gesamt)'}
          </h3>

          {/* Horizontal Day-by-Day (Bar7) Selector */}
          {uniqueDates.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full sm:ml-2">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors",
                  selectedDate === null
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/60 bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                Gesamter Plan ({numDays} Tage)
              </button>
              {uniqueDates.map((date) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg border font-medium whitespace-nowrap transition-colors",
                    selectedDate === date
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/60 bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {formatDate(date)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowPerPortion(!showPerPortion)}
          className="text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted/50 transition-colors font-medium self-end sm:self-auto"
        >
          {showPerPortion ? 'Gesamt anzeigen' : `Pro Portion (${data.norm_portions})`}
        </button>
      </div>
      <div className="divide-y">
        {rows.map((row) => {
          // Find the active rule for this parameter
          const activeRule = rules?.find(
            (r) =>
              r.parameter === row.parameter &&
              (r.scope === 'meal_event' || r.scope === 'day')
          );

          // The rules operate "pro Person pro Tag" (daily average per portion).
          // For the SollIstBar, we always compare the daily per-portion average to the rules.
          // If a specific day is selected, we don't divide by numDays since the data is already daily.
          const dailyPortionVal = selectedDate ? row.perPortionValue : row.perPortionValue / numDays;

          const hasSollIst = !!activeRule;
          const status = activeRule
            ? evaluateRuleStatus(
                dailyPortionVal,
                activeRule.min_green,
                activeRule.max_green,
                activeRule.min_yellow,
                activeRule.max_yellow
              )
            : 'green';

          const target_mid = activeRule
            ? activeRule.min_green !== null && activeRule.max_green !== null
              ? (activeRule.min_green + activeRule.max_green) / 2
              : activeRule.min_green ?? activeRule.max_green
            : null;

          const displayVal = showPerPortion
            ? `${row.perPortionValue.toFixed(row.unit === 'kcal' ? 0 : 1)} ${row.unit}`
            : `${row.totalValue.toFixed(row.unit === 'kcal' ? 0 : 1)} ${row.unit}`;

          return (
            <div key={row.label} className="px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                    {row.icon}
                  </span>
                  {row.label}
                </span>
                <span className="text-sm font-semibold">{displayVal}</span>
              </div>

              {hasSollIst && activeRule && (
                <div className="pl-6 max-w-xl">
                  <SollIstBar
                    current={dailyPortionVal}
                    min_green={activeRule.min_green}
                    max_green={activeRule.max_green}
                    target_mid={target_mid}
                    status={status}
                    unit={row.unit}
                  />
                </div>
              )}
            </div>
          );
        })}
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
