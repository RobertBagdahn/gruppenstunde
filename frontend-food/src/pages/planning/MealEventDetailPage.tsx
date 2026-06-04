import { useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { BackButton } from '@/components/shared/BackButton';
import { toast } from 'sonner';
import {
  Calendar,
  Users,
  ShoppingCart,
  Sparkles,
  Settings,
  Grid3X3,
  Scale,
  DollarSign,
  Lightbulb,
} from 'lucide-react';
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
  useScaleMealToTarget,
  useCopyMealItem,
} from '@/api/mealPlans';
import { MEAL_TYPE_ORDER } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SuggestionDashboard } from '@/components/suggestions';
import TableView from './TableView';
import CostDashboard from './CostDashboard';
import SettingsPanel from './SettingsPanel';
import NutritionView from './NutritionView';
import ShoppingView from './ShoppingView';
import { DayPlanView } from './DayPlanView';
import { CopyMealItemDialog } from './CopyMealItemDialog';

/** Group a flat list of meals by date (from start_datetime), sorted by MEAL_TYPE_ORDER. */
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
    .map(([date, meals]) => ({
      date,
      meals: meals.sort((a, b) => {
        const getOrder = (mt: string) => {
          const idx = MEAL_TYPE_ORDER.indexOf(mt as typeof MEAL_TYPE_ORDER[number]);
          return idx === -1 ? 999 : idx;
        };
        return getOrder(a.meal_type) - getOrder(b.meal_type);
      }),
    }));
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

  const scaleMealMutation = useScaleMealToTarget(mealPlanId);
  const copyMealItemMutation = useCopyMealItem(mealPlanId);

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
  const [copyItemId, setCopyItemId] = useState<number | null>(null);

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
    external_cost_per_person?: number | null;
  }) => {
    updateMealMutation.mutate(
      { mealId, ...data },
      {
        onError: (err: any) => toast.error('Fehler', { description: err.message }),
      },
    );
  }, [updateMealMutation]);

  const handleScaleMeal = useCallback((mealId: number) => {
    scaleMealMutation.mutate(mealId, {
      onSuccess: () => {
        toast.success('Mahlzeit erfolgreich auf Soll-Kcal skaliert');
      },
      onError: (err: any) => {
        toast.error('Fehler beim Skalieren', { description: err.message });
      },
    });
  }, [scaleMealMutation]);

  const handleCopyItemConfirm = useCallback((targetMealId: number) => {
    if (copyItemId === null) return;
    copyMealItemMutation.mutate(
      { itemId: copyItemId, target_meal_id: targetMealId },
      {
        onSuccess: () => {
          toast.success('Eintrag erfolgreich kopiert');
          setCopyItemId(null);
        },
        onError: (err: any) => {
          toast.error('Fehler beim Kopieren', { description: err.message });
        },
      }
    );
  }, [copyItemId, copyMealItemMutation]);

  if (error) return <ErrorDisplay error={error} onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
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

  const TAB_ICONS = {
    plan: Calendar,
    table: Grid3X3,
    nutrition: Scale,
    costs: DollarSign,
    shopping: ShoppingCart,
    suggestions: Lightbulb,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton to="/meal-plans/app" />
        <div className="border-l border-border pl-3 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground truncate">{plan.name}</h1>
          <div className="flex flex-wrap gap-3 mt-1.5 text-xs font-semibold text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              {plan.norm_portions} Portionen
            </span>
            <span className="inline-flex items-center gap-1" title="Reservefaktor für Einkaufsmengen">
              <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
              Reserve: +{Math.round((plan.reserve_factor - 1) * 100)}%
            </span>
            {plan.event_name && (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                {plan.event_name}
              </span>
            )}
          </div>
        </div>
        {plan.can_edit && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-sm font-bold bg-card hover:bg-muted/50 transition-all self-start shadow-soft"
          >
            <Settings className="w-4 h-4 text-primary" />
            Einstellungen
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && plan.can_edit && (
        <SettingsPanel plan={plan} onSave={handleSaveSettings} isPending={updateMutation.isPending} />
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[
          { key: 'plan' as const, label: 'Tagesplan' },
          { key: 'table' as const, label: 'Tabelle' },
          { key: 'nutrition' as const, label: 'Nährwerte' },
          { key: 'costs' as const, label: 'Kosten' },
          { key: 'shopping' as const, label: 'Einkaufsliste' },
          { key: 'suggestions' as const, label: 'Vorschläge' },
        ].map((tab) => {
          const IconComponent = TAB_ICONS[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
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
          onScaleMeal={handleScaleMeal}
          onCopyItem={setCopyItemId}
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
          onScaleMeal={handleScaleMeal}
          onUnlinkMeal={handleUnlinkMeal}
          onLinkMeal={handleLinkMeal}
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

      {/* Copy Item Dialog */}
      <CopyMealItemDialog
        open={copyItemId !== null}
        onOpenChange={(open) => {
          if (!open) setCopyItemId(null);
        }}
        onConfirm={handleCopyItemConfirm}
        meals={plan.meals}
        isPending={copyMealItemMutation.isPending}
      />
    </div>
  );
}
