/**
 * SplitConfigDialog — configures portion splits for exchange groups and optional
 * ingredients after a recipe is added to a meal item.
 *
 * Shows only when the recipe has exchange groups or optional items.
 * Tasks 11.2–11.6.
 */
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { RecipeItem } from '@/schemas/recipe';
import { useSetMealItemSplits } from '@/api/mealPlans';

interface SplitConfigDialogProps {
  mealPlanId: number;
  mealItemId: number;
  recipeItems: RecipeItem[];
  effectivePortions: number;
  open: boolean;
  onClose: () => void;
}

interface GroupState {
  key: string;
  label: string;
  members: { recipeItemId: number; name: string; isDefault: boolean }[];
  portions: Record<number, number>; // recipeItemId -> whole portions
}

/** Largest-remainder round so that Σ portions = total */
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

export default function SplitConfigDialog({
  mealPlanId,
  mealItemId,
  recipeItems,
  effectivePortions,
  open,
  onClose,
}: SplitConfigDialogProps) {
  const setSplits = useSetMealItemSplits(mealPlanId, mealItemId);

  // Build groups from recipe items
  const buildGroups = (): GroupState[] => {
    const groups: GroupState[] = [];
    const exchangeMap = new Map<number, RecipeItem[]>();

    for (const ri of recipeItems) {
      if (ri.exchange_group_id != null) {
        const existing = exchangeMap.get(ri.exchange_group_id) ?? [];
        exchangeMap.set(ri.exchange_group_id, [...existing, ri]);
      }
    }

    // Exchange groups
    for (const [groupId, members] of exchangeMap) {
      const sorted = [...members].sort(
        (a, b) => (a.exchange_position ?? 0) - (b.exchange_position ?? 0),
      );
      const defaultMember = sorted[0];
      const initPortions: Record<number, number> = {};
      sorted.forEach((m, idx) => {
        initPortions[m.id] = idx === 0 ? effectivePortions : 0;
      });
      groups.push({
        key: `exchange:${groupId}`,
        label: `Austausch-Gruppe`,
        members: sorted.map((m) => ({
          recipeItemId: m.id,
          name: m.ingredient_name,
          isDefault: m.id === defaultMember?.id,
        })),
        portions: initPortions,
      });
    }

    // Optional items
    for (const ri of recipeItems) {
      if (ri.is_optional) {
        groups.push({
          key: `optional:${ri.id}`,
          label: `Optional: ${ri.ingredient_name}`,
          members: [
            { recipeItemId: ri.id, name: `mit ${ri.ingredient_name}`, isDefault: true },
            { recipeItemId: -ri.id, name: `ohne ${ri.ingredient_name}`, isDefault: false },
          ],
          portions: { [ri.id]: effectivePortions, [-ri.id]: 0 },
        });
      }
    }

    return groups;
  };

  const [groups, setGroups] = useState<GroupState[]>([]);

  useEffect(() => {
    if (open) {
      setGroups(buildGroups());
    }
  }, [open, recipeItems, effectivePortions]);

  if (!open) return null;
  if (groups.length === 0) {
    onClose();
    return null;
  }

  const handlePortionChange = (groupKey: string, recipeItemId: number, value: number) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.key !== groupKey) return g;
        const clamped = Math.max(0, Math.min(effectivePortions, value));
        // Adjust other members so sum stays ≤ effectivePortions; put remainder on default
        const otherIds = g.members
          .map((m) => m.recipeItemId)
          .filter((id) => id !== recipeItemId);
        const totalOthers = effectivePortions - clamped;
        const newPortions = { ...g.portions, [recipeItemId]: clamped };
        // Distribute remainder to first other member (default)
        if (otherIds.length === 1) {
          newPortions[otherIds[0]] = Math.max(0, totalOthers);
        } else {
          const othersSum = otherIds.reduce((s, id) => s + (g.portions[id] ?? 0), 0);
          if (othersSum === 0) {
            newPortions[otherIds[0]] = totalOthers;
          } else {
            const scale = totalOthers / othersSum;
            const scaled = Object.fromEntries(otherIds.map((id) => [id, (g.portions[id] ?? 0) * scale]));
            const rounded = largestRemainderRound(scaled, totalOthers);
            for (const id of otherIds) newPortions[id] = rounded[id] ?? 0;
          }
        }
        return { ...g, portions: newPortions };
      }),
    );
  };

  const isValid = groups.every((g) => {
    const sum = g.members
      .filter((m) => m.recipeItemId > 0) // skip virtual "ohne" ids
      .reduce((s, m) => s + (g.portions[m.recipeItemId] ?? 0), 0);
    // For optional groups, "ohne"-portion is just stored as (1 - share)
    return Math.abs(sum + (g.key.startsWith('optional') ? (g.portions[-g.members[0].recipeItemId] ?? 0) : 0) - effectivePortions) <= 1;
  });

  const handleSave = async () => {
    const splits: { recipe_item_id: number; share: number }[] = [];
    for (const g of groups) {
      for (const m of g.members) {
        if (m.recipeItemId < 0) continue; // virtual "ohne" item
        const portions = g.portions[m.recipeItemId] ?? 0;
        const share = effectivePortions > 0 ? portions / effectivePortions : 0;
        splits.push({ recipe_item_id: m.recipeItemId, share });
      }
    }
    try {
      await setSplits.mutateAsync(splits);
      toast.success('Varianten gespeichert');
      onClose();
    } catch (err) {
      toast.error('Fehler beim Speichern', { description: (err as Error).message });
    }
  };

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
            {groups.map((group) => {
              const sum = group.members.reduce((s, m) => s + (group.portions[m.recipeItemId] ?? 0), 0);
              const isGroupValid = Math.abs(sum - effectivePortions) <= 1;

              return (
                <div key={group.key}>
                  <div className="text-sm font-medium text-muted-foreground mb-2">{group.label}</div>
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
                              handlePortionChange(group.key, m.recipeItemId, parseInt(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 text-sm text-right border rounded-md"
                          />
                          <span className="text-xs text-muted-foreground">Port.</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`text-xs mt-1 ${isGroupValid ? 'text-muted-foreground' : 'text-destructive font-medium'}`}>
                    Σ {sum} / {effectivePortions} Portionen
                    {!isGroupValid && ' — Summe muss stimmen'}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid || setSplits.isPending}
              className="flex-1 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {setSplits.isPending ? 'Speichert...' : 'Speichern'}
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
