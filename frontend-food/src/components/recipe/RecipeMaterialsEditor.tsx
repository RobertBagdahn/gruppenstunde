/**
 * RecipeMaterialsEditor — reusable editor for recipe materials.
 *
 * Server state lives in TanStack Query (recipeMaterials hooks); local state is
 * limited to draft inputs. Materials, ingredients and equipment are managed
 * in separate sections, so this editor only talks to the materials endpoints.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { CardTable, DataCardRow } from '@/components/shared/CardTable';
import EmptyState from '@/components/shared/EmptyState';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMaterialSearch } from '@/api/supplies';
import {
  useRecipeMaterials,
  useCreateRecipeMaterial,
  useUpdateRecipeMaterial,
  useDeleteRecipeMaterial,
  useReorderRecipeMaterials,
} from '@/api/recipeMaterials';

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

interface RecipeMaterialsEditorProps {
  recipeId: number;
  onSuggestClick?: () => void;
}

export default function RecipeMaterialsEditor({ recipeId, onSuggestClick }: RecipeMaterialsEditorProps) {
  const { data: materials, isLoading, error, refetch } = useRecipeMaterials(recipeId);
  const createMaterial = useCreateRecipeMaterial(recipeId);
  const updateMaterial = useUpdateRecipeMaterial(recipeId);
  const deleteMaterial = useDeleteRecipeMaterial(recipeId);
  const reorderMaterials = useReorderRecipeMaterials(recipeId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [selectedMaterialName, setSelectedMaterialName] = useState('');
  const [newQuantity, setNewQuantity] = useState('');
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});

  const { data: searchResults } = useMaterialSearch(searchTerm, searchTerm.trim().length > 0 && selectedMaterialId === null);

  const itemIds = useMemo(() => (materials ?? []).map((item) => item.id), [materials]);

  const quantityFor = (itemId: number, fallback: string) => quantityDrafts[itemId] ?? fallback;

  const handleQuantityBlur = (itemId: number, current: string) => {
    const draft = (quantityDrafts[itemId] ?? '').trim();
    if (draft === current.trim()) {
      setQuantityDrafts((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      return;
    }
    updateMaterial.mutate(
      { itemId, data: { quantity: draft } },
      {
        onSuccess: () => {
          setQuantityDrafts((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        },
        onError: (err) => {
          toast.error('Material konnte nicht gespeichert werden', { description: err.message });
        },
      },
    );
  };

  const handleAdd = () => {
    if (selectedMaterialId === null) {
      toast.error('Bitte wähle zuerst ein Material aus');
      return;
    }
    createMaterial.mutate(
      { material_id: selectedMaterialId, quantity: newQuantity.trim() },
      {
        onSuccess: () => {
          toast.success('Material hinzugefügt');
          setSearchTerm('');
          setSelectedMaterialId(null);
          setSelectedMaterialName('');
          setNewQuantity('');
        },
        onError: (err) => {
          toast.error('Material konnte nicht hinzugefügt werden', { description: err.message });
        },
      },
    );
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const next = moveItemOrder(itemIds, index, direction);
    if (next.join(',') === itemIds.join(',')) return;
    reorderMaterials.mutate(next, {
      onError: (err) => {
        toast.error('Reihenfolge konnte nicht gespeichert werden', { description: err.message });
      },
    });
  };

  const handleDelete = (itemId: number, materialName: string) => {
    deleteMaterial.mutate(itemId, {
      onSuccess: () => {
        toast.success(`${materialName} entfernt`);
      },
      onError: (err) => {
        toast.error('Material konnte nicht entfernt werden', { description: err.message });
      },
    });
  };

  const handleSelectMaterial = (materialId: number, name: string) => {
    setSelectedMaterialId(materialId);
    setSelectedMaterialName(name);
    setSearchTerm(name);
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
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{item.material_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.material_category}</p>
                    </div>
                    <Input
                      className="max-w-[240px]"
                      aria-label={`Menge für ${item.material_name}`}
                      placeholder="Menge, z.B. 30 Stück"
                      value={quantityFor(item.id, item.quantity)}
                      onChange={(e) =>
                        setQuantityDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                      }
                      onBlur={() => handleQuantityBlur(item.id, item.quantity)}
                    />
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
              title="Keine Materialien"
              description="Füge Verbrauchs- und Hilfsmaterialien wie Zahnstocher, Holzspieße oder Backpapier hinzu."
              icon="inventory_2"
            />
          )}

          {/* Add form */}
          <div className="bg-card rounded-xl border p-4 space-y-3">
            <p className="text-sm font-medium">Material hinzufügen</p>
            <div className="flex flex-col gap-2">
              <Input
                aria-label="Material suchen"
                placeholder="Material suchen, z.B. Zahnstocher"
                value={selectedMaterialName && selectedMaterialId !== null ? selectedMaterialName : searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchTerm(value);
                  setSelectedMaterialName('');
                  setSelectedMaterialId(null);
                }}
              />
              {searchResults && searchResults.length > 0 && selectedMaterialId === null && (
                <ul className="border rounded-lg divide-y max-h-48 overflow-y-auto" data-testid="materials-search-results">
                  {searchResults.map((material) => (
                    <li key={material.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => handleSelectMaterial(material.id, material.name)}
                      >
                        {material.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                className="sm:max-w-[240px]"
                aria-label="Menge des neuen Materials"
                placeholder="Menge, z.B. 1 Rolle"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAdd}
                disabled={selectedMaterialId === null || createMaterial.isPending}
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
