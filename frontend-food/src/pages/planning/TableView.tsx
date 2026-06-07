import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Coffee,
  Utensils,
  Cookie,
  BookOpen,
  Egg,
  X,
  AlertCircle,
  FileText,
  TrendingUp,
  GlassWater,
  MoreVertical,
} from 'lucide-react';
import type { Meal } from '@/schemas/mealPlan';
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS, MEAL_TYPE_COLORS, NORM_PERSON_DAILY_KCAL } from '@/schemas/mealPlan';
import { kjToKcal } from '@/utils/nutritionUnits';
import { cn } from '@/lib/utils';
import RecipeSearchDialog from './RecipeSearchDialog';
import { FactorInput } from './FactorInput';
import { MealActionsMenu } from '@/components/planning/MealActionsMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MEAL_TYPE_LUCIDE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Utensils,
  snack: Cookie,
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
}

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
    const totals: Record<string, { kcal: number; cost: number; targetKcal: number; targetCost: number }> = {};
    for (const date of dates) {
      let kcalSum = 0;
      let costSum = 0;
      let targetKcalSum = 0;
      let targetCostSum = 0;
      for (const mealType of MEAL_TYPE_ORDER) {
        const meal = grid[mealType]?.[date];
        if (meal) {
          if (mealType !== 'drinks') {
            if (meal.is_external) {
              kcalSum += meal.external_energy_kcal ?? 0;
            } else {
              kcalSum += kjToKcal(meal.total_energy_kj);
            }
            targetKcalSum += NORM_PERSON_DAILY_KCAL * meal.day_part_factor;
          }
          costSum += meal.total_cost_eur;
          if (budgetPerPersonPerDay) {
            targetCostSum += budgetPerPersonPerDay * meal.day_part_factor;
          }
        }
      }
      totals[date] = {
        kcal: Math.round(kcalSum),
        cost: costSum,
        targetKcal: Math.round(targetKcalSum),
        targetCost: targetCostSum,
      };
    }
    return totals;
  }, [dates, grid, budgetPerPersonPerDay]);

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
      <div className="w-full overflow-x-auto rounded-xl border border-border shadow-soft bg-card">
        <table className="w-full border-collapse text-left min-w-[800px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-background/95 backdrop-blur-sm border-r border-b border-border px-4 py-3 font-display font-semibold text-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-[180px]">
                Mahlzeit
              </th>
              {dates.map((date) => {
                const { weekday, day } = formatDate(date);
                return (
                  <th
                    key={date}
                    className="px-4 py-3 text-left font-display font-semibold text-sm border-b border-border min-w-[240px]"
                  >
                    <div className="font-bold text-foreground">{weekday}</div>
                    <div className="text-xs text-muted-foreground font-medium">{day}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {MEAL_TYPE_ORDER.map((mealType) => {
              const IconComponent = MEAL_TYPE_LUCIDE_ICONS[mealType] || Utensils;
              return (
                <tr key={mealType}>
                  <td className="sticky left-0 z-10 bg-card/95 backdrop-blur-sm border-r border-b border-border px-4 py-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-middle">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold shadow-sm",
                      MEAL_TYPE_COLORS[mealType]?.bg || 'bg-muted',
                      MEAL_TYPE_COLORS[mealType]?.text || 'text-muted-foreground',
                      MEAL_TYPE_COLORS[mealType]?.border || 'border-muted'
                    )}>
                      <IconComponent className="w-3.5 h-3.5 shrink-0" />
                      <span>{MEAL_TYPE_LABELS[mealType] ?? mealType}</span>
                    </div>
                  </td>
                  {dates.map((date) => {
                    const meal = grid[mealType]?.[date];
                    const portions = meal ? (meal.override_portions || normPortions) : normPortions;
                    const isEmpty = !meal || meal.items.length === 0;

                    return (
                      <td
                        key={date}
                        className={cn(
                          "border-b border-r border-border p-3 align-top min-h-[120px] bg-card hover:bg-muted/5 transition-colors",
                          isEmpty && meal && "bg-destructive/5"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                            {portions} Port.
                          </span>
                          {isCreatingSlot === `${date}_${mealType}` ? (
                            <div className="text-[10px] text-muted-foreground/60 animate-pulse">
                              Wird erstellt...
                            </div>
                          ) : meal ? (
                            canEdit && (
                              <MealActionsMenu
                                meal={meal}
                                canEdit={canEdit}
                                onDeleteMeal={onDeleteMeal || (() => {})}
                                onUpdateMeal={onUpdateMeal || (() => {})}
                                onScaleMeal={onScaleMeal || (() => {})}
                                onAddClick={() => setSearchDialogMeal(meal)}
                                onAddNoteClick={() => {
                                  setEditingNoteMealId(meal.id);
                                  setLocalNoteValue(meal.note || '');
                                }}
                              />
                            )
                          ) : (
                            canEdit && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/10 transition-colors"
                                    title="Aktionen"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuItem
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
                                  >
                                    <BookOpen className="mr-2 h-4 w-4 text-primary" />
                                    <span>Rezept hinzufügen...</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
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
                                  >
                                    <Egg className="mr-2 h-4 w-4 text-primary" />
                                    <span>Zutat hinzufügen...</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      setIsCreatingSlot(`${date}_${mealType}`);
                                      try {
                                        const newMeal = await onAddMealType?.(date, mealType);
                                        if (newMeal) {
                                          setEditingNoteMealId(newMeal.id);
                                          setLocalNoteValue('');
                                        }
                                      } catch (e) {} finally {
                                        setIsCreatingSlot(null);
                                      }
                                    }}
                                  >
                                    <FileText className="mr-2 h-4 w-4 text-primary" />
                                    <span>Notiz hinzufügen / bearbeiten...</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )
                          )}
                        </div>

                        {/* Items list */}
                        {meal && meal.items.length > 0 ? (
                          <div className="space-y-1.5 mb-3">
                            {meal.items.map((item, i) => {
                              const name = item.recipe_title || item.ingredient_name || item.display_name || '';
                              const kcal = item.energy_kj != null ? Math.round(kjToKcal(item.energy_kj / normPortions)) : null;
                              const cost = item.cost_eur != null ? item.cost_eur / normPortions : null;
                              return (
                                <div key={item.id || i} className="group flex items-center justify-between gap-1.5 p-1.5 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted hover:border-border transition-all shadow-sm">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-bold text-foreground truncate max-w-[150px]" title={name}>
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
                            })}
                          </div>
                        ) : meal ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-[9px] uppercase tracking-wider mb-2">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Mahlzeit leer
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground/30 italic py-2">—</div>
                        )}

                        {/* Note area */}
                        {meal && (
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
                            ) : null}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky left-0 z-10 bg-muted/95 backdrop-blur-sm border-r border-t border-border px-4 py-4 font-bold text-xs text-foreground shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] align-top">
                Tagesbilanz
              </td>
              {dates.map((date) => {
                const dailyTotal = dailyTotals[date] || { kcal: 0, cost: 0, targetKcal: 0, targetCost: 0 };
                const cost = dailyTotal.cost;
                const costPerPerson = normPortions > 0 ? cost / normPortions : 0;
                const kcalPerPerson = normPortions > 0 ? Math.round(dailyTotal.kcal / normPortions) : 0;
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
                  <td key={date} className="border-t border-r border-border bg-muted/40 p-3 text-xs align-top">
                    <div className="flex flex-col gap-1.5 font-sans">
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <span>Soll {dailyTotal.targetKcal} · {kcalPerPerson} kcal ({dailyTotal.targetKcal > 0 ? Math.round((kcalPerPerson / dailyTotal.targetKcal) * 100) : 0} %)</span>
                      </div>
                      <div className="text-[11px] font-semibold text-muted-foreground">
                        Soll {dailyTotal.targetCost.toFixed(2).replace('.', ',')} € · {costPerPerson > 0 ? `${costPerPerson.toFixed(2).replace('.', ',')} €` : '0,00 €'} ({dailyTotal.targetCost > 0 ? Math.round((costPerPerson / dailyTotal.targetCost) * 100) : 0} %)
                      </div>
                      {hasBudget && (
                        <div className={cn(
                          "inline-block px-2 py-0.5 text-[10px] font-bold rounded-lg border w-fit shadow-xs",
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
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

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
