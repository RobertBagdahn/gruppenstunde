import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Coffee,
  Utensils,
  Cookie,
  Cake,
  BookOpen,
  Egg,
  Plus,
  X,
  AlertCircle,
  FileText,
  TrendingUp,
  GlassWater,
} from 'lucide-react';
import type { Meal } from '@/schemas/mealPlan';
import { MEAL_TYPE_LABELS, MEAL_TYPE_COLORS } from '@/schemas/mealPlan';
import { kjToKcal } from '@/utils/nutritionUnits';
import { cn } from '@/lib/utils';
import RecipeSearchDialog from './RecipeSearchDialog';
import { FactorInput } from './FactorInput';
import { CardTable, DataCardRow } from '@/components/shared/CardTable';
import { MealActionsMenu } from '@/components/planning/MealActionsMenu';

const MEAL_TYPE_LUCIDE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Utensils,
  snack: Cookie,
  dessert: Cake,
  drinks: GlassWater,
};

interface TableViewProps {
  meals: Meal[];
  normPortions: number;
  budgetPerPersonPerDay?: number | null;
  canEdit?: boolean;
  onAddMealType?: (date: string, mealType: string) => Promise<Meal>;
  onAddRecipe?: (mealId: number, recipeId: number) => void;
  onAddIngredient?: (
    mealId: number,
    ingredientId: number,
    portionId: number | null,
    measuringUnitId: number | null,
    quantity: number
  ) => void;
  onDeleteItem?: (id: number) => void;
  onUpdateItemFactor?: (itemId: number, factor: number) => void;
  onDeleteMeal?: (id: number) => void;
  onUpdateMeal?: (
    mealId: number,
    data: {
      note?: string | null;
      override_portions?: number | null;
      day_part_factor?: number | null;
      is_external?: boolean | null;
      external_energy_kcal?: number | null;
      external_cost_per_person?: number | null;
    }
  ) => void;
  onScaleMeal?: (mealId: number) => void;
  onUnlinkMeal?: (mealId: number) => void;
  onLinkMeal?: (mealId: number, mealType: string) => void;
}

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drinks'];

