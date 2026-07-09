/**
 * CreateRecipeModal — Frontend-Food variant for breakfast wizard
 * Integrates with useWizardState modal state for drink recipes
 */
import { useState } from 'react';
import { useCreateRecipe } from '@/api/breakfast';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CreateModalState } from '@/pages/planning/breakfast/useWizardState';

interface CreateRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalState: CreateModalState;
  onError: (error: string) => void;
}

export function CreateRecipeModal({
  isOpen,
  onClose,
  modalState,
  onError,
}: CreateRecipeModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreateRecipe();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Name erforderlich');
      return;
    }

    try {
      const tagIds = modalState.recipeType
        ? [await getTagIdForRecipeType(modalState.recipeType)]
        : [];

      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        summary: description.trim() || undefined,
        visibility: 'private',
        tag_ids: tagIds,
      });

      toast.success('Rezept erstellt ✓');
      
      // Invalidate catalog so new recipe appears
      queryClient.invalidateQueries({ queryKey: ['breakfast-catalog'] });
      
      setTitle('');
      setDescription('');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Erstellen';
      toast.error(message);
      onError(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modalState.recipeType === 'drink' && 'Neues Getränk-Rezept erstellen'}
            {!modalState.recipeType && 'Neues Rezept erstellen'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Orangensaft, Kaffee..."
              disabled={createMutation.isPending}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">Beschreibung</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional: Zutaten, Zubereitung..."
              disabled={createMutation.isPending}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
            >
              {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function getTagIdForRecipeType(recipeType: string): Promise<number> {
  // This should be replaced with a proper tag lookup
  // For now, return placeholder - tag IDs would be fetched from backend
  const tagMap: Record<string, number> = {
    'drink': 5,
  };
  return tagMap[recipeType] || 0;
}
