/**
 * RecipeMaterialsEditor — reusable editor for recipe materials.
 *
 * Devices (oven, pot) and consumables (paper plates, skewers) are both materials;
 * each link has a numeric amount and, for consumables, a mode (per portion or total).
 * Server state lives in TanStack Query; local state is limited to draft inputs.
 */
import { useMemo, useState } from 'react';
import { useAiAccess } from '@/hooks/useAiAccess';
import { notify } from '@/lib/notify';
import { ArrowDown, ArrowUp, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { CardTable, DataCardRow } from '@/components/shared/CardTable';
import EmptyState from '@/components/shared/EmptyState';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMaterialSearch } from '@/api/supplies';
import { useCreateMaterial } from '@/api/materials';
import {
  useRecipeMaterials,
  useCreateRecipeMaterial,
  useUpdateRecipeMaterial,
  useDeleteRecipeMaterial,
  useReorderRecipeMaterials,
  type QuantityMode,
} from '@/api/recipeMaterials';
import { QUANTITY_MODE_LABELS, parseAmountInput } from '@/lib/materialAmount';

/** Pure helper: move one item within an ordered id list. */
export function moveItemOrder(itemIds: number[], index: number, direction: 'up' | 'down'): number[] {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= itemIds.length) {
    return itemIds;
  }
  const next = [...itemIds];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

const SELECT_CLASS =
  'h-11 rounded-lg border border-input bg-card px-3 text-body focus:outline-none focus:ring-2 focus:ring-ring';

interface RecipeMaterialsEditorProps {
  recipeId: number;
  onSuggestClick?: () => void;
}