export default function TableView({
  meals,
  normPortions,
  budgetPerPersonPerDay,
  canEdit = false,
  onAddMealType,
  onAddRecipe,
  onAddIngredient,
  onDeleteItem,
  onUpdateItemFactor,
  onDeleteMeal,
  onUpdateMeal,
  onScaleMeal,
  onUnlinkMeal,
  onLinkMeal,
}: TableViewProps) {
  // Dialog state for recipe details/search
  const [searchDialogMeal, setSearchDialogMeal] = useState<Meal | null>(null);

  // Note inline-editor state
  const [editingNoteMealId, setEditingNoteMealId] = useState<number | null>(null);
  const [localNoteValue, setLocalNoteValue] = useState('');

  // Pending creation state: "date_mealType"
  const [isCreatingSlot, setIsCreatingSlot] = useState<string | null>(null);

  const { dates, grid } = useMemo(() => {
    // Collect unique dates sorted (skip reference meals without datetime)
    const dateSet = new Set<string>();
    for (const meal of meals) {
      if (meal.start_datetime) {
        dateSet.add(meal.start_datetime.slice(0, 10));
      }
    }
    const dates = [...dateSet].sort();

    // Build grid: mealType -> date -> Meal
    const grid: Record<string, Record<string, Meal | undefined>> = {};
    for (const type of MEAL_TYPE_ORDER) {
      grid[type] = {};
    }
    for (const meal of meals) {
      if (!meal.start_datetime) continue;
      const date = meal.start_datetime.slice(0, 10);
      if (!grid[meal.meal_type]) {
        grid[meal.meal_type] = {};
      }
      grid[meal.meal_type][date] = meal;
    }

    return { dates, grid };
  }, [meals]);

  const dailyTotals = useMemo(() => {
    const totals: Record<string, { kcal: number; cost: number }> = {};
    for (const date of dates) {
      let kcalSum = 0;
      let costSum = 0;
      for (const mealType of MEAL_TYPE_ORDER) {
        const meal = grid[mealType]?.[date];
        if (meal) {
          if (mealType !== 'drinks') {
            if (meal.is_external) {
              kcalSum += meal.external_energy_kcal ?? 0;
            } else {
              kcalSum += kjToKcal(meal.total_energy_kj);
            }
          }
          costSum += meal.total_cost_eur;
        }
      }
      totals[date] = { kcal: Math.round(kcalSum), cost: costSum };
    }
    return totals;
  }, [dates, grid]);

  if (dates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground font-sans">
        Noch keine Tage im Essensplan.
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const weekday = d.toLocaleDateString('de-DE', { weekday: 'long' });
    const day = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return { weekday, day };
  };

  return (
    <div className="space-y-4 font-sans">
      <CardTable>
        {dates.map((date) => {
          const { weekday, day } = formatDate(date);
          const dailyTotal = dailyTotals[date];
          const cost = dailyTotal ? dailyTotal.cost : 0;
          const costPerPerson = normPortions > 0 ? cost / normPortions : 0;
          const kcalPerPerson = dailyTotal && normPortions > 0 ? Math.round(dailyTotal.kcal / normPortions) : 0;
          const budget = budgetPerPersonPerDay ? Number(budgetPerPersonPerDay) : null;
          const hasBudget = budget !== null && budget > 0;

          let budgetStatus: 'green' | 'yellow' | 'red' = 'green';
          if (hasBudget) {
            if (costPerPerson <= budget) {
              budgetStatus = 'green';
            } else if (costPerPerson <= budget * 1.2) {
              budgetStatus = 'yellow';
            } else {
              budgetStatus = 'red';
            }
          }

          const diff = hasBudget ? budget - costPerPerson : 0;

          return (
            <DataCardRow key={date} className="flex flex-col gap-4 p-5 md:p-6">
              {/* Day Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60 w-full">
                <div className="flex items-baseline gap-2.5">
                  <h3 className="font-display font-bold text-lg text-foreground">
                    {weekday}
                  </h3>
                  <span className="text-sm font-medium text-muted-foreground">
                    {day}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/50 text-xs font-semibold text-foreground">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span>{kcalPerPerson} kcal</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/50 text-xs font-semibold text-foreground">
                    <span>{costPerPerson > 0 ? `${costPerPerson.toFixed(2).replace('.', ',')} €` : '0,00 €'} / Port.</span>
                  </div>
                  {hasBudget && (
                    <div className={cn(
                      "px-3 py-1 text-xs font-bold rounded-xl border shadow-sm",
                      budgetStatus === 'green' && "bg-primary/10 text-primary border-primary/20",
                      budgetStatus === 'yellow' && "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/20",
                      budgetStatus === 'red' && "bg-destructive/10 text-destructive border-destructive/20"
                    )}>
                      {diff >= 0
                        ? `noch ${diff.toFixed(2).replace('.', ',')} €`
                        : `+${Math.abs(diff).toFixed(2).replace('.', ',')} €`
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Grid of Meal Slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {MEAL_TYPE_ORDER.map((mealType) => {
                  const meal = grid[mealType]?.[date];
                  const IconComponent = MEAL_TYPE_LUCIDE_ICONS[mealType] || Utensils;

                  if (!meal) {
                    return (
                      <div key={mealType} className="flex flex-col justify-between p-4 rounded-xl border border-dashed border-border bg-muted/10 min-h-[140px] transition-all">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/80 mb-2">
                          <IconComponent className="w-3.5 h-3.5" />
                          <span>{MEAL_TYPE_LABELS[mealType] ?? mealType}</span>
                        </div>
                        {canEdit ? (
                          <div className="flex flex-col gap-1 mt-auto">
                            {isCreatingSlot === `${date}_${mealType}` ? (
                              <div className="text-[10px] text-muted-foreground/60 animate-pulse text-center py-2">
                                Wird erstellt...
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={async () => {
                                    setIsCreatingSlot(`${date}_${mealType}`);
                                    try {
                                      const newMeal = await onAddMealType?.(date, mealType);
                                      if (newMeal) {
                                        setSearchDialogMeal(newMeal);
                                      }
                                    } catch (e) {} finally {
                                      setIsCreatingSlot(null);
                                    }
                                  }}
                                  className="w-full inline-flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground font-semibold border border-transparent transition-all"
                                >
                                  <BookOpen className="w-3 h-3 text-primary" />
                                  + Rezept
                                </button>
                                <button
                                  onClick={async () => {
                                    setIsCreatingSlot(`${date}_${mealType}`);
                                    try {
                                      const newMeal = await onAddMealType?.(date, mealType);
                                      if (newMeal) {
                                        setSearchDialogMeal(newMeal);
                                      }
                                    } catch (e) {} finally {
                                      setIsCreatingSlot(null);
                                    }
                                  }}
                                  className="w-full inline-flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground font-semibold border border-transparent transition-all"
                                >
                                  <Egg className="w-3 h-3 text-primary" />
                                  + Zutat
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/30 italic text-center py-2 mt-auto">—</span>
                        )}
                      </div>
                    );
                  }

                  const portions = meal.override_portions || normPortions;
                  const isEmpty = meal.items.length === 0;

                  return (
                    <div
                      key={mealType}
                      className={cn(
                        "flex flex-col justify-between p-4 rounded-xl border min-h-[160px] shadow-soft transition-all",
                        isEmpty ? "bg-destructive/5 border-destructive/20" : "bg-card border-border"
                      )}
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold shadow-sm",
                          MEAL_TYPE_COLORS[mealType]?.bg || 'bg-muted',
                          MEAL_TYPE_COLORS[mealType]?.text || 'text-muted-foreground',
                          MEAL_TYPE_COLORS[mealType]?.border || 'border-muted'
                        )}>
                          <IconComponent className="w-3 h-3 shrink-0" />
                          <span>{MEAL_TYPE_LABELS[mealType] ?? mealType}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            {portions} Port.
                          </span>
                          {canEdit && (
                            <MealActionsMenu
                              meal={meal}
                              canEdit={canEdit}
                              onDeleteMeal={onDeleteMeal || (() => {})}
                              onUpdateMeal={onUpdateMeal || (() => {})}
                              onScaleMeal={onScaleMeal || (() => {})}
                              onUnlinkMeal={onUnlinkMeal || (() => {})}
                              onLinkMeal={onLinkMeal || (() => {})}
                            />
                          )}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5 mb-4 flex-1">
                        {meal.items.length > 0 ? (
                          meal.items.map((item, i) => {
                            const name = item.recipe_title || item.ingredient_name || item.display_name || '';
                            const kcal = item.energy_kj != null ? Math.round(kjToKcal(item.energy_kj / normPortions)) : null;
                            const cost = item.cost_eur != null ? item.cost_eur / normPortions : null;
                            return (
                              <div key={item.id || i} className="group flex items-center justify-between gap-1.5 p-2 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted hover:border-border transition-all shadow-sm">
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-bold text-foreground truncate max-w-[130px]" title={name}>
                                    {item.recipe_id && item.recipe_slug ? (
                                      <Link
                                        to={`/recipes/${item.recipe_slug}`}
                                        className="hover:underline hover:text-primary transition-colors"
                                      >
                                        {name}
                                      </Link>
                                    ) : (
                                      name
                                    )}
                                  </div>
                                  <div className="text-[9px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                                    {kcal != null && <span>{kcal} kcal</span>}
                                    {kcal != null && cost != null && <span className="text-muted-foreground/40">•</span>}
                                    {cost != null && <span>{cost.toFixed(2).replace('.', ',')} €</span>}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {canEdit && !meal.is_synced ? (
                                    <FactorInput
                                      value={item.factor}
                                      onChange={(f) => onUpdateItemFactor?.(item.id, f)}
                                    />
                                  ) : (
                                    item.factor !== 1.0 && (
                                      <span className="text-[9px] font-extrabold text-muted-foreground px-1 py-0.5 rounded bg-muted/60">
                                        &times;{item.factor.toFixed(1).replace('.', ',')}
                                      </span>
                                    )
                                  )}

                                  {canEdit && !meal.is_synced && (
                                    <button
                                      onClick={() => onDeleteItem?.(item.id)}
                                      className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                      title="Entfernen"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-[9px] uppercase tracking-wider">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Mahlzeit leer
                          </div>
                        )}
                      </div>

                      {/* Footer actions of the slot */}
                      <div className="pt-2 border-t border-border/40 mt-auto space-y-2">
                        {editingNoteMealId === meal.id ? (
                          <input
                            type="text"
                            value={localNoteValue}
                            onChange={(e) => setLocalNoteValue(e.target.value)}
                            onBlur={() => {
                              onUpdateMeal?.(meal.id, { note: localNoteValue });
                              setEditingNoteMealId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                onUpdateMeal?.(meal.id, { note: localNoteValue });
                                setEditingNoteMealId(null);
                              } else if (e.key === 'Escape') {
                                setEditingNoteMealId(null);
                              }
                            }}
                            placeholder="Notiz..."
                            autoFocus
                            className="w-full px-2 py-1 text-[10px] border border-border rounded-lg bg-background focus:ring-1 focus:ring-primary/40 focus:border-primary focus:outline-none transition-all"
                          />
                        ) : meal.note ? (
                          <div
                            onClick={() => {
                              if (canEdit) {
                                setEditingNoteMealId(meal.id);
                                setLocalNoteValue(meal.note);
                              }
                            }}
                            className={cn(
                              "text-[10px] text-muted-foreground italic flex items-start gap-1 py-1 px-1.5 rounded-lg bg-muted/50 border border-transparent hover:bg-muted transition-all truncate max-w-full",
                              canEdit && "cursor-pointer"
                            )}
                            title={meal.note}
                          >
                            <FileText className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                            <span className="truncate">{meal.note}</span>
                          </div>
                        ) : (
                          canEdit && (
                            <button
                              onClick={() => {
                                setEditingNoteMealId(meal.id);
                                setLocalNoteValue('');
                              }}
                              className="text-[9px] text-muted-foreground/60 hover:text-primary hover:bg-muted px-1 py-0.5 rounded flex items-center gap-1 transition-all"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              Notiz hinzufügen
                            </button>
                          )
                        )}

                        {canEdit && (
                          <div className="pt-1">
                            <button
                              onClick={() => setSearchDialogMeal(meal)}
                              className="w-full inline-flex items-center justify-center gap-0.5 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/10 hover:border-primary/20 transition-all font-bold text-[9px] shadow-sm"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              Hinzufügen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DataCardRow>
          );
        })}
      </CardTable>

      {/* Recipe Search Dialog */}
      {searchDialogMeal !== null && (
        <RecipeSearchDialog
          mealType={searchDialogMeal.meal_type}
          open={searchDialogMeal !== null}
          onOpenChange={(open) => !open && setSearchDialogMeal(null)}
          onSelect={(recipeId) => {
            onAddRecipe?.(searchDialogMeal.id, recipeId);
            setSearchDialogMeal(null);
          }}
          onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity) => {
            onAddIngredient?.(searchDialogMeal.id, ingredientId, portionId, measuringUnitId, quantity);
            setSearchDialogMeal(null);
          }}
        />
      )}
    </div>
  );
}
