import { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
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
  ShieldAlert,
  ChefHat,
  Share2,
} from 'lucide-react';
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
} from '@/api/mealPlans';
import { MEAL_TYPE_ORDER, minutesToHHMM, getMealDefaultTimes } from '@/schemas/mealPlan';
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
import { CopyFromPlanDialog } from './CopyFromPlanDialog';
import IngredientScanView from './IngredientScanView';
import VariantSliderDialog from '@/components/meal/VariantSliderDialog';
import { useRecipeItems } from '@/api/recipes';
import MealPlanCollaboratorManager from '@/components/planner/MealPlanCollaboratorManager';
import CookingScheduleTab from './CookingScheduleTab';

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

  const navigate = useNavigate();

  const TAB_KEYS = ['plan', 'table', 'cooking-schedule', 'nutrition', 'costs', 'shopping', 'suggestions', 'ingredient-scan'] as const;
  type TabKey = typeof TAB_KEYS[number];

  const tabPath = useParams()['*'] || '';

  useEffect(() => {
    if (!tabPath) {
      navigate(`/meal-plans/${mealPlanId}/plan`, { replace: true });
    }
  }, [tabPath, navigate, mealPlanId]);

  const activeTab = (TAB_KEYS.includes(tabPath as TabKey) ? tabPath : 'plan') as TabKey;

  // Variant dialog state
  const [variantDialog, setVariantDialog] = useState<{
    open: boolean;
    mealId: number;
    mealItemId: number;
    recipeId: number;
    effectivePortions: number;
  }>({ open: false, mealId: 0, mealItemId: 0, recipeId: 0, effectivePortions: 0 });

  const { data: variantDialogRecipeItems, isLoading: variantDialogLoading, isFetching: variantDialogFetching } = useRecipeItems(
    variantDialog.open ? variantDialog.recipeId : 0,
  );

  // Delete confirmations
  const [deleteDayDate, setDeleteDayDate] = useState<string | null>(null);
  const [deleteMealId, setDeleteMealId] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  // Cross-plan copy dialog state
  const [copyDialogTargetMealId, setCopyDialogTargetMealId] = useState<number | null>(null);

  // Edit settings
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Group meals by date for display
  const dayGroups = useMemo(() => {
    if (!plan) return [];
    return groupMealsByDate(plan.meals);
  }, [plan]);

  useEffect(() => {
    if (activeTab === 'ingredient-scan' && !(plan?.nutritional_tag_ids && plan.nutritional_tag_ids.length > 0)) {
      navigate(`/meal-plans/${mealPlanId}/plan`, { replace: true });
    }
  }, [activeTab, plan?.nutritional_tag_ids, navigate, mealPlanId]);

  const handleUpdateItemFactor = useCallback((itemId: number, factor: number) => {
    updateMealItemMutation.mutate(
      { itemId, factor },
      {
        onError: (err: { message: string }) => toast.error('Fehler', { description: err.message }),
      },
    );
  }, [updateMealItemMutation]);

  const handleUpdateItemQuantity = useCallback((itemId: number, quantity: number) => {
    updateMealItemMutation.mutate(
      { itemId, quantity },
      {
        onError: (err: { message: string }) => toast.error('Fehler', { description: err.message }),
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
    start_datetime?: string | null;
    end_datetime?: string | null;
  }) => {
    updateMealMutation.mutate(
      { mealId, ...data },
      {
        onError: (err: { message: string }) => toast.error('Fehler', { description: err.message }),
      },
    );
  }, [updateMealMutation]);

  const handleScaleMeal = useCallback((mealId: number) => {
    scaleMealMutation.mutate(mealId, {
      onSuccess: () => {
        toast.success('Mahlzeit erfolgreich auf Soll-Kcal skaliert');
      },
      onError: (err: { message: string }) => {
        toast.error('Fehler beim Skalieren', { description: err.message });
      },
    });
  }, [scaleMealMutation]);

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

  const handleAddMealType = (date: string, mealType: string): Promise<Meal> => {
    // Prefer plan-specific default times, fall back to hardcoded defaults.
    const defaultTimes = getMealDefaultTimes(plan?.meal_default_times)[mealType];
    const startTime = defaultTimes ? minutesToHHMM(defaultTimes[0]) : '12:00';
    const endTime = defaultTimes ? minutesToHHMM(defaultTimes[1]) : '13:00';
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
    const meal = plan?.meals?.find((m) => m.id === mealId);
    const effectivePortions =
      meal?.override_portions ?? plan?.norm_portions ?? 10;

    addMealItemMutation.mutate(
      { mealId, recipe_id: recipeId },
      {
        onSuccess: (newItem) => {
          toast.success('Rezept hinzugefügt');
          if (newItem && typeof newItem === 'object' && 'id' in newItem) {
            setVariantDialog({
              open: true,
              mealId,
              mealItemId: (newItem as { id: number }).id,
              recipeId,
              effectivePortions,
            });
          }
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
    reserve_factor?: number;
    budget_per_person_per_day?: number | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
    nutritional_tag_ids?: number[];
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
    'cooking-schedule': ChefHat,
    nutrition: Scale,
    costs: DollarSign,
    shopping: ShoppingCart,
    suggestions: Lightbulb,
    'ingredient-scan': ShieldAlert,
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
            <span className="inline-flex items-center gap-1" title="Reservefaktor – betrifft nur die Einkaufsmengen, nicht die kcal-Bilanz">
              <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
              Einkauf +{Math.round((plan.reserve_factor - 1) * 100)}% Reserve
            </span>
            {plan.event_name && (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                {plan.event_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setShowShare(!showShare)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all shadow-soft"
            aria-label="Essensplan teilen"
            title="Essensplan teilen"
          >
            <Share2 className="w-5 h-5 text-primary" />
          </button>
          {plan.can_edit && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all shadow-soft"
              aria-label="Einstellungen"
              title="Einstellungen"
            >
              <Settings className="w-5 h-5 text-primary" />
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && plan.can_edit && (
        <SettingsPanel plan={plan} onSave={handleSaveSettings} isPending={updateMutation.isPending} />
      )}

      {/* Share / Collaborator Panel */}
      {showShare && (
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5 shadow-soft font-sans">
          <h3 className="font-display font-bold text-lg text-foreground">Essensplan teilen</h3>
          <MealPlanCollaboratorManager planId={mealPlanId} isOwner={plan.is_owner} />
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {([
          { key: 'plan' as const, label: 'Tagesplan' },
          { key: 'table' as const, label: 'Tabelle' },
          { key: 'cooking-schedule' as const, label: 'Kochplan' },
          { key: 'nutrition' as const, label: 'Nährwerte' },
          { key: 'costs' as const, label: 'Kosten' },
          { key: 'shopping' as const, label: 'Einkaufsliste' },
          { key: 'suggestions' as const, label: 'Vorschläge' },
          { key: 'ingredient-scan' as const, label: 'Zutaten-Radar' },
        ] as const).filter(tab => tab.key !== 'ingredient-scan' || (plan.nutritional_tag_ids && plan.nutritional_tag_ids.length > 0)).map((tab) => {
          const IconComponent = TAB_ICONS[tab.key];
          return (
            <NavLink
              key={tab.key}
              to={`/meal-plans/${mealPlanId}/${tab.key}`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                }`
              }
            >
              <IconComponent className="w-4 h-4" aria-label={tab.label} />
              {tab.label}
            </NavLink>
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
          onUpdateItemQuantity={handleUpdateItemQuantity}
          onUpdateMeal={handleUpdateMeal}
          onScaleMeal={handleScaleMeal}
          onCopyFromPlan={setCopyDialogTargetMealId}
          nutritionalTagIds={plan.nutritional_tag_ids}
          nutritionalTagNames={plan.nutritional_tags?.map(t => t.name) ?? []}
        />
      )}
      {activeTab === 'nutrition' && <NutritionView mealPlanId={mealPlanId} meals={plan.meals} onSelectTab={(tab) => navigate(`/meal-plans/${mealPlanId}/${tab}`)} />}
      {activeTab === 'table' && (
        <TableView
          meals={plan.meals}
          normPortions={plan.norm_portions}
          budgetPerPersonPerDay={plan.budget_per_person_per_day}
          canEdit={plan.can_edit}
          startDatetime={plan.start_datetime}
          endDatetime={plan.end_datetime}
          onAddMealType={handleAddMealType}
          onAddRecipe={handleAddRecipe}
          onAddIngredient={handleAddIngredient}
          onDeleteItem={setDeleteItemId}
          onUpdateItemFactor={handleUpdateItemFactor}
          onDeleteMeal={setDeleteMealId}
          onUpdateMeal={handleUpdateMeal}
          onScaleMeal={handleScaleMeal}
          nutritionalTagIds={plan.nutritional_tag_ids}
          nutritionalTagNames={plan.nutritional_tags?.map(t => t.name) ?? []}
        />
      )}
      {activeTab === 'cooking-schedule' && <CookingScheduleTab mealPlanId={mealPlanId} />}
       {activeTab === 'costs' && <CostDashboard mealPlanId={mealPlanId} budgetPerPersonPerDay={plan.budget_per_person_per_day} meals={plan.meals} onSelectTab={(tab) => navigate(`/meal-plans/${mealPlanId}/${tab}`)} />}
      {activeTab === 'shopping' && <ShoppingView mealPlanId={mealPlanId} />}
      {activeTab === 'suggestions' && <SuggestionDashboard mealPlanId={mealPlanId} />}
      {activeTab === 'ingredient-scan' && (
        <IngredientScanView
          mealPlanId={mealPlanId}
          canEdit={plan.can_edit}
          onOpenSettings={() => setShowSettings(true)}
          nutritionalTagsCount={plan.nutritional_tag_ids?.length || 0}
        />
      )}

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

      {/* Copy From Plan Dialog */}
      <CopyFromPlanDialog
        open={copyDialogTargetMealId !== null}
        onOpenChange={(open) => {
          if (!open) setCopyDialogTargetMealId(null);
        }}
        targetMealId={copyDialogTargetMealId ?? 0}
        targetPlanId={mealPlanId}
      />

      {/* Variant Config Dialog */}
      <VariantSliderDialog
        mealPlanId={mealPlanId}
        mealId={variantDialog.mealId}
        recipeId={variantDialog.recipeId}
        recipeItems={variantDialogRecipeItems ?? []}
        effectivePortions={variantDialog.effectivePortions}
        open={variantDialog.open}
        onClose={() => setVariantDialog((prev) => ({ ...prev, open: false }))}
        isLoading={variantDialogLoading}
        isFetching={variantDialogFetching}
      />
    </div>
  );
}
