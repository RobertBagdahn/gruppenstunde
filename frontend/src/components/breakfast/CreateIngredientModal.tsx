/**
 * CreateIngredientModal.tsx
 * Modal dialog for creating custom breakfast ingredients with visibility & tagging.
 */
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { IngredientCreate, VisibilityInputSchema } from '../../schemas/breakfast';
import { ApiClient } from '../../services/api';

interface CreateIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (ingredient: any) => void;
  groupId?: number;
}

export function CreateIngredientModal({
  isOpen,
  onClose,
  onSuccess,
  groupId,
}: CreateIngredientModalProps) {
  const [formData, setFormData] = useState<Partial<IngredientCreate>>({
    name: '',
    description: '',
    visibility: 'private',
    shared_group_ids: groupId ? [groupId] : [],
    tag_ids: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data: IngredientCreate) => {
      const response = await ApiClient.post('/api/supplies/ingredients/', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Zutat erstellt ✓');
      setFormData({
        name: '',
        description: '',
        visibility: 'private',
        shared_group_ids: groupId ? [groupId] : [],
        tag_ids: [],
      });
      onSuccess?.(data);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Fehler beim Erstellen der Zutat');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Zutatname erforderlich');
      return;
    }

    createMutation.mutate(formData as IngredientCreate);
  };

  const handleClose = () => {
    if (!createMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Neue Zutat erstellen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Zutatname *</label>
            <Input
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="z.B. Glutenfreies Brot"
              disabled={createMutation.isPending}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Beschreibung</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional: Weitere Details zur Zutat"
              className="w-full px-3 py-2 border rounded-md text-sm"
              disabled={createMutation.isPending}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Sichtbarkeit</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={formData.visibility === 'private'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: 'private' as const,
                      shared_group_ids: [],
                    })
                  }
                  disabled={createMutation.isPending}
                />
                <span className="text-sm">Privat (nur diese Gruppe)</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="visibility"
                  value="shared"
                  checked={formData.visibility === 'shared'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: 'shared' as const,
                    })
                  }
                  disabled={createMutation.isPending}
                />
                <span className="text-sm">Mit Gruppen teilen</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              isLoading={createMutation.isPending}
            >
              Erstellen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