export default function RecipeMaterialsEditor({ recipeId, onSuggestClick }: RecipeMaterialsEditorProps) {
  const ai = useAiAccess();
  const { data: materials, isLoading, error, refetch } = useRecipeMaterials(recipeId);
  const createMaterial = useCreateRecipeMaterial(recipeId);
  const updateMaterial = useUpdateRecipeMaterial(recipeId);
  const deleteMaterial = useDeleteRecipeMaterial(recipeId);
  const reorderMaterials = useReorderRecipeMaterials(recipeId);
  const createCatalogMaterial = useCreateMaterial();

  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<{ id: number; name: string; isConsumable: boolean } | null>(null);
  const [newAmount, setNewAmount] = useState('1');
  const [newMode, setNewMode] = useState<QuantityMode>('total');
  const [amountDrafts, setAmountDrafts] = useState<Record<number, string>>({});

  const { data: searchResults } = useMaterialSearch(searchTerm, searchTerm.trim().length > 0 && selected === null);

  const itemIds = useMemo(() => (materials ?? []).map((item) => item.id), [materials]);
  const trimmedTerm = searchTerm.trim();
  const hasExactMatch = (searchResults ?? []).some((m) => m.name.toLowerCase() === trimmedTerm.toLowerCase());

  const clearDraft = (itemId: number) =>
    setAmountDrafts((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

  const handleAmountBlur = (itemId: number, current: number) => {
    const draft = amountDrafts[itemId];
    if (draft === undefined) return;
    const parsed = parseAmountInput(draft);
    if (parsed === null) {
      notify.error('Bitte gib eine Menge größer als 0 ein');
      clearDraft(itemId);
      return;
    }
    if (parsed === current) {
      clearDraft(itemId);
      return;
    }
    updateMaterial.mutate(
      { itemId, data: { amount: parsed } },
      {
        onSuccess: () => clearDraft(itemId),
        onError: (err) => notify.error('Material konnte nicht gespeichert werden', { error: err }),
      },
    );
  };

  const handleModeChange = (itemId: number, mode: QuantityMode) => {
    updateMaterial.mutate(
      { itemId, data: { quantity_mode: mode } },
      { onError: (err) => notify.error('Material konnte nicht gespeichert werden', { error: err }) },
    );
  };

  const resetAddForm = () => {
    setSearchTerm('');
    setSelected(null);
    setNewAmount('1');
    setNewMode('total');
  };

  const handleAdd = () => {
    if (selected === null) {
      notify.error('Bitte wähle zuerst ein Material aus');
      return;
    }
    const amount = parseAmountInput(newAmount);
    if (amount === null) {
      notify.error('Bitte gib eine Menge größer als 0 ein');
      return;
    }
    createMaterial.mutate(
      { material_id: selected.id, amount, quantity_mode: selected.isConsumable ? newMode : 'total' },
      {
        onSuccess: () => {
          notify.success('Material hinzugefügt');
          resetAddForm();
        },
        onError: (err) => notify.error('Material konnte nicht hinzugefügt werden', { error: err }),
      },
    );
  };

  const handleCreateNew = (isConsumable: boolean) => {
    createCatalogMaterial.mutate(
      { name: trimmedTerm, is_consumable: isConsumable, material_category: 'kitchen' },
      {
        onSuccess: (material) => {
          setSelected({ id: material.id, name: material.name, isConsumable: material.is_consumable });
          setNewMode(material.is_consumable ? 'per_portion' : 'total');
          setSearchTerm(material.name);
        },
        onError: (err) => notify.error('Material konnte nicht angelegt werden', { error: err }),
      },
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const next = moveItemOrder(itemIds, index, direction);
    if (next.join(',') === itemIds.join(',')) return;
    reorderMaterials.mutate(next, {
      onError: (err) => notify.error('Reihenfolge konnte nicht gespeichert werden', { error: err }),
    });
  };

  const handleDelete = (itemId: number, materialName: string) => {
    deleteMaterial.mutate(itemId, {
      onSuccess: () => notify.success(`${materialName} entfernt`),
      onError: (err) => notify.error('Material konnte nicht entfernt werden', { error: err }),
    });
  };

  const handleSelectMaterial = (material: { id: number; name: string; is_consumable: boolean }) => {
    setSelected({ id: material.id, name: material.name, isConsumable: material.is_consumable });
    setNewMode(material.is_consumable ? 'per_portion' : 'total');
    setSearchTerm(material.name);
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="animate-pulse space-y-3" data-testid="materials-loading">
          <div className="h-16 bg-muted rounded-xl" />
          <div className="h-16 bg-muted rounded-xl" />
        </div>
      ) : error ? (
        <ErrorDisplay error={error} variant="inline" onRetry={() => refetch()} />
      ) : (
        <>
          {materials && materials.length > 0 ? (
            <CardTable data-testid="materials-list">
              {materials.map((item, index) => (
                <DataCardRow key={item.id}>
                  <div className="flex flex-col md:flex-row md:items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 md:flex-1">
                      <p className="font-medium text-body truncate">{item.material_name}</p>
                      <p className="text-caption text-muted-foreground truncate">
                        {item.is_consumable ? 'Verbrauchsmaterial' : 'Gerät'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-24"
                        inputMode="decimal"
                        aria-label={`Menge für ${item.material_name}`}
                        value={amountDrafts[item.id] ?? String(item.amount).replace('.', ',')}
                        onChange={(e) => setAmountDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onBlur={() => handleAmountBlur(item.id, item.amount)}
                      />
                      {item.is_consumable && (
                        <select
                          className={SELECT_CLASS}
                          aria-label={`Berechnung für ${item.material_name}`}
                          value={item.quantity_mode}
                          onChange={(e) => handleModeChange(item.id, e.target.value as QuantityMode)}
                        >
                          <option value="per_portion">{QUANTITY_MODE_LABELS.per_portion}</option>
                          <option value="total">{QUANTITY_MODE_LABELS.total}</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Nach oben verschieben"
                      disabled={index === 0 || reorderMaterials.isPending}
                      onClick={() => handleMove(index, 'up')}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Nach unten verschieben"
                      disabled={index === (materials?.length ?? 0) - 1 || reorderMaterials.isPending}
                      onClick={() => handleMove(index, 'down')}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${item.material_name} entfernen`}
                      onClick={() => handleDelete(item.id, item.material_name)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </DataCardRow>
              ))}
            </CardTable>
          ) : (
            <EmptyState
              title="Kein Material"
              description="Füge Geräte wie Backofen oder Topf und Verbrauchsmaterial wie Pappteller oder Zahnstocher hinzu."
              icon="inventory_2"
            />
          )}

          {/* Add form */}
          <div className="bg-card rounded-xl p-4 space-y-3 shadow-card">
            <p className="text-body font-medium">Material hinzufügen</p>
            <div className="flex flex-col gap-2">
              <Input
                aria-label="Material suchen"
                placeholder="Material suchen, z.B. Pappteller oder Backofen"
                value={selected ? selected.name : searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelected(null);
                }}
              />
              {selected === null && trimmedTerm.length > 0 && (
                <ul className="border rounded-lg divide-y max-h-56 overflow-y-auto" data-testid="materials-search-results">
                  {(searchResults ?? []).map((material) => (
                    <li key={material.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-body hover:bg-muted transition-colors flex items-center justify-between gap-2"
                        onClick={() => handleSelectMaterial(material)}
                      >
                        <span>{material.name}</span>
                        <span className="text-caption text-muted-foreground">
                          {material.is_consumable ? 'Verbrauchsmaterial' : 'Gerät'}
                        </span>
                      </button>
                    </li>
                  ))}
                  {!hasExactMatch && (
                    <li className="px-3 py-2 flex flex-wrap items-center gap-2" data-testid="materials-create-new">
                      <span className="text-body">„{trimmedTerm}“ neu anlegen als</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={createCatalogMaterial.isPending}
                        onClick={() => handleCreateNew(true)}
                      >
                        Verbrauchsmaterial
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={createCatalogMaterial.isPending}
                        onClick={() => handleCreateNew(false)}
                      >
                        Gerät
                      </Button>
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                className="sm:w-24"
                inputMode="decimal"
                aria-label="Menge des neuen Materials"
                placeholder="Menge"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              {selected?.isConsumable && (
                <select
                  className={SELECT_CLASS}
                  aria-label="Berechnung des neuen Materials"
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as QuantityMode)}
                >
                  <option value="per_portion">{QUANTITY_MODE_LABELS.per_portion}</option>
                  <option value="total">{QUANTITY_MODE_LABELS.total}</option>
                </select>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleAdd}
                disabled={selected === null || createMaterial.isPending}
                data-testid="materials-add-button"
              >
                {createMaterial.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Hinzufügen
              </Button>
              {onSuggestClick && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onSuggestClick}
                  disabled={ai.disabled}
                  title={ai.hint || undefined}
                  data-testid="materials-suggest-button"
                >
                  <Sparkles className="w-4 h-4" />
                  Vorschlagen lassen
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
