import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import type { RecipeItem } from '@/schemas/recipe';
import { useBatchCreateMealItems } from '@/api/mealPlans';
import type { MealItemVariantIn } from '@/schemas/mealPlan';

interface VariantSliderDialogProps {
  mealPlanId: number;
  mealId: number;
  recipeId: number;
  recipeItems: RecipeItem[];
  effectivePortions: number;
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
  isFetching?: boolean;
}

interface ExchangeGroupState {
  groupId: number;
  members: { recipeItemId: number; name: string }[];
  portions: Record<number, number>;
}

interface OptionalItemState {
  recipeItemId: number;
  name: string;
  portionsWith: number;
}

function largestRemainderRound(
  shares: Record<number, number>,
  total: number,
): Record<number, number> {
  const ids = Object.keys(shares).map(Number);
  if (ids.length === 0 || total === 0) return Object.fromEntries(ids.map((id) => [id, 0]));
  const raw = Object.fromEntries(ids.map((id) => [id, shares[id] * total]));
  const floored = Object.fromEntries(ids.map((id) => [id, Math.floor(raw[id])]));
  let remainder = total - ids.reduce((s, id) => s + floored[id], 0);
  const order = [...ids].sort((a, b) => (raw[b] - floored[b]) - (raw[a] - floored[a]));
  for (const id of order) {
    if (remainder <= 0) break;
    floored[id]++;
    remainder--;
  }
  return floored;
}

function buildGroups(
  recipeItems: RecipeItem[],
  effectivePortions: number,
): { groups: ExchangeGroupState[]; optionals: OptionalItemState[] } {
  const exchangeMap = new Map<number, RecipeItem[]>();
  for (const ri of recipeItems) {
    if (ri.exchange_group_id != null) {
      const existing = exchangeMap.get(ri.exchange_group_id) ?? [];
      exchangeMap.set(ri.exchange_group_id, [...existing, ri]);
    }
  }

  const groups: ExchangeGroupState[] = [];
  for (const [groupId, members] of exchangeMap) {
    const sorted = [...members].sort(
      (a, b) => (a.exchange_position ?? 0) - (b.exchange_position ?? 0),
    );
    const initPortions: Record<number, number> = {};
    sorted.forEach((m, idx) => {
      initPortions[m.id] = idx === 0 ? effectivePortions : 0;
    });
    groups.push({
      groupId,
      members: sorted.map((m) => ({
        recipeItemId: m.id,
        name: m.ingredient_name,
      })),
      portions: initPortions,
    });
  }

  const optionals: OptionalItemState[] = [];
  for (const ri of recipeItems) {
    if (ri.is_optional) {
      optionals.push({
        recipeItemId: ri.id,
        name: ri.ingredient_name,
        portionsWith: effectivePortions,
      });
    }
  }

  return { groups, optionals };
}

