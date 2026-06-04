import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  Plus,
  Trash2,
  Edit,
  Link2,
  Unlink,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  X,
  Sliders,
  MoreVertical,
  Copy,
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
  useRecipeSuggestions,
  useScaleMealToTarget,
  useCopyMealItem,
} from '@/api/mealPlans';
import { MEAL_TYPE_LABELS, MEAL_TYPE_ICONS, MEAL_TYPE_COLORS, getCoverageStatus, NORM_PERSON_DAILY_KCAL } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import { kjToKcal } from '@/utils/nutritionUnits';
import ErrorDisplay from '@/components/ErrorDisplay';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SuggestionDashboard } from '@/components/suggestions';
import EmptyState from '@/components/shared/EmptyState';
import RecipeSearchDialog from './RecipeSearchDialog';
import TableView from './TableView';
import CostDashboard from './CostDashboard';
import SettingsPanel from './SettingsPanel';
import NutritionView from './NutritionView';
import ShoppingView from './ShoppingView';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

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

  const TAB_ICONS = {
    plan: Calendar,
    table: Grid3X3,
    nutrition: Scale,
    costs: DollarSign,
    shopping: ShoppingCart,
    suggestions: Lightbulb,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BackButton to="/meal-plans/app" />
        <div className="border-l pl-3 flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-display font-bold truncate">{plan.name}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="w-4 h-4 text-muted-foreground" />
              {plan.norm_portions} Portionen
            </span>
            <span className="inline-flex items-center gap-1" title="Reservefaktor für Einkaufsmengen">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              Reserve: +{Math.round((plan.reserve_factor - 1) * 100)}%
            </span>
            {plan.event_name && (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
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
            <Settings className="w-4 h-4" />
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
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
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
      <CopyItemDialog
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

// ==========================================================================
// Copy Item Dialog
// ==========================================================================

interface CopyItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetMealId: number) => void;
  meals: Meal[];
  isPending: boolean;
}

function CopyItemDialog({ open, onOpenChange, onConfirm, meals, isPending }: CopyItemDialogProps) {
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);

  const groups = useMemo(() => {
    return groupMealsByDate(meals);
  }, [meals]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const handleConfirm = () => {
    if (selectedMealId) {
      onConfirm(selectedMealId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Eintrag kopieren</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Wähle eine Ziel-Mahlzeit aus, in die dieser Eintrag kopiert werden soll:
          </p>
          
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.date} className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {formatDate(group.date)}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.meals.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMealId(m.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors flex items-center justify-between",
                        selectedMealId === m.id
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <span>{MEAL_TYPE_LABELS[m.meal_type] || m.meal_type}</span>
                      {m.is_synced && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          Ref
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedMealId || isPending}
          >
            {isPending ? 'Kopieren...' : 'Kopieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  onScaleMeal,
  onCopyItem,
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
    external_cost_per_person?: number | null;
  }) => void;
  onScaleMeal: (mealId: number) => void;
  onCopyItem: (itemId: number) => void;
}) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drinks'];

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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/20 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
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
                    <Trash2 className="w-4.5 h-4.5" />
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
                    onScaleMeal={onScaleMeal}
                    onCopyItem={onCopyItem}
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-primary" />
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/20 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
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
  onScaleMeal,
  onCopyItem,
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
    external_cost_per_person?: number | null;
  }) => void;
  onScaleMeal: (mealId: number) => void;
  onCopyItem: (itemId: number) => void;
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
  const coverageColorClass = coverage.status === 'good' ? 'text-primary font-semibold' : coverage.status === 'warning' ? 'text-chart-4 font-semibold' : 'text-destructive font-bold';

  const mealTargetKcal = Math.round(NORM_PERSON_DAILY_KCAL * meal.day_part_factor);
  const mealActualKcal = Math.round(kjToKcal(meal.total_energy_kj / normPortions));
  const actualDailyPercent = Math.round((mealActualKcal / NORM_PERSON_DAILY_KCAL) * 100);
  const mealTargetCost = budgetPerPersonPerDay ? budgetPerPersonPerDay * meal.day_part_factor : 0;
  const mealActualCost = meal.total_cost_eur / normPortions;

  return (
    <div className={`px-4 py-3 border-l-4 ${isEmpty && !meal.is_external ? 'border-destructive bg-destructive/5' : mealColors.border}`}>
      {/* Meal Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isEmpty && !meal.is_external ? (
            <AlertCircle className="w-5 h-5 text-destructive animate-pulse" />
          ) : (
            <span className={`material-symbols-outlined text-[20px] ${mealColors.text}`}>
              {MEAL_TYPE_ICONS[meal.meal_type] || 'restaurant'}
            </span>
          )}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/10 transition-colors"
                  title="Aktionen"
                >
                  <MoreVertical className="w-4.5 h-4.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {!meal.is_synced && !meal.is_external && (
                  <DropdownMenuItem
                    onClick={() => {
                      setIsSearching(true);
                      setSearchQuery('');
                    }}
                  >
                    <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                    <span>Rezept hinzufügen</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowMealSettings(!showMealSettings)}>
                  <Edit className="mr-2 h-4 w-4 text-primary" />
                  <span>Einstellungen</span>
                </DropdownMenuItem>
                {canEdit && !meal.is_synced && !meal.is_external && meal.items.length > 0 && (
                  <DropdownMenuItem onClick={() => onScaleMeal(meal.id)}>
                    <Scale className="mr-2 h-4 w-4 text-primary" />
                    <span>Auf Soll skalieren</span>
                  </DropdownMenuItem>
                )}
                {meal.is_synced ? (
                  <DropdownMenuItem onClick={() => onUnlinkMeal(meal.id)}>
                    <Unlink className="mr-2 h-4 w-4 text-primary" />
                    <span>Vom RefMeal entkoppeln</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onLinkMeal(meal.id, meal.meal_type)}>
                    <Link2 className="mr-2 h-4 w-4 text-primary" />
                    <span>Mit RefMeal verknüpfen</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDeleteMeal(meal.id)}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Mahlzeit löschen</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className={cn("grid grid-cols-1 gap-3", meal.is_external ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
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
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-muted-foreground">Energie (kcal)</label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={meal.external_energy_kcal ?? ''}
                    onChange={(e) => onUpdateMeal(meal.id, { external_energy_kcal: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="Auto (Soll)"
                    className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-muted-foreground">Festpreis pro Person (€)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={meal.external_cost_per_person ?? ''}
                    onChange={(e) => onUpdateMeal(meal.id, { external_cost_per_person: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="z.B. 4,50"
                    className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </>
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
        <p className="text-xs text-primary font-medium pl-7 flex items-center gap-1 mb-1">
          <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
          Referenz-Mahlzeit
        </p>
      )}
      {isEmpty && !isSearching && (
        <p className="text-sm text-destructive italic pl-7 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 text-destructive" />
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
              className="text-base hover:text-primary transition-colors truncate block font-medium"
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
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={() => onCopyItem(item.id)}
                className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                title="Eintrag kopieren"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="Entfernen"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
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
              <Sliders className="w-4 h-4" />
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
