import { useMemo, useState, useEffect, useRef } from 'react';
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
  Trash2,
  TrendingUp,
} from 'lucide-react';
import type { Meal } from '@/schemas/mealPlan';
import { MEAL_TYPE_LABELS, MEAL_TYPE_COLORS } from '@/schemas/mealPlan';
import { kjToKcal } from '@/utils/nutritionUnits';
import { cn } from '@/lib/utils';
import RecipeSearchDialog from './RecipeSearchDialog';

const MEAL_TYPE_LUCIDE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  breakfast: Coffee,
  lunch: Utensils,
  dinner: Utensils,
  snack: Cookie,
  dessert: Cake,
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
    data: { note?: string | null; override_portions?: number | null }
  ) => void;
}

const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

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
      <span className="text-muted-foreground text-xs">&times;</span>
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="w-10 px-0.5 py-0.5 text-xs border rounded bg-background text-center font-medium"
      />
    </span>
  );
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
          if (meal.is_external) {
            kcalSum += meal.external_energy_kcal ?? 0;
          } else {
            kcalSum += kjToKcal(meal.total_energy_kj);
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
      <div className="text-center py-12 text-muted-foreground">
        Noch keine Tage im Essensplan.
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekday = d.toLocaleDateString('de-DE', { weekday: 'short' });
    const day = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return { weekday, day };
  };

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-xl border border-muted/80 shadow-md">
      <table className="min-w-full border-collapse text-sm bg-background">
        <thead>
          <tr className="bg-slate-50/75 backdrop-blur-sm">
            <th className="sticky left-0 bg-slate-50 border-b border-r px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground/80 min-w-[130px] z-10">
              Mahlzeit
            </th>
            {dates.map((date) => {
              const { weekday, day } = formatDate(date);
              return (
                <th
                  key={date}
                  className="border-b border-r px-4 py-3.5 text-center min-w-[220px]"
                >
                  <div className="inline-flex flex-col items-center justify-center bg-background border border-muted px-4 py-1.5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80">{weekday}</span>
                    <span className="text-sm font-extrabold text-foreground">{day}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {MEAL_TYPE_ORDER.map((mealType) => (
            <tr key={mealType} className="hover:bg-slate-50/20 transition-colors">
              {/* Sticky first column */}
              <td className="sticky left-0 bg-background border-r border-b px-4 py-5 font-semibold whitespace-nowrap z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)]">
                <div className="flex justify-start">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-bold shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
                    MEAL_TYPE_COLORS[mealType]?.bg || 'bg-muted',
                    MEAL_TYPE_COLORS[mealType]?.text || 'text-muted-foreground',
                    MEAL_TYPE_COLORS[mealType]?.border || 'border-muted'
                  )}>
                    {(() => {
                      const IconComponent = MEAL_TYPE_LUCIDE_ICONS[mealType] || Utensils;
                      return <IconComponent className="w-4 h-4 shrink-0" />;
                    })()}
                    <span>{MEAL_TYPE_LABELS[mealType] ?? mealType}</span>
                  </div>
                </div>
              </td>

              {dates.map((date) => {
                const meal = grid[mealType]?.[date];

                // Case A: No meal slot exists yet
                if (!meal) {
                  return (
                    <td key={date} className="px-4 py-4 align-middle bg-slate-50/40 border-r border-b">
                      {canEdit ? (
                        <div className="flex flex-col gap-1.5 max-w-[170px] mx-auto p-2 bg-background border border-dashed rounded-xl border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
                          {isCreatingSlot === `${date}_${mealType}` ? (
                            <div className="text-xs text-muted-foreground/60 animate-pulse text-center py-4">
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
                                  } catch (e) {
                                    // Ignored (handled by toast)
                                  } finally {
                                    setIsCreatingSlot(null);
                                  }
                                }}
                                className="w-full inline-flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-slate-100 text-[11px] text-muted-foreground hover:text-primary transition-all font-semibold border border-transparent hover:border-slate-200"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
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
                                  } catch (e) {
                                    // Ignored
                                  } finally {
                                    setIsCreatingSlot(null);
                                  }
                                }}
                                className="w-full inline-flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-slate-100 text-[11px] text-muted-foreground hover:text-primary transition-all font-semibold border border-transparent hover:border-slate-200"
                              >
                                <Egg className="w-3.5 h-3.5" />
                                + Zutat
                              </button>
                              <button
                                onClick={async () => {
                                  setIsCreatingSlot(`${date}_${mealType}`);
                                  try {
                                    const newMeal = await onAddMealType?.(date, mealType);
                                    if (newMeal) {
                                      setEditingNoteMealId(newMeal.id);
                                      setLocalNoteValue('');
                                    }
                                  } catch (e) {
                                    // Ignored
                                  } finally {
                                    setIsCreatingSlot(null);
                                  }
                                }}
                                className="w-full inline-flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-slate-100 text-[11px] text-muted-foreground hover:text-primary transition-all font-semibold border border-transparent hover:border-slate-200"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                + Notiz
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground/20">—</div>
                      )}
                    </td>
                  );
                }

                // Case B: Meal slot exists
                const portions = meal.override_portions || normPortions;
                const isEmpty = meal.items.length === 0;

                return (
                  <td key={date} className={`px-4 py-4 align-top border-r border-b hover:bg-muted/30 transition-colors ${isEmpty ? 'bg-[hsl(var(--chart-4))]/5' : 'bg-background'}`}>
                    <div className="flex flex-col h-full justify-between gap-4 min-h-[120px]">
                      {/* Items List */}
                      <div className="space-y-2">
                        {meal.items.length > 0 ? (
                          meal.items.map((item, i) => {
                            const name = item.recipe_title || item.ingredient_name || item.display_name || '';
                            const kcal = item.energy_kj != null ? Math.round(kjToKcal(item.energy_kj / normPortions)) : null;
                            const cost = item.cost_eur != null ? item.cost_eur / normPortions : null;
                            return (
                              <div key={item.id || i} className="group flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border/50 hover:bg-muted hover:border-border transition-all shadow-sm">
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-foreground truncate max-w-[170px]" title={name}>
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
                                  <div className="text-[10px] text-muted-foreground/90 font-medium flex items-center gap-1 mt-0.5">
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
                                      <span className="text-xs font-bold text-muted-foreground/80 px-1 rounded bg-muted/40">
                                        &times;{item.factor.toFixed(1).replace('.', ',')}
                                      </span>
                                    )
                                  )}

                                  {canEdit && !meal.is_synced && (
                                    <button
                                      onClick={() => onDeleteItem?.(item.id)}
                                      className="p-1 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                      title="Entfernen"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-[10px] uppercase tracking-wider shadow-sm">
                            <AlertCircle className="w-3 h-3" />
                            Mahlzeit leer
                          </div>
                        )}
                      </div>

                      {/* Note and Metadata */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 mt-auto">
                        {/* Notes Input / display */}
                        {editingNoteMealId === meal.id ? (
                          <div className="space-y-1">
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
                              className="w-full px-2 py-1 text-xs border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:outline-none transition-all"
                            />
                          </div>
                        ) : meal.note ? (
                          <div
                            onClick={() => {
                              if (canEdit) {
                                setEditingNoteMealId(meal.id);
                                setLocalNoteValue(meal.note);
                              }
                            }}
                            className={`text-xs text-muted-foreground italic flex items-start gap-1.5 py-1 px-2 rounded-lg bg-[hsl(var(--chart-4))]/5 border border-[hsl(var(--chart-4))]/10 hover:bg-[hsl(var(--chart-4))]/10 hover:border-[hsl(var(--chart-4))]/20 transition-all ${canEdit ? 'cursor-pointer' : ''}`}
                            title={meal.note}
                          >
                            <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[hsl(var(--chart-4))]" />
                            <span className="truncate max-w-[140px] font-medium">{meal.note}</span>
                          </div>
                        ) : (
                          canEdit && (
                            <button
                              onClick={() => {
                                setEditingNoteMealId(meal.id);
                                setLocalNoteValue('');
                              }}
                              className="text-[10px] text-muted-foreground/60 hover:text-primary hover:bg-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              Notiz hinzufügen
                            </button>
                          )
                        )}

                        {/* Person count & delete slot button */}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 font-medium">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100/80 text-slate-700">{portions} Port.</span>
                          
                          {canEdit && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setSearchDialogMeal(meal)}
                                className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-colors font-bold shadow-sm"
                                title="Rezept oder Zutat hinzufügen"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                Hinzufügen
                              </button>

                              <button
                                onClick={() => onDeleteMeal?.(meal.id)}
                                className="p-1 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Mahlzeit-Slot löschen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 bg-slate-50/50 backdrop-blur-sm font-semibold">
            {/* Sticky first column */}
            <td className="sticky left-0 bg-slate-50 border-r px-4 py-4 font-bold text-foreground z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-slate-700">Tagessumme <span className="text-[10px] text-slate-500 font-medium block uppercase tracking-normal">(pro Port.)</span></span>
              </div>
            </td>
            {dates.map((date) => {
              const total = dailyTotals[date];
              const cost = total ? total.cost : 0;
              const costPerPerson = normPortions > 0 ? cost / normPortions : 0;
              const kcalPerPerson = total && normPortions > 0 ? Math.round(total.kcal / normPortions) : 0;
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
                <td key={date} className="border-r px-4 py-4 text-center align-middle bg-slate-50/30">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="font-extrabold text-sm text-slate-800">{kcalPerPerson} kcal</span>
                    <span className="text-xs font-semibold text-muted-foreground">{costPerPerson > 0 ? `${costPerPerson.toFixed(2).replace('.', ',')} €` : '0,00 €'}</span>
                    {hasBudget && (
                      <div className={cn(
                        "mt-1.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full border shadow-[0_1px_2px_rgba(0,0,0,0.02)] whitespace-nowrap",
                        budgetStatus === 'green' && "bg-primary/10 text-primary border-primary/20",
                        budgetStatus === 'yellow' && "bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/20",
                        budgetStatus === 'red' && "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        {diff >= 0
                          ? `noch ${diff.toFixed(2).replace('.', ',')} € / Pers.`
                          : `+${Math.abs(diff).toFixed(2).replace('.', ',')} € / Pers.`
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