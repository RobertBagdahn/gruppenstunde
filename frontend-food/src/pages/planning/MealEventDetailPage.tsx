import { useMemo, useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useLocation, useSearchParams, NavLink } from 'react-router-dom';
import { BackButton } from '@/components/shared/BackButton';
import { PdfExportDialog } from '@/components/PdfExportDialog';
import { PlanCheckFlyout } from '@/components/planning/PlanCheckFlyout';
import { MealOmnibarDialog } from '@/components/planning/MealOmnibarDialog';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Users,
  ShoppingCart,
  Sparkles,
  Settings,
  Grid3X3,
  DollarSign,
  ShieldAlert,
  ChefHat,
  Share2,
  Printer,
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
import { MEAL_TYPE_ORDER, minutesToHHMM, getMealDefaultTimes, effectivePortions } from '@/schemas/mealPlan';
import type { Meal, MealItem } from '@/schemas/mealPlan';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import TableView from './TableView';
import CostDashboard from './CostDashboard';
import SettingsPanel from './SettingsPanel';
import ShoppingView from './ShoppingView';
import { DayPlanView } from './DayPlanView';
import { CopyFromPlanDialog } from './CopyFromPlanDialog';
import IngredientScanView from './IngredientScanView';
import VariantSliderDialog from '@/components/meal/VariantSliderDialog';
import { useRecipeItems } from '@/api/recipes';
import MealPlanCollaboratorManager from '@/components/planner/MealPlanCollaboratorManager';
import { GroupMemberPanel } from '@/components/groupMembers/GroupMemberPanel';
import CookingScheduleTab from './CookingScheduleTab';
import { MealPlanBudgetCockpit } from '@/components/planning/MealPlanBudgetCockpit';

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
  const queryClient = useQueryClient();

  const navigate = useNavigate();
  const location = useLocation();

  const MAIN_TAB_KEYS = ['plan', 'shopping', 'cooking'] as const;
  type MainTabKey = typeof MAIN_TAB_KEYS[number];

  const tabPath = useParams()['*'] || '';
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!tabPath) {
      navigate(`/meal-plans/${mealPlanId}/plan`, { replace: true });
    } else if (tabPath === 'table') {
      navigate(`/meal-plans/${mealPlanId}/plan?view=table`, { replace: true });
    } else if (tabPath === 'costs') {
      navigate(`/meal-plans/${mealPlanId}/shopping?sub=costs`, { replace: true });
    } else if (tabPath === 'cooking-schedule') {
      navigate(`/meal-plans/${mealPlanId}/cooking?sub=schedule`, { replace: true });
    } else if (tabPath === 'ingredient-scan') {
      navigate(`/meal-plans/${mealPlanId}/cooking?sub=helpers`, { replace: true });
    } else if (tabPath === 'nutrition' || tabPath === 'suggestions') {
      navigate(`/meal-plans/${mealPlanId}/plan`, { replace: true });
    }
  }, [tabPath, navigate, mealPlanId]);

  const activeTab = (MAIN_TAB_KEYS.includes(tabPath as MainTabKey) ? tabPath : 'plan') as MainTabKey;
  const planView = searchParams.get('view') === 'table' ? 'table' : 'cards';
  const shoppingSub = searchParams.get('sub') === 'costs' ? 'costs' : 'list';
  const cookingSub = searchParams.get('sub') === 'helpers' ? 'helpers' : 'schedule';

  // Omnibar meal state (e.g. triggered from PlanCheckFlyout or direct action)
  const [omnibarMealId, setOmnibarMealId] = useState<number | null>(null);

  const omnibarMeal = useMemo(() => {
    if (!omnibarMealId || !plan) return null;
    return plan.meals.find((m) => m.id === omnibarMealId) || null;
  }, [omnibarMealId, plan]);

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

  const handleDeleteItem = useCallback(
    (itemId: number) => {
      let itemTitle = 'Eintrag';
      if (plan) {
        for (const m of plan.meals) {
          const it = m.items.find((i) => i.id === itemId);
          if (it) {
            itemTitle = it.recipe_title || it.ingredient_name || 'Eintrag';
            break;
          }
        }
      }

      removeMealItemMutation.mutate(itemId, {
        onSuccess: (_data, _vars, context) => {
          toast.success(`«${itemTitle}» entfernt`, {
            duration: 6000,
            action: {
              label: 'Rückgängig',
              onClick: () => {
                if (context?.previousPlan) {
                  queryClient.setQueryData(['meal-plan', mealPlanId], context.previousPlan);
                  if (context?.removedItem && context.removedFromMealId) {
                    const it = context.removedItem as MealItem;
                    if (it.recipe_id) {
                      addMealItemMutation.mutate({
                        mealId: context.removedFromMealId,
                        recipe_id: it.recipe_id,
                        factor: it.factor,
                      });
                    }
                  }
                }
              },
            },
          });
        },
        onError: (err: { message: string }) => {
          toast.error('Fehler beim Entfernen', { description: err.message });
        },
      });
    },
    [plan, removeMealItemMutation, queryClient, mealPlanId, addMealItemMutation]
  );

  // Cross-plan copy dialog state
  const [copyDialogTargetMealId, setCopyDialogTargetMealId] = useState<number | null>(null);

  // Edit settings
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showGroupMembersDialog, setShowGroupMembersDialog] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  // Group meals by date for display
  const dayGroups = useMemo(() => {
    if (!plan) return [];
    return groupMealsByDate(plan.meals);
  }, [plan]);

  // Scroll to the day/meal anchor referenced by the URL hash (e.g. coming from a suggestion card)
  useEffect(() => {
    if (activeTab !== 'plan' || !location.hash || !plan) return;
    const id = location.hash.slice(1);
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(t);
  }, [activeTab, location.hash, plan]);

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
    norm_portions_manual?: boolean;
    reserve_factor?: number;
    activity_factor?: number;
    budget_per_person_per_day?: number | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
    nutritional_tag_ids?: number[];
  }) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success(
          data.norm_portions_manual === false
            ? 'Automatische Normportionen aktiviert'
            : data.norm_portions_manual === true
              ? 'Manuelle Normportionen gespeichert'
              : 'Einstellungen gespeichert',
        );
        setShowSettingsDialog(false);
      },
      onError: (err) => toast.error('Fehler', { description: err.message }),
    });
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
              {plan.norm_portions.toFixed(1)} Portionen
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
            {plan.tags && plan.tags.length > 0 && (
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                {plan.tags.map((tag: { id: number; name: string }) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold"
                  >
                    {tag.name}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <PlanCheckFlyout
            mealPlanId={mealPlanId}
            onNavigateToCosts={() => navigate(`/meal-plans/${mealPlanId}/shopping?sub=costs`)}
            onScrollToMeal={(mId) => {
              navigate(`/meal-plans/${mealPlanId}/plan#meal-${mId}`);
              setTimeout(() => {
                document.getElementById(`meal-${mId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 50);
            }}
            onOpenOmnibar={(mId) => {
              if (mId) setOmnibarMealId(mId);
            }}
          />
          <button
            onClick={() => setShowShareDialog(true)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all shadow-soft"
            aria-label="Essensplan teilen"
            title="Essensplan teilen"
          >
            <Share2 className="w-5 h-5 text-primary" />
          </button>
          <button
            onClick={() => setShowGroupMembersDialog(true)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all shadow-soft"
            aria-label="Teilnehmende verwalten"
            title="Teilnehmende verwalten"
          >
            <Users className="w-5 h-5 text-primary" />
          </button>
          {plan.can_edit && (
            <button
              onClick={() => setShowSettingsDialog(true)}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all shadow-soft"
              aria-label="Einstellungen"
              title="Einstellungen"
            >
              <Settings className="w-5 h-5 text-primary" />
            </button>
          )}
          <button
            onClick={() => setPdfDialogOpen(true)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all shadow-soft"
            aria-label="Als PDF öffnen"
            title="Als PDF öffnen"
          >
            <Printer className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Einstellungen
            </DialogTitle>
          </DialogHeader>
          {plan.can_edit && (
            <SettingsPanel planId={mealPlanId} plan={plan} onSave={handleSaveSettings} isPending={updateMutation.isPending} />
          )}
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Essensplan teilen
            </DialogTitle>
          </DialogHeader>
          <MealPlanCollaboratorManager planId={mealPlanId} isOwner={plan.is_owner} />
        </DialogContent>
      </Dialog>

      {/* Group Members Dialog */}
      <Dialog open={showGroupMembersDialog} onOpenChange={setShowGroupMembersDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Teilnehmende
            </DialogTitle>
          </DialogHeader>
          <GroupMemberPanel
            mealPlanId={mealPlanId}
            hasEvent={!!plan.event_id}
            eventName={plan.event_name || ''}
            activityFactor={plan.activity_factor}
          />
        </DialogContent>
      </Dialog>

      {/* Budget & Nutrition Cockpit */}
      <MealPlanBudgetCockpit
        normPortions={plan.norm_portions}
        budgetPerPersonPerDay={plan.budget_per_person_per_day}
        reserveFactor={plan.reserve_factor}
        meals={plan.meals}
        onNavigateToCosts={() => navigate(`/meal-plans/${mealPlanId}/shopping?sub=costs`)}
        onNavigateToSuggestions={() => navigate(`/meal-plans/${mealPlanId}/plan`)}
      />

      {/* Main 3-Pillar Tab Bar */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {[
          { key: 'plan' as const, label: 'Planen', icon: Calendar },
          { key: 'shopping' as const, label: 'Einkaufen', icon: ShoppingCart },
          { key: 'cooking' as const, label: 'Kochen', icon: ChefHat },
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <NavLink
              key={tab.key}
              to={`/meal-plans/${mealPlanId}/${tab.key}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap ${
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
        <div className="space-y-4">
          {/* Header View Switcher */}
          <div className="flex items-center justify-between pb-1">
            <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border">
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('view');
                  setSearchParams(next, { replace: true });
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  planView === 'cards'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                Tagesplan
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set('view', 'table');
                  setSearchParams(next, { replace: true });
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  planView === 'table'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Tabelle
              </button>
            </div>
          </div>

          {planView === 'cards' ? (
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
              onDeleteItem={handleDeleteItem}
              onUpdateItemFactor={handleUpdateItemFactor}
              onUpdateItemQuantity={handleUpdateItemQuantity}
              onUpdateMeal={handleUpdateMeal}
              onScaleMeal={handleScaleMeal}
              onCopyFromPlan={setCopyDialogTargetMealId}
              nutritionalTagIds={plan.nutritional_tag_ids}
              nutritionalTagNames={plan.nutritional_tags?.map(t => t.name) ?? []}
            />
          ) : (
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
              onDeleteItem={handleDeleteItem}
              onUpdateItemFactor={handleUpdateItemFactor}
              onUpdateItemQuantity={handleUpdateItemQuantity}
              onDeleteMeal={setDeleteMealId}
              onUpdateMeal={handleUpdateMeal}
              onScaleMeal={handleScaleMeal}
              nutritionalTagIds={plan.nutritional_tag_ids}
              nutritionalTagNames={plan.nutritional_tags?.map(t => t.name) ?? []}
            />
          )}
        </div>
      )}

      {activeTab === 'shopping' && (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('sub');
                setSearchParams(next, { replace: true });
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                shoppingSub === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Einkaufsliste
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('sub', 'costs');
                setSearchParams(next, { replace: true });
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                shoppingSub === 'costs'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <DollarSign className="w-3.5 h-3.5" />
              Kosten & Budget
            </button>
          </div>
          {shoppingSub === 'list' && <ShoppingView mealPlanId={mealPlanId} />}
          {shoppingSub === 'costs' && (
            <CostDashboard
              mealPlanId={mealPlanId}
              budgetPerPersonPerDay={plan.budget_per_person_per_day}
              meals={plan.meals}
              onSelectTab={(tab) => {
                if (tab === 'shopping') {
                  const next = new URLSearchParams(searchParams);
                  next.delete('sub');
                  setSearchParams(next, { replace: true });
                } else {
                  navigate(`/meal-plans/${mealPlanId}/${tab}`);
                }
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'cooking' && (
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('sub');
                setSearchParams(next, { replace: true });
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                cookingSub === 'schedule'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <ChefHat className="w-3.5 h-3.5" />
              Zubereitungs-Zeitplan
            </button>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('sub', 'helpers');
                setSearchParams(next, { replace: true });
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all',
                cookingSub === 'helpers'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              )}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Küchenhelfer & Allergene
            </button>
          </div>
          {cookingSub === 'schedule' && <CookingScheduleTab mealPlanId={mealPlanId} />}
          {cookingSub === 'helpers' && (
            <IngredientScanView
              mealPlanId={mealPlanId}
              canEdit={plan.can_edit}
              onOpenSettings={() => setShowSettingsDialog(true)}
              nutritionalTagsCount={plan.nutritional_tag_ids?.length || 0}
            />
          )}
        </div>
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

      {/* Unified Meal Omnibar Dialog */}
      {omnibarMeal && (
        <MealOmnibarDialog
          open={!!omnibarMeal}
          onOpenChange={(open) => {
            if (!open) setOmnibarMealId(null);
          }}
          mealType={omnibarMeal.meal_type}
          mealId={omnibarMeal.id}
          normPortions={effectivePortions(omnibarMeal, plan.norm_portions)}
          onSelectRecipe={(recipeId) => {
            handleAddRecipe(omnibarMeal.id, recipeId);
            setOmnibarMealId(null);
          }}
          onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity) => {
            handleAddIngredient(omnibarMeal.id, ingredientId, portionId, measuringUnitId, quantity);
            setOmnibarMealId(null);
          }}
          nutritionalTagIds={plan.nutritional_tag_ids}
        />
      )}

      <PdfExportDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        baseUrl={`${API_BASE_URL}/api/meal-plans/${mealPlanId}/export/pdf/`}
        optionType="meal_plan"
      />
    </div>
  );
}
