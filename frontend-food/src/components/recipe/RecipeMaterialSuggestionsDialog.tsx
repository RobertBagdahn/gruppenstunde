/**
 * RecipeMaterialSuggestionsDialog — AI suggestions for recipe materials.
 *
 * Suggestions are fetched on demand and never persisted until the user
 * explicitly selects them. Only matched materials can be applied; unmatched
 * suggestions are shown with a hint instead of being silently created.
 */
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AiVoteButtons } from '@/components/shared/AiVoteButtons';
import EmptyState from '@/components/shared/EmptyState';
import {
  useSuggestRecipeMaterials,
  useApplyRecipeMaterials,
} from '@/api/recipeMaterials';

interface RecipeMaterialSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: number;
}

export default function RecipeMaterialSuggestionsDialog({
  open,
  onOpenChange,
  recipeId,
}: RecipeMaterialSuggestionsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const hasFetchedRef = useRef(false);

  const suggest = useSuggestRecipeMaterials(recipeId);
  const apply = useApplyRecipeMaterials(recipeId);

  useEffect(() => {
    if (open && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      suggest.mutate(undefined, {
        onError: (err) => {
          toast.error('KI-Vorschläge konnten nicht geladen werden', { description: err.message });
        },
      });
    }
    // Reset selection whenever the dialog opens
    setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const suggestions = suggest.data?.items ?? [];
  const matched = suggestions.filter((item) => item.material_id !== null && !item.is_new);

  const toggleSelection = (materialId: number) => {
    setSelectedIds((prev) =>
      prev.includes(materialId) ? prev.filter((id) => id !== materialId) : [...prev, materialId],
    );
  };

  const handleApply = () => {
    const toApply = matched
      .filter((item) => item.material_id !== null && selectedIds.includes(item.material_id))
      .map((item) => ({ material_id: item.material_id as number, quantity: item.quantity }));
    if (toApply.length === 0) {
      toast.error('Bitte wähle mindestens ein Material aus');
      return;
    }
    apply.mutate(toApply, {
      onSuccess: (created) => {
        toast.success(`${created.length} Material(ien) übernommen`);
        hasFetchedRef.current = false;
        suggest.reset();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error('Materialien konnten nicht übernommen werden', { description: err.message });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Materialien vorschlagen lassen</DialogTitle>
          <DialogDescription>
            Die KI schlägt Verbrauchs- und Hilfsmaterialien für dieses Rezept vor. Bestätigte
            Vorschläge werden erst nach dem Übernehmen gespeichert.
          </DialogDescription>
        </DialogHeader>

        {suggest.isPending ? (
          <div className="animate-pulse space-y-3 py-4" data-testid="materials-suggestions-loading">
            <div className="h-14 bg-muted rounded-xl" />
            <div className="h-14 bg-muted rounded-xl" />
            <div className="h-14 bg-muted rounded-xl" />
          </div>
        ) : suggestions.length === 0 ? (
          <EmptyState
            title="Keine Vorschläge"
            description="Die KI hat keine passenden Materialien für dieses Rezept gefunden."
            icon="auto_awesome"
          />
        ) : (
          <ul className="space-y-2 max-h-[320px] overflow-y-auto" data-testid="materials-suggestions-list">
            {suggestions.map((suggestion) => {
              const isMatched = suggestion.material_id !== null && !suggestion.is_new;
              const isSelected = suggestion.material_id !== null && selectedIds.includes(suggestion.material_id);
              return (
                <li
                  key={`${suggestion.suggested_name}-${suggestion.material_id ?? 'new'}`}
                  className={`rounded-xl border p-3 transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    {isMatched && (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={isSelected}
                        onChange={() => toggleSelection(suggestion.material_id as number)}
                        data-testid={`suggestion-checkbox-${suggestion.material_id}`}
                      />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{suggestion.suggested_name}</span>
                        {isMatched ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            Gefunden: {suggestion.matched_name}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Noch nicht im Material-Katalog
                          </span>
                        )}
                      </span>
                      {suggestion.quantity && (
                        <span className="block text-xs text-muted-foreground mt-0.5">{suggestion.quantity}</span>
                      )}
                      {!isMatched && (
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          Lege das Material zuerst im Material-Katalog an.
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {suggest.data?.ai_interaction_id && (
          <div className="flex justify-end">
            <AiVoteButtons interactionId={suggest.data.ai_interaction_id} />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={apply.isPending || matched.length === 0 || selectedIds.length === 0}
            data-testid="materials-apply-suggestions"
          >
            {apply.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Übernehmen ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
