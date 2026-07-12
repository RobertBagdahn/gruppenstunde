/**
 * CreateIngredientModal — Frontend-Food variant for breakfast wizard
 * Integrates with useWizardState modal state
 */
import { useState } from 'react';
import { useCreateIngredient } from '@/api/breakfast';
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

interface CreateIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalState: CreateModalState;
  onError: (error: string) => void;
}

export function CreateIngredientModal({
  isOpen,
  onClose,
  modalState,
  onError,
}: CreateIngredientModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createMutation = useCreateIngredient();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name erforderlich');
      return;
    }

    try {
      const tagIds = modalState.breakfastTag
        ? [await getTagIdForBreakfastTag(modalState.breakfastTag)]
        : [];

      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility: 'private',
        tag_ids: tagIds,
      });

      toast.success('Zutat erstellt ✓');
      
      // Invalidate catalog so new item appears
      queryClient.invalidateQueries({ queryKey: ['breakfast-catalog'] });
      
      setName('');
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
            {modalState.breakfastTag === 'breakfast-base' && 'Neue Basis erstellen'}
            {modalState.breakfastTag === 'breakfast-topping' && 'Neues Belag erstellen'}
            {modalState.breakfastTag === 'breakfast-fat' && 'Neues Streichfett erstellen'}
            {modalState.breakfastTag === 'breakfast-extra' && 'Neues Extra erstellen'}
            {!modalState.breakfastTag && 'Neue Zutat erstellen'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Vollkornbrot, Tomatenscheiben..."
              disabled={createMutation.isPending}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium">Beschreibung</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional: Herkunft, Besonderheiten..."
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
              disabled={createMutation.isPending || !name.trim()}
            >
              {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

async function getTagIdForBreakfastTag(tagName: string): Promise<string> {
  const tagMap: Record<string, string> = {
    'breakfast-base': 'base',
    'breakfast-topping': 'topping',
    'breakfast-fat': 'fat',
    'breakfast-extra': 'extra',
    'breakfast-drink': 'drink',
  };
  return tagMap[tagName] || '';
}