function generateVariants(
  groups: ExchangeGroupState[],
  optionals: OptionalItemState[],
  effectivePortions: number,
): { active_recipe_item_ids: number[]; factor: number; display_name: string }[] {
  if (groups.length === 0 && optionals.length === 0) return [];

  const choiceSets: { recipeItemId: number; choiceFactor: number; name: string }[][] = [];

  for (const g of groups) {
    const choices: { recipeItemId: number; choiceFactor: number; name: string }[] = [];
    for (const m of g.members) {
      const portions = g.portions[m.recipeItemId] ?? 0;
      if (portions > 0) {
        choices.push({
          recipeItemId: m.recipeItemId,
          choiceFactor: portions / effectivePortions,
          name: m.name,
        });
      }
    }
    if (choices.length === 0) {
      choices.push({
        recipeItemId: g.members[0].recipeItemId,
        choiceFactor: 0,
        name: g.members[0].name,
      });
    }
    choiceSets.push(choices);
  }

  for (const opt of optionals) {
    const choices: { recipeItemId: number; choiceFactor: number; name: string }[] = [];
    const withPortions = opt.portionsWith;
    const withoutPortions = effectivePortions - withPortions;
    if (withPortions > 0) {
      choices.push({
        recipeItemId: opt.recipeItemId,
        choiceFactor: withPortions / effectivePortions,
        name: `mit ${opt.name}`,
      });
    }
    if (withoutPortions > 0) {
      choices.push({
        recipeItemId: -opt.recipeItemId,
        choiceFactor: withoutPortions / effectivePortions,
        name: `ohne ${opt.name}`,
      });
    }
    if (choices.length === 0) {
      choices.push({
        recipeItemId: -opt.recipeItemId,
        choiceFactor: 0,
        name: `ohne ${opt.name}`,
      });
    }
    choiceSets.push(choices);
  }

  function cartesianProduct<T>(arrays: T[][]): T[][] {
    return arrays.reduce<T[][]>((acc, curr) => {
      return acc.flatMap((a) => curr.map((c) => [...a, c]));
    }, [[]]);
  }

  const product = cartesianProduct(choiceSets);
  const variants: { active_recipe_item_ids: number[]; factor: number; display_name: string }[] = [];

  for (const combo of product) {
    const activeIds: number[] = [];
    let factor = 1;
    const nameParts: string[] = [];
    for (const choice of combo) {
      if (choice.recipeItemId > 0) {
        activeIds.push(choice.recipeItemId);
      }
      factor *= choice.choiceFactor;
      nameParts.push(choice.name);
    }
    if (factor < 0.001) continue;
    variants.push({
      active_recipe_item_ids: activeIds,
      factor: Math.round(factor * 1000) / 1000,
      display_name: nameParts.join(' + '),
    });
  }

  return variants;
}

export default function VariantSliderDialog({
  mealPlanId,
  mealId,
  recipeId,
  recipeItems,
  effectivePortions,
  open,
  onClose,
  isLoading = false,
  isFetching = false,
}: VariantSliderDialogProps) {
  const batchCreate = useBatchCreateMealItems(mealPlanId, mealId);
  const [groups, setGroups] = useState<ExchangeGroupState[]>([]);
  const [optionals, setOptionals] = useState<OptionalItemState[]>([]);

  const dataLoaded = !isLoading && !isFetching;

  const computed = useMemo(
    () => buildGroups(recipeItems, effectivePortions),
    [recipeItems, effectivePortions],
  );

  useEffect(() => {
    if (!open) {
      setGroups([]);
      setOptionals([]);
      return;
    }
    if (dataLoaded) {
      const hasVariants = computed.groups.length > 0 || computed.optionals.length > 0;
      if (!hasVariants) {
        onClose();
        return;
      }
      setGroups(computed.groups);
      setOptionals(computed.optionals);
    }
  }, [open, dataLoaded, computed, onClose]);

  const displayGroups = groups.length > 0 ? groups : computed.groups;
  const displayOptionals = optionals.length > 0 ? optionals : computed.optionals;

  if (!open) return null;

  if (effectivePortions <= 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-card rounded-xl border shadow-xl w-full max-w-md p-6 text-center space-y-4">
          <span className="material-symbols-outlined text-4xl text-muted-foreground">info</span>
          <p className="text-sm text-muted-foreground">
            Keine gültige Portionsanzahl für dieses Gericht. Bitte zuerst Portionen festlegen.
          </p>
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-muted">
            Schließen
          </button>
        </div>
      </div>
    );
  }

  if (!dataLoaded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-card rounded-xl border shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Lade Zutaten…</span>
          </div>
        </div>
      </div>
    );
  }

  const handlePortionChange = (groupId: number, recipeItemId: number, value: number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.groupId !== groupId) return g;
        const clamped = Math.max(0, Math.min(effectivePortions, value));
        const otherIds = g.members
          .map((m) => m.recipeItemId)
          .filter((id) => id !== recipeItemId);
        const totalOthers = effectivePortions - clamped;
        const newPortions = { ...g.portions, [recipeItemId]: clamped };
        if (otherIds.length === 1) {
          newPortions[otherIds[0]] = Math.max(0, totalOthers);
        } else {
          const othersSum = otherIds.reduce((s, id) => s + (g.portions[id] ?? 0), 0);
          if (othersSum === 0) {
            newPortions[otherIds[0]] = totalOthers;
          } else {
            const scale = totalOthers / othersSum;
            const scaled = Object.fromEntries(
              otherIds.map((id) => [id, (g.portions[id] ?? 0) * scale]),
            );
            const rounded = largestRemainderRound(scaled, totalOthers);
            for (const id of otherIds) newPortions[id] = rounded[id] ?? 0;
          }
        }
        return { ...g, portions: newPortions };
      }),
    );
  };

  const handleOptionalChange = (recipeItemId: number, value: number) => {
    setOptionals((prev) =>
      prev.map((o) =>
        o.recipeItemId === recipeItemId
          ? { ...o, portionsWith: Math.max(0, Math.min(effectivePortions, value)) }
          : o,
      ),
    );
  };

  const allGroupsValid = displayGroups.every((g) => {
    const sum = g.members.reduce((s, m) => s + (g.portions[m.recipeItemId] ?? 0), 0);
    return Math.abs(sum - effectivePortions) <= 1;
  });

  const handleSave = useCallback(async () => {
    const variants = generateVariants(displayGroups, displayOptionals, effectivePortions);
    if (variants.length === 0) {
      toast.error('Keine Varianten erzeugt');
      return;
    }
    const items: MealItemVariantIn[] = variants.map((v) => ({
      recipe_id: recipeId,
      factor: v.factor,
      display_name: v.display_name,
      active_recipe_item_ids: v.active_recipe_item_ids,
    }));
    try {
      await batchCreate.mutateAsync(items);
      toast.success(`${variants.length} Varianten erstellt`);
      onClose();
    } catch (err) {
      toast.error('Fehler beim Erstellen der Varianten', {
        description: (err as Error).message,
      });
    }
  }, [displayGroups, displayOptionals, effectivePortions, recipeItems, batchCreate, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl border shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold font-display mb-1">Varianten konfigurieren</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Dieses Rezept hat Austausch-Gruppen oder optionale Zutaten.
            Verteile die {effectivePortions} Portionen auf die Varianten.
          </p>

          <div className="space-y-6">
            {displayGroups.map((group) => {
              const sum = group.members.reduce(
                (s, m) => s + (group.portions[m.recipeItemId] ?? 0),
                0,
              );
              const isValid = Math.abs(sum - effectivePortions) <= 1;

              return (
                <div key={group.groupId}>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Austausch-Gruppe
                  </div>
                  <div className="space-y-2">
                    {group.members.map((m) => (
                      <div key={m.recipeItemId} className="flex items-center gap-3">
                        <span className="flex-1 text-sm">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={effectivePortions}
                            value={group.portions[m.recipeItemId] ?? 0}
                            onChange={(e) =>
                              handlePortionChange(
                                group.groupId,
                                m.recipeItemId,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-16 px-2 py-1 text-sm text-right border rounded-md"
                          />
                          <span className="text-xs text-muted-foreground">Port.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div
                    className={`text-xs mt-1 ${isValid ? 'text-muted-foreground' : 'text-destructive font-medium'}`}
                  >
                    Σ {sum} / {effectivePortions} Portionen
                    {!isValid && ' — Summe muss stimmen'}
                  </div>
                </div>
              );
            })}

            {displayOptionals.map((opt) => (
              <div key={opt.recipeItemId}>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Optional: {opt.name}
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex-1 text-sm">mit {opt.name}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={effectivePortions}
                      value={opt.portionsWith}
                      onChange={(e) =>
                        handleOptionalChange(
                          opt.recipeItemId,
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-16 px-2 py-1 text-sm text-right border rounded-md"
                    />
                    <span className="text-xs text-muted-foreground">Port.</span>
                  </div>
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  ohne {opt.name}: {effectivePortions - opt.portionsWith} Portionen
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={!allGroupsValid || batchCreate.isPending}
              className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {batchCreate.isPending ? 'Erstellt...' : `${generateVariants(displayGroups, displayOptionals, effectivePortions).length} Varianten erstellen`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
            >
              Überspringen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
